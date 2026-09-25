import { CameraControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { ROOM } from "~/lib/garage";
import type { CameraShot } from "~/lib/showroom";

type CameraRigProps = {
    shot: CameraShot;
    ready: boolean;
    autoRotate: boolean;
    onUserInteract: () => void;
};

/** Seconds of inactivity before auto-rotate resumes after the user lets go. */
const IDLE_DELAY = 2.5;
const DESKTOP_FOV = 32;
/** Keep the camera this far below the ceiling and in from the walls. */
const CEILING_MARGIN = 0.5;
const WALL_MARGIN = 1.2;

export function CameraRig({ shot, ready, autoRotate, onUserInteract }: CameraRigProps) {
    const controls = useRef<CameraControls>(null);
    const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera;
    const aspect = useThree((state) => state.size.width / state.size.height);
    const dragging = useRef(false);
    const idleFor = useRef(0);
    const introDone = useRef(false);

    // Portrait screens: step back a little and widen the lens, rather than
    // backing the camera through the garage wall.
    const portrait = aspect < 1;
    const distanceScale = portrait ? 1.25 : 1;

    useEffect(() => {
        const fov = portrait
            ? Math.min(66, THREE.MathUtils.radToDeg(2 * Math.atan(0.33 / (distanceScale * aspect))))
            : DESKTOP_FOV;
        camera.fov = Math.max(DESKTOP_FOV, fov);
        camera.updateProjectionMatrix();
    }, [camera, aspect, portrait, distanceScale]);

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
        ctl.setLookAt(px, Math.min(py, ROOM.height - CEILING_MARGIN), pz, tx, ty, tz, true);
    }, [shot, ready, distanceScale]);

    useFrame((_, delta) => {
        const ctl = controls.current;
        if (!ctl || !ready) return;

        // Stay inside the garage: the allowed distance shrinks as the camera
        // looks down from higher up (ceiling) or out towards a wall.
        const target = ctl.getTarget(new THREE.Vector3());
        const polar = ctl.polarAngle;
        const up = Math.cos(polar);
        const out = Math.sin(polar);
        const byCeiling = up > 0.01 ? (ROOM.height - CEILING_MARGIN - target.y) / up : Infinity;
        const byWall = out > 0.01 ? (Math.min(ROOM.halfWidth, ROOM.halfDepth) - WALL_MARGIN) / out : Infinity;
        // Feeding this into maxDistance (instead of dollying directly) lets it
        // cooperate with animated view transitions.
        ctl.maxDistance = Math.max(ctl.minDistance, Math.min(12, byCeiling, byWall));

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
            minPolarAngle={0.55}
            maxPolarAngle={Math.PI / 2 + 0.04}
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
