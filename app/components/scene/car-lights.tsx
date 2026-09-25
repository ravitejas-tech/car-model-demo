import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { stage } from "~/lib/stage-state";
import { LightCone } from "./effects";

/*
 * Car lighting, authored in the model's own units (≈1 cm) and rendered inside
 * the car's transform. The nose points along +Z.
 */

/** Quad headlights: inner pair sits proud of the grille, outer pair set back. */
const LAMPS: { position: [number, number, number]; yaw: number }[] = [
    { position: [46, 53, 215], yaw: 0 },
    { position: [-46, 53, 215], yaw: 0 },
    { position: [72, 53, 200], yaw: 0.32 },
    { position: [-72, 53, 200], yaw: -0.32 },
];

const LAMP_RADIUS = 6.2;
const HEADLIGHT_COLOR = "#eef4ff";

export function CarLights({ scene, lowQuality }: { scene: THREE.Object3D; lowQuality: boolean }) {
    const discs = useRef<THREE.MeshBasicMaterial[]>([]);
    const halos = useRef<THREE.SpriteMaterial[]>([]);
    const beams = useRef<THREE.SpotLight[]>([]);
    const tailGlow = useRef<THREE.PointLight>(null);
    const halo = useMemo(() => (typeof document === "undefined" ? null : makeHaloTexture()), []);
    // Spot light targets must live in the scene graph so their matrices update.
    const beamTargets = useMemo(() => [new THREE.Object3D(), new THREE.Object3D()], []);
    const white = useMemo(() => new THREE.Color(HEADLIGHT_COLOR), []);

    // Taillights: make the model's red lens material glow with the engine.
    const redGlass = useMemo(() => {
        let found: THREE.MeshStandardMaterial | null = null;
        scene.traverse((object) => {
            const mesh = object as THREE.Mesh;
            const material = mesh.material as THREE.MeshStandardMaterial | undefined;
            if (mesh.isMesh && material?.name === "redglass") found = material;
        });
        return found as THREE.MeshStandardMaterial | null;
    }, [scene]);

    useEffect(() => {
        if (!redGlass) return;
        redGlass.emissive = new THREE.Color("#ff1020");
        redGlass.emissiveIntensity = 0;
        redGlass.toneMapped = false;
        redGlass.needsUpdate = true;
    }, [redGlass]);

    useFrame(() => {
        const e = stage.engine;
        // Unlit, the glow discs disappear and the model's own glass shows.
        discs.current.forEach((m) => {
            if (!m) return;
            m.color.copy(white).multiplyScalar(e * 5);
            m.visible = e > 0.01;
        });
        halos.current.forEach((m) => {
            if (m) m.opacity = e * 0.85;
        });
        beams.current.forEach((light) => {
            if (light) light.intensity = e * 55;
        });
        if (redGlass) redGlass.emissiveIntensity = 0.15 + e * 3.2;
        if (tailGlow.current) tailGlow.current.intensity = e * 0.3;
    });

    return (
        <group>
            {LAMPS.map((lamp, i) => (
                <group key={i} position={lamp.position} rotation-y={lamp.yaw}>
                    {/* Glowing lens */}
                    <mesh position-z={1.2}>
                        <circleGeometry args={[LAMP_RADIUS, 40]} />
                        <meshBasicMaterial
                            ref={(m) => {
                                if (m) discs.current[i] = m;
                            }}
                            toneMapped={false}
                            transparent
                            opacity={0.95}
                        />
                    </mesh>
                    {/* Soft halo so lamps read as lit even without bloom */}
                    <sprite position-z={4} scale={[LAMP_RADIUS * 7, LAMP_RADIUS * 7, 1]}>
                        <spriteMaterial
                            ref={(m) => {
                                if (m) halos.current[i] = m;
                            }}
                            map={halo}
                            color={HEADLIGHT_COLOR}
                            transparent
                            opacity={0}
                            depthWrite={false}
                            blending={THREE.AdditiveBlending}
                            toneMapped={false}
                        />
                    </sprite>
                </group>
            ))}

            {/* Beams: real lights that pool on the floor, plus visible cones */}
            {[46, -46].map((x, i) => (
                <group key={x}>
                    <primitive object={beamTargets[i]} position={[x * 1.6, 0, 900]} />
                    <spotLight
                        ref={(l) => {
                            if (l) beams.current[i] = l;
                        }}
                        position={[x, 53, 218]}
                        angle={0.42}
                        penumbra={0.55}
                        decay={1.1}
                        // Light distances are in world metres even inside the scaled car.
                        distance={14}
                        color={HEADLIGHT_COLOR}
                        intensity={0}
                        target={beamTargets[i]}
                    />
                    <LightCone
                        color={HEADLIGHT_COLOR}
                        opacity={lowQuality ? 0.12 : 0.16}
                        length={420}
                        radius={110}
                        falloff={1.3}
                        position={[x, 53, 218]}
                        target={[x * 1.3, 8, 640]}
                        level={() => stage.engine}
                    />
                </group>
            ))}

            {/* Red wash on the floor behind the car */}
            <pointLight ref={tailGlow} position={[0, 55, -250]} color="#ff1a24" intensity={0} distance={2.4} decay={1.4} />
        </group>
    );
}

/**
 * Idle vibration, a rock when the engine catches, and on the throttle the
 * rear squats and the V8's torque rolls the body slightly.
 */
export function useEngineMotion(target: React.RefObject<THREE.Group | null>) {
    const load = useRef(0);
    useFrame(({ clock }, delta) => {
        const g = target.current;
        if (!g) return;
        const t = clock.elapsedTime;
        const running = stage.rpm > 150 ? 1 : 0;
        const since = t - stage.engineStart;
        const crank = since >= 0 && since < 1.4 ? Math.exp(-since * 4) * Math.sin(since * 26) : 0;
        // Suspension lags the throttle a little.
        const targetLoad = Math.min(1, Math.max(0, (stage.rpm - 950) / 3000));
        load.current += (targetLoad - load.current) * (1 - Math.exp(-delta * 7));
        const shake = running * (0.0009 + load.current * 0.0012);
        g.position.y = shake * Math.sin(t * 52) + crank * 0.012 - load.current * 0.004;
        g.rotation.z = crank * 0.006 + shake * 0.5 * Math.sin(t * 37) + load.current * 0.006;
        g.rotation.x = crank * -0.004 - load.current * 0.011;
    });
}

function makeHaloTexture() {
    const size = 128;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.18, "rgba(255,255,255,0.45)");
    g.addColorStop(0.5, "rgba(255,255,255,0.08)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(canvas);
}
