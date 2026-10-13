import fs from 'fs';
import path from 'path';

const sfxDir = path.resolve('public/default-assets/sfx');
fs.mkdirSync(sfxDir, { recursive: true });

function createWavBuffer(sampleRate, samples) {
  const byteRate = sampleRate * 2; // 16-bit mono
  const blockAlign = 2;
  const dataSize = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // fmt chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // subchunk1 size
  buffer.writeUInt16LE(1, 20); // PCM format
  buffer.writeUInt16LE(1, 22); // Mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(16, 34); // Bits per sample

  // data chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    const intSample = s < 0 ? s * 0x8000 : s * 0x7fff;
    buffer.writeInt16LE(Math.floor(intSample), 44 + i * 2);
  }

  return buffer;
}

const sampleRate = 22050;

function generateSound(duration, synthFn) {
  const numSamples = Math.floor(sampleRate * duration);
  const samples = new Float32Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    samples[i] = synthFn(t, duration);
  }
  return createWavBuffer(sampleRate, samples);
}

// 1. Jump (quick upward chirp)
const jumpWav = generateSound(0.12, (t, dur) => {
  const freq = 300 + (t / dur) * 450;
  const env = 1 - (t / dur);
  return Math.sin(2 * Math.PI * freq * t) * env * 0.5;
});

// 2. Spring (boing with frequency sweep)
const springWav = generateSound(0.3, (t, dur) => {
  const freq = 250 + Math.sin(t * 40) * 100 + (t / dur) * 600;
  const env = Math.exp(-t * 8);
  return Math.sin(2 * Math.PI * freq * t) * env * 0.6;
});

// 3. Trampoline (deep boing)
const trampolineWav = generateSound(0.35, (t, dur) => {
  const freq = 180 + Math.sin(t * 30) * 80 + (t / dur) * 500;
  const env = Math.exp(-t * 6);
  return Math.sin(2 * Math.PI * freq * t) * env * 0.7;
});

// 4. Break (crack noise)
const breakWav = generateSound(0.18, (t, dur) => {
  const noise = (Math.random() * 2 - 1) * Math.exp(-t * 20);
  const tone = Math.sin(2 * Math.PI * 150 * t) * Math.exp(-t * 15);
  return (noise * 0.6 + tone * 0.4) * 0.6;
});

// 5. Propeller (buzz)
const propellerWav = generateSound(0.4, (t) => {
  const f = 120 + Math.sin(t * 60) * 20;
  return (Math.sin(2 * Math.PI * f * t) > 0 ? 0.3 : -0.3) * (0.5 + 0.5 * Math.sin(t * 50));
});

// 6. Jetpack (rocket hiss)
const jetpackWav = generateSound(0.5, (t) => {
  const noise = Math.random() * 2 - 1;
  const rumble = Math.sin(2 * Math.PI * 80 * t);
  return (noise * 0.5 + rumble * 0.5) * 0.5;
});

// 7. Shoot (pew laser)
const shootWav = generateSound(0.15, (t, dur) => {
  const freq = 1200 * Math.exp(-t * 15);
  const env = 1 - (t / dur);
  return Math.sin(2 * Math.PI * freq * t) * env * 0.5;
});

// 8. Monster kill (pop crunch)
const killWav = generateSound(0.2, (t) => {
  const f = 400 * Math.exp(-t * 12);
  const n = (Math.random() * 2 - 1) * Math.exp(-t * 18);
  return (Math.sin(2 * Math.PI * f * t) * 0.5 + n * 0.5) * 0.6;
});

// 9. Fall (downward slide whistle)
const fallWav = generateSound(0.6, (t, dur) => {
  const freq = 600 * Math.exp(-t * 2.5);
  const env = 1 - (t / dur) * 0.5;
  return Math.sin(2 * Math.PI * freq * t) * env * 0.5;
});

// 10. Game over (descending sad triad)
const gameOverWav = generateSound(0.6, (t) => {
  let f = 330;
  if (t > 0.2) f = 293;
  if (t > 0.4) f = 246;
  const env = Math.exp(-(t % 0.2) * 8);
  return Math.sin(2 * Math.PI * f * t) * env * 0.5;
});

const sounds = {
  'jump.mp3': jumpWav,
  'spring.mp3': springWav,
  'trampoline.mp3': trampolineWav,
  'break.mp3': breakWav,
  'propeller.mp3': propellerWav,
  'jetpack.mp3': jetpackWav,
  'shoot.mp3': shootWav,
  'monster_kill.mp3': killWav,
  'fall.mp3': fallWav,
  'game_over.mp3': gameOverWav
};

for (const [name, buf] of Object.entries(sounds)) {
  fs.writeFileSync(path.join(sfxDir, name), buf);
}
console.log('Audio files written successfully:', Object.keys(sounds).length);
