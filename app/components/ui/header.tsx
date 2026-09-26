import { useState } from "react";
import { CloseIcon, LogoMark } from "./icons";

type HeaderProps = {
    onOverview: () => void;
    onSpecs: () => void;
    onReserve: () => void;
    onTestDrive: () => void;
    sound: boolean;
    onToggleSound: () => void;
    show: boolean;
};

export function Header({ onOverview, onSpecs, onReserve, onTestDrive, sound, onToggleSound, show }: HeaderProps) {
    const [menuOpen, setMenuOpen] = useState(false);
    const links = [
        { label: "Overview", action: onOverview },
        { label: "Specs", action: onSpecs },
        { label: "Reserve", action: onReserve },
    ];

    const run = (action: () => void) => {
        setMenuOpen(false);
        action();
    };

    return (
        <header className={`pointer-events-none absolute inset-x-0 top-0 z-30 px-5 pt-5 transition-opacity duration-1000 sm:px-10 sm:pt-7 ${show ? "opacity-100" : "opacity-0"}`} aria-hidden={!show}>
            <nav className={`mx-auto flex items-center justify-between ${show ? "pointer-events-auto" : ""}`}>
                <button type="button" onClick={() => run(onOverview)} className="flex items-center gap-3" aria-label="Velocity home">
                    <LogoMark className="size-5" />
                    <span className="font-display text-[11px] tracking-[0.55em] text-white/90">VELOCITY</span>
                </button>

                <div className="flex items-center gap-2 sm:gap-5">
                    <button type="button" onClick={onSpecs} className="hidden font-mono text-[10px] uppercase tracking-[0.3em] text-white/50 transition-colors hover:text-white md:block">
                        Specs
                    </button>
                    <SoundToggle sound={sound} active={show} onToggle={onToggleSound} />
                    <button
                        type="button"
                        onClick={onTestDrive}
                        className="hidden rounded-full border border-white/20 px-5 py-2.5 font-mono text-[10px] uppercase tracking-[0.3em] text-white/85 transition-all hover:border-white hover:bg-white hover:text-black sm:block"
                    >
                        Test drive
                    </button>
                    <button
                        type="button"
                        onClick={() => setMenuOpen((open) => !open)}
                        className="glass grid size-10 place-items-center rounded-full md:hidden"
                        aria-label={menuOpen ? "Close menu" : "Open menu"}
                        aria-expanded={menuOpen}
                    >
                        {menuOpen ? (
                            <CloseIcon className="size-4" />
                        ) : (
                            <span className="flex w-4 flex-col gap-1">
                                <span className="h-px w-full bg-white" />
                                <span className="h-px w-2/3 bg-white" />
                            </span>
                        )}
                    </button>
                </div>
            </nav>

            {menuOpen && (
                <div className="glass reveal pointer-events-auto absolute right-5 top-[4.5rem] flex w-56 flex-col rounded-2xl p-2 md:hidden">
                    {[...links, { label: "Book a test drive", action: onTestDrive }].map((link) => (
                        <button
                            key={link.label}
                            type="button"
                            onClick={() => run(link.action)}
                            className="rounded-xl px-4 py-3 text-left text-sm text-white/80 hover:bg-white/10"
                        >
                            {link.label}
                        </button>
                    ))}
                </div>
            )}
        </header>
    );
}

/** Sound on/off (engine and music), with bars that dance while it plays. */
function SoundToggle({ sound, active, onToggle }: { sound: boolean; active: boolean; onToggle: () => void }) {
    const live = sound && active;
    return (
        <button
            type="button"
            onClick={onToggle}
            aria-pressed={sound}
            aria-label={sound ? "Mute sound" : "Unmute sound"}
            title={sound ? "Sound on" : "Sound off"}
            className="flex h-10 items-center gap-2.5 rounded-full px-3 font-mono text-[9px] uppercase tracking-[0.24em] text-white/55 transition-colors hover:text-white"
        >
            <span className="flex h-3 items-end gap-[2px]" aria-hidden>
                {[0, 1, 2, 3].map((i) => (
                    <span
                        key={i}
                        className={`w-[2px] origin-bottom rounded-full ${sound ? "bg-accent" : "bg-white/35"} ${live ? "animate-[eq_0.9s_ease-in-out_infinite]" : ""}`}
                        style={{ height: sound ? `${[45, 90, 65, 35][i]}%` : "20%", animationDelay: `${i * -0.23}s` }}
                    />
                ))}
            </span>
            <span className="hidden sm:inline">{sound ? "Sound" : "Muted"}</span>
        </button>
    );
}
