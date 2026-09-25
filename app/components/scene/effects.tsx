import { Sparkles } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { lightsLevel, rpmNow, TIMELINE } from "~/lib/experience";
import { INTRO, introTime, LIGHTS_DELAY, paintScan, ramp, stage } from "~/lib/stage-state";

/* ------------------------------------------------------------------ */
/* Power director: drives the shared intro / engine timeline           */
/* ------------------------------------------------------------------ */

type DirectorProps = { ready: boolean; entered: boolean; live: boolean; engineOn: boolean; themeKey: string; paintKey: string };

export function PowerDirector({ ready, entered, live, engineOn, themeKey, paintKey }: DirectorProps) {
    const aspect = useThree((state) => state.size.width / state.size.height);
    const clock = useThree((state) => state.clock);
    const firstTheme = useRef(true);
    const firstPaint = useRef(true);

    // New paint sends a pulse across the floor.
    useEffect(() => {
        if (firstPaint.current) {
            firstPaint.current = false;
            return;
        }
        stage.paintPulse = clock.elapsedTime;
    }, [paintKey, clock]);

    // Before entry only the rim light is up, drawing the car's silhouette.
    useEffect(() => {
        if (ready && stage.gateStart < 0) stage.gateStart = clock.elapsedTime + 0.3;
    }, [ready, clock]);

    // Pressing start: the garage lights fade up once the engine has caught and revved.
    useEffect(() => {
        if (!entered || stage.introStart >= 0) return;
        stage.introStart = clock.elapsedTime + LIGHTS_DELAY;
        stage.fixtureFade = true;
        stage.fixturesStart = stage.introStart + INTRO.fixtures;
    }, [entered, clock]);

    // Switching garage re-runs the fixtures' power-on flicker.
    useEffect(() => {
        if (firstTheme.current) {
            firstTheme.current = false;
            return;
        }
        if (stage.introStart < 0) return;
        stage.fixtureFade = false;
        stage.fixturesStart = clock.elapsedTime + 0.05;
    }, [themeKey, clock]);

    useEffect(() => {
        stage.engineOn = engineOn;
        // The body rocks when the engine catches, after the starter cranks.
        if (engineOn) stage.engineStart = clock.elapsedTime + TIMELINE.catch;
    }, [engineOn, clock]);

    useFrame(({ clock }, delta) => {
        const t = introTime(clock.elapsedTime);
        stage.room = ramp(t, INTRO.keyLight, 1.2);
        // Ceiling lights strike at full brightness, then settle down once the
        // page is live, like a detailing bay dimming to "showroom" mode.
        const ceiling = !live ? 1 : aspect < 1 ? 0.1 : 0.6;
        stage.ceiling += (ceiling - stage.ceiling) * (1 - Math.exp(-delta * 0.9));
        // Lights and rpm follow the same timeline as the engine sound.
        stage.engine = lightsLevel();
        stage.rpm = rpmNow();
    });

    return null;
}

/* ------------------------------------------------------------------ */
/* Fake volumetric light cone                                          */
/* ------------------------------------------------------------------ */

const coneVertex = /* glsl */ `
    varying float vAlong;
    varying vec3 vNormalView;
    varying vec3 vViewDir;
    void main() {
        vAlong = uv.y;
        vec4 viewPos = modelViewMatrix * vec4(position, 1.0);
        vNormalView = normalize(normalMatrix * normal);
        vViewDir = normalize(-viewPos.xyz);
        gl_Position = projectionMatrix * viewPos;
    }
`;

const coneFragment = /* glsl */ `
    uniform vec3 uColor;
    uniform float uOpacity;
    uniform float uFalloff;
    uniform float uReach;
    varying float vAlong;
    varying vec3 vNormalView;
    varying vec3 vViewDir;
    void main() {
        // Clamp every input to pow(): with MSAA a varying can land just outside
        // 0–1, and pow() of a negative is NaN, which bloom spreads over the
        // whole frame (the screen goes black).
        float v = clamp(vAlong, 0.0, 1.0);
        // Brightest at the source (tip, uv.y = 1), fading towards the floor.
        float along = pow(v, uFalloff);
        // Soft edges: surfaces seen edge-on (the cone's silhouette) fade out.
        float facing = clamp(abs(dot(normalize(vNormalView), normalize(vViewDir))), 0.0, 1.0);
        float edge = pow(facing, 2.2);
        // uReach < 1 pours the beam down from the source: only the top part shows.
        float poured = smoothstep(1.0 - uReach - 0.14, 1.0 - uReach + 0.02, v);
        gl_FragColor = vec4(uColor, clamp(along * edge * poured * uOpacity, 0.0, 1.0));
    }
`;

type LightConeProps = {
    color: string;
    opacity: number;
    /** Height and base radius in metres. */
    length: number;
    radius: number;
    falloff?: number;
    /** Where the tip (light source) sits and where the beam points. */
    position: [number, number, number];
    target: [number, number, number];
    /** Optional per-frame multiplier (0–1) for fading with the timeline. */
    level?: () => number;
    /** Optional per-frame 0–1: how far down the beam has poured from its source. */
    reach?: (elapsed: number) => number;
};

export function LightCone({ color, opacity, length, radius, falloff = 1.6, position, target, level, reach }: LightConeProps) {
    const mesh = useRef<THREE.Mesh>(null);
    const uniforms = useMemo(
        () => ({ uColor: { value: new THREE.Color(color) }, uOpacity: { value: 0 }, uFalloff: { value: falloff }, uReach: { value: 1 } }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        []
    );
    const geometry = useMemo(() => {
        const geo = new THREE.ConeGeometry(radius, length, 48, 1, true);
        // Put the tip at the origin and point the cone down -Y.
        geo.translate(0, -length / 2, 0);
        return geo;
    }, [radius, length]);

    useEffect(() => {
        uniforms.uColor.value.set(color);
    }, [color, uniforms]);

    useEffect(() => {
        // Orient: the cone's -Y axis should face the target.
        const m = mesh.current;
        if (!m) return;
        const dir = new THREE.Vector3(...target).sub(new THREE.Vector3(...position)).normalize();
        m.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
    }, [position, target]);

    useFrame(({ clock }) => {
        uniforms.uOpacity.value = opacity * (level ? level() : 1);
        uniforms.uReach.value = reach ? reach(clock.elapsedTime) : 1;
        // Scale away rather than hide, so the shader is compiled before the entry.
        if (mesh.current) mesh.current.scale.setScalar(uniforms.uOpacity.value > 0.002 ? 1 : 1e-4);
    });

    return (
        <mesh ref={mesh} position={position} geometry={geometry} renderOrder={5}>
            <shaderMaterial
                vertexShader={coneVertex}
                fragmentShader={coneFragment}
                uniforms={uniforms}
                transparent
                depthWrite={false}
                blending={THREE.AdditiveBlending}
                side={THREE.DoubleSide}
                toneMapped={false}
            />
        </mesh>
    );
}

/* ------------------------------------------------------------------ */
/* Dust drifting through the light                                     */
/* ------------------------------------------------------------------ */

export function Dust({ color }: { color: string }) {
    const group = useRef<THREE.Group>(null);
    useFrame(({ clock }) => {
        if (group.current) group.current.scale.setScalar(ramp(introTime(clock.elapsedTime), INTRO.keyLight, 0.8) > 0.5 ? 1 : 1e-4);
    });
    return (
        <group ref={group} scale={1e-4}>
            <Sparkles count={40} scale={[5, 3.2, 6]} position={[0, 1.9, 0]} size={1.1} speed={0.15} opacity={0.16} color={color} noise={0.6} />
        </group>
    );
}

/* ------------------------------------------------------------------ */
/* Paint scanner gantry                                                */
/* ------------------------------------------------------------------ */

const GANTRY = { width: 2.7, height: 1.72, radius: 0.22, thickness: 0.022 };

function roundedRect(shape: THREE.Shape | THREE.Path, w: number, h: number, r: number) {
    const x = -w / 2;
    shape.moveTo(x + r, 0);
    shape.lineTo(x + w - r, 0);
    shape.quadraticCurveTo(x + w, 0, x + w, r);
    shape.lineTo(x + w, h - r);
    shape.quadraticCurveTo(x + w, h, x + w - r, h);
    shape.lineTo(x + r, h);
    shape.quadraticCurveTo(x, h, x, h - r);
    shape.lineTo(x, r);
    shape.quadraticCurveTo(x, 0, x + r, 0);
}

const sheetFragment = /* glsl */ `
    uniform vec3 uColor;
    uniform float uOpacity;
    varying vec2 vUv;
    void main() {
        // Faint light sheet, brighter towards the floor, with scan lines.
        float lines = 0.6 + 0.4 * step(0.5, fract(vUv.y * 60.0));
        float a = mix(0.9, 0.25, vUv.y) * lines * uOpacity;
        gl_FragColor = vec4(uColor, a);
    }
`;
const sheetVertex = /* glsl */ `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

/**
 * A glowing frame that travels along the car when the paint changes, in step
 * with the shader seam on the bodywork, like a CT scanner repainting it.
 */
export function PaintScanner({ accent }: { accent: string }) {
    const group = useRef<THREE.Group>(null);
    const frame = useRef<THREE.MeshBasicMaterial>(null);
    const line = useRef<THREE.MeshBasicMaterial>(null);
    const color = useMemo(() => new THREE.Color(), []);
    const sheet = useMemo(() => ({ uColor: { value: new THREE.Color() }, uOpacity: { value: 0 } }), []);

    const frameGeometry = useMemo(() => {
        const { width: w, height: h, radius: r, thickness: t } = GANTRY;
        const outer = new THREE.Shape();
        roundedRect(outer, w, h, r);
        const inner = new THREE.Path();
        roundedRect(inner, w - t * 2, h - t * 2, r - t);
        // Lift the inner outline so the frame has an even border all round.
        outer.holes.push(new THREE.Path(inner.getPoints(12).map((p) => new THREE.Vector2(p.x, p.y + t))));
        return new THREE.ShapeGeometry(outer, 24);
    }, []);

    useFrame(({ clock }) => {
        const g = group.current;
        if (!g) return;
        const s = paintScan(clock.elapsedTime - stage.paintPulse);
        g.scale.setScalar(s.active ? 1 : 1e-4);
        if (!s.active) return;
        g.position.z = s.z;
        color.set(accent);
        frame.current?.color.copy(color).multiplyScalar(3.2 * s.strength);
        line.current?.color.copy(color).multiplyScalar(2.4 * s.strength);
        sheet.uColor.value.copy(color);
        sheet.uOpacity.value = 0.07 * s.strength;
    });

    return (
        <group ref={group} scale={1e-4}>
            <mesh geometry={frameGeometry} renderOrder={6}>
                <meshBasicMaterial ref={frame} toneMapped={false} transparent depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
            </mesh>
            <mesh position-y={GANTRY.height / 2} renderOrder={6}>
                <planeGeometry args={[GANTRY.width - 0.05, GANTRY.height - 0.05]} />
                <shaderMaterial
                    vertexShader={sheetVertex}
                    fragmentShader={sheetFragment}
                    uniforms={sheet}
                    transparent
                    depthWrite={false}
                    blending={THREE.AdditiveBlending}
                    side={THREE.DoubleSide}
                    toneMapped={false}
                />
            </mesh>
            {/* Laser line across the floor */}
            <mesh rotation-x={-Math.PI / 2} position-y={0.008} renderOrder={6}>
                <planeGeometry args={[9, 0.018]} />
                <meshBasicMaterial ref={line} toneMapped={false} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
            </mesh>
        </group>
    );
}

/* ------------------------------------------------------------------ */
/* Stage ring                                                          */
/* ------------------------------------------------------------------ */

/** One thin accent ring under the car. It draws itself round as the lights come up. */
export function StageRing({ accent }: { accent: string }) {
    const geometry = useMemo(() => new THREE.RingGeometry(3.36, 3.38, 256, 1), []);
    const material = useRef<THREE.MeshBasicMaterial>(null);
    const target = useMemo(() => new THREE.Color(), []);
    const total = geometry.index!.count;

    useFrame(({ clock }, delta) => {
        const reveal = ramp(introTime(clock.elapsedTime), INTRO.turntable, 1.6);
        geometry.setDrawRange(0, Math.floor((total * reveal) / 6) * 6);
        const mat = material.current;
        if (!mat) return;
        target.set(accent).multiplyScalar(0.55 + stage.engine * 0.5);
        mat.color.lerp(target, 1 - Math.exp(-delta * 4));
    });

    return (
        <mesh geometry={geometry} rotation-x={-Math.PI / 2} rotation-z={Math.PI / 2} position={[0, 0.008, 0]}>
            <meshBasicMaterial ref={material} transparent opacity={0.7} toneMapped={false} depthWrite={false} />
        </mesh>
    );
}
