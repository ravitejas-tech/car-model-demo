import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { ROOM, type GarageTheme } from "~/lib/garage";

/** How bright emissive fixtures are; values above 1 are picked up by bloom. */
const FIXTURE_GLOW = 2.6;

type GarageRoomProps = {
    theme: GarageTheme;
    accent: string;
    /** 0.4–1.6 multiplier from the brightness slider. */
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
        () => new THREE.Color(fixtureColor).multiplyScalar(FIXTURE_GLOW * lightLevel),
        [fixtureColor, lightLevel]
    );
    const accentGlow = useMemo(
        () => new THREE.Color(accent).multiplyScalar(3.2 * lightLevel),
        [accent, lightLevel]
    );
    const env = variant === "environment";

    return (
        <group>
            <Shell theme={theme} unlit={env} />
            <CeilingFixtures style={theme.lightStyle} color={glow} />
            <WallDetail theme={theme} accentGlow={accentGlow} lightLevel={lightLevel} unlit={env} />
            <BrandSign color={accentGlow} />
        </group>
    );
}

/** Four walls and a ceiling, facing inwards. */
function Shell({ theme, unlit }: { theme: GarageTheme; unlit: boolean }) {
    const { halfWidth: w, halfDepth: d, height: h } = ROOM;
    const concrete = useConcreteTexture(theme.id === "concrete-loft");
    const wallColor = useMemo(() => {
        // The environment copy is unlit, so lift it to roughly how lit walls read.
        const color = new THREE.Color(theme.wall);
        return unlit ? color.multiplyScalar(1.6) : color;
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

/** Instanced thin boxes: every fixture is made of these. */
function Bars({ bars, color, thickness = 0.07, depth = 0.04 }: { bars: Bar[]; color: THREE.Color; thickness?: number; depth?: number }) {
    const mesh = useRef<THREE.InstancedMesh>(null);

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
        });
        target.instanceMatrix.needsUpdate = true;
        target.computeBoundingSphere();
    }, [bars]);

    return (
        <instancedMesh key={bars.length} ref={mesh} args={[undefined, undefined, bars.length]} frustumCulled={false}>
            <boxGeometry args={[1, depth, thickness]} />
            <meshBasicMaterial color={color} toneMapped={false} />
        </instancedMesh>
    );
}

/** Honeycomb of LED tubes with a rectangular frame, as in detailing studios. */
function HexGrid({ y, color }: { y: number; color: THREE.Color }) {
    const bars = useMemo(() => {
        const radius = 1.05;
        const halfX = 9.4;
        const halfZ = 11.2;
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
        const fx = halfX + 1.1;
        const fz = halfZ + 1.1;
        result.push(
            { position: [0, y, -fz], rotationY: 0, length: fx * 2 },
            { position: [0, y, fz], rotationY: 0, length: fx * 2 },
            { position: [-fx, y, 0], rotationY: Math.PI / 2, length: fz * 2 },
            { position: [fx, y, 0], rotationY: Math.PI / 2, length: fz * 2 }
        );
        return result;
    }, [y]);
    return <Bars bars={bars} color={color} />;
}

function Strips({ y, color }: { y: number; color: THREE.Color }) {
    const bars = useMemo<Bar[]>(
        () => [-9, -6, -3, 0, 3, 6, 9].map((x) => ({ position: [x, y, 0], rotationY: Math.PI / 2, length: 24 })),
        [y]
    );
    return <Bars bars={bars} color={color} thickness={0.09} />;
}

function Panels({ y, color }: { y: number; color: THREE.Color }) {
    const panels = useMemo(() => {
        const result: [number, number, number][] = [];
        for (const x of [-7.5, -2.5, 2.5, 7.5]) for (const z of [-10, -5, 0, 5, 10]) result.push([x, y, z]);
        return result;
    }, [y]);
    return (
        <group>
            {panels.map((position, i) => (
                <mesh key={i} position={position} rotation-x={Math.PI / 2}>
                    <planeGeometry args={[2.4, 1.4]} />
                    <meshBasicMaterial color={color} toneMapped={false} side={THREE.DoubleSide} />
                </mesh>
            ))}
        </group>
    );
}

function Rings({ y, color }: { y: number; color: THREE.Color }) {
    return (
        <group position={[0, y - 0.25, 0]} rotation-x={Math.PI / 2}>
            {[2.4, 3.8, 5.2, 7.6, 10].map((radius) => (
                <mesh key={radius}>
                    <torusGeometry args={[radius, 0.04, 8, 160]} />
                    <meshBasicMaterial color={color} toneMapped={false} />
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
    const baseGlow = useMemo(() => new THREE.Color("#dfe6ff").multiplyScalar(1.6 * lightLevel), [lightLevel]);

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
                    <Bars bars={baseboard} color={baseGlow} thickness={0.04} />
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
                    <Bars bars={bars} color={accentGlow} thickness={0.05} />
                    <NeonVerticals color={accentGlow} />
                </group>
            );
        }
        case "wood":
            return (
                <group>
                    <WoodWall color={theme.woodColor ?? "#6e4a2c"} unlit={unlit} />
                    <Bars bars={baseboard.slice(0, 1)} color={baseGlow} thickness={0.04} />
                </group>
            );
        default:
            return <Bars bars={baseboard} color={baseGlow.clone().multiplyScalar(0.7)} thickness={0.03} />;
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
                    <meshBasicMaterial color={color} toneMapped={false} />
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

/** The Velocity "V" mark glowing on the back wall. */
function BrandSign({ color }: { color: THREE.Color }) {
    const geometry = useMemo(() => {
        // Same outline as the UI logo (32×32 artboard), centred and flipped to Y-up.
        const shape = new THREE.Shape();
        const pts: [number, number][] = [[3, 7], [10, 7], [16, 19], [22, 7], [29, 7], [18.5, 27], [13.5, 27]];
        pts.forEach(([x, y], i) => (i === 0 ? shape.moveTo(x - 16, 17 - y) : shape.lineTo(x - 16, 17 - y)));
        shape.closePath();
        const geo = new THREE.ExtrudeGeometry(shape, { depth: 1.2, bevelEnabled: false });
        geo.scale(0.04, 0.04, 0.04);
        return geo;
    }, []);

    return (
        <mesh geometry={geometry} position={[0, 2.6, -ROOM.halfDepth + 0.3]}>
            <meshBasicMaterial color={color} toneMapped={false} />
        </mesh>
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
