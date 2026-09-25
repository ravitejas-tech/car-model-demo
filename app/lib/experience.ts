/**
 * Engine state shared by the UI, the 3D scene and the audio synth. All engine
 * timing (sound, rev counter, headlights, body shake) comes from the curves
 * below, evaluated on one clock, so everything stays in sync.
 */
import { useSyncExternalStore } from "react";

export type Phase = "off" | "running";

type State = {
    phase: Phase;
    /** Clock time (s) the engine was last started / stopped. */
    startedAt: number;
    stoppedAt: number;
    /** Clock time of the last throttle blip. */
    blipAt: number;
    sound: boolean;
};

let state: State = { phase: "off", startedAt: -100, stoppedAt: -100, blipAt: -100, sound: true };
const serverState = state;
const listeners = new Set<() => void>();

function set(patch: Partial<State>) {
    state = { ...state, ...patch };
    listeners.forEach((listener) => listener());
}

/** Seconds on the shared clock. */
export const clock = () => (typeof performance === "undefined" ? 0 : performance.now() / 1000);

export const engine = {
    get: () => state,
    subscribe(listener: () => void) {
        listeners.add(listener);
        return () => {
            listeners.delete(listener);
        };
    },
    start() {
        set({ phase: "running", startedAt: clock() });
    },
    stop() {
        if (state.phase !== "running") return;
        set({ phase: "off", stoppedAt: clock() });
    },
    /** Returns false if the engine can't take a blip yet (off or still starting). */
    blip() {
        const now = clock();
        if (state.phase !== "running" || now - state.startedAt < TIMELINE.settled) return false;
        if (now - state.blipAt < BLIP_SECONDS * 0.6) return false;
        set({ blipAt: now });
        return true;
    },
    setSound(sound: boolean) {
        set({ sound });
    },
};

export function useEngine() {
    return useSyncExternalStore(engine.subscribe, engine.get, () => serverState);
}

/* ------------------------------------------------------------------ */
/* Timeline                                                            */
/* ------------------------------------------------------------------ */

export const TIMELINE = {
    /** Starter motor cranks until the engine catches (lights come on here). */
    catch: 0.8,
    /** Start-up revs are over; throttle blips are allowed. */
    settled: 3.3,
};

/** rpm keyframes after pressing start: crank, catch + rev, blip, settle. */
const START_KEYS: [number, number][] = [
    [0, 0],
    [0.08, 260],
    [0.8, 280],
    [0.98, 3600],
    [1.55, 1200],
    [1.72, 2700],
    [2.3, 1050],
    [3.2, 820],
];

/** A throttle blip, added on top of idle. */
const BLIP_KEYS: [number, number][] = [
    [0, 0],
    [0.14, 3900],
    [0.3, 3300],
    [0.95, 0],
];
export const BLIP_SECONDS = 0.95;

const IDLE = 820;
const smooth = (t: number) => t * t * (3 - 2 * t);

function sample(keys: [number, number][], t: number) {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) {
        const [t1, v1] = keys[i];
        if (t <= t1) {
            const [t0, v0] = keys[i - 1];
            return v0 + (v1 - v0) * smooth((t - t0) / (t1 - t0));
        }
    }
    return keys[keys.length - 1][1];
}

/** Engine speed `t` seconds after the start button was pressed (no blips). */
export function startupRpm(t: number) {
    if (t <= 0) return 0;
    if (t >= TIMELINE.settled) return idleRpm(t);
    let rpm = sample(START_KEYS, t);
    // Starter motor chug.
    if (t < TIMELINE.catch) rpm += Math.sin(t * Math.PI * 2 * 11) * 60;
    return rpm;
}

/** Lumpy cam idle. */
function idleRpm(t: number) {
    return IDLE + Math.sin(t * 7.3) * 22 + Math.sin(t * 2.1) * 28;
}

/** Extra rpm from a throttle blip `t` seconds after it started. */
export function blipRpm(t: number) {
    if (t < 0 || t > BLIP_SECONDS) return 0;
    return sample(BLIP_KEYS, t);
}

/** Current engine speed, including blips and spin-down after shutdown. */
export function rpmNow(now = clock()) {
    const s = state;
    if (s.phase === "running") return startupRpm(now - s.startedAt) + blipRpm(now - s.blipAt);
    const since = now - s.stoppedAt;
    if (s.stoppedAt < 0 || since > 1) return 0;
    const before = startupRpm(s.stoppedAt - s.startedAt) + blipRpm(s.stoppedAt - s.blipAt);
    return before * (1 - smooth(Math.min(1, since / 0.9)));
}

/** 0–1 head/taillight level: off until the engine catches, then a welcome double flash. */
export function lightsLevel(now = clock()) {
    const s = state;
    if (s.phase === "off") return s.stoppedAt < 0 ? 0 : Math.max(0, 1 - (now - s.stoppedAt) / 0.4);
    const t = now - s.startedAt - TIMELINE.catch;
    if (t < 0) return 0;
    if (t < 0.08) return 1;
    if (t < 0.2) return 0.05;
    if (t < 0.3) return 1;
    if (t < 0.42) return 0.1;
    return Math.min(1, 0.45 + (t - 0.42) * 3);
}
