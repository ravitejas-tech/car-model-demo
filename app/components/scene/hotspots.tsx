import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { HOTSPOTS, type Hotspot } from "~/lib/showroom";

type HotspotsProps = {
    visible: boolean;
    activeId: string | null;
    onSelect: (hotspot: Hotspot) => void;
};

export function Hotspots({ visible, activeId, onSelect }: HotspotsProps) {
    return (
        <>
            {HOTSPOTS.map((hotspot, index) => (
                <HotspotMarker
                    key={hotspot.id}
                    hotspot={hotspot}
                    index={index}
                    visible={visible}
                    active={activeId === hotspot.id}
                    onSelect={onSelect}
                />
            ))}
        </>
    );
}

type MarkerProps = {
    hotspot: Hotspot;
    index: number;
    visible: boolean;
    active: boolean;
    onSelect: (hotspot: Hotspot) => void;
};

const worldPosition = new THREE.Vector3();
const toCamera = new THREE.Vector3();

function HotspotMarker({ hotspot, index, visible, active, onSelect }: MarkerProps) {
    const anchor = useRef<THREE.Group>(null);
    const element = useRef<HTMLDivElement>(null);
    const normal = useMemo(() => new THREE.Vector3(...hotspot.normal).normalize(), [hotspot.normal]);

    // Fade markers that are on the far side of the car instead of raycasting
    // against ~600k triangles every frame.
    useFrame(({ camera }) => {
        if (!anchor.current || !element.current) return;
        anchor.current.getWorldPosition(worldPosition);
        toCamera.copy(camera.position).sub(worldPosition).normalize();
        const facing = THREE.MathUtils.smoothstep(toCamera.dot(normal), -0.1, 0.3);
        const opacity = visible ? facing : 0;
        element.current.style.opacity = opacity.toFixed(3);
        element.current.style.pointerEvents = opacity > 0.4 ? "auto" : "none";
    });

    return (
        <group ref={anchor} position={hotspot.anchor}>
            <Html center zIndexRange={[30, 0]} style={{ pointerEvents: "none" }}>
                <div ref={element} className="transition-opacity duration-300" style={{ opacity: 0 }}>
                    <button
                        type="button"
                        onClick={() => onSelect(hotspot)}
                        aria-label={`Show ${hotspot.title}`}
                        aria-pressed={active}
                        className="hotspot group relative grid size-9 place-items-center rounded-full"
                        style={{ animationDelay: `${index * 0.4}s` }}
                    >
                        <span
                            className={`absolute inset-0 rounded-full border backdrop-blur-md transition-all duration-300 ${
                                active
                                    ? "border-accent bg-accent/30 scale-110"
                                    : "border-white/40 bg-black/30 group-hover:border-accent group-hover:bg-accent/20"
                            }`}
                        />
                        <span className="hotspot-dot relative size-2.5 rounded-full bg-accent shadow-[0_0_12px_var(--accent)]" />
                        <span className="pointer-events-none absolute left-11 whitespace-nowrap rounded-full bg-black/60 px-3 py-1 text-[11px] font-medium tracking-wide text-white opacity-0 backdrop-blur-md transition-opacity duration-200 group-hover:opacity-100">
                            {hotspot.title}
                        </span>
                    </button>
                </div>
            </Html>
        </group>
    );
}
