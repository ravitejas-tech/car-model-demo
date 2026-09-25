import { useFrame } from "@react-three/fiber";
import { createContext, useContext, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { ROOM, type GarageTheme } from "~/lib/garage";
import { fixturePower, POWER_ON_SECONDS, stage } from "~/lib/stage-state";

/**
 * Whether fixtures animate (the visible room) or render at full power (the
 * copy baked into reflections, which is captured in a single frame).
 */
const Animated = createContext(false);

/** Seconds after `stage.fixturesStart` that each fixture group switches on. */
const DELAY = { ceiling: 0, walls: 0.35, baseboard: 0.45, sign: 0.7 };
/** Extra delay per metre from the centre: lights ripple outwards from the car. */
const WAVE = 0.07;

function fixtureLevel(clock: number, delay: number) {
    return stage.fixturesStart < 0 ? 0 : fixturePower(clock - stage.fixturesStart - delay);
}

/** Emissive material whose brightness follows the power-on timeline. */
function GlowMaterial({ color, delay, side }: { color: THREE.Color; delay: number; side?: THREE.Side }) {
    const animated = useContext(Animated);
    const material = useRef<THREE.MeshBasicMaterial>(null);
    useFrame(({ clock }) => {
        if (!animated || !material.current) return;
        material.current.color.copy(color).multiplyScalar(fixtureLevel(clock.elapsedTime, delay) * stage.ceiling);
    });
    return <meshBasicMaterial ref={material} color={color} toneMapped={false} side={side} />;
}

/**
 * How bright emissive fixtures are. The room itself stays dim (values near 1
 * only just bloom), while the copy baked into the reflections is brighter so
 * the fixtures still draw crisp highlight lines along the paint.
 */
const FIXTURE_GLOW = { scene: 0.6, environment: 2.6 };
const ACCENT_GLOW = { scene: 1.5, environment: 2.2 };

type GarageRoomProps = {
    theme: GarageTheme;
    accent: string;
    /** 0.3–1.4 multiplier from the brightness slider. */
    lightLevel: number;
    /**
     * `"scene"` renders the lit room you walk around in; `"environment"` is a
     * cheap unlit copy baked into the cube map that the paint reflects.
     */
    variant: "scene" | "environment";
};

export function GarageRoom({ theme, accent, lightLevel, variant }: GarageRoomProps) {
    const fixtureColor = theme.lightColor === "accent" ? accent : theme.lightColor;
    const glow = useMemo(
        () => new THREE.Color(fixtureColor).multiplyScalar(FIXTURE_GLOW[variant] * lightLevel),
        [fixtureColor, lightLevel, variant]
    );
    const accentGlow = useMemo(
        () => new THREE.Color(accent).multiplyScalar(ACCENT_GLOW[variant] * lightLevel),
        [accent, lightLevel, variant]
    );
    const env = variant === "environment";

    return (
        <Animated.Provider value={!env}>
            <group>
                <Shell theme={theme} unlit={env} />
                <CeilingFixtures style={theme.lightStyle} color={glow} />
                <WallDetail theme={theme} accentGlow={accentGlow} lightLevel={lightLevel} unlit={env} />
            </group>
        </Animated.Provider>
    );
}

/** Four walls and a ceiling, facing inwards. */
function Shell({ theme, unlit }: { theme: GarageTheme; unlit: boolean }) {
    const { halfWidth: w, halfDepth: d, height: h } = ROOM;
    const concrete = useConcreteTexture(theme.id === "concrete-loft");
    const wallColor = useMemo(() => {
        // The environment copy is unlit; keep it dark so reflections stay moody.
        const color = new THREE.Color(theme.wall);
        return unlit ? color.multiplyScalar(0.8) : color;
    }, [theme.wall, unlit]);

    const walls: { position: [number, number, number]; rotation: [number, number, number]; size: [number, number] }[] = [
        { position: [0, h / 2, -d], rotation: [0, 0, 0], size: [w * 2, h] },
        { position: [0, h / 2, d], rotation: [0, Math.PI, 0], size: [w * 2, h] },
        { position: [-w, h / 2, 0], rotation: [0, Math.PI / 2, 0], size: [d * 2, h] },
        { position: [w, h / 2, 0], rotation: [0, -Math.PI / 2, 0], size: [d * 2, h] },
    ];

    return (
        <group>
            {walls.map((wall, i) => (
                <mesh key={i} position={wall.position} rotation={wall.rotation} receiveShadow={!unlit}>
                    <planeGeometry args={wall.size} />
                    {unlit ? (
                        <meshBasicMaterial color={wallColor} />
                    ) : (
                        <meshStandardMaterial color={wallColor} map={concrete} roughness={0.92} metalness={0} />
                    )}
                </mesh>
            ))}
            <mesh position={[0, h, 0]} rotation-x={Math.PI / 2}>
                <planeGeometry args={[w * 2, d * 2]} />
                {unlit ? (
                    <meshBasicMaterial color={theme.ceiling} />
                ) : (
                    <meshStandardMaterial color={theme.ceiling} roughness={1} />
                )}
            </mesh>
        </group>
    );
}

/* ------------------------------------------------------------------ */
/* Ceiling fixtures                                                    */
/* ------------------------------------------------------------------ */

function CeilingFixtures({ style, color }: { style: GarageTheme["lightStyle"]; color: THREE.Color }) {
    const y = ROOM.height - 0.06;
    switch (style) {
        case "hex":
            return <HexGrid y={y} color={color} />;
        case "strips":
            return <Strips y={y} color={color} />;
        case "panels":
            return <Panels y={y} color={color} />;
        case "rings":
            return <Rings y={y} color={color} />;
    }
}

type Bar = { position: [number, number, number]; rotationY: number; length: number };

/**
 * Instanced thin boxes: every fixture is made of these. While powering on,
 * each bar comes on individually, rippling outwards from the centre.
 */
function Bars({ bars, color, delay, thickness = 0.07, depth = 0.04 }: { bars: Bar[]; color: THREE.Color; delay: number; thickness?: number; depth?: number }) {
    const animated = useContext(Animated);
    const mesh = useRef<THREE.InstancedMesh>(null);
    const barMaterial = useRef<THREE.MeshBasicMaterial>(null);
    const settled = useRef(false);
    useFrame(() => {
        if (animated) barMaterial.current?.color.copy(color).multiplyScalar(stage.ceiling);
    });
    const delays = useMemo(
        () => bars.map((bar) => delay + Math.hypot(bar.position[0], bar.position[2]) * WAVE + ((bar.position[0] * 13.1 + bar.position[2] * 7.7) % 1 + 1) % 1 * 0.12),
        [bars, delay]
    );
    const lastDelay = useMemo(() => Math.max(0, ...delays) + POWER_ON_SECONDS, [delays]);
    const scratch = useMemo(() => new THREE.Color(), []);

    useLayoutEffect(() => {
        const target = mesh.current;
        if (!target) return;
        const matrix = new THREE.Matrix4();
        const quaternion = new THREE.Quaternion();
        const up = new THREE.Vector3(0, 1, 0);
        bars.forEach((bar, i) => {
            quaternion.setFromAxisAngle(up, bar.rotationY);
            matrix.compose(new THREE.Vector3(...bar.position), quaternion, new THREE.Vector3(bar.length, 1, 1));
            target.setMatrixAt(i, matrix);
            target.setColorAt(i, scratch.setScalar(animated ? 0 : 1));
        });
        target.instanceMatrix.needsUpdate = true;
        if (target.instanceColor) target.instanceColor.needsUpdate = true;
        target.computeBoundingSphere();
        settled.current = false;
    }, [bars, animated, scratch]);

    useFrame(({ clock }) => {
        const target = mesh.current;
        if (!animated || !target || stage.fixturesStart < 0) return;
        const t = clock.elapsedTime - stage.fixturesStart;
        if (t > lastDelay) {
            if (settled.current) return;
            settled.current = true;
        } else {
            settled.current = false;
        }
        for (let i = 0; i < delays.length; i++) target.setColorAt(i, scratch.setScalar(fixturePower(t - delays[i])));
        if (target.instanceColor) target.instanceColor.needsUpdate = true;
    });

    return (
        <instancedMesh key={bars.length} ref={mesh} args={[undefined, undefined, bars.length]} frustumCulled={false}>
            <boxGeometry args={[1, depth, thickness]} />
            <meshBasicMaterial ref={barMaterial} color={color} toneMapped={false} />
        </instancedMesh>
    );
}

/** Honeycomb of LED tubes with a rectangular frame, as in detailing studios. */
function HexGrid({ y, color }: { y: number; color: THREE.Color }) {
    const bars = useMemo(() => {
        // Only over the bay: the rest of the room falls away into darkness.
        const radius = 0.9;
        const halfX = 4.4;
        const halfZ = 5.8;
        const seen = new Set<string>();
        const result: Bar[] = [];
        const width = Math.sqrt(3) * radius;
        for (let row = -12; row <= 12; row++) {
            for (let col = -12; col <= 12; col++) {
                const cx = col * width + (row % 2 ? width / 2 : 0);
                const cz = row * radius * 1.5;
                if (Math.abs(cx) > halfX || Math.abs(cz) > halfZ) continue;
                for (let k = 0; k < 6; k++) {
                    // Pointy-top hexagon corners.
                    const a1 = (Math.PI / 3) * k + Math.PI / 6;
                    const a2 = a1 + Math.PI / 3;
                    const x1 = cx + radius * Math.cos(a1);
                    const z1 = cz + radius * Math.sin(a1);
                    const x2 = cx + radius * Math.cos(a2);
                    const z2 = cz + radius * Math.sin(a2);
                    const mx = (x1 + x2) / 2;
                    const mz = (z1 + z2) / 2;
                    const key = `${mx.toFixed(2)},${mz.toFixed(2)}`;
                    if (seen.has(key)) continue;
                    seen.add(key);
                    result.push({ position: [mx, y, mz], rotationY: -Math.atan2(z2 - z1, x2 - x1), length: radius * 0.94 });
                }
            }
        }
        // Frame around the honeycomb.
        const fx = halfX + 0.9;
        const fz = halfZ + 0.9;
        result.push(
            { position: [0, y, -fz], rotationY: 0, length: fx * 2 },
            { position: [0, y, fz], rotationY: 0, length: fx * 2 },
            { position: [-fx, y, 0], rotationY: Math.PI / 2, length: fz * 2 },
            { position: [fx, y, 0], rotationY: Math.PI / 2, length: fz * 2 }
        );
        return result;
    }, [y]);
    return <Bars bars={bars} color={color} delay={DELAY.ceiling} />;
}

function Strips({ y, color }: { y: number; color: THREE.Color }) {
    const bars = useMemo<Bar[]>(
        () => [-2.6, 0, 2.6].map((x) => ({ position: [x, y, 0], rotationY: Math.PI / 2, length: 10 })),
        [y]
    );
    return <Bars bars={bars} color={color} delay={DELAY.ceiling} thickness={0.09} />;
}

function Panels({ y, color }: { y: number; color: THREE.Color }) {
    const panels = useMemo(() => {
        const result: [number, number, number][] = [];
        for (const x of [-2.1, 2.1]) for (const z of [-3.4, 0, 3.4]) result.push([x, y, z]);
        return result;
    }, [y]);
    return (
        <group>
            {panels.map((position, i) => (
                <mesh key={i} position={position} rotation-x={Math.PI / 2}>
                    <planeGeometry args={[1.8, 1]} />
                    <GlowMaterial color={color} delay={DELAY.ceiling + i * 0.12} side={THREE.DoubleSide} />
                </mesh>
            ))}
        </group>
    );
}

function Rings({ y, color }: { y: number; color: THREE.Color }) {
    return (
        <group position={[0, y - 0.25, 0]} rotation-x={Math.PI / 2}>
            {[2.2, 3.4, 4.6].map((radius, i) => (
                <mesh key={radius}>
                    <torusGeometry args={[radius, 0.04, 8, 160]} />
                    <GlowMaterial color={color} delay={DELAY.ceiling + i * 0.22} />
                </mesh>
            ))}
        </group>
    );
}

/* ------------------------------------------------------------------ */
/* Walls                                                               */
/* ------------------------------------------------------------------ */

function WallDetail({ theme, accentGlow, lightLevel, unlit }: { theme: GarageTheme; accentGlow: THREE.Color; lightLevel: number; unlit: boolean }) {
    const { halfWidth: w, halfDepth: d } = ROOM;
    // A faint line in the paint's accent colour where walls meet the floor.
    const baseGlow = useMemo(() => accentGlow.clone().multiplyScalar(0.45), [accentGlow]);
    void lightLevel;

    // A thin light line where each wall meets the floor.
    const baseboard = useMemo<Bar[]>(
        () => [
            { position: [0, 0.1, -d + 0.05], rotationY: 0, length: w * 2 },
            { position: [0, 0.1, d - 0.05], rotationY: 0, length: w * 2 },
            { position: [-w + 0.05, 0.1, 0], rotationY: Math.PI / 2, length: d * 2 },
            { position: [w - 0.05, 0.1, 0], rotationY: Math.PI / 2, length: d * 2 },
        ],
        [w, d]
    );

    switch (theme.wallDetail) {
        case "slats":
            return (
                <group>
                    <Slats color={theme.wall} lighten={1.6} unlit={unlit} />
                    <Bars bars={baseboard} color={baseGlow} delay={DELAY.baseboard} thickness={0.04} />
                </group>
            );
        case "neon": {
            const bars: Bar[] = [
                ...baseboard,
                // Waist-high line around the room.
                { position: [0, 2.2, -d + 0.05], rotationY: 0, length: w * 2 },
                { position: [0, 2.2, d - 0.05], rotationY: 0, length: w * 2 },
                { position: [-w + 0.05, 2.2, 0], rotationY: Math.PI / 2, length: d * 2 },
                { position: [w - 0.05, 2.2, 0], rotationY: Math.PI / 2, length: d * 2 },
            ];
            return (
                <group>
                    <Bars bars={bars} color={accentGlow} delay={DELAY.walls} thickness={0.05} />
                    <NeonVerticals color={accentGlow} />
                </group>
            );
        }
        case "wood":
            return (
                <group>
                    <WoodWall color={theme.woodColor ?? "#6e4a2c"} unlit={unlit} />
                    <Bars bars={baseboard.slice(0, 1)} color={baseGlow} delay={DELAY.baseboard} thickness={0.04} />
                </group>
            );
        default:
            return <Bars bars={baseboard} color={baseGlow} delay={DELAY.baseboard} thickness={0.03} />;
    }
}

/** Vertical acoustic slats along both side walls. */
function Slats({ color, lighten, unlit }: { color: string; lighten: number; unlit: boolean }) {
    const mesh = useRef<THREE.InstancedMesh>(null);
    const { halfWidth: w, halfDepth: d, height: h } = ROOM;
    const positions = useMemo(() => {
        const result: [number, number, number][] = [];
        for (let z = -d + 1; z <= d - 1; z += 0.42) {
            result.push([-w + 0.08, h / 2, z], [w - 0.08, h / 2, z]);
        }
        return result;
    }, [w, d, h]);

    useLayoutEffect(() => {
        const target = mesh.current;
        if (!target) return;
        const matrix = new THREE.Matrix4();
        positions.forEach((p, i) => target.setMatrixAt(i, matrix.makeTranslation(...p)));
        target.instanceMatrix.needsUpdate = true;
    }, [positions]);

    const slatColor = useMemo(() => new THREE.Color(color).multiplyScalar(lighten), [color, lighten]);

    return (
        <instancedMesh ref={mesh} args={[undefined, undefined, positions.length]} frustumCulled={false}>
            <boxGeometry args={[0.12, h, 0.16]} />
            {unlit ? <meshBasicMaterial color={slatColor} /> : <meshStandardMaterial color={slatColor} roughness={0.7} />}
        </instancedMesh>
    );
}

function NeonVerticals({ color }: { color: THREE.Color }) {
    const { halfWidth: w, halfDepth: d, height: h } = ROOM;
    const tubes = useMemo(() => {
        const result: [number, number, number][] = [];
        for (const x of [-9, -6, 6, 9]) result.push([x, h / 2, -d + 0.06]);
        for (const z of [-8, -3, 3, 8]) result.push([-w + 0.06, h / 2, z], [w - 0.06, h / 2, z]);
        return result;
    }, [w, d, h]);
    return (
        <group>
            {tubes.map((position, i) => (
                <mesh key={i} position={position}>
                    <boxGeometry args={[0.05, h, 0.05]} />
                    <GlowMaterial color={color} delay={DELAY.walls + i * 0.06} />
                </mesh>
            ))}
        </group>
    );
}

/** Walnut slat feature wall behind the car, washed by a warm light from below. */
function WoodWall({ color, unlit }: { color: string; unlit: boolean }) {
    const mesh = useRef<THREE.InstancedMesh>(null);
    const { halfDepth: d, height: h } = ROOM;
    const count = 64;

    useLayoutEffect(() => {
        const target = mesh.current;
        if (!target) return;
        const matrix = new THREE.Matrix4();
        const tint = new THREE.Color();
        const base = new THREE.Color(color);
        for (let i = 0; i < count; i++) {
            const x = -8 + (16 / (count - 1)) * i;
            target.setMatrixAt(i, matrix.makeTranslation(x, h / 2, -d + 0.12));
            // Slight per-slat variation so it reads as real timber.
            target.setColorAt(i, tint.copy(base).multiplyScalar(0.8 + ((i * 37) % 11) / 25));
        }
        target.instanceMatrix.needsUpdate = true;
        if (target.instanceColor) target.instanceColor.needsUpdate = true;
    }, [color, d, h]);

    return (
        <instancedMesh ref={mesh} args={[undefined, undefined, count]} frustumCulled={false}>
            <boxGeometry args={[0.16, h, 0.14]} />
            {unlit ? <meshBasicMaterial color="#ffffff" /> : <meshStandardMaterial color="#ffffff" roughness={0.65} />}
        </instancedMesh>
    );
}


/* ------------------------------------------------------------------ */
/* Textures                                                            */
/* ------------------------------------------------------------------ */

let concreteCache: THREE.CanvasTexture | null = null;

/** Soft procedural concrete: layered noise blotches on a mid grey. */
export function makeConcreteTexture() {
    if (concreteCache) return concreteCache;
    const size = 512;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#8a8783";
    ctx.fillRect(0, 0, size, size);
    let seed = 7;
    const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 1400; i++) {
        const x = random() * size;
        const y = random() * size;
        const r = 4 + random() * 60;
        const shade = random() > 0.5 ? 255 : 0;
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
        gradient.addColorStop(0, `rgba(${shade},${shade},${shade},${0.03 + random() * 0.05})`);
        gradient.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = gradient;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    concreteCache = texture;
    return texture;
}

function useConcreteTexture(enabled: boolean) {
    return useMemo(() => {
        if (!enabled || typeof document === "undefined") return null;
        const texture = makeConcreteTexture().clone();
        texture.repeat.set(3, 1);
        texture.needsUpdate = true;
        return texture;
    }, [enabled]);
}
