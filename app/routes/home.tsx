import { Environment, PerspectiveCamera } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { CarModel, Header, HeroOverlay } from "~/components";

export default function () {
    return (
        <div className="relative w-full h-screen bg-zinc-950 overflow-hidden font-[Inter] selection:bg-[#D4AF37] selection:text-black">
            <Header />
            <HeroOverlay />

            <Canvas className="absolute inset-0" shadows>
                <PerspectiveCamera makeDefault position={[0, 2, 10]} fov={45} />
                <ambientLight intensity={0.3} />
                <spotLight
                    position={[10, 10, 10]}
                    angle={0.5}
                    penumbra={1}
                    intensity={2}
                    castShadow
                    color="#ffffff"
                />
                <spotLight
                    position={[-10, 5, -5]}
                    angle={0.5}
                    penumbra={1}
                    intensity={1.5}
                    color="#D4AF37"
                />

                <Suspense fallback={null}>
                    <CarModel />
                    <Environment preset="city" blur={1} background={false} />
                </Suspense>
            </Canvas>
        </div>
    );
}
