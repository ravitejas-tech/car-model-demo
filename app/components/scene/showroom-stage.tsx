import {
    ContactShadows,
    Environment,
    MeshReflectorMaterial,
    PerformanceMonitor,
} from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer, ToneMapping } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { Suspense, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import { ROOM, type FloorFinish, type GarageTheme } from "~/lib/garage";
import type { CameraShot, Paint } from "~/lib/showroom";
import { CameraRig } from "./camera-rig";
import { CarModel } from "./car-model";
import { GarageRoom, makeConcreteTexture } from "./garage-room";

type ShowroomStageProps = {
    paint: Paint;
    shot: CameraShot;
    ready: boolean;
    autoRotate: boolean;
    panelOpen: boolean;
    garage: GarageTheme;
    floor: FloorFinish["id"];
    lightLevel: number;
    onReady: () => void;
    onUserInteract: () => void;
};

export function ShowroomStage(props: ShowroomStageProps) {
    const [dpr, setDpr] = useState(1.5);
    // Weak GPUs (or ?quality=low) get a plain floor, no bloom and no real-time shadows.
    const [lowQuality, setLowQuality] = useState(
        () => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("quality") === "low"
    );
    const { garage, paint, lightLevel } = props;
    const fixtureColor = garage.lightColor === "accent" ? paint.accent : garage.lightColor;

    return (
        <Canvas
            className="!absolute inset-0"
            dpr={lowQuality ? 1 : dpr}
            shadows={!lowQuality}
            gl={{ antialias: true, powerPreference: "high-performance" }}
            camera={{ position: [7.5, 3, 8], fov: 32, near: 0.1, far: 80 }}
        >
            <PerformanceMonitor
                onIncline={() => setDpr(2)}
                onDecline={() => setDpr(1)}
                flipflops={3}
                onFallback={() => setLowQuality(true)}
            />
            <color attach="background" args={[garage.background]} />

            <ViewOffset panelOpen={props.panelOpen} />
            <CameraRig
                shot={props.shot}
                ready={props.ready}
                autoRotate={props.autoRotate}
                onUserInteract={props.onUserInteract}
            />

            <RoomLights color={fixtureColor} level={lightLevel} castShadow={!lowQuality} />

            <GarageRoom theme={garage} accent={paint.accent} lightLevel={lightLevel} variant="scene" />
            <GarageFloor finish={props.floor} lowQuality={lowQuality} />
            <Turntable accent={paint.accent} />

            <Suspense fallback={null}>
                <CarModel paint={paint} onReady={props.onReady} />
                {/* The car never moves, so the soft shadow is baked once. */}
                <ContactShadows position={[0, 0.005, 0]} scale={9} blur={2.2} far={2} opacity={0.8} resolution={512} frames={1} />
            </Suspense>

            {/*
              The paint reflects an unlit copy of the room, baked once per
              theme/paint change. Brightness is applied via environmentIntensity
              so dragging the slider never re-bakes.
            */}
            <Environment
                key={`${garage.id}-${props.floor}-${garage.lightColor === "accent" || garage.wallDetail === "neon" ? paint.accent : ""}`}
                resolution={512}
                frames={1}
                environmentIntensity={0.35 + 0.65 * lightLevel}
            >
                <group position={[0, -1, 0]}>
                    <GarageRoom theme={garage} accent={paint.accent} lightLevel={1} variant="environment" />
                    <mesh rotation-x={-Math.PI / 2}>
                        <planeGeometry args={[ROOM.halfWidth * 2, ROOM.halfDepth * 2]} />
                        <meshBasicMaterial color={props.floor === "concrete" ? "#3d3b38" : props.floor === "checker" ? "#5a5a5c" : "#0c0d10"} />
                    </mesh>
                </group>
            </Environment>

            {!lowQuality && (
                <EffectComposer multisampling={4}>
                    <Bloom mipmapBlur luminanceThreshold={1} luminanceSmoothing={0.25} intensity={0.85} radius={0.72} />
                    <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
                </EffectComposer>
            )}
        </Canvas>
    );
}

let rectLightsReady = false;

/** Real light sources matching the ceiling fixtures, so walls and floor are lit. */
function RoomLights({ color, level, castShadow }: { color: string; level: number; castShadow: boolean }) {
    if (!rectLightsReady && typeof window !== "undefined") {
        RectAreaLightUniformsLib.init();
        rectLightsReady = true;
    }
    return (
        <>
            <ambientLight intensity={0.06 * level} />
            <hemisphereLight args={[color, "#1a1a1a", 0.55 * level]} />
            <rectAreaLight
                position={[0, ROOM.height - 0.1, 0]}
                rotation-x={-Math.PI / 2}
                width={11}
                height={14}
                color={color}
                intensity={2.4 * level}
            />
            <spotLight
                position={[0, ROOM.height - 0.2, 0]}
                angle={0.9}
                penumbra={1}
                decay={1.4}
                intensity={18 * level}
                color={color}
                castShadow={castShadow}
                shadow-mapSize={[1024, 1024]}
                shadow-bias={-0.0001}
            />
        </>
    );
}

/* ------------------------------------------------------------------ */
/* Floor                                                               */
/* ------------------------------------------------------------------ */

let checkerCache: THREE.CanvasTexture | null = null;
function makeCheckerTexture() {
    if (checkerCache) return checkerCache;
    const size = 512;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const half = size / 2;
    ctx.fillStyle = "#d4d4d2";
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = "#141518";
    ctx.fillRect(half, 0, half, half);
    ctx.fillRect(0, half, half, half);
    // Hairline grout between tiles.
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, size, size);
    ctx.beginPath();
    ctx.moveTo(half, 0);
    ctx.lineTo(half, size);
    ctx.moveTo(0, half);
    ctx.lineTo(size, half);
    ctx.stroke();
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 16;
    checkerCache = texture;
    return texture;
}

const FLOOR_LOOKS: Record<
    FloorFinish["id"],
    { color: string; roughness: number; metalness: number; blur: [number, number]; mixStrength: number; tile?: number }
> = {
    // Deep, glossy and mirror-like.
    epoxy: { color: "#101115", roughness: 0.35, metalness: 0.6, blur: [180, 70], mixStrength: 22 },
    // Soft blurred reflections on warm grey.
    concrete: { color: "#8c8882", roughness: 0.75, metalness: 0.1, blur: [500, 220], mixStrength: 3, tile: 6 },
    // 60 cm tiles.
    checker: { color: "#b4b4b2", roughness: 0.45, metalness: 0.15, blur: [260, 110], mixStrength: 5, tile: 1.2 },
};

function GarageFloor({ finish, lowQuality }: { finish: FloorFinish["id"]; lowQuality: boolean }) {
    const narrow = useThree((state) => state.size.width < 768);
    const look = FLOOR_LOOKS[finish];
    const width = ROOM.halfWidth * 2;
    const depth = ROOM.halfDepth * 2;

    const map = useMemo(() => {
        if (typeof document === "undefined" || finish === "epoxy") return null;
        const texture = (finish === "checker" ? makeCheckerTexture() : makeConcreteTexture()).clone();
        texture.repeat.set(width / look.tile!, depth / look.tile!);
        texture.needsUpdate = true;
        return texture;
    }, [finish, width, depth, look.tile]);

    return (
        <mesh rotation-x={-Math.PI / 2} receiveShadow>
            <planeGeometry args={[width, depth]} />
            {lowQuality ? (
                <meshStandardMaterial color={look.color} map={map} roughness={look.roughness} metalness={look.metalness} />
            ) : (
                <MeshReflectorMaterial
                    key={finish}
                    map={map}
                    color={look.color}
                    blur={look.blur}
                    resolution={narrow ? 512 : 1024}
                    mixBlur={1}
                    mixStrength={look.mixStrength}
                    mixContrast={1}
                    roughness={look.roughness}
                    metalness={look.metalness}
                    depthScale={1.1}
                    minDepthThreshold={0.4}
                    maxDepthThreshold={1.3}
                    mirror={0}
                />
            )}
        </mesh>
    );
}

/* ------------------------------------------------------------------ */
/* Turntable + framing                                                 */
/* ------------------------------------------------------------------ */

/** Thin glowing ring on the floor, tinted with the current accent colour. */
function Turntable({ accent }: { accent: string }) {
    const ring = useRef<THREE.MeshBasicMaterial>(null);
    const target = useMemo(() => new THREE.Color(), []);

    useFrame((state, delta) => {
        if (!ring.current) return;
        target.set(accent).multiplyScalar(1.6);
        ring.current.color.lerp(target, 1 - Math.exp(-delta * 4));
        ring.current.opacity = 0.6 + Math.sin(state.clock.elapsedTime * 1.2) * 0.15;
    });

    return (
        <mesh position={[0, 0.006, 0]} rotation-x={-Math.PI / 2}>
            <ringGeometry args={[3.35, 3.39, 160]} />
            <meshBasicMaterial ref={ring} transparent toneMapped={false} />
        </mesh>
    );
}

/**
 * Shifts the rendered frame (not the orbit centre) so the car sits beside the
 * copy on wide screens and centres itself when the specs panel opens.
 */
function ViewOffset({ panelOpen }: { panelOpen: boolean }) {
    const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera;
    const size = useThree((state) => state.size);
    const current = useRef({ x: 0, y: 0 });

    useLayoutEffect(() => () => camera.clearViewOffset(), [camera]);

    useFrame((_, delta) => {
        const { width, height } = size;
        let x = 0;
        let y = 0;
        // Desktop and landscape tablets: car to the right of the copy.
        if (width >= 1024 || (width >= 700 && width / height > 1.2)) {
            // Positive x moves the car left, negative moves it right.
            x = panelOpen ? Math.min(220, width * 0.16) : -width * 0.14;
            y = -height * 0.02;
        } else {
            y = panelOpen ? height * 0.18 : -height * 0.02;
        }
        const t = 1 - Math.exp(-delta * 4);
        current.current.x = THREE.MathUtils.lerp(current.current.x, x, t);
        current.current.y = THREE.MathUtils.lerp(current.current.y, y, t);
        camera.setViewOffset(width, height, current.current.x, current.current.y, width, height);
    });

    return null;
}
