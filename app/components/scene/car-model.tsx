import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import type { Paint } from "~/lib/showroom";
import { paintScan, stage } from "~/lib/stage-state";
import { CarLights, useEngineMotion } from "./car-lights";

const MODEL_URL = "/models/car.glb";
/** Real-world length (metres) the model is scaled to. */
const TARGET_LENGTH = 4.66;

type CarModelProps = {
    paint: Paint;
    lowQuality: boolean;
    onReady?: () => void;
    children?: ReactNode;
};

export function CarModel({ paint, lowQuality, onReady, children }: CarModelProps) {
    const { scene } = useGLTF(MODEL_URL);
    const body = useRef<THREE.Group>(null);
    useEngineMotion(body);
    const paintMaterial = useRef<THREE.MeshPhysicalMaterial | null>(null);
    // Uniforms for the paint scanner: old colour behind the scan line, new ahead.
    const scan = useMemo(
        () => ({
            uPaintOld: { value: new THREE.Color(paint.color) },
            uPaintNew: { value: new THREE.Color(paint.color) },
            uScanZ: { value: -100 },
            uScanGlow: { value: new THREE.Color(paint.accent) },
            uScanStrength: { value: 0 },
        }),
        // Initial values only; paint changes are handled below.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        []
    );

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
                // The source model tiles a noise normal map over the body, which
                // reads as a spotty pattern up close. Smooth clearcoat instead.
                physical.normalMap = null;
                physical.clearcoat = 1;
                physical.clearcoatRoughness = 0.03;
                physical.envMapIntensity = 1.7;
                installPaintScanner(physical, scan);
                physical.needsUpdate = true;
                paintMaterial.current = physical;
            } else if (material.name === "chrome") {
                material.envMapIntensity = 1.6;
            }
        });
    }, [scene, scan]);

    // New paint: whatever is on the car now becomes the "old" side of the scan.
    const firstPaint = useRef(true);
    useEffect(() => {
        if (firstPaint.current) {
            firstPaint.current = false;
            return;
        }
        const midScan = scan.uScanZ.value > -50;
        if (!midScan || scan.uScanZ.value < 0) scan.uPaintOld.value.copy(scan.uPaintNew.value);
        scan.uPaintNew.value.set(paint.color);
        scan.uScanGlow.value.set(paint.accent);
    }, [paint, scan]);

    useEffect(() => {
        onReady?.();
    }, [onReady]);

    useFrame(({ clock }, delta) => {
        const material = paintMaterial.current;
        if (!material) return;
        const s = paintScan(clock.elapsedTime - stage.paintPulse);
        scan.uScanZ.value = s.z;
        scan.uScanStrength.value = s.strength * 2.4;
        if (!s.active) scan.uPaintOld.value.copy(scan.uPaintNew.value);
        // Finish (metallic flake, gloss) eases over as the scan passes.
        const t = 1 - Math.exp(-delta * 3);
        material.metalness = THREE.MathUtils.lerp(material.metalness, paint.metalness, t);
        material.roughness = THREE.MathUtils.lerp(material.roughness, paint.roughness, t);
    });

    return (
        <group ref={body}>
            <group scale={scale}>
                <group position={offset}>
                    <primitive object={scene} />
                    <CarLights scene={scene} lowQuality={lowQuality} />
                </group>
            </group>
            {children}
        </group>
    );
}

type ScanUniforms = {
    uPaintOld: { value: THREE.Color };
    uPaintNew: { value: THREE.Color };
    uScanZ: { value: number };
    uScanGlow: { value: THREE.Color };
    uScanStrength: { value: number };
};

/**
 * Patches the paint shader: the body colour is split at a world-space Z plane
 * (old paint behind it, new paint ahead) and the seam glows in the accent
 * colour, so a paint change reads as a scanner repainting the car.
 */
function installPaintScanner(material: THREE.MeshPhysicalMaterial, uniforms: ScanUniforms) {
    material.onBeforeCompile = (shader) => {
        Object.assign(shader.uniforms, uniforms);
        shader.vertexShader = shader.vertexShader
            .replace("#include <common>", "#include <common>\nvarying vec3 vScanWorld;")
            .replace(
                "#include <project_vertex>",
                "#include <project_vertex>\nvScanWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;"
            );
        shader.fragmentShader = shader.fragmentShader
            .replace(
                "#include <common>",
                `#include <common>
                varying vec3 vScanWorld;
                uniform vec3 uPaintOld;
                uniform vec3 uPaintNew;
                uniform float uScanZ;
                uniform vec3 uScanGlow;
                uniform float uScanStrength;`
            )
            .replace(
                "#include <color_fragment>",
                `#include <color_fragment>
                float scanEdge = vScanWorld.z - uScanZ;
                diffuseColor.rgb = mix(uPaintOld, uPaintNew, smoothstep(-0.012, 0.012, scanEdge));`
            )
            .replace(
                "#include <emissivemap_fragment>",
                `#include <emissivemap_fragment>
                totalEmissiveRadiance += uScanGlow * uScanStrength * (exp(-abs(scanEdge) * 42.0) + 0.18 * exp(-abs(scanEdge) * 5.0));`
            );
    };
    material.customProgramCacheKey = () => "velocity-paint-scanner";
}

useGLTF.preload(MODEL_URL);
