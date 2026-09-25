import { useEffect, useState } from "react";
import { HEADLINE_STATS, type Hotspot, type Paint } from "~/lib/showroom";
import { ArrowIcon, CloseIcon } from "./icons";

/** Counts from 0 to `value` with an ease-out curve once `start` is true. */
function useCountUp(value: number, start: boolean, duration = 1600) {
    const [current, setCurrent] = useState(0);
    useEffect(() => {
        if (!start) return;
        let frame = 0;
        const began = performance.now();
        const tick = (now: number) => {
            const t = Math.min(1, (now - began) / duration);
            setCurrent(value * (1 - Math.pow(1 - t, 4)));
            if (t < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, [value, start, duration]);
    return current;
}

function Stat({ value, suffix, label, decimals = 0, start, delay }: {
    value: number;
    suffix: string;
    label: string;
    decimals?: number;
    start: boolean;
    delay: number;
}) {
    const current = useCountUp(value, start);
    return (
        <div className="reveal" style={{ animationDelay: `${delay}ms` }}>
            <div className="flex items-baseline gap-1">
                <span className="font-display text-xl tabular-nums text-white sm:text-3xl">{current.toFixed(decimals)}</span>
                <span className="text-xs font-semibold text-accent sm:text-sm">{suffix}</span>
            </div>
            <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-white/45 sm:text-[11px]">{label}</div>
        </div>
    );
}

type HeroCopyProps = {
    ready: boolean;
    hidden: boolean;
    paint: Paint;
    onReserve: () => void;
    onSpecs: () => void;
};

export function HeroCopy({ ready, hidden, paint, onReserve, onSpecs }: HeroCopyProps) {
    if (!ready) return null;
    return (
        <section
            className={`pointer-events-none absolute inset-x-0 top-24 z-20 px-5 transition-all duration-500 sm:px-8 lg:top-1/2 lg:-translate-y-1/2 ${
                hidden ? "opacity-0 -translate-x-4 lg:-translate-x-4" : "opacity-100"
            }`}
            aria-hidden={hidden}
        >
            <div className="mx-auto max-w-[1400px]">
                <div className={`max-w-xl ${hidden ? "" : "pointer-events-auto"}`}>
                    <div className="reveal flex items-center gap-4" style={{ animationDelay: "100ms" }}>
                        <span className="h-px w-10 bg-accent" />
                        <span className="text-[11px] font-semibold uppercase tracking-[0.35em] text-accent">
                            2026 Velocity GT
                        </span>
                    </div>

                    <h1 className="reveal mt-4 font-display text-[2.6rem] leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl" style={{ animationDelay: "200ms" }}>
                        <span className="block text-white">Pure</span>
                        <span className="text-gradient-accent block">Luxury.</span>
                    </h1>

                    <p className="reveal mt-5 hidden max-w-md text-base leading-relaxed text-white/55 sm:block" style={{ animationDelay: "320ms" }}>
                        Classic muscle, modern precision. Spin it, tap the glowing points
                        to explore, and see it in{" "}
                        <span className="text-white transition-colors">{paint.name}</span>.
                    </p>

                    <div className="mt-6 flex gap-6 sm:mt-10 sm:gap-10">
                        {HEADLINE_STATS.map((stat, index) => (
                            <Stat key={stat.label} {...stat} start={ready} delay={450 + index * 120} />
                        ))}
                    </div>

                    <div className="reveal mt-10 hidden gap-3 lg:flex" style={{ animationDelay: "800ms" }}>
                        <button
                            type="button"
                            onClick={onReserve}
                            className="group flex items-center gap-3 rounded-full bg-accent px-7 py-4 text-xs font-bold uppercase tracking-[0.2em] text-black shadow-[0_0_40px_-8px_var(--accent)] transition-transform hover:scale-[1.03]"
                        >
                            Reserve yours
                            <ArrowIcon className="size-4 transition-transform group-hover:translate-x-1" />
                        </button>
                        <button
                            type="button"
                            onClick={onSpecs}
                            className="rounded-full border border-white/15 px-7 py-4 text-xs font-semibold uppercase tracking-[0.2em] text-white/80 transition-colors hover:border-white/40 hover:text-white"
                        >
                            Full specs
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
}

type HotspotCardProps = {
    hotspot: Hotspot | null;
    index: number;
    total: number;
    onClose: () => void;
    onStep: (direction: 1 | -1) => void;
};

/** Detail card for the selected hotspot; replaces the hero copy while open. */
export function HotspotCard({ hotspot, index, total, onClose, onStep }: HotspotCardProps) {
    if (!hotspot) return null;
    return (
        <aside
            key={hotspot.id}
            className="glass reveal absolute inset-x-4 top-20 z-20 rounded-3xl p-6 sm:inset-x-auto sm:left-8 sm:top-1/2 sm:w-[360px] sm:-translate-y-1/2 sm:p-7"
            aria-live="polite"
        >
            <div className="flex items-start justify-between gap-4">
                <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-accent">
                    Detail {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
                </span>
                <button type="button" onClick={onClose} className="-m-2 p-2 text-white/50 hover:text-white" aria-label="Close detail">
                    <CloseIcon className="size-4" />
                </button>
            </div>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight">{hotspot.title}</h2>
            <p className="mt-1 text-sm font-medium text-white/70">{hotspot.stat}</p>
            <p className="mt-4 text-sm leading-relaxed text-white/50">{hotspot.body}</p>
            <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
                <button type="button" onClick={() => onStep(-1)} className="text-xs uppercase tracking-[0.2em] text-white/50 hover:text-white">
                    ← Prev
                </button>
                <div className="flex gap-1.5">
                    {Array.from({ length: total }, (_, i) => (
                        <span key={i} className={`h-1 rounded-full transition-all ${i === index ? "w-5 bg-accent" : "w-1.5 bg-white/20"}`} />
                    ))}
                </div>
                <button type="button" onClick={() => onStep(1)} className="text-xs uppercase tracking-[0.2em] text-white/50 hover:text-white">
                    Next →
                </button>
            </div>
        </aside>
    );
}
