import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { Paint } from "~/lib/showroom";

const MODEL_URL = "/models/car.glb";
/** Real-world length (metres) the model is scaled to. */
const TARGET_LENGTH = 4.66;

type CarModelProps = {
    paint: Paint;
    onReady?: () => void;
};

export function CarModel({ paint, onReady }: CarModelProps) {
    const { scene } = useGLTF(MODEL_URL);
    const paintMaterial = useRef<THREE.MeshPhysicalMaterial | null>(null);
    const targetColor = useMemo(() => new THREE.Color(), []);

    // Fit the model to a real-world size and sit it on the floor.
    const { scale, offset } = useMemo(() => {
        const box = new THREE.Box3().setFromObject(scene);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        return {
            scale: TARGET_LENGTH / Math.max(size.z, size.x),
            offset: [-center.x, -box.min.y, -center.z] as [number, number, number],
        };
    }, [scene]);

    useLayoutEffect(() => {
        scene.traverse((object) => {
            const mesh = object as THREE.Mesh;
            if (!mesh.isMesh) return;
            mesh.castShadow = true;
            const material = mesh.material as THREE.MeshStandardMaterial;
            if (material.name === "carpaint") {
                const physical = material as THREE.MeshPhysicalMaterial;
                physical.clearcoat = 1;
                physical.clearcoatRoughness = 0.04;
                physical.envMapIntensity = 1.4;
                paintMaterial.current = physical;
            } else if (material.name === "chrome") {
                material.envMapIntensity = 1.6;
            }
        });
    }, [scene]);

    useEffect(() => {
        onReady?.();
    }, [onReady]);

    // Ease the paint towards the selected colour instead of snapping.
    useFrame((_, delta) => {
        const material = paintMaterial.current;
        if (!material) return;
        const t = 1 - Math.exp(-delta * 5);
        targetColor.set(paint.color);
        material.color.lerp(targetColor, t);
        material.metalness = THREE.MathUtils.lerp(material.metalness, paint.metalness, t);
        material.roughness = THREE.MathUtils.lerp(material.roughness, paint.roughness, t);
    });

    return (
        <group scale={scale}>
            <group position={offset}>
                <primitive object={scene} />
            </group>
        </group>
    );
}

useGLTF.preload(MODEL_URL);
