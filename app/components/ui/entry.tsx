import { useEffect, useState } from "react";
import { LIGHTS_DELAY } from "~/lib/stage-state";

export type EntryStage = "gate" | "intro" | "live";

type EntryProps = {
    ready: boolean;
    stage: EntryStage;
    onEnter: (withSound: boolean) => void;
};

/**
 * The cinematic entry. Letterbox bars frame a silhouette of the car; the only
 * control is a push-to-start button. Pressing it hands over to the lighting
 * sequence, a title card plays, and the bars retract as the page comes alive.
 */
export function Entry({ ready, stage, onEnter }: EntryProps) {
    const gate = ready && stage === "gate";

    // Enter (or Space) starts the car from the gate.
    useEffect(() => {
        if (!gate) return;
        const onKey = (event: KeyboardEvent) => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onEnter(true);
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [gate, onEnter]);

    return (
        <>
            <Letterbox open={stage === "live"} />

            {/* Top bar: a quiet credit, like the opening of a film. */}
            <div
                aria-hidden
                className={`pointer-events-none fixed inset-x-0 top-0 z-40 flex h-[var(--bar)] items-center justify-center font-mono text-[9px] uppercase tracking-[0.6em] text-white/35 transition-opacity duration-700 ${
                    ready && stage !== "live" ? "opacity-100" : "opacity-0"
                }`}
            >
                Velocity Motors <span className="mx-3 text-white/15">·</span> presents
            </div>

            {/* The gate: one control, centred in the lower third. */}
            <div
                className={`fixed inset-x-0 bottom-[calc(var(--bar)+4vh)] z-40 flex flex-col items-center transition-all duration-700 ease-out ${
                    gate ? "opacity-100" : "pointer-events-none translate-y-3 opacity-0 blur-sm"
                }`}
                aria-hidden={!gate}
            >
                <StartButton onPress={() => onEnter(true)} disabled={!gate} />
                <div className="mt-6 font-mono text-[10px] uppercase tracking-[0.45em] text-white/55">Press to start</div>
                <div className="mt-3 flex items-center gap-3 text-[11px] text-white/30">
                    <span>Best with sound</span>
                    <span className="h-3 w-px bg-white/15" />
                    <button type="button" onClick={() => onEnter(false)} disabled={!gate} className="underline-offset-4 transition-colors hover:text-white/70 hover:underline">
                        Enter silently
                    </button>
                </div>
            </div>

            <TitleCard play={stage === "intro"} />
        </>
    );
}

/** Two black bars that slide away when the scene is ready. */
function Letterbox({ open }: { open: boolean }) {
    const bar = "fixed inset-x-0 z-40 h-[var(--bar)] bg-black transition-transform duration-[1600ms] ease-[cubic-bezier(0.7,0,0.2,1)]";
    return (
        <div aria-hidden>
            <div className={`${bar} top-0 ${open ? "-translate-y-full" : "translate-y-0"}`} />
            <div className={`${bar} bottom-0 ${open ? "translate-y-full" : "translate-y-0"}`} />
        </div>
    );
}

/** Push-to-start: brushed metal, a breathing accent ring, a pressed state. */
function StartButton({ onPress, disabled }: { onPress: () => void; disabled: boolean }) {
    const [pressed, setPressed] = useState(false);
    return (
        <button
            type="button"
            disabled={disabled}
            onClick={() => {
                setPressed(true);
                onPress();
            }}
            aria-label="Start engine and enter"
            className="group relative grid size-[104px] place-items-center rounded-full outline-none"
        >
            {/* Breathing halo */}
            <span className="absolute -inset-3 animate-[breathe_3.2s_ease-in-out_infinite] rounded-full bg-[radial-gradient(circle,var(--accent)_0%,transparent_65%)] opacity-25" />
            <span className="absolute inset-0 rounded-full border border-white/10" />
            <span className="absolute inset-[5px] rounded-full border border-accent/50 shadow-[0_0_24px_-6px_var(--accent)] transition-all duration-300 group-hover:border-accent group-focus-visible:border-accent" />
            <span
                className={`absolute inset-[13px] grid place-items-center rounded-full border border-white/10 shadow-[inset_0_1px_0_rgb(255_255_255/0.08),0_10px_24px_-8px_rgb(0_0_0/0.9)] transition-transform duration-150 ${
                    pressed ? "scale-95" : "group-active:scale-95"
                }`}
                style={{
                    background:
                        "radial-gradient(circle at 50% 28%, #2a2c31 0%, #141518 58%, #0a0a0c 100%), repeating-conic-gradient(from 0deg, rgb(255 255 255 / 0.035) 0 2deg, transparent 2deg 4deg)",
                }}
            >
                <span className="flex flex-col items-center leading-none">
                    <span className="font-mono text-[6.5px] tracking-[0.35em] text-white/40">ENGINE</span>
                    <span className="mt-1.5 font-display text-[10.5px] tracking-[0.2em] text-white">START</span>
                    <span className="mt-1.5 font-mono text-[6.5px] tracking-[0.35em] text-white/40">STOP</span>
                </span>
            </span>
        </button>
    );
}

/** The model name, set wide, fading up and away between the lights and the UI. */
function TitleCard({ play }: { play: boolean }) {
    return (
        <div aria-hidden className="pointer-events-none fixed inset-x-0 top-[calc(var(--bar)+7vh)] z-30 flex justify-center">
            {play && (
                <div className="title-card flex flex-col items-center" style={{ animationDelay: `${LIGHTS_DELAY + 0.8}s` }}>
                    <span className="font-mono text-[9px] uppercase tracking-[0.6em] text-white/45">2026</span>
                    <span className="mt-3 font-display text-[26px] text-white sm:text-[40px]">VELOCITY GT</span>
                </div>
            )}
        </div>
    );
}
