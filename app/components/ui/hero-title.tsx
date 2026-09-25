import type { Paint } from "~/lib/showroom";

/** Bottom-left on desktop, under the header on phones: the model, one line of facts. */
export function HeroTitle({ show, paint }: { show: boolean; paint: Paint }) {
    if (!show) return null;
    return (
        <section className="pointer-events-none absolute left-5 top-[76px] z-20 sm:left-10 lg:bottom-10 lg:top-auto">
            <div className="rise font-mono text-[9.5px] uppercase tracking-[0.42em] text-white/40" style={{ animationDelay: "80ms" }}>
                2026 <span className="mx-2 text-white/15">/</span> Grand Tourer
            </div>
            <h1 className="rise mt-3 font-display text-[30px] leading-none tracking-[0.04em] text-white sm:text-[44px] lg:text-[56px]" style={{ animationDelay: "180ms" }}>
                Velocity <span className="text-accent transition-colors duration-700">GT</span>
            </h1>
            <p className="rise mt-4 font-mono text-[10px] uppercase tracking-[0.24em] text-white/45" style={{ animationDelay: "300ms" }}>
                620 hp <Dot /> 0–100 in 3.2 s <Dot /> <span className="text-white/70">{paint.name}</span>
            </p>
        </section>
    );
}

function Dot() {
    return <span className="mx-2 inline-block size-[3px] -translate-y-[2px] rounded-full bg-white/25" />;
}
