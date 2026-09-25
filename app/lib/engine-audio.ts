/**
 * A small WebAudio synth: V8 start-up and idle, garage light switches and a
 * paint-scanner whoosh. Everything is generated; there are no audio files.
 * The AudioContext is created on the first user gesture (browser policy).
 */
import { BLIP_SECONDS, blipRpm, startupRpm, TIMELINE } from "./experience";

const CURVE_SECONDS = TIMELINE.settled;
const CURVE_STEP = 0.02;

type EngineNodes = {
    oscillators: OscillatorNode[];
    sources: AudioBufferSourceNode[];
    firing: OscillatorNode[];
    half: OscillatorNode[];
    roar: BiquadFilterNode;
    tone: BiquadFilterNode;
    amp: GainNode;
    lope: OscillatorNode;
};

class EngineAudio {
    private ctx: AudioContext | null = null;
    private master: GainNode | null = null;
    private noise: AudioBuffer | null = null;
    private engine: EngineNodes | null = null;
    private muted = false;

    /** Must be called from a user gesture before anything is audible. */
    unlock() {
        if (typeof window === "undefined") return;
        if (!this.ctx) {
            const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
            if (!Ctx) return;
            this.ctx = new Ctx();
            this.master = this.ctx.createGain();
            this.master.gain.value = this.muted ? 0 : 0.9;
            // Gentle limiter so revs never clip.
            const limiter = this.ctx.createDynamicsCompressor();
            limiter.threshold.value = -10;
            limiter.ratio.value = 8;
            this.master.connect(limiter).connect(this.ctx.destination);
            this.noise = this.makeNoise();
        }
        if (this.ctx.state === "suspended") void this.ctx.resume();
    }

    setMuted(muted: boolean) {
        this.muted = muted;
        if (!this.ctx || !this.master) return;
        this.master.gain.setTargetAtTime(muted ? 0 : 0.9, this.ctx.currentTime, 0.08);
    }

    /** Starter crank, catch, rev, blip, settle into a lumpy idle. */
    start() {
        const ctx = this.ctx;
        if (!ctx || !this.master || !this.noise) return;
        this.stop(true);
        const t0 = ctx.currentTime + 0.02;

        this.starterMotor(t0);

        const firing = [ctx.createOscillator(), ctx.createOscillator()];
        firing[0].type = "sawtooth";
        firing[1].type = "sawtooth";
        firing[1].detune.value = 9;
        const half = [ctx.createOscillator(), ctx.createOscillator()];
        half[0].type = "square";
        half[1].type = "sine";

        const noise = ctx.createBufferSource();
        noise.buffer = this.noise;
        noise.loop = true;
        const roar = ctx.createBiquadFilter();
        roar.type = "bandpass";
        roar.Q.value = 1.1;
        const roarGain = ctx.createGain();
        roarGain.gain.value = 0.35;

        const mix = ctx.createGain();
        mix.gain.value = 0.5;
        const shaper = ctx.createWaveShaper();
        shaper.curve = softClip(2.4);
        const tone = ctx.createBiquadFilter();
        tone.type = "lowpass";
        tone.Q.value = 0.9;
        const amp = ctx.createGain();
        amp.gain.value = 0;

        // Cam lope: amplitude wobble at half crank speed.
        const lope = ctx.createOscillator();
        lope.type = "sine";
        const lopeDepth = ctx.createGain();
        lopeDepth.gain.value = 0.35;
        const lopeTarget = ctx.createGain();
        lopeTarget.gain.value = 0.65;
        lope.connect(lopeDepth).connect(lopeTarget.gain);

        const firingGain = ctx.createGain();
        firingGain.gain.value = 0.55;
        const halfGain = ctx.createGain();
        halfGain.gain.value = 0.5;
        firing.forEach((o) => o.connect(firingGain));
        half.forEach((o) => o.connect(halfGain));
        firingGain.connect(mix);
        halfGain.connect(mix);
        noise.connect(roar).connect(roarGain).connect(mix);
        mix.connect(lopeTarget).connect(shaper).connect(tone).connect(amp).connect(this.master);

        // Drive every rpm-dependent parameter from the shared timeline.
        const n = Math.ceil(CURVE_SECONDS / CURVE_STEP);
        const curves = {
            firing: new Float32Array(n),
            half: new Float32Array(n),
            roar: new Float32Array(n),
            tone: new Float32Array(n),
            amp: new Float32Array(n),
            lope: new Float32Array(n),
        };
        for (let i = 0; i < n; i++) {
            const rpm = Math.max(1, startupRpm(i * CURVE_STEP));
            const p = paramsFor(rpm);
            curves.firing[i] = p.firing;
            curves.half[i] = p.firing / 2;
            curves.roar[i] = p.roar;
            curves.tone[i] = p.tone;
            curves.amp[i] = i * CURVE_STEP < TIMELINE.catch - 0.04 ? 0.012 : p.amp;
            curves.lope[i] = p.lope;
        }
        firing.forEach((o) => o.frequency.setValueCurveAtTime(curves.firing, t0, CURVE_SECONDS));
        half.forEach((o) => o.frequency.setValueCurveAtTime(curves.half, t0, CURVE_SECONDS));
        roar.frequency.setValueCurveAtTime(curves.roar, t0, CURVE_SECONDS);
        tone.frequency.setValueCurveAtTime(curves.tone, t0, CURVE_SECONDS);
        amp.gain.setValueCurveAtTime(curves.amp, t0, CURVE_SECONDS);
        lope.frequency.setValueCurveAtTime(curves.lope, t0, CURVE_SECONDS);

        const oscillators = [...firing, ...half, lope];
        oscillators.forEach((o) => o.start(t0));
        noise.start(t0);

        this.engine = { oscillators, sources: [noise], firing, half, roar, tone, amp, lope };
    }

    /** Throttle blip on top of idle: rev, hang, fall back. */
    blip() {
        const ctx = this.ctx;
        const engine = this.engine;
        if (!ctx || !engine) return;
        const t0 = ctx.currentTime + 0.01;
        const n = Math.ceil(BLIP_SECONDS / CURVE_STEP);
        const curves = { firing: new Float32Array(n), roar: new Float32Array(n), tone: new Float32Array(n), amp: new Float32Array(n), lope: new Float32Array(n) };
        for (let i = 0; i < n; i++) {
            const p = paramsFor(820 + blipRpm(i * CURVE_STEP));
            curves.firing[i] = p.firing;
            curves.roar[i] = p.roar;
            curves.tone[i] = p.tone;
            curves.amp[i] = p.amp;
            curves.lope[i] = p.lope;
        }
        const apply = (param: AudioParam, values: Float32Array) => {
            param.cancelScheduledValues(t0);
            param.setValueCurveAtTime(values, t0, BLIP_SECONDS);
        };
        engine.firing.forEach((o) => apply(o.frequency, curves.firing));
        engine.half.forEach((o) => apply(o.frequency, curves.firing.map((f) => f / 2)));
        apply(engine.roar.frequency, curves.roar);
        apply(engine.tone.frequency, curves.tone);
        apply(engine.amp.gain, curves.amp);
        apply(engine.lope.frequency, curves.lope);
    }

    /** Spin down and fade out. */
    stop(immediate = false) {
        const ctx = this.ctx;
        const engine = this.engine;
        if (!ctx || !engine) return;
        this.engine = null;
        const now = ctx.currentTime;
        const fade = immediate ? 0.05 : 1.1;
        const params = [
            ...engine.firing.map((o) => o.frequency),
            ...engine.half.map((o) => o.frequency),
            engine.roar.frequency,
            engine.tone.frequency,
            engine.amp.gain,
            engine.lope.frequency,
        ];
        params.forEach((param) => {
            param.cancelScheduledValues(now);
            param.setValueAtTime(param.value, now);
        });
        engine.firing.forEach((o) => o.frequency.exponentialRampToValueAtTime(12, now + fade));
        engine.half.forEach((o) => o.frequency.exponentialRampToValueAtTime(6, now + fade));
        engine.tone.frequency.exponentialRampToValueAtTime(90, now + fade);
        engine.amp.gain.linearRampToValueAtTime(0, now + fade);
        const end = now + fade + 0.1;
        engine.oscillators.forEach((o) => o.stop(end));
        engine.sources.forEach((s) => s.stop(end));
    }

    /** "Chk" of a heavy light switch, scheduled `delay` seconds from now. */
    lightSwitch(delay: number, pitch = 1) {
        const ctx = this.ctx;
        if (!ctx || !this.master || !this.noise) return;
        const t = ctx.currentTime + delay;
        const src = ctx.createBufferSource();
        src.buffer = this.noise;
        const hp = ctx.createBiquadFilter();
        hp.type = "bandpass";
        hp.frequency.value = 2400 * pitch;
        hp.Q.value = 3;
        const env = ctx.createGain();
        env.gain.setValueAtTime(0, t);
        env.gain.linearRampToValueAtTime(0.5, t + 0.003);
        env.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
        src.connect(hp).connect(env).connect(this.master);
        src.start(t, Math.random());
        src.stop(t + 0.1);

        // Low thump of the relay.
        const thump = ctx.createOscillator();
        thump.frequency.setValueAtTime(95 * pitch, t);
        thump.frequency.exponentialRampToValueAtTime(40, t + 0.08);
        const thumpEnv = ctx.createGain();
        thumpEnv.gain.setValueAtTime(0.3, t);
        thumpEnv.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
        thump.connect(thumpEnv).connect(this.master);
        thump.start(t);
        thump.stop(t + 0.12);

        // Fluorescent buzz as the tube strikes.
        const buzz = ctx.createOscillator();
        buzz.type = "sawtooth";
        buzz.frequency.value = 100;
        const buzzFilter = ctx.createBiquadFilter();
        buzzFilter.type = "bandpass";
        buzzFilter.frequency.value = 1200;
        const buzzEnv = ctx.createGain();
        buzzEnv.gain.setValueAtTime(0, t + 0.02);
        buzzEnv.gain.linearRampToValueAtTime(0.025, t + 0.08);
        buzzEnv.gain.exponentialRampToValueAtTime(0.0005, t + 0.6);
        buzz.connect(buzzFilter).connect(buzzEnv).connect(this.master);
        buzz.start(t);
        buzz.stop(t + 0.65);
    }

    /** Rising, airy sweep for the paint scanner. */
    scan(duration: number) {
        const ctx = this.ctx;
        if (!ctx || !this.master || !this.noise) return;
        const t = ctx.currentTime;
        const src = ctx.createBufferSource();
        src.buffer = this.noise;
        src.loop = true;
        const band = ctx.createBiquadFilter();
        band.type = "bandpass";
        band.Q.value = 6;
        band.frequency.setValueAtTime(500, t);
        band.frequency.exponentialRampToValueAtTime(4200, t + duration);
        const env = ctx.createGain();
        env.gain.setValueAtTime(0, t);
        env.gain.linearRampToValueAtTime(0.12, t + 0.15);
        env.gain.setValueAtTime(0.12, t + duration - 0.25);
        env.gain.linearRampToValueAtTime(0, t + duration);
        src.connect(band).connect(env).connect(this.master);
        src.start(t);
        src.stop(t + duration + 0.05);

        // A soft tonal shimmer riding on top.
        const tone = ctx.createOscillator();
        tone.type = "sine";
        tone.frequency.setValueAtTime(660, t);
        tone.frequency.exponentialRampToValueAtTime(1320, t + duration);
        const toneEnv = ctx.createGain();
        toneEnv.gain.setValueAtTime(0, t);
        toneEnv.gain.linearRampToValueAtTime(0.02, t + 0.2);
        toneEnv.gain.linearRampToValueAtTime(0, t + duration);
        tone.connect(toneEnv).connect(this.master);
        tone.start(t);
        tone.stop(t + duration + 0.05);
    }

    private starterMotor(t0: number) {
        const ctx = this.ctx!;
        const src = ctx.createBufferSource();
        src.buffer = this.noise;
        src.loop = true;
        const band = ctx.createBiquadFilter();
        band.type = "bandpass";
        band.frequency.value = 900;
        band.Q.value = 2.5;
        const chug = ctx.createGain();
        chug.gain.value = 0.5;
        const chugLfo = ctx.createOscillator();
        chugLfo.type = "square";
        chugLfo.frequency.value = 11;
        const chugDepth = ctx.createGain();
        chugDepth.gain.value = 0.5;
        chugLfo.connect(chugDepth).connect(chug.gain);
        const env = ctx.createGain();
        env.gain.setValueAtTime(0, t0);
        env.gain.linearRampToValueAtTime(0.35, t0 + 0.06);
        env.gain.setValueAtTime(0.35, t0 + TIMELINE.catch - 0.1);
        env.gain.linearRampToValueAtTime(0, t0 + TIMELINE.catch + 0.05);

        const whine = ctx.createOscillator();
        whine.type = "triangle";
        whine.frequency.setValueAtTime(180, t0);
        whine.frequency.linearRampToValueAtTime(260, t0 + TIMELINE.catch);
        const whineGain = ctx.createGain();
        whineGain.gain.value = 0.08;

        src.connect(band).connect(chug).connect(env);
        whine.connect(whineGain).connect(env);
        env.connect(this.master!);
        const end = t0 + TIMELINE.catch + 0.1;
        [src, chugLfo, whine].forEach((node) => {
            node.start(t0);
            node.stop(end);
        });
    }

    private makeNoise() {
        const ctx = this.ctx!;
        const length = ctx.sampleRate * 2;
        const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        // Slightly pink noise: warmer than white.
        let last = 0;
        for (let i = 0; i < length; i++) {
            const white = Math.random() * 2 - 1;
            last = 0.97 * last + 0.03 * white;
            data[i] = (white * 0.35 + last * 3) * 0.6;
        }
        return buffer;
    }
}

/** Map engine speed to synth parameters. */
function paramsFor(rpm: number) {
    // A V8 fires four times per crank revolution.
    const firing = Math.max(8, (rpm / 60) * 4);
    const load = Math.min(1, Math.max(0, (rpm - 800) / 3000));
    return {
        firing,
        roar: 180 + firing * 3.2,
        tone: 260 + rpm * 0.55,
        amp: 0.16 + load * 0.32,
        lope: Math.max(2, rpm / 120),
    };
}

function softClip(drive: number) {
    const n = 1024;
    const curve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
        const x = (i / (n - 1)) * 2 - 1;
        curve[i] = Math.tanh(x * drive) / Math.tanh(drive);
    }
    return curve;
}

export const engineAudio = new EngineAudio();
