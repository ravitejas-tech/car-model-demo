import { VIEW_ORDER, VIEWS, type ViewId } from "~/lib/showroom";

type ViewRailProps = {
    view: ViewId | null;
    autoRotate: boolean;
    onView: (view: ViewId) => void;
    onToggleRotate: () => void;
};

/**
 * Camera angles. Desktop: a quiet vertical index on the right edge.
 * Phones: one row above the paints.
 */
export function ViewRail({ view, autoRotate, onView, onToggleRotate }: ViewRailProps) {
    return (
        <nav
            aria-label="Camera angle"
            className="rise pointer-events-auto absolute inset-x-4 bottom-[106px] z-20 flex items-center justify-between sm:inset-x-10 sm:bottom-[100px] lg:inset-x-auto lg:bottom-auto lg:right-10 lg:top-1/2 lg:-translate-y-1/2 lg:flex-col lg:items-end lg:gap-4"
            style={{ animationDelay: "520ms" }}
        >
            {VIEW_ORDER.map((id, index) => {
                const active = view === id;
                return (
                    <button
                        key={id}
                        type="button"
                        onClick={() => onView(id)}
                        aria-pressed={active}
                        title={`${VIEWS[id].label} (${index + 1})`}
                        className="group flex items-center gap-2.5 lg:flex-row-reverse"
                    >
                        <span
                            className={`hidden h-px transition-all duration-500 lg:block ${active ? "w-7 bg-accent" : "w-3 bg-white/20 group-hover:w-5 group-hover:bg-white/50"}`}
                        />
                        <span
                            className={`font-mono text-[10px] uppercase tracking-[0.28em] transition-colors duration-300 ${
                                active ? "text-white" : "text-white/40 group-hover:text-white/80"
                            }`}
                        >
                            <span className={`mr-2 hidden lg:inline ${active ? "text-accent" : "text-white/25"}`}>0{index + 1}</span>
                            {VIEWS[id].label}
                        </span>
                    </button>
                );
            })}
            <button
                type="button"
                onClick={onToggleRotate}
                aria-pressed={autoRotate}
                title="Slowly orbit the car"
                className={`hidden font-mono text-[9px] uppercase tracking-[0.28em] transition-colors lg:mt-3 lg:block ${
                    autoRotate ? "text-accent" : "text-white/30 hover:text-white/70"
                }`}
            >
                Orbit {autoRotate ? "on" : "off"}
            </button>
        </nav>
    );
}
