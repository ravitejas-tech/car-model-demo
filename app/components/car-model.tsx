import { ContactShadows, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";

export function CarModel() {
    const { scene } = useGLTF("/models/car.glb");
    const carRef = useRef<any>(null);

    useFrame((state) => {
        if (carRef.current) {
            carRef.current.rotation.y =
                Math.PI / 5 + state.clock.elapsedTime * 0.05;
            carRef.current.position.y =
                -0.8 + Math.sin(state.clock.elapsedTime * 0.5) * 0.02;
        }
    });

    return (
        <group position={[2.5, 2, 0]}>
            {" "}
            <primitive
                ref={carRef}
                object={scene}
                scale={0.015}
                rotation={[0, -Math.PI / 4, 0]}
            />
            <ContactShadows
                resolution={1024}
                scale={10}
                blur={1.5}
                opacity={0.5}
                far={1}
                color="#000000"
            />
        </group>
    );
}
