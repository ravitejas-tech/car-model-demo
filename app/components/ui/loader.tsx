import { useProgress } from "@react-three/drei";
import { useEffect, useState } from "react";

/** Full-screen loader that tracks the GLB download and fades away once ready. */
export function Loader({ ready }: { ready: boolean }) {
    const { progress } = useProgress();
    const [displayed, setDisplayed] = useState(0);
    const [gone, setGone] = useState(false);

    // Never let the bar move backwards (drei reports per-file progress);
    // the CSS transition on width smooths out the jumps.
    useEffect(() => {
        setDisplayed((value) => Math.max(value, progress));
    }, [progress]);

    useEffect(() => {
        if (!ready) return;
        const id = setTimeout(() => setGone(true), 1300);
        return () => clearTimeout(id);
    }, [ready]);

    if (gone) return null;
    const percent = ready ? 100 : Math.round(displayed);

    return (
        <div
            className={`fixed inset-0 z-50 grid place-items-center bg-black transition-opacity duration-[1200ms] ${
                ready ? "pointer-events-none opacity-0" : "opacity-100"
            }`}
            role="status"
            aria-live="polite"
        >
            <div className="flex w-56 flex-col items-center gap-5">
                <div className="font-display text-[11px] tracking-[0.7em] text-white/70">VELOCITY</div>
                <div className="h-px w-full overflow-hidden bg-white/[0.08]">
                    <div className="h-full bg-white/70 transition-[width] duration-500 ease-out" style={{ width: `${percent}%` }} />
                </div>
                <div className="font-mono text-[9px] tabular-nums tracking-[0.4em] text-white/35">{String(percent).padStart(3, "0")}</div>
            </div>
        </div>
    );
}
