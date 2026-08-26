let enabled = true;
let audioContext = null;

function context() {
  if (!enabled) return null;
  if (!audioContext) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    audioContext = new AudioContext();
  }
  if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
  return audioContext;
}

function tone(frequency, duration, volume, type = 'sine') {
  const ctx = context();
  if (!ctx) return;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
  oscillator.connect(gain).connect(ctx.destination);
  oscillator.start();
  oscillator.stop(ctx.currentTime + duration);
}

export function playStep() { tone(135, 0.035, 0.018, 'triangle'); }
export function playCaught() {
  tone(120, 0.16, 0.05, 'sawtooth');
  setTimeout(() => tone(78, 0.2, 0.04, 'sawtooth'), 70);
}
export function setSoundEnabled(value) { enabled = Boolean(value); return enabled; }
export function isSoundEnabled() { return enabled; }
