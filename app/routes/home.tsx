import { useCallback, useEffect, useState } from "react";
import { ShowroomStage } from "~/components/scene/showroom-stage";
import { ConfiguratorDock } from "~/components/ui/configurator-dock";
import { Header } from "~/components/ui/header";
import { HeroCopy } from "~/components/ui/hero-copy";
import { DragIcon } from "~/components/ui/icons";
import { Loader } from "~/components/ui/loader";
import { ReserveDialog, type ReserveMode } from "~/components/ui/reserve-dialog";
import { SpecsPanel } from "~/components/ui/specs-panel";
import { GARAGE_THEMES, type FloorFinish } from "~/lib/garage";
import { PAINTS, VIEW_ORDER, VIEWS, type CameraShot, type ViewId } from "~/lib/showroom";

export default function Showroom() {
    const [ready, setReady] = useState(false);
    const [paint, setPaint] = useState(PAINTS[0]);
    const [view, setView] = useState<ViewId | null>("hero");
    // A fresh object per request, so re-selecting the same view re-frames the car.
    const [shot, setShot] = useState<CameraShot>({ ...VIEWS.hero });
    const [autoRotate, setAutoRotate] = useState(true);
    const [garage, setGarage] = useState(GARAGE_THEMES[0]);
    const [floor, setFloor] = useState<FloorFinish["id"]>("epoxy");
    const [lightLevel, setLightLevel] = useState(1);
    const [specsOpen, setSpecsOpen] = useState(false);
    const [reserveMode, setReserveMode] = useState<ReserveMode | null>(null);
    const [interacted, setInteracted] = useState(false);

    useEffect(() => {
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setAutoRotate(false);
    }, []);

    // Drive the UI accent colour from the selected paint.
    useEffect(() => {
        document.documentElement.style.setProperty("--accent", paint.accent);
    }, [paint]);

    const handleReady = useCallback(() => setReady(true), []);
    const handleInteract = useCallback(() => {
        setInteracted(true);
        setView(null);
    }, []);

    const goToView = useCallback((id: ViewId) => {
        setView(id);
        setShot({ ...VIEWS[id] });
        // Hold still on a chosen angle; the 360° view keeps spinning.
        setAutoRotate(id === "hero");
    }, []);

    const openReserve = (mode: ReserveMode) => {
        setSpecsOpen(false);
        setReserveMode(mode);
    };

    // Keyboard: ← → cycle paint, 1–5 camera angles, Esc closes panels.
    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (reserveMode || event.target instanceof HTMLInputElement) return;
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
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [reserveMode, goToView]);

    return (
        <main className="relative h-dvh w-full overflow-hidden font-sans" style={{ background: garage.background }}>
            <ShowroomStage
                paint={paint}
                shot={shot}
                ready={ready}
                autoRotate={autoRotate}
                panelOpen={specsOpen}
                garage={garage}
                floor={floor}
                lightLevel={lightLevel}
                onReady={handleReady}
                onUserInteract={handleInteract}
            />

            {/* Darken the left edge so the copy stays legible in brighter garages. */}
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 hidden w-[46%] bg-gradient-to-r from-black/65 via-black/25 to-transparent md:block" />
            <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[45%] bg-gradient-to-b from-black/60 to-transparent md:hidden" />
            <div className="vignette pointer-events-none absolute inset-0 z-10" />
            <div className="grain pointer-events-none absolute inset-0 z-10" />

            <Header
                onOverview={() => {
                    setSpecsOpen(false);
                    goToView("hero");
                }}
                onSpecs={() => setSpecsOpen(true)}
                onReserve={() => openReserve("reserve")}
                onTestDrive={() => openReserve("test-drive")}
            />

            <HeroCopy
                ready={ready}
                hidden={specsOpen}
                paint={paint}
                onReserve={() => openReserve("reserve")}
                onSpecs={() => setSpecsOpen(true)}
            />

            {ready && !interacted && (
                <div className="reveal pointer-events-none absolute bottom-40 right-8 z-20 hidden items-center gap-3 text-[11px] uppercase tracking-[0.25em] text-white/55 lg:flex" style={{ animationDelay: "1400ms" }}>
                    <DragIcon className="size-5 animate-[drift_2.4s_ease-in-out_infinite]" />
                    Drag to rotate · Scroll to zoom
                </div>
            )}

            <ConfiguratorDock
                ready={ready}
                paint={paint}
                view={view}
                autoRotate={autoRotate}
                garage={garage}
                floor={floor}
                lightLevel={lightLevel}
                onPaint={setPaint}
                onView={goToView}
                onToggleRotate={() => setAutoRotate((value) => !value)}
                onSpecs={() => setSpecsOpen(true)}
                onGarage={setGarage}
                onFloor={setFloor}
                onLightLevel={setLightLevel}
            />

            <SpecsPanel open={specsOpen} onClose={() => setSpecsOpen(false)} onReserve={() => openReserve("reserve")} />
            <ReserveDialog mode={reserveMode} paint={paint} onClose={() => setReserveMode(null)} />
            <Loader ready={ready} />
        </main>
    );
}
