import { useState } from "react";
import { CloseIcon, LogoMark } from "./icons";

type HeaderProps = {
    onOverview: () => void;
    onSpecs: () => void;
    onReserve: () => void;
    onTestDrive: () => void;
};

export function Header({ onOverview, onSpecs, onReserve, onTestDrive }: HeaderProps) {
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
        <header className="pointer-events-none absolute inset-x-0 top-0 z-30 px-5 pt-5 sm:px-8 sm:pt-6">
            <nav className="pointer-events-auto mx-auto flex max-w-[1400px] items-center justify-between">
                <button type="button" onClick={() => run(onOverview)} className="flex items-center gap-3" aria-label="Velocity home">
                    <LogoMark className="size-7" />
                    <span className="font-display text-sm tracking-[0.45em] text-white">VELOCITY</span>
                </button>

                <div className="glass hidden items-center gap-1 rounded-full p-1 md:flex">
                    {links.map((link) => (
                        <button
                            key={link.label}
                            type="button"
                            onClick={link.action}
                            className="rounded-full px-5 py-2 text-xs font-medium uppercase tracking-[0.2em] text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                        >
                            {link.label}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={onTestDrive}
                        className="hidden rounded-full border border-accent/60 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.2em] text-white transition-all hover:bg-accent hover:text-black sm:block"
                    >
                        Book a test drive
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
