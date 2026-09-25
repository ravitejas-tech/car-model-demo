import {
    ContactShadows,
    Environment,
    Lightformer,
    MeshReflectorMaterial,
    PerformanceMonitor,
} from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { CameraShot, Hotspot, Paint } from "~/lib/showroom";
import { CameraRig } from "./camera-rig";
import { CarModel } from "./car-model";
import { Hotspots } from "./hotspots";

const BACKGROUND = "#08090b";

type ShowroomStageProps = {
    paint: Paint;
    shot: CameraShot;
    ready: boolean;
    autoRotate: boolean;
    showHotspots: boolean;
    activeHotspot: string | null;
    panelOpen: boolean;
    onReady: () => void;
    onUserInteract: () => void;
    onHotspotSelect: (hotspot: Hotspot) => void;
};

export function ShowroomStage(props: ShowroomStageProps) {
    const [dpr, setDpr] = useState(1.5);
    // Weak GPUs (or ?quality=low) get a plain floor and no real-time shadows.
    const [lowQuality, setLowQuality] = useState(
        () => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("quality") === "low"
    );

    return (
        <Canvas
            className="!absolute inset-0"
            dpr={lowQuality ? 1 : dpr}
            shadows={!lowQuality}
            gl={{ antialias: true, powerPreference: "high-performance" }}
            camera={{ position: [10, 4.5, 12], fov: 32, near: 0.1, far: 80 }}
        >
            <PerformanceMonitor
                onIncline={() => setDpr(2)}
                onDecline={() => setDpr(1)}
                flipflops={3}
                onFallback={() => setLowQuality(true)}
            />
            <color attach="background" args={[BACKGROUND]} />
            <fog attach="fog" args={[BACKGROUND, 11, 26]} />

            <ViewOffset panelOpen={props.panelOpen} />
            <CameraRig
                shot={props.shot}
                ready={props.ready}
                autoRotate={props.autoRotate}
                onUserInteract={props.onUserInteract}
            />

            <ambientLight intensity={0.15} />
            <spotLight
                position={[0, 9, 0]}
                angle={0.55}
                penumbra={1}
                intensity={40}
                castShadow={!lowQuality}
                shadow-mapSize={[1024, 1024]}
                shadow-bias={-0.0001}
            />

            <Suspense fallback={null}>
                <CarModel paint={props.paint} onReady={props.onReady}>
                    <Hotspots
                        visible={props.ready && props.showHotspots}
                        activeId={props.activeHotspot}
                        onSelect={props.onHotspotSelect}
                    />
                </CarModel>
                <StudioLighting accent={props.paint.accent} />
                {/* The car never moves, so the soft shadow is baked once. */}
                <ContactShadows position={[0, 0.005, 0]} scale={9} blur={2.2} far={2} opacity={0.75} resolution={512} frames={1} />
            </Suspense>

            <Turntable accent={props.paint.accent} />
            <ShowroomFloor lowQuality={lowQuality} />
        </Canvas>
    );
}

/** A virtual photo studio: soft boxes and light strips that the paint reflects. */
function StudioLighting({ accent }: { accent: string }) {
    return (
        // Keyed by accent: the environment map is baked once per paint change
        // rather than re-rendered every frame.
        <Environment key={accent} resolution={512} frames={1} background={false}>
            <color attach="background" args={["#050505"]} />
            {/* Overhead soft box */}
            <Lightformer form="rect" intensity={2.2} position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[8, 4, 1]} />
            {/* Long strips that draw clean lines along the body */}
            {[-6, -2, 2, 6].map((z) => (
                <Lightformer key={z} form="rect" intensity={3} position={[z, 4, -3]} rotation-x={Math.PI / 2} scale={[0.6, 12, 1]} />
            ))}
            <Lightformer form="rect" intensity={4} position={[-8, 1.5, 0]} rotation-y={Math.PI / 2} scale={[18, 1.2, 1]} />
            <Lightformer form="rect" intensity={2.5} position={[8, 1.5, 0]} rotation-y={-Math.PI / 2} scale={[18, 1.2, 1]} />
            {/* Coloured rim light that follows the selected paint */}
            <Lightformer form="ring" color={accent} intensity={6} position={[-6, 3, -8]} scale={4} onUpdate={(self) => self.lookAt(0, 0, 0)} />
        </Environment>
    );
}

function ShowroomFloor({ lowQuality }: { lowQuality: boolean }) {
    const lowEnd = useThree((state) => state.size.width < 768);
    if (lowQuality) {
        return (
            <mesh rotation-x={-Math.PI / 2}>
                <planeGeometry args={[60, 60]} />
                <meshStandardMaterial color="#060708" metalness={0} roughness={1} />
            </mesh>
        );
    }
    return (
        <mesh rotation-x={-Math.PI / 2} receiveShadow>
            <planeGeometry args={[60, 60]} />
            <MeshReflectorMaterial
                blur={[400, 120]}
                resolution={lowEnd ? 512 : 1024}
                mixBlur={1}
                mixStrength={12}
                roughness={0.9}
                depthScale={1.1}
                minDepthThreshold={0.4}
                maxDepthThreshold={1.3}
                color="#0d0e11"
                metalness={0.6}
                mirror={0}
            />
        </mesh>
    );
}

/** Thin glowing ring on the floor, tinted with the current accent colour. */
function Turntable({ accent }: { accent: string }) {
    const ring = useRef<THREE.MeshBasicMaterial>(null);
    const glow = useRef<THREE.MeshBasicMaterial>(null);
    const target = useMemo(() => new THREE.Color(), []);

    useFrame((state, delta) => {
        target.set(accent);
        const t = 1 - Math.exp(-delta * 4);
        ring.current?.color.lerp(target, t);
        glow.current?.color.lerp(target, t);
        if (ring.current) ring.current.opacity = 0.55 + Math.sin(state.clock.elapsedTime * 1.2) * 0.12;
    });

    return (
        <group position={[0, 0.004, 0]} rotation-x={-Math.PI / 2}>
            <mesh>
                <ringGeometry args={[3.35, 3.38, 128]} />
                <meshBasicMaterial ref={ring} transparent toneMapped={false} />
            </mesh>
            <mesh>
                <ringGeometry args={[3.2, 3.6, 128]} />
                <meshBasicMaterial ref={glow} transparent opacity={0.07} toneMapped={false} depthWrite={false} />
            </mesh>
        </group>
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

    useFrame((_, delta) => {
        const { width, height } = size;
        let x = 0;
        let y = 0;
        if (width >= 1024) {
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
