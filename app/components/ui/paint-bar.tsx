import { useEffect, useRef, useState } from "react";
import { FLOOR_FINISHES, GARAGE_THEMES, type FloorFinish, type GarageTheme } from "~/lib/garage";
import { formatPrice, PAINTS, VIEW_ORDER, VIEWS, type Paint, type ViewId } from "~/lib/showroom";
import { CloseIcon, SunIcon } from "./icons";

type PaintBarProps = {
    paint: Paint;
    garage: GarageTheme;
    floor: FloorFinish["id"];
    lightLevel: number;
    view: ViewId | null;
    autoRotate: boolean;
    onPaint: (paint: Paint) => void;
    onGarage: (theme: GarageTheme) => void;
    onFloor: (floor: FloorFinish["id"]) => void;
    onLightLevel: (level: number) => void;
    onView: (view: ViewId) => void;
    onToggleRotate: () => void;
};

/**
 * Bottom-right: the paint, as a row of lacquered dots, plus one "Customize"
 * button that opens everything else (garage, floor, light, camera).
 */
export function PaintBar(props: PaintBarProps) {
    const { paint, onPaint } = props;
    const [open, setOpen] = useState(false);
    const root = useRef<HTMLDivElement>(null);

    // Close on outside click or Escape.
    useEffect(() => {
        if (!open) return;
        const onDown = (event: PointerEvent) => {
            if (root.current && !root.current.contains(event.target as Node)) setOpen(false);
        };
        const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
        window.addEventListener("pointerdown", onDown);
        window.addEventListener("keydown", onKey);
        return () => {
            window.removeEventListener("pointerdown", onDown);
            window.removeEventListener("keydown", onKey);
        };
    }, [open]);

    return (
        <div ref={root} className="pointer-events-auto absolute bottom-5 right-4 z-30 flex flex-col items-end sm:bottom-9 sm:right-10">
            {open && <CustomizePanel {...props} onClose={() => setOpen(false)} />}

            <div className="rise flex items-baseline gap-3" style={{ animationDelay: "380ms" }}>
                <span className="text-[13px] text-white/85">{paint.name}</span>
                <span className="font-mono text-[10px] tracking-[0.12em] text-white/35">{paint.price ? `+${formatPrice(paint.price)}` : "Included"}</span>
            </div>

            <div className="rise mt-3 flex items-center gap-4" style={{ animationDelay: "460ms" }}>
                <div className="flex items-center gap-2 sm:gap-2.5" role="radiogroup" aria-label="Paint">
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
                                onClick={() => onPaint(option)}
                                className="group relative grid size-7 place-items-center"
                            >
                                <span
                                    className={`absolute inset-0 rounded-full border transition-all duration-500 ${
                                        selected ? "scale-100 border-white/60" : "scale-75 border-transparent"
                                    }`}
                                />
                                <span
                                    className={`relative rounded-full transition-all duration-300 ${selected ? "size-[18px]" : "size-4 group-hover:size-[18px]"}`}
                                    style={{
                                        background: `radial-gradient(circle at 32% 28%, rgb(255 255 255 / 0.5), transparent 42%), radial-gradient(circle at 50% 60%, ${option.color}, color-mix(in oklab, ${option.color} 45%, black))`,
                                        boxShadow: "inset 0 0 0 1px rgb(255 255 255 / 0.12)",
                                    }}
                                />
                            </button>
                        );
                    })}
                </div>
                <span className="h-5 w-px bg-white/10" />
                <button
                    type="button"
                    onClick={() => setOpen((value) => !value)}
                    aria-expanded={open}
                    className={`font-mono text-[10px] uppercase tracking-[0.3em] transition-colors ${open ? "text-white" : "text-white/50 hover:text-white"}`}
                >
                    Customize
                </button>
            </div>
        </div>
    );
}

function CustomizePanel({ garage, floor, lightLevel, view, autoRotate, onGarage, onFloor, onLightLevel, onView, onToggleRotate, onClose }: PaintBarProps & { onClose: () => void }) {
    return (
        <div className="panel-in mb-5 w-[min(92vw,340px)] rounded-2xl border border-white/[0.08] bg-[#0b0c0e]/90 p-5 shadow-[0_30px_60px_-20px_rgb(0_0_0/0.9)] backdrop-blur-xl">
            <div className="flex items-center justify-between">
                <span className="font-mono text-[9.5px] uppercase tracking-[0.35em] text-white/40">Garage</span>
                <button type="button" onClick={onClose} aria-label="Close" className="-m-1.5 p-1.5 text-white/35 hover:text-white">
                    <CloseIcon className="size-3.5" />
                </button>
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2" role="radiogroup" aria-label="Garage style">
                {GARAGE_THEMES.map((theme) => {
                    const selected = theme.id === garage.id;
                    return (
                        <button key={theme.id} type="button" role="radio" aria-checked={selected} title={theme.tagline} onClick={() => onGarage(theme)} className="group flex flex-col gap-1.5 text-left">
                            <span
                                className={`block h-11 rounded-lg border transition-all ${selected ? "border-white/50" : "border-white/[0.07] opacity-60 group-hover:opacity-100"}`}
                                style={{ background: theme.preview }}
                            />
                            <span className={`truncate text-[10px] ${selected ? "text-white/85" : "text-white/35"}`}>{theme.name.split(" ")[0]}</span>
                        </button>
                    );
                })}
            </div>

            <div className="mt-5 flex items-center justify-between gap-4">
                <div className="flex gap-2" role="radiogroup" aria-label="Floor">
                    {FLOOR_FINISHES.map((finish) => (
                        <button
                            key={finish.id}
                            type="button"
                            role="radio"
                            aria-checked={finish.id === floor}
                            aria-label={finish.name}
                            title={finish.name}
                            onClick={() => onFloor(finish.id)}
                            className={`size-7 rounded-md border transition-all ${finish.id === floor ? "border-white/60" : "border-white/[0.08] opacity-60 hover:opacity-100"}`}
                            style={{ background: finish.preview }}
                        />
                    ))}
                </div>
                <label className="flex flex-1 items-center gap-2.5 text-white/40">
                    <SunIcon className="size-3.5 shrink-0" />
                    <span className="sr-only">Light level</span>
                    <input type="range" min={0.3} max={1.4} step={0.05} value={lightLevel} onChange={(event) => onLightLevel(Number(event.target.value))} className="range-accent w-full" />
                </label>
            </div>

            <div className="mt-5 border-t border-white/[0.06] pt-4">
                <div className="flex items-center justify-between">
                    <span className="font-mono text-[9.5px] uppercase tracking-[0.35em] text-white/40">Camera</span>
                    <button type="button" onClick={onToggleRotate} aria-pressed={autoRotate} className={`font-mono text-[9.5px] uppercase tracking-[0.25em] transition-colors ${autoRotate ? "text-accent" : "text-white/35 hover:text-white/70"}`}>
                        Orbit {autoRotate ? "on" : "off"}
                    </button>
                </div>
                <div className="mt-3 flex justify-between" role="group" aria-label="Camera angle">
                    {VIEW_ORDER.map((id) => (
                        <button
                            key={id}
                            type="button"
                            onClick={() => onView(id)}
                            aria-pressed={view === id}
                            className={`text-[11px] transition-colors ${view === id ? "text-white" : "text-white/35 hover:text-white/75"}`}
                        >
                            {VIEWS[id].label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
