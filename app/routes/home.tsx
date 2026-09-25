import { useCallback, useEffect, useRef, useState } from "react";
import { ShowroomStage } from "~/components/scene/showroom-stage";
import { Entry, type EntryStage } from "~/components/ui/entry";
import { Header } from "~/components/ui/header";
import { HeroTitle } from "~/components/ui/hero-title";
import { IgnitionButton } from "~/components/ui/ignition";
import { Loader } from "~/components/ui/loader";
import { PaintBar } from "~/components/ui/paint-bar";
import { ReserveDialog, type ReserveMode } from "~/components/ui/reserve-dialog";
import { SpecsPanel } from "~/components/ui/specs-panel";
import { ViewRail } from "~/components/ui/view-rail";
import { engineAudio } from "~/lib/engine-audio";
import { engine, TIMELINE, useEngine } from "~/lib/experience";
import { GARAGE_THEMES, type FloorFinish } from "~/lib/garage";
import { GATE_SHOT, IGNITION_SHOT, LOOKUP_SHOT, PAINTS, REVEAL_SHOT, VIEW_ORDER, VIEWS, type CameraShot, type ViewId } from "~/lib/showroom";
import { INTRO, SCAN_SECONDS } from "~/lib/stage-state";

/**
 * Entry choreography, in seconds after pressing start:
 * crank → catch (headlights) → camera tilts up → ceiling lights strike in a
 * ripple → a shaft of light pours onto the car → camera tilts down onto it →
 * the letterbox opens and the page rises in.
 */
const ENTRY = {
    /** Tilt up into the dark ceiling while the starter cranks. */
    lookUp: 0.15,
    /** Tilt down onto the car just as the light reaches it. */
    reveal: TIMELINE.catch + 0.2 + INTRO.keyLight - 0.1,
    /** Letterbox retracts and the UI rises, once the camera has landed. */
    live: TIMELINE.catch + 0.2 + INTRO.keyLight + 2.3,
};

export default function Showroom() {
    const [ready, setReady] = useState(false);
    const [entry, setEntry] = useState<EntryStage>("gate");
    const [paint, setPaint] = useState(PAINTS[0]);
    const [view, setView] = useState<ViewId | null>(null);
    // A fresh object per request, so re-selecting the same view re-frames the car.
    const [shot, setShot] = useState<CameraShot>({ ...GATE_SHOT });
    const [autoRotate, setAutoRotate] = useState(true);
    const [garage, setGarage] = useState(GARAGE_THEMES[0]);
    const [floor, setFloor] = useState<FloorFinish["id"]>("epoxy");
    const [lightLevel, setLightLevel] = useState(0.9);
    const { phase, sound } = useEngine();
    const engineOn = phase === "running";
    const [specsOpen, setSpecsOpen] = useState(false);
    const [reserveMode, setReserveMode] = useState<ReserveMode | null>(null);
    const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
    const live = entry === "live";

    const later = (seconds: number, fn: () => void) => {
        timers.current.push(setTimeout(fn, seconds * 1000));
    };
    const clearTimers = () => {
        timers.current.forEach(clearTimeout);
        timers.current = [];
    };

    // Drive the UI accent colour from the selected paint.
    useEffect(() => {
        document.documentElement.style.setProperty("--accent", paint.accent);
    }, [paint]);

    const handleReady = useCallback(() => setReady(true), []);
    const handleInteract = useCallback(() => setView(null), []);

    const goToView = useCallback((id: ViewId) => {
        setView(id);
        setShot({ ...VIEWS[id] });
        // Hold still on a chosen angle; the 360° view keeps orbiting.
        setAutoRotate(id === "hero");
    }, []);

    /**
     * The entry: start the engine, then let the garage lights strike in a
     * ripple, pull the camera back to the hero shot and bring up the page.
     */
    const enter = useCallback((withSound: boolean) => {
        if (entry !== "gate") return;
        engine.setSound(withSound);
        engineAudio.unlock();
        engineAudio.setMuted(!withSound);
        engine.start();
        engineAudio.start();
        // Heavy switches clunk as each bank of lights strikes.
        const fixturesAt = TIMELINE.catch + 0.2 + INTRO.fixtures;
        [0, 0.16, 0.33, 0.62].forEach((delay, i) => engineAudio.lightSwitch(fixturesAt + delay, 1 - i * 0.1));

        setEntry("intro");
        setAutoRotate(false);
        later(ENTRY.lookUp, () => setShot({ ...LOOKUP_SHOT }));
        later(ENTRY.reveal, () => setShot({ ...REVEAL_SHOT }));
        later(ENTRY.live, () => {
            setEntry("live");
            setView("hero");
            setAutoRotate(true);
        });
    }, [entry]);

    // Restarting later: swing round to the headlights, then back to the hero.
    const toggleEngine = useCallback(() => {
        engineAudio.unlock();
        if (engine.get().phase === "running") {
            engine.stop();
            engineAudio.stop();
            return;
        }
        engine.start();
        engineAudio.start();
        clearTimers();
        setView(null);
        setShot({ ...IGNITION_SHOT });
        setAutoRotate(false);
        later(5.2, () => {
            setView("hero");
            setShot({ ...VIEWS.hero });
            setAutoRotate(true);
        });
    }, []);

    const rev = useCallback(() => {
        if (engine.blip()) engineAudio.blip();
    }, []);

    const toggleSound = useCallback(() => {
        const next = !engine.get().sound;
        engine.setSound(next);
        engineAudio.unlock();
        engineAudio.setMuted(!next);
    }, []);

    useEffect(() => () => {
        clearTimers();
        engineAudio.stop(true);
    }, []);

    // Paint change: scanner whoosh. Garage change: the light switches clunk.
    const firstPaint = useRef(true);
    useEffect(() => {
        if (firstPaint.current) {
            firstPaint.current = false;
            return;
        }
        engineAudio.scan(SCAN_SECONDS);
    }, [paint]);
    const firstGarage = useRef(true);
    useEffect(() => {
        if (firstGarage.current) {
            firstGarage.current = false;
            return;
        }
        [0.02, 0.17, 0.31].forEach((delay, i) => engineAudio.lightSwitch(delay, 1 - i * 0.12));
    }, [garage]);

    const openReserve = (mode: ReserveMode) => {
        setSpecsOpen(false);
        setReserveMode(mode);
    };

    // Keyboard (once live): ← → paint, 1–5 camera, E engine, Space rev, Esc closes.
    useEffect(() => {
        if (!live) return;
        const onKey = (event: KeyboardEvent) => {
            if (reserveMode || event.target instanceof HTMLInputElement || event.metaKey || event.ctrlKey) return;
            if (event.key === "Escape") {
                setSpecsOpen(false);
            } else if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
                const step = event.key === "ArrowRight" ? 1 : -1;
                setPaint((current) => {
                    const index = PAINTS.findIndex((p) => p.id === current.id);
                    return PAINTS[(index + step + PAINTS.length) % PAINTS.length];
                });
            } else if (/^[1-5]$/.test(event.key)) {
                goToView(VIEW_ORDER[Number(event.key) - 1]);
            } else if (event.key === "e" || event.key === "E") {
                toggleEngine();
            } else if (event.key === " " && !(event.target instanceof HTMLButtonElement)) {
                event.preventDefault();
                rev();
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [live, reserveMode, goToView, toggleEngine, rev]);

    return (
        <main className="relative h-dvh w-full overflow-hidden bg-black font-sans">
            <ShowroomStage
                paint={paint}
                shot={shot}
                ready={ready}
                autoRotate={autoRotate}
                rotateSpeed={live ? 0.12 : 0.035}
                directed={!live}
                entered={entry !== "gate"}
                panelOpen={specsOpen}
                garage={garage}
                floor={floor}
                lightLevel={lightLevel}
                engineOn={engineOn}
                onReady={handleReady}
                onUserInteract={handleInteract}
            />

            {/* Just enough shade for the type, and a soft vignette. */}
            <div className={`pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[34%] bg-gradient-to-t from-black/70 to-transparent transition-opacity duration-1000 ${live ? "opacity-100" : "opacity-0"}`} />
            <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[34%] bg-gradient-to-b from-black/85 via-black/40 to-transparent sm:h-[18%] sm:from-black/50 sm:via-transparent" />
            <div className="vignette pointer-events-none absolute inset-0 z-10" />
            <div className="grain pointer-events-none absolute inset-0 z-10" />

            <Header
                show={live}
                onOverview={() => {
                    setSpecsOpen(false);
                    goToView("hero");
                }}
                onSpecs={() => setSpecsOpen(true)}
                onReserve={() => openReserve("reserve")}
                onTestDrive={() => openReserve("test-drive")}
                sound={sound}
                engineOn={engineOn}
                onToggleSound={toggleSound}
            />

            <HeroTitle show={live && !specsOpen} paint={paint} />

            {live && (
                <>
                    <div className="rise pointer-events-auto absolute bottom-[146px] left-1/2 z-20 -translate-x-1/2 sm:bottom-[140px] lg:bottom-8" style={{ animationDelay: "240ms" }}>
                        <IgnitionButton on={engineOn} onToggle={toggleEngine} onRev={rev} size="sm" />
                    </div>
                    {!specsOpen && (
                        <PaintBar
                            paint={paint}
                            garage={garage}
                            floor={floor}
                            lightLevel={lightLevel}
                            onPaint={setPaint}
                            onGarage={setGarage}
                            onFloor={setFloor}
                            onLightLevel={setLightLevel}
                        />
                    )}
                    {!specsOpen && (
                        <ViewRail view={view} autoRotate={autoRotate} onView={goToView} onToggleRotate={() => setAutoRotate((value) => !value)} />
                    )}
                </>
            )}

            <Entry ready={ready} stage={entry} onEnter={enter} />

            <SpecsPanel open={specsOpen} onClose={() => setSpecsOpen(false)} onReserve={() => openReserve("reserve")} />
            <ReserveDialog mode={reserveMode} paint={paint} onClose={() => setReserveMode(null)} />
            <Loader ready={ready} />
        </main>
    );
}
