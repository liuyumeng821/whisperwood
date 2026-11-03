/**
 * WhisperWood SFX Engine — Gothic Dark Fairytale Audio
 * All sounds synthesized via Web Audio API. No external files.
 */

let ctx = null;
let masterGain = null;

function ensureCtx() {
    if (!ctx) {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        masterGain = ctx.createGain();
        masterGain.gain.value = 0.7;
        masterGain.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
}

// Utility: create noise buffer
function noiseBuffer(duration) {
    const c = ensureCtx();
    const sr = c.sampleRate;
    const len = Math.floor(sr * duration);
    const buf = c.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buf;
}

// ==================== SFX: Magic Success Chime ====================
// Ghost-blue shimmering arpeggio: fast ascending crystal notes
export function sfxSuccess() {
    const c = ensureCtx();
    const now = c.currentTime;
    const notes = [523, 659, 784, 1047, 1319]; // C5 E5 G5 C6 E6
    const baseGain = 0.15;
    const decay = 0.8;

    notes.forEach((freq, i) => {
        const t = now + i * 0.06;
        // Main tone
        const osc = c.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;
        const g = c.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(baseGain, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, t + decay * (1 - i * 0.1));
        osc.connect(g); g.connect(masterGain);
        osc.start(t); osc.stop(t + decay);

        // Shimmer overtone (ghost-blue sparkle)
        const osc2 = c.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.value = freq * 3; // Octave + fifth harmonic
        const g2 = c.createGain();
        g2.gain.setValueAtTime(0, t);
        g2.gain.linearRampToValueAtTime(baseGain * 0.3, t + 0.01);
        g2.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        osc2.connect(g2); g2.connect(masterGain);
        osc2.start(t); osc2.stop(t + 0.5);
    });
}

// ==================== SFX: Combo Bonus (higher with combo count) ====================
export function sfxCombo(comboLevel) {
    const c = ensureCtx();
    const now = c.currentTime;
    const lvl = Math.min(comboLevel, 10);
    const notes = [523, 659, 784, 1047, 1319, 1568, 1760, 2093, 2350, 2637];
    const freq = notes[Math.min(lvl - 1, notes.length - 1)];
    const dur = 0.4;
    const vol = 0.12 + lvl * 0.01;

    // Bright chime
    const osc = c.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);
    osc.connect(g); g.connect(masterGain);
    osc.start(now); osc.stop(now + dur);

    // Sub-glow
    const osc2 = c.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = freq / 2;
    const g2 = c.createGain();
    g2.gain.setValueAtTime(vol * 0.5, now);
    g2.gain.exponentialRampToValueAtTime(0.001, now + dur * 1.5);
    osc2.connect(g2); g2.connect(masterGain);
    osc2.start(now); osc2.stop(now + dur * 1.5);
}

// ==================== SFX: Curse Hit (failure / miss) ====================
// Deep, dark, heavy thud — like a coffin lid closing
export function sfxMiss() {
    const c = ensureCtx();
    const now = c.currentTime;

    // Sub-bass thud
    const osc = c.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.3);
    const g = c.createGain();
    g.gain.setValueAtTime(0.25, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.connect(g); g.connect(masterGain);
    osc.start(now); osc.stop(now + 0.4);

    // Noise crack (like breaking wood/bone)
    const noiseSrc = c.createBufferSource();
    noiseSrc.buffer = noiseBuffer(0.15);
    const ng = c.createGain();
    ng.gain.setValueAtTime(0.12, now);
    ng.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    const nf = c.createBiquadFilter();
    nf.type = 'bandpass'; nf.frequency.value = 500; nf.Q.value = 0.5;
    noiseSrc.connect(nf); nf.connect(ng); ng.connect(masterGain);
    noiseSrc.start(now); noiseSrc.stop(now + 0.15);
}

// ==================== SFX: Demon Gaze Heartbeat ====================
// Low, ominous thump-thump like a giant heart
// phase 1: slow, deep. phase 2 (intensify=true): faster, higher-pitched
export function sfxDemonHeartbeat(intensify = false) {
    const c = ensureCtx();
    const now = c.currentTime;
    const baseFreq = intensify ? 70 : 50;
    const interval = intensify ? 0.55 : 0.9;
    const count = intensify ? 4 : 3;

    for (let i = 0; i < count; i++) {
        const t = now + i * interval;
        // Main thump
        const osc = c.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(baseFreq, t);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.35, t + 0.3);
        const g = c.createGain();
        g.gain.setValueAtTime(intensify ? 0.35 : 0.3, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        osc.connect(g); g.connect(masterGain);
        osc.start(t); osc.stop(t + 0.35);

        // Harmonic overtone (darker) for intensified
        if (intensify) {
            const osc2 = c.createOscillator();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(baseFreq * 0.5, t);
            osc2.frequency.exponentialRampToValueAtTime(15, t + 0.35);
            const g2 = c.createGain();
            g2.gain.setValueAtTime(0.15, t);
            g2.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
            osc2.connect(g2); g2.connect(masterGain);
            osc2.start(t); osc2.stop(t + 0.45);
        }
    }
}

// ==================== SFX: Mirror Curse Activate ====================
// Metallic, distorted, reversed-feeling chime
export function sfxMirrorActivate() {
    const c = ensureCtx();
    const now = c.currentTime;

    // Descending metallic tones (mirror = reversed)
    const notes = [1568, 1319, 1047, 784];
    notes.forEach((freq, i) => {
        const t = now + i * 0.08;
        const osc = c.createOscillator();
        osc.type = 'square';
        osc.frequency.value = freq;
        const g = c.createGain();
        g.gain.setValueAtTime(0.06, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        osc.connect(g); g.connect(masterGain);
        osc.start(t); osc.stop(t + 0.3);

        // Detuned shadow
        const osc2 = c.createOscillator();
        osc2.type = 'sawtooth';
        osc2.frequency.value = freq * 0.99; // Slightly detuned = unsettling
        const g2 = c.createGain();
        g2.gain.setValueAtTime(0.03, t);
        g2.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
        osc2.connect(g2); g2.connect(masterGain);
        osc2.start(t); osc2.stop(t + 0.45);
    });
}

// ==================== SFX: Button Click ====================
// Subtle wooden/stone tap
export function sfxClick() {
    const c = ensureCtx();
    const now = c.currentTime;

    const osc = c.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.06);
    const g = c.createGain();
    g.gain.setValueAtTime(0.08, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    osc.connect(g); g.connect(masterGain);
    osc.start(now); osc.stop(now + 0.08);
}

// ==================== SFX: Countdown Tick ====================
// Deep wooden knock with slight reverb
export function sfxTick() {
    const c = ensureCtx();
    const now = c.currentTime;

    const osc = c.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.12);
    const g = c.createGain();
    g.gain.setValueAtTime(0.15, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(g); g.connect(masterGain);
    osc.start(now); osc.stop(now + 0.15);

    // Knock body
    const osc2 = c.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = 80;
    const g2 = c.createGain();
    g2.gain.setValueAtTime(0.1, now);
    g2.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc2.connect(g2); g2.connect(masterGain);
    osc2.start(now); osc2.stop(now + 0.1);
}

// ==================== SFX: Final Countdown BOOM ====================
export function sfxFinalTick() {
    const c = ensureCtx();
    const now = c.currentTime;

    const osc = c.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(60, now);
    osc.frequency.exponentialRampToValueAtTime(15, now + 0.5);
    const g = c.createGain();
    g.gain.setValueAtTime(0.35, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc.connect(g); g.connect(masterGain);
    osc.start(now); osc.stop(now + 0.6);
}

// ==================== SFX: Page Turn / Transition ====================
// Rustling, ethereal whoosh
export function sfxTransition() {
    const c = ensureCtx();
    const now = c.currentTime;

    // Windy whoosh (filtered noise)
    const noiseSrc = c.createBufferSource();
    noiseSrc.buffer = noiseBuffer(0.4);
    const nf = c.createBiquadFilter();
    nf.type = 'bandpass';
    nf.frequency.setValueAtTime(2000, now);
    nf.frequency.exponentialRampToValueAtTime(200, now + 0.4);
    nf.Q.value = 1;
    const ng = c.createGain();
    ng.gain.setValueAtTime(0.08, now);
    ng.gain.setValueAtTime(0.1, now + 0.1);
    ng.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    noiseSrc.connect(nf); nf.connect(ng); ng.connect(masterGain);
    noiseSrc.start(now); noiseSrc.stop(now + 0.45);
}

// ==================== SFX: Whisper Voice (creepy breath) ====================
export function sfxWhisper() {
    const c = ensureCtx();
    const now = c.currentTime;

    // Filtered noise = breathy whisper
    for (let i = 0; i < 3; i++) {
        const t = now + i * 0.3;
        const noiseSrc = c.createBufferSource();
        noiseSrc.buffer = noiseBuffer(0.2 + Math.random() * 0.1);
        const nf = c.createBiquadFilter();
        nf.type = 'bandpass';
        nf.frequency.value = 600 + Math.random() * 400;
        nf.Q.value = 3;
        const ng = c.createGain();
        ng.gain.setValueAtTime(0.04, t);
        ng.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        noiseSrc.connect(nf); nf.connect(ng); ng.connect(masterGain);
        noiseSrc.start(t); noiseSrc.stop(t + 0.3);
    }
}

// ==================== SFX: Wave Clear / Boss phase change ====================
export function sfxWaveClear() {
    const c = ensureCtx();
    const now = c.currentTime;

    // Triumphant dark chord
    const freqs = [261, 330, 392, 523]; // C-E-G-C minor-ish
    freqs.forEach((f, i) => {
        const t = now + i * 0.1;
        const osc = c.createOscillator();
        osc.type = 'triangle';
        osc.frequency.value = f;
        const g = c.createGain();
        g.gain.setValueAtTime(0.1, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 1.2 - i * 0.1);
        osc.connect(g); g.connect(masterGain);
        osc.start(t); osc.stop(t + 1.5);
    });
}

// ==================== Ambient Drone (battle background) ====================
let droneOsc = null, droneGain = null;

export function sfxBattleStart() {
    const c = ensureCtx();
    const now = c.currentTime;

    stopDrone();
    droneOsc = c.createOscillator();
    droneOsc.type = 'sine';
    droneOsc.frequency.value = 40; // Deep sub rumble

    const osc2 = c.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = 40.5; // Slightly detuned = beat frequency = unsettling

    droneGain = c.createGain();
    droneGain.gain.setValueAtTime(0, now);
    droneGain.gain.linearRampToValueAtTime(0.04, now + 1.5);

    const merger = c.createGain();
    merger.gain.value = 0.5;

    droneOsc.connect(merger);
    osc2.connect(merger);
    merger.connect(droneGain);
    droneGain.connect(masterGain);

    droneOsc.start(now);
    osc2.start(now);
}

function stopDrone() {
    if (droneOsc) { try { droneOsc.stop(); } catch (e) { } droneOsc = null; }
}

export function sfxBattleStop() {
    const c = ensureCtx();
    if (!droneGain) return;
    const now = c.currentTime;
    droneGain.gain.linearRampToValueAtTime(0, now + 0.5);
    setTimeout(stopDrone, 600);
}

// ==================== Settings ====================
export function setVolume(v) {
    if (masterGain) masterGain.gain.value = Math.max(0, Math.min(1, v));
}
export function getVolume() {
    return masterGain ? masterGain.gain.value : 0.7;
}
