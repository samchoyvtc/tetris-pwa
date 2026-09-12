const AUDIO_CTX = "AudioContext" in window ? new AudioContext() : null;

function release(ctx, gain, when) {
  gain.gain.setValueAtTime(gain.gain.value, when);
  gain.gain.exponentialRampToValueAtTime(0.001, when + 0.08);
}

function playTone({ freq, duration, type = "square", attack = 0.01, sweep = null, volume = 0.12, delay = 0 }) {
  if (!AUDIO_CTX) return;
  if (AUDIO_CTX.state === "suspended") AUDIO_CTX.resume();

  const ctx = AUDIO_CTX;
  const t = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (sweep) osc.frequency.exponentialRampToValueAtTime(sweep, t + duration);

  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(volume, t + attack);
  gain.gain.setValueAtTime(volume, t + duration - 0.05);
  release(ctx, gain, t + duration - 0.05);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(t);
  osc.stop(t + duration + 0.12);
}

function playChord({ freqs, duration, type = "triangle", volume = 0.1, delay = 0 }) {
  if (!AUDIO_CTX) return;
  if (AUDIO_CTX.state === "suspended") AUDIO_CTX.resume();
  freqs.forEach((freq, i) => {
    playTone({ freq, duration, type, volume, delay: delay + i * 0.02 });
  });
}

export function resumeAudio() {
  if (AUDIO_CTX && AUDIO_CTX.state === "suspended") AUDIO_CTX.resume();
}

export function playMove() {
  playTone({ freq: 260, duration: 0.06, type: "triangle", volume: 0.06 });
}

export function playRotate() {
  playTone({ freq: 360, duration: 0.07, type: "sine", volume: 0.06, sweep: 440 });
}

export function playLock() {
  playTone({ freq: 140, duration: 0.1, type: "square", volume: 0.1 });
}

export function playClear(lines) {
  const base = 330;
  const arp = [];
  for (let i = 0; i < lines; i += 1) arp.push(base + i * 110);
  arp.push(base + lines * 110 + 220);
  playChord({ freqs: arp, duration: 0.28, type: "triangle", volume: 0.1, delay: 0.05 });
}

export function playLevelUp() {
  playChord({ freqs: [440, 554, 659, 880], duration: 0.35, type: "triangle", volume: 0.12, delay: 0.05 });
}

export function playGameOver() {
  playTone({ freq: 300, duration: 0.35, type: "sawtooth", sweep: 90, volume: 0.14, delay: 0.05 });
  playTone({ freq: 80, duration: 0.55, type: "square", volume: 0.1, delay: 0.35 });
}
