import { CameraControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import type { CameraShot } from "~/lib/showroom";

type CameraRigProps = {
    shot: CameraShot;
    ready: boolean;
    autoRotate: boolean;
    onUserInteract: () => void;
};

/** Seconds of inactivity before auto-rotate resumes after the user lets go. */
const IDLE_DELAY = 2.5;

export function CameraRig({ shot, ready, autoRotate, onUserInteract }: CameraRigProps) {
    const controls = useRef<CameraControls>(null);
    const aspect = useThree((state) => state.size.width / state.size.height);
    const dragging = useRef(false);
    const idleFor = useRef(0);
    const introDone = useRef(false);

    // Portrait screens need the camera further back to fit the whole car.
    const distanceScale = aspect < 1.1 ? Math.min(2.3, Math.max(1.3, 0.95 / aspect)) : 1;

    useEffect(() => {
        const ctl = controls.current;
        if (!ctl || !ready) return;
        const [tx, ty, tz] = shot.target;
        const px = tx + (shot.position[0] - tx) * distanceScale;
        const py = ty + (shot.position[1] - ty) * distanceScale;
        const pz = tz + (shot.position[2] - tz) * distanceScale;
        // Slow, cinematic fly-in on first load, snappier transitions afterwards.
        ctl.smoothTime = introDone.current ? 0.55 : 1.4;
        introDone.current = true;
        idleFor.current = 0;
        ctl.setLookAt(px, py, pz, tx, ty, tz, true);
    }, [shot, ready, distanceScale]);

    useFrame((_, delta) => {
        const ctl = controls.current;
        if (!ctl || !ready) return;
        if (dragging.current) return;
        idleFor.current += delta;
        if (autoRotate && idleFor.current > IDLE_DELAY) {
            // Ease in the rotation speed so it never starts with a jolt.
            const ramp = Math.min(1, (idleFor.current - IDLE_DELAY) / 1.5);
            ctl.azimuthAngle += delta * 0.14 * ramp;
        }
    });

    return (
        <CameraControls
            ref={controls}
            makeDefault
            minDistance={3.2}
            maxDistance={14 * distanceScale}
            minPolarAngle={0.2}
            maxPolarAngle={Math.PI / 2 - 0.06}
            dollySpeed={0.4}
            truckSpeed={0}
            onStart={() => {
                dragging.current = true;
                onUserInteract();
            }}
            onEnd={() => {
                dragging.current = false;
                idleFor.current = 0;
            }}
        />
    );
}
