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
import { engine, clock as engineClock, TIMELINE } from "~/lib/experience";
import { flicker, INTRO, introTime, ramp, stage } from "~/lib/stage-state";
import { CameraRig } from "./camera-rig";
import { CarModel } from "./car-model";
import { Dust, LightCone, PaintScanner, PowerDirector, StageRing } from "./effects";
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
    engineOn: boolean;
    /** The visitor has pressed start: bring the garage up. */
    entered: boolean;
    /** Camera is directed (entry sequence) rather than user-controlled. */
    directed: boolean;
    rotateSpeed?: number;
    onReady: () => void;
    onUserInteract: () => void;
};

export function ShowroomStage(props: ShowroomStageProps) {
    // ?quality=low (or a GPU that can't keep up, detected after the entry)
    // gets a plain floor and no bloom. Shadows and resolution never change at
    // runtime: toggling them rebuilds every shader, which flashes the screen black.
    const [forcedLow] = useState(
        () => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("quality") === "low"
    );
    const [slowGpu, setSlowGpu] = useState(false);
    const lowQuality = forcedLow || slowGpu;
    const { garage, paint, lightLevel } = props;
    const fixtureColor = garage.lightColor === "accent" ? paint.accent : garage.lightColor;

    return (
        <Canvas
            className="!absolute inset-0"
            dpr={forcedLow ? 1 : [1, 1.75]}
            shadows={!forcedLow}
            gl={{ antialias: true, powerPreference: "high-performance" }}
            camera={{ position: [7.5, 3, 8], fov: 32, near: 0.1, far: 80 }}
        >
            {/* Only judge performance once the entry has settled, never during it. */}
            {!props.directed && !lowQuality && <PerformanceMonitor ms={400} iterations={12} bounds={() => [24, 90]} flipflops={2} onFallback={() => setSlowGpu(true)} />}
            <Prewarm ready={props.ready} />
            <color attach="background" args={[garage.background]} />
            {/* Distant walls melt into darkness; the lit bay stays crisp. */}
            <fog attach="fog" args={[garage.background, 11, 28]} />

            <PowerDirector ready={props.ready} entered={props.entered} live={!props.directed} engineOn={props.engineOn} themeKey={garage.id} paintKey={paint.id} />
            <EnvironmentLevel level={lightLevel} />
            <ViewOffset panelOpen={props.panelOpen} />
            <CameraRig
                shot={props.shot}
                ready={props.ready}
                autoRotate={props.autoRotate}
                rotateSpeed={props.rotateSpeed}
                interactive={!props.directed}
                onUserInteract={props.onUserInteract}
            />

            <RoomLights color={fixtureColor} accent={paint.accent} level={lightLevel} castShadow={!lowQuality} />

            <GarageRoom theme={garage} accent={paint.accent} lightLevel={lightLevel} variant="scene" />
            <GarageFloor finish={props.floor} lowQuality={lowQuality} />
            <StageRing accent={paint.accent} />
            <PaintScanner accent={paint.accent} />

            {/* A visible shaft of light over the car, with dust drifting through it. */}
            <LightCone
                color={fixtureColor}
                opacity={0.075 * lightLevel}
                length={ROOM.height - 0.1}
                radius={3.1}
                falloff={1.1}
                position={[0, ROOM.height - 0.1, 0]}
                target={[0, 0, 0]}
                level={() => stage.room}
                // The shaft of light pours down from the ceiling onto the car.
                reach={(elapsed) => ramp(introTime(elapsed), INTRO.keyLight - 0.15, 0.9)}
            />
            <Dust color={fixtureColor} />

            <Suspense fallback={null}>
                <CarModel paint={paint} lowQuality={lowQuality} onReady={props.onReady} />
                {/* The car never moves, so the soft shadow is baked once. */}
                <ContactShadows position={[0, 0.005, 0]} scale={9} blur={2.2} far={2} opacity={0.85} resolution={512} frames={1} />
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
            >
                <group position={[0, -1, 0]}>
                    <GarageRoom theme={garage} accent={paint.accent} lightLevel={1} variant="environment" />
                    <mesh rotation-x={-Math.PI / 2}>
                        <planeGeometry args={[ROOM.halfWidth * 2, ROOM.halfDepth * 2]} />
                        <meshBasicMaterial color={props.floor === "concrete" ? "#1e1c1a" : props.floor === "checker" ? "#262628" : "#060708"} />
                    </mesh>
                </group>
            </Environment>

            {!lowQuality && (
                <EffectComposer multisampling={4}>
                    <Bloom mipmapBlur luminanceThreshold={0.95} luminanceSmoothing={0.3} intensity={0.55} radius={0.7} />
                    <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
                </EffectComposer>
            )}
        </Canvas>
    );
}

let rectLightsReady = false;

/** Reflections fade up with the room during the intro. */
function EnvironmentLevel({ level }: { level: number }) {
    const scene = useThree((state) => state.scene);
    useFrame(() => {
        scene.environmentIntensity = (0.3 + 0.7 * level) * (0.04 + 0.96 * stage.room);
    });
    return null;
}

/**
 * Low-key lighting: a pool of light on the car, a faint fill, and rim lights
 * in the paint's accent colour so the body's silhouette glows against the dark.
 * Every light follows the intro timeline: rim first, then the ceiling.
 */
function RoomLights({ color, accent, level, castShadow }: { color: string; accent: string; level: number; castShadow: boolean }) {
    if (!rectLightsReady && typeof window !== "undefined") {
        RectAreaLightUniformsLib.init();
        rectLightsReady = true;
    }
    const ambient = useRef<THREE.AmbientLight>(null);
    const hemi = useRef<THREE.HemisphereLight>(null);
    const area = useRef<THREE.RectAreaLight>(null);
    const rim = useRef<THREE.SpotLight>(null);
    const key = useRef<THREE.SpotLight>(null);
    const edge = useRef<THREE.SpotLight>(null);
    const rimTarget = useMemo(() => new THREE.Object3D(), []);

    useFrame(({ clock }) => {
        const now = clock.elapsedTime;
        const t = introTime(now);
        const fixtures = stage.fixturesStart < 0 ? 0 : flicker(now - stage.fixturesStart);
        const room = stage.room;
        if (ambient.current) ambient.current.intensity = 0.02 * level * room;
        if (hemi.current) hemi.current.intensity = 0.08 * level * room;
        if (area.current) area.current.intensity = 1.5 * level * fixtures;
        if (key.current) key.current.intensity = 26 * level * fixtures * (0.25 + 0.75 * room);
        // Before entry the rim light alone outlines the car; it firms up with the room.
        const gate = stage.gateStart < 0 ? 0 : ramp(now - stage.gateStart, 0, 2.4) * 0.8;
        if (rim.current) rim.current.intensity = 10 * level * Math.max(gate, ramp(t, INTRO.rim, 0.9));
        if (edge.current) edge.current.intensity = 6 * gate * (1 - room);
    });

    return (
        <>
            <ambientLight ref={ambient} intensity={0} />
            <hemisphereLight ref={hemi} args={[color, "#000000", 0]} />
            <rectAreaLight
                ref={area}
                position={[0, ROOM.height - 0.1, 0]}
                rotation-x={-Math.PI / 2}
                width={6}
                height={8.5}
                color={color}
                intensity={0}
            />
            {/* Accent rim light from behind, aimed at the body so it doesn't pool on the floor. */}
            <primitive object={rimTarget} position={[-0.2, 0.7, -0.3]} />
            {/* Steep enough that the part of the beam that misses the car lands underneath it. */}
            <spotLight ref={rim} target={rimTarget} position={[-5, 4, -7]} angle={0.28} penumbra={1} decay={1.2} distance={10.5} intensity={0} color={accent} />
            {/* Cool top-edge light for the waiting silhouette; fades as the room comes up. */}
            <spotLight ref={edge} target={rimTarget} position={[4.5, 4, -5]} angle={0.3} penumbra={1} decay={1.2} distance={9.5} intensity={0} color="#cfd8ff" />
            <spotLight
                ref={key}
                position={[0, ROOM.height - 0.2, 0]}
                angle={0.62}
                penumbra={0.9}
                decay={1.2}
                intensity={0}
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
    ctx.fillStyle = "#7a7a78";
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = "#0e0f11";
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
    epoxy: { color: "#08090b", roughness: 0.3, metalness: 0.6, blur: [180, 70], mixStrength: 18 },
    // Soft blurred reflections on warm grey.
    concrete: { color: "#4a4743", roughness: 0.75, metalness: 0.1, blur: [500, 220], mixStrength: 2.5, tile: 6 },
    // 60 cm tiles.
    checker: { color: "#8a8a8a", roughness: 0.4, metalness: 0.2, blur: [260, 110], mixStrength: 5, tile: 1.2 },
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

/**
 * Shifts the rendered frame (not the orbit centre) so the car sits beside the
 * copy on wide screens and centres itself when the specs panel opens.
 */
function ViewOffset({ panelOpen }: { panelOpen: boolean }) {
    const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera;
    const size = useThree((state) => state.size);
    const current = useRef({ x: 0, y: 0 });
    const reducedMotion = useRef(false);

    useLayoutEffect(() => {
        reducedMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        return () => camera.clearViewOffset();
    }, [camera]);

    useFrame((_, delta) => {
        const { width, height } = size;
        let x = 0;
        let y = 0;
        if (width >= 1024) {
            // Car centred; slide it left only when the specs panel is open.
            // A slight lift keeps it clear of the controls along the bottom.
            x = panelOpen ? Math.min(240, width * 0.15) : 0;
            y = height * 0.04;
        } else if (width >= 700 && width / height > 1.2) {
            x = 0;
            y = 0;
        } else {
            y = panelOpen ? height * 0.18 : -height * 0.02;
        }
        const t = 1 - Math.exp(-delta * 4);
        current.current.x = THREE.MathUtils.lerp(current.current.x, x, t);
        current.current.y = THREE.MathUtils.lerp(current.current.y, y, t);
        // One short jolt as the engine catches: nothing before, nothing after.
        let shake = 0;
        const e = engine.get();
        const since = engineClock() - e.startedAt - TIMELINE.catch;
        if (!reducedMotion.current && e.phase === "running" && since >= 0 && since < 0.35) {
            shake = 3.5 * (1 - since / 0.35);
        }
        const jx = (Math.random() - 0.5) * shake;
        const jy = (Math.random() - 0.5) * shake;
        camera.setViewOffset(width, height, current.current.x + jx, current.current.y + jy, width, height);
    });

    return null;
}

/**
 * Compile every shader up front, while the visitor is looking at the gate, so
 * nothing stalls the first time it lights up during the entry.
 */
function Prewarm({ ready }: { ready: boolean }) {
    const gl = useThree((state) => state.gl);
    const scene = useThree((state) => state.scene);
    const camera = useThree((state) => state.camera);
    const done = useRef(false);
    useFrame(() => {
        if (!ready || done.current) return;
        done.current = true;
        // compileAsync lets the driver build programs in parallel where supported.
        void gl.compileAsync(scene, camera).catch(() => gl.compile(scene, camera));
    });
    return null;
}
