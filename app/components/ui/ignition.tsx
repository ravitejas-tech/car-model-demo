import { useEffect, useRef } from "react";
import { rpmNow } from "~/lib/experience";

type IgnitionProps = {
    on: boolean;
    onToggle: () => void;
    /** Throttle blip; offered once the engine is running. */
    onRev?: () => void;
    size?: "lg" | "sm";
};

/** Rev-counter geometry: a 270° arc from 0 to 8 ×1000 r/min. */
const R = 54;
const SWEEP = 270;
const START_ANGLE = 135;
const MAX_RPM = 8;
const ARC = (2 * Math.PI * R * SWEEP) / 360;

function polar(angleDeg: number, radius: number) {
    const a = (angleDeg * Math.PI) / 180;
    return [60 + radius * Math.cos(a), 60 + radius * Math.sin(a)];
}

/**
 * Push-to-start button wrapped in a live rev counter. The needle follows the
 * same rpm curve as the engine sound: crank, catch, rev, settle, blips.
 */
export function IgnitionButton({ on, onToggle, onRev, size = "lg" }: IgnitionProps) {
    const arcs = useRef<SVGCircleElement[]>([]);
    const readout = useRef<HTMLSpanElement>(null);
    const needle = useRef(0);

    useEffect(() => {
        let frame = 0;
        let last = performance.now();
        const tick = (now: number) => {
            const dt = Math.min(0.05, (now - last) / 1000);
            last = now;
            const target = rpmNow() / 1000;
            // A real needle has a little inertia.
            needle.current += (target - needle.current) * (1 - Math.exp(-dt * 18));
            const fraction = Math.min(1, needle.current / MAX_RPM);
            arcs.current.forEach((el) => el && (el.style.strokeDashoffset = String(ARC * (1 - fraction))));
            if (readout.current) readout.current.textContent = Math.max(0, needle.current).toFixed(1);
            frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, []);

    const ticks = Array.from({ length: MAX_RPM * 2 + 1 }, (_, i) => i / 2);
    const px = size === "lg" ? "size-[112px]" : "size-[84px]";

    return (
        <div className="flex flex-col items-center gap-1.5">
            <button
                type="button"
                onClick={onToggle}
                aria-pressed={on}
                aria-label={on ? "Stop engine" : "Start engine"}
                title={on ? "Stop engine (E)" : "Start engine (E)"}
                className={`group relative ${px} shrink-0 rounded-full transition-transform duration-200 active:scale-95`}
            >
                <svg viewBox="0 0 120 120" className="absolute inset-0 size-full overflow-visible">
                    <defs>
                        <filter id="ign-glow" x="-50%" y="-50%" width="200%" height="200%">
                            <feGaussianBlur stdDeviation="2.4" />
                        </filter>
                    </defs>
                    {/* Tick marks */}
                    {ticks.map((value) => {
                        const angle = START_ANGLE + (value / MAX_RPM) * SWEEP;
                        const major = Number.isInteger(value);
                        const [x1, y1] = polar(angle, major ? 44 : 46.5);
                        const [x2, y2] = polar(angle, 49);
                        return (
                            <line
                                key={value}
                                x1={x1}
                                y1={y1}
                                x2={x2}
                                y2={y2}
                                stroke={value >= 7 ? "#ff3b3b" : "white"}
                                strokeOpacity={major ? 0.55 : 0.25}
                                strokeWidth={major ? 1.3 : 0.9}
                            />
                        );
                    })}
                    {/* Track */}
                    <circle
                        cx="60"
                        cy="60"
                        r={R}
                        fill="none"
                        stroke="white"
                        strokeOpacity="0.08"
                        strokeWidth="2.5"
                        strokeDasharray={`${ARC} 999`}
                        transform={`rotate(${START_ANGLE} 60 60)`}
                        strokeLinecap="round"
                    />
                    {/* Live value, with a blurred copy underneath for glow */}
                    {[true, false].map((glow, i) => (
                        <circle
                            key={String(glow)}
                            ref={(el) => {
                                if (el) arcs.current[i] = el;
                            }}
                            cx="60"
                            cy="60"
                            r={R}
                            fill="none"
                            stroke="var(--accent)"
                            strokeWidth={glow ? 5 : 2.5}
                            strokeOpacity={glow ? 0.5 : 1}
                            strokeDasharray={`${ARC} 999`}
                            strokeDashoffset={ARC}
                            transform={`rotate(${START_ANGLE} 60 60)`}
                            strokeLinecap="round"
                            filter={glow ? "url(#ign-glow)" : undefined}
                        />
                    ))}
                </svg>
                {/* Brushed-metal push button */}
                <span
                    className={`absolute inset-[19%] grid place-items-center rounded-full border transition-all duration-500 ${
                        on
                            ? "border-accent/70 shadow-[0_0_28px_-4px_var(--accent),inset_0_0_18px_-6px_var(--accent)]"
                            : "border-white/15 shadow-[0_6px_18px_-6px_rgba(0,0,0,0.9)] group-hover:border-white/35"
                    }`}
                    style={{
                        background:
                            "radial-gradient(circle at 50% 30%, #2b2d33 0%, #15161a 55%, #0b0c0e 100%), repeating-conic-gradient(from 0deg, rgb(255 255 255 / 0.03) 0 2deg, transparent 2deg 4deg)",
                    }}
                >
                    <span className="flex flex-col items-center leading-none">
                        <span className="font-mono text-[7px] tracking-[0.3em] text-white/45">ENGINE</span>
                        <span className={`mt-1 font-display text-[11px] tracking-[0.16em] transition-colors ${on ? "text-accent" : "text-white"}`}>
                            {on ? "STOP" : "START"}
                        </span>
                        <span className={`mt-1.5 h-[3px] w-3 rounded-full transition-colors ${on ? "bg-accent shadow-[0_0_8px_var(--accent)]" : "bg-white/20"}`} />
                    </span>
                </span>
            </button>
            <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.2em] text-white/40">
                <span>
                    <span ref={readout} className="tabular-nums text-white/75">0.0</span> ×1000 R/MIN
                </span>
                {onRev && (
                    <button
                        type="button"
                        onClick={onRev}
                        disabled={!on}
                        title="Blip the throttle (Space)"
                        className={`rounded-full border px-2 py-0.5 text-[9px] tracking-[0.22em] transition-all duration-300 ${
                            on
                                ? "border-accent/50 text-accent hover:bg-accent hover:text-black"
                                : "pointer-events-none border-white/10 text-white/20 opacity-0"
                        }`}
                    >
                        REV
                    </button>
                )}
            </div>
        </div>
    );
}
