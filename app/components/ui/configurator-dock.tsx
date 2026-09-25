import { formatPrice, PAINTS, VIEW_ORDER, VIEWS, type Paint, type ViewId } from "~/lib/showroom";
import { PinIcon, RotateIcon, SpecsIcon } from "./icons";

type DockProps = {
    ready: boolean;
    paint: Paint;
    view: ViewId | null;
    autoRotate: boolean;
    showHotspots: boolean;
    onPaint: (paint: Paint) => void;
    onView: (view: ViewId) => void;
    onToggleRotate: () => void;
    onToggleHotspots: () => void;
    onSpecs: () => void;
};

export function ConfiguratorDock(props: DockProps) {
    const { ready, paint, view } = props;
    if (!ready) return null;

    return (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 px-3 pb-3 sm:px-8 sm:pb-6">
            <div
                className="glass reveal pointer-events-auto mx-auto flex min-w-0 max-w-[1100px] flex-col gap-3 rounded-[28px] p-3 lg:flex-row lg:items-center lg:gap-0 lg:p-2.5"
                style={{ animationDelay: "600ms" }}
            >
                {/* Paint */}
                <div className="flex min-w-0 items-center gap-3 lg:flex-1 lg:pl-4 lg:pr-5">
                    <div className="hidden w-36 shrink-0 lg:block">
                        <div className="text-[10px] uppercase tracking-[0.3em] text-white/40">Paint</div>
                        <div className="mt-0.5 truncate text-sm font-medium">{paint.name}</div>
                        <div className="text-[11px] text-accent">{paint.price ? `+ ${formatPrice(paint.price)}` : "Included"}</div>
                    </div>
                    <div className="no-scrollbar -my-2 flex flex-1 gap-2.5 overflow-x-auto px-1 py-2 sm:gap-3" role="radiogroup" aria-label="Paint colour">
                        {PAINTS.map((option) => {
                            const selected = option.id === paint.id;
                            return (
                                <button
                                    key={option.id}
                                    type="button"
                                    role="radio"
                                    aria-checked={selected}
                                    aria-label={option.name}
                                    title={option.name}
                                    onClick={() => props.onPaint(option)}
                                    className={`relative size-9 shrink-0 rounded-full transition-transform duration-300 hover:scale-110 sm:size-10 ${
                                        selected ? "scale-110" : ""
                                    }`}
                                >
                                    <span
                                        className={`absolute -inset-[5px] rounded-full border transition-colors duration-300 ${
                                            selected ? "border-accent" : "border-transparent"
                                        }`}
                                    />
                                    <span
                                        className="absolute inset-0 rounded-full ring-1 ring-white/15"
                                        style={{
                                            background: `radial-gradient(circle at 30% 25%, rgb(255 255 255 / 0.55), transparent 38%), radial-gradient(circle at 50% 60%, ${option.color}, color-mix(in oklab, ${option.color} 55%, black))`,
                                        }}
                                    />
                                </button>
                            );
                        })}
                    </div>
                    <div className="shrink-0 text-right lg:hidden">
                        <div className="text-xs font-medium">{paint.name}</div>
                        <div className="text-[10px] text-accent">{paint.price ? `+ ${formatPrice(paint.price)}` : "Included"}</div>
                    </div>
                </div>

                <div className="hidden h-10 w-px bg-white/10 lg:block" />

                {/* Views + toggles */}
                <div className="flex min-w-0 items-center gap-1.5 sm:gap-2 lg:pl-3">
                    <div className="flex min-w-0 flex-1 rounded-full bg-black/30 p-1" role="group" aria-label="Camera angle">
                        {VIEW_ORDER.map((id) => (
                            <button
                                key={id}
                                type="button"
                                onClick={() => props.onView(id)}
                                aria-pressed={view === id}
                                className={`min-w-0 flex-1 rounded-full px-1 py-2 text-[10px] font-medium uppercase tracking-[0.08em] transition-colors sm:px-4 sm:text-[11px] sm:tracking-[0.12em] ${
                                    view === id ? "bg-white text-black" : "text-white/55 hover:text-white"
                                }`}
                            >
                                {VIEWS[id].label}
                            </button>
                        ))}
                    </div>
                    <ToggleButton label="Auto-rotate" active={props.autoRotate} onClick={props.onToggleRotate}>
                        <RotateIcon className="size-4" />
                    </ToggleButton>
                    <ToggleButton label="Show details" active={props.showHotspots} onClick={props.onToggleHotspots}>
                        <PinIcon className="size-4" />
                    </ToggleButton>
                    <ToggleButton label="Specifications" active={false} onClick={props.onSpecs} className="lg:hidden">
                        <SpecsIcon className="size-4" />
                    </ToggleButton>
                </div>
            </div>
        </div>
    );
}

function ToggleButton({ label, active, onClick, children, className = "" }: {
    label: string;
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={active}
            aria-label={label}
            title={label}
            className={`grid size-9 shrink-0 place-items-center rounded-full border sm:size-10 transition-colors ${
                active ? "border-accent/60 bg-accent/15 text-accent" : "border-white/10 text-white/55 hover:text-white"
            } ${className}`}
        >
            {children}
        </button>
    );
}
