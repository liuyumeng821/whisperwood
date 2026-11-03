/**
 * WhisperWood BGM Player — External audio file with loop
 * Uses HTMLAudioElement for simplicity. All SFX remain Web Audio API.
 */

let bgmAudio = null;
let bgmOn = true;

export function bgmStart(fileName = 'bgm.mp3') {
    if (bgmAudio) return;

    bgmAudio = new Audio(fileName);
    bgmAudio.loop = true;
    bgmAudio.volume = 0.3;
    bgmAudio.play().catch(() => {
        // Autoplay may be blocked — will retry on first user interaction
        bgmAudio = null;
    });
}

export function bgmStop() {
    if (!bgmAudio) return;
    bgmAudio.pause();
    bgmAudio.currentTime = 0;
    bgmAudio = null;
}

export function setBgmVolume(v) {
    bgmOn = v > 0;
    if (bgmAudio) bgmAudio.volume = v;
}

export function getBgmVolume() {
    return bgmAudio ? bgmAudio.volume : 0;
}

// Retry start on user gesture (browser autoplay policy)
let retryAttached = false;
export function bgmRetryOnTap(fileName = 'bgm.mp3') {
    if (retryAttached || bgmAudio) return;
    retryAttached = true;
    const handler = () => {
        if (!bgmAudio && bgmOn) bgmStart(fileName);
        if (bgmAudio) {
            document.removeEventListener('click', handler);
            document.removeEventListener('touchstart', handler);
        }
    };
    document.addEventListener('click', handler, {once: false});
    document.addEventListener('touchstart', handler, {once: false});
}
