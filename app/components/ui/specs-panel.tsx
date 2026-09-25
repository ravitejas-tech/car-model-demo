import { useEffect, useState } from "react";
import { SPEC_BARS, SPEC_TABLE } from "~/lib/showroom";
import { ArrowIcon, CloseIcon } from "./icons";

type SpecsPanelProps = {
    open: boolean;
    onClose: () => void;
    onReserve: () => void;
};

/** Side sheet on desktop, bottom sheet on mobile. */
export function SpecsPanel({ open, onClose, onReserve }: SpecsPanelProps) {
    // Delay the bar fill until the sheet has slid in so the animation is visible.
    const [filled, setFilled] = useState(false);
    useEffect(() => {
        if (!open) return setFilled(false);
        const id = setTimeout(() => setFilled(true), 250);
        return () => clearTimeout(id);
    }, [open]);

    return (
        <aside
            className={`glass fixed z-40 flex flex-col overflow-hidden bg-[#0c0d10]/80 transition-transform duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)]
                inset-x-0 bottom-0 max-h-[62vh] rounded-t-[28px]
                lg:inset-y-4 lg:right-4 lg:left-auto lg:bottom-4 lg:max-h-none lg:w-[400px] lg:rounded-[28px]
                ${open ? "translate-y-0 lg:translate-x-0" : "translate-y-full lg:translate-y-0 lg:translate-x-[110%]"}`}
            aria-hidden={!open}
            aria-label="Specifications"
            inert={!open}
        >
            <div className="flex items-center justify-between px-7 pb-2 pt-6">
                <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.3em] text-accent">Velocity GT</div>
                    <h2 className="mt-1 font-display text-xl">Specifications</h2>
                </div>
                <button type="button" onClick={onClose} className="grid size-9 place-items-center rounded-full border border-white/10 text-white/60 hover:text-white" aria-label="Close specifications">
                    <CloseIcon className="size-4" />
                </button>
            </div>

            <div className="no-scrollbar flex-1 overflow-y-auto px-7 pb-6">
                <div className="mt-6 space-y-5">
                    {SPEC_BARS.map((bar, index) => (
                        <div key={bar.label}>
                            <div className="flex justify-between text-sm">
                                <span className="text-white/55">{bar.label}</span>
                                <span className="font-medium tabular-nums">{bar.value}</span>
                            </div>
                            <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
                                <div
                                    className="h-full rounded-full bg-accent shadow-[0_0_10px_var(--accent)] transition-[width] duration-1000 ease-out"
                                    style={{ width: filled ? `${bar.ratio * 100}%` : "0%", transitionDelay: `${index * 90}ms` }}
                                />
                            </div>
                        </div>
                    ))}
                </div>

                <dl className="mt-9 divide-y divide-white/5 border-y border-white/5">
                    {SPEC_TABLE.map(([term, value]) => (
                        <div key={term} className="flex justify-between gap-4 py-3 text-sm">
                            <dt className="text-white/45">{term}</dt>
                            <dd className="text-right text-white/90">{value}</dd>
                        </div>
                    ))}
                </dl>
            </div>

            <div className="border-t border-white/10 p-5">
                <button
                    type="button"
                    onClick={onReserve}
                    className="group flex w-full items-center justify-center gap-3 rounded-full bg-accent py-4 text-xs font-bold uppercase tracking-[0.2em] text-black"
                >
                    Reserve this configuration
                    <ArrowIcon className="size-4 transition-transform group-hover:translate-x-1" />
                </button>
            </div>
        </aside>
    );
}
