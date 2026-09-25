/**
 * Shared, mutable animation state for the 3D stage and the HUD.
 *
 * Values here change every frame, so they live outside React state: scene
 * components read them in `useFrame` and HUD elements poll them with rAF.
 */
export const stage = {
    /** Clock time the car was ready and the silhouette rim light began. */
    gateStart: -1,
    /** Clock time (s) the lights-on intro started; -1 until the visitor presses start. */
    introStart: -1,
    /** Clock time the current garage's fixtures started powering on. */
    fixturesStart: -1,
    /**
     * Brightness of the visible ceiling fixtures: full while they strike
     * during the entry, then settling to a dim glow (dimmer on portrait
     * screens, where the ceiling is always in frame).
     */
    ceiling: 1,
    /** Overall room power 0–1: eases up during the intro. */
    room: 0,
    /** Engine 0–1: headlights, taillights and idle, eased with a start-up flicker. */
    engine: 0,
    engineOn: false,
    /** Current engine speed (r/min), from the shared engine timeline. */
    rpm: 0,
    /** Clock time the engine last caught (for the start-up rock). */
    engineStart: -10,
    /** Clock time the paint last changed (floor shockwave). */
    paintPulse: -10,
    /** Camera readout for the HUD, in degrees. */
    azimuth: 0,
    elevation: 0,
    distance: 0,
};

/**
 * Brightness of a fluorescent-style fixture `t` seconds after it was switched
 * on: a couple of stuttering blinks, then a quick ramp to full.
 */
export function flicker(t: number): number {
    if (t <= 0) return 0;
    if (t < 0.05) return 0.9;
    if (t < 0.13) return 0.08;
    if (t < 0.19) return 0.75;
    if (t < 0.3) return 0.12;
    if (t < 0.36) return 0.95;
    if (t < 0.42) return 0.35;
    if (t < 0.7) return 0.6 + ((t - 0.42) / 0.28) * 0.4;
    return 1;
}

/** Smooth 0→1 ramp between `start` and `start + duration`. */
export function ramp(t: number, start: number, duration: number): number {
    const x = Math.min(1, Math.max(0, (t - start) / duration));
    return x * x * (3 - 2 * x);
}

/** Seconds since the intro began (0 before it starts). */
export function introTime(clock: number): number {
    return stage.introStart < 0 ? 0 : clock - stage.introStart;
}

/** Intro timeline, in seconds after the model is ready. */
export const INTRO = {
    rim: 0.15,
    fixtures: 0.55,
    keyLight: 1.35,
    turntable: 1.1,
    signage: 1.2,
    word: 1.45,
    ui: 1.6,
};

/* Paint scanner: a gantry sweeps nose → tail, repainting the body as it goes. */
export const SCAN_SECONDS = 1.5;
const SCAN_FROM = 2.75;
const SCAN_TO = -2.75;

/** Where the scan line is (world z) and how bright its glow is, `t` s after a paint change. */
export function paintScan(t: number) {
    if (t < 0 || t >= SCAN_SECONDS) return { z: -100, strength: 0, active: false };
    const k = t / SCAN_SECONDS;
    const eased = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
    const strength = ramp(k, 0, 0.12) * (1 - ramp(k, 0.82, 0.18));
    return { z: SCAN_FROM + (SCAN_TO - SCAN_FROM) * eased, strength, active: true };
}
