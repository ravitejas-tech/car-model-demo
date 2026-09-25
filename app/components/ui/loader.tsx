import { useProgress } from "@react-three/drei";
import { useEffect, useState } from "react";
import { LogoMark } from "./icons";

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
        const id = setTimeout(() => setGone(true), 900);
        return () => clearTimeout(id);
    }, [ready]);

    if (gone) return null;
    const percent = ready ? 100 : Math.round(displayed);

    return (
        <div
            className={`fixed inset-0 z-50 grid place-items-center bg-[#08090b] transition-opacity duration-700 ${
                ready ? "pointer-events-none opacity-0" : "opacity-100"
            }`}
            role="status"
            aria-live="polite"
        >
            <div className="flex w-64 flex-col items-center gap-6">
                <LogoMark className="size-12 animate-pulse" />
                <div className="font-display text-sm tracking-[0.5em] text-white/80">VELOCITY</div>
                <div className="h-px w-full overflow-hidden bg-white/10">
                    <div
                        className="h-full bg-accent shadow-[0_0_12px_var(--accent)] transition-[width] duration-300"
                        style={{ width: `${percent}%` }}
                    />
                </div>
                <div className="flex w-full justify-between text-[10px] uppercase tracking-[0.3em] text-white/40">
                    <span>Preparing showroom</span>
                    <span className="tabular-nums text-white/70">{percent}%</span>
                </div>
            </div>
        </div>
    );
}
