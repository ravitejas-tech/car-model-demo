import { useState } from "react";
import { FLOOR_FINISHES, GARAGE_THEMES, type FloorFinish, type GarageTheme } from "~/lib/garage";
import { formatPrice, PAINTS, VIEW_ORDER, VIEWS, type Paint, type ViewId } from "~/lib/showroom";
import { RotateIcon, SpecsIcon, SunIcon } from "./icons";

type DockProps = {
    ready: boolean;
    paint: Paint;
    view: ViewId | null;
    autoRotate: boolean;
    garage: GarageTheme;
    floor: FloorFinish["id"];
    lightLevel: number;
    onPaint: (paint: Paint) => void;
    onView: (view: ViewId) => void;
    onToggleRotate: () => void;
    onSpecs: () => void;
    onGarage: (theme: GarageTheme) => void;
    onFloor: (floor: FloorFinish["id"]) => void;
    onLightLevel: (level: number) => void;
};

type Tab = "paint" | "garage";

export function ConfiguratorDock(props: DockProps) {
    const [tab, setTab] = useState<Tab>("paint");
    if (!props.ready) return null;

    return (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 px-3 pb-3 sm:px-8 sm:pb-6">
            <div
                className="glass reveal pointer-events-auto mx-auto flex min-w-0 max-w-[1180px] flex-col gap-3 rounded-[28px] p-3 lg:flex-row lg:items-center lg:gap-0 lg:p-2.5"
                style={{ animationDelay: "600ms" }}
            >
                <div className="flex min-w-0 items-center gap-3 lg:flex-1 lg:pl-1.5 lg:pr-5">
                    <TabSwitch tab={tab} onChange={setTab} />
                    {tab === "paint" ? <PaintPicker {...props} /> : <GaragePicker {...props} />}
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
                                aria-pressed={props.view === id}
                                className={`min-w-0 flex-1 rounded-full px-1 py-2 text-[10px] font-medium uppercase tracking-[0.08em] transition-colors sm:px-3.5 sm:text-[11px] sm:tracking-[0.12em] ${
                                    props.view === id ? "bg-white text-black" : "text-white/55 hover:text-white"
                                }`}
                            >
                                {VIEWS[id].label}
                            </button>
                        ))}
                    </div>
                    <ToggleButton label="Auto-rotate" active={props.autoRotate} onClick={props.onToggleRotate}>
                        <RotateIcon className="size-4" />
                    </ToggleButton>
                    <ToggleButton label="Specifications" active={false} onClick={props.onSpecs} className="lg:hidden">
                        <SpecsIcon className="size-4" />
                    </ToggleButton>
                </div>
            </div>
        </div>
    );
}

function TabSwitch({ tab, onChange }: { tab: Tab; onChange: (tab: Tab) => void }) {
    return (
        <div className="flex shrink-0 flex-col gap-1 rounded-2xl bg-black/30 p-1" role="tablist" aria-label="Customise">
            {(["paint", "garage"] as Tab[]).map((id) => (
                <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={tab === id}
                    onClick={() => onChange(id)}
                    className={`rounded-xl px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] transition-colors ${
                        tab === id ? "bg-white/12 text-white" : "text-white/40 hover:text-white/80"
                    }`}
                >
                    {id}
                </button>
            ))}
        </div>
    );
}

function PaintPicker({ paint, onPaint }: DockProps) {
    return (
        <>
            <div className="hidden w-32 shrink-0 lg:block">
                <div className="truncate text-sm font-medium">{paint.name}</div>
                <div className="text-[11px] text-accent">{paint.price ? `+ ${formatPrice(paint.price)}` : "Included"}</div>
            </div>
            <div className="no-scrollbar -my-2 flex min-w-0 flex-1 gap-2.5 overflow-x-auto px-1 py-2 sm:gap-3" role="radiogroup" aria-label="Paint colour">
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
                            className={`relative size-9 shrink-0 rounded-full transition-transform duration-300 hover:scale-110 sm:size-10 ${selected ? "scale-110" : ""}`}
                        >
                            <span className={`absolute -inset-[5px] rounded-full border transition-colors duration-300 ${selected ? "border-accent" : "border-transparent"}`} />
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
        </>
    );
}

function GaragePicker({ garage, floor, lightLevel, onGarage, onFloor, onLightLevel }: DockProps) {
    return (
        <div className="no-scrollbar flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2.5 lg:-my-2 lg:flex-nowrap lg:overflow-x-auto lg:px-1 lg:py-2">
            {/* Room style */}
            <div className="flex w-full gap-2 lg:w-auto lg:shrink-0" role="radiogroup" aria-label="Garage style">
                {GARAGE_THEMES.map((theme) => {
                    const selected = theme.id === garage.id;
                    return (
                        <button
                            key={theme.id}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            title={`${theme.name} — ${theme.tagline}`}
                            onClick={() => onGarage(theme)}
                            className={`group relative h-12 min-w-0 flex-1 overflow-hidden rounded-xl border lg:w-[72px] lg:flex-none text-left transition-all duration-300 ${
                                selected ? "border-accent shadow-[0_0_18px_-6px_var(--accent)]" : "border-white/10 hover:border-white/30"
                            }`}
                        >
                            <span className="absolute inset-0" style={{ background: theme.preview }} />
                            <span className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                            <span className="absolute inset-x-1.5 bottom-1 truncate text-[9px] font-semibold leading-tight tracking-wide text-white">
                                <span className="lg:hidden">{theme.name.split(" ")[0]}</span>
                                <span className="hidden lg:inline">{theme.name}</span>
                            </span>
                        </button>
                    );
                })}
            </div>

            <div className="hidden h-9 w-px shrink-0 bg-white/10 lg:block" />

            {/* Floor */}
            <div className="flex shrink-0 gap-2" role="radiogroup" aria-label="Floor finish">
                {FLOOR_FINISHES.map((finish) => {
                    const selected = finish.id === floor;
                    return (
                        <button
                            key={finish.id}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            aria-label={finish.name}
                            title={finish.name}
                            onClick={() => onFloor(finish.id)}
                            className={`size-9 shrink-0 rounded-lg border transition-all ${selected ? "border-accent ring-2 ring-accent/30" : "border-white/15 hover:border-white/40"}`}
                            style={{ background: finish.preview }}
                        />
                    );
                })}
            </div>

            <div className="h-9 w-px shrink-0 bg-white/10" />

            {/* Brightness */}
            <label className="flex min-w-0 flex-1 items-center gap-2.5 text-white/60 lg:flex-none lg:shrink-0">
                <SunIcon className="size-4" />
                <span className="sr-only">Garage lighting</span>
                <input
                    type="range"
                    min={0.4}
                    max={1.6}
                    step={0.05}
                    value={lightLevel}
                    onChange={(event) => onLightLevel(Number(event.target.value))}
                    className="range-accent w-full min-w-16 lg:w-28"
                />
            </label>
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
            className={`grid size-9 shrink-0 place-items-center rounded-full border transition-colors sm:size-10 ${
                active ? "border-accent/60 bg-accent/15 text-accent" : "border-white/10 text-white/55 hover:text-white"
            } ${className}`}
        >
            {children}
        </button>
    );
}
