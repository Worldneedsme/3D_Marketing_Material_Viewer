// Synthesised sound effects, built as an ffmpeg filter graph. Scenes list
// cues as { t, type, gain }; the video stream is input 0.
const RECIPES = {
  // Sharp slap of the entry plus a longer wash of falling water.
  splash: (seed) => [
    { src: `anoisesrc=color=white:amplitude=0.8:seed=${seed}:duration=0.5`, fx: 'highpass=f=900,lowpass=f=5200,afade=t=out:st=0.01:d=0.28:curve=exp', gain: 0.55 },
    { src: `anoisesrc=color=pink:amplitude=0.9:seed=${seed + 1}:duration=1.8`, fx: 'highpass=f=180,lowpass=f=2600,afade=t=in:d=0.02,afade=t=out:st=0.08:d=1.6:curve=exp', gain: 0.75 },
  ],
  // Springboard thunk.
  board: (seed) => [
    { src: `sine=frequency=95:duration=0.35`, fx: 'afade=t=out:st=0:d=0.32:curve=exp', gain: 0.5 },
    { src: `anoisesrc=color=brown:amplitude=0.6:seed=${seed}:duration=0.2`, fx: 'lowpass=f=700,afade=t=out:st=0:d=0.18:curve=exp', gain: 0.4 },
  ],
  // Air rushing past during a dive.
  whoosh: (seed) => [
    { src: `anoisesrc=color=pink:amplitude=0.5:seed=${seed}:duration=1.1`, fx: 'bandpass=f=900:width_type=o:w=2,afade=t=in:d=0.5:curve=qsin,afade=t=out:st=0.55:d=0.5:curve=qsin', gain: 0.22 },
  ],
  // Pickaxe biting into packed earth.
  dig: (seed) => [
    { src: `anoisesrc=color=brown:amplitude=0.8:seed=${seed}:duration=0.3`, fx: 'lowpass=f=1400,afade=t=out:st=0:d=0.25:curve=exp', gain: 0.5 },
    { src: `anoisesrc=color=white:amplitude=0.5:seed=${seed + 1}:duration=0.12`, fx: 'bandpass=f=2500:width_type=o:w=1.5,afade=t=out:st=0:d=0.1:curve=exp', gain: 0.25 },
  ],
  // Pick hits the gem: bright metallic ring.
  chime: () => [
    { src: 'sine=frequency=1568:duration=2.2', fx: 'afade=t=out:st=0:d=2.1:curve=exp', gain: 0.35 },
    { src: 'sine=frequency=2349:duration=1.8', fx: 'afade=t=out:st=0:d=1.7:curve=exp', gain: 0.22 },
    { src: 'sine=frequency=3136:duration=1.4', fx: 'adelay=60|60,afade=t=out:st=0:d=1.3:curve=exp', gain: 0.15 },
  ],
  // Coin landing in a hand.
  coin: () => [
    { src: 'sine=frequency=2637:duration=0.4', fx: 'afade=t=out:st=0:d=0.38:curve=exp', gain: 0.45 },
    { src: 'sine=frequency=3951:duration=0.3', fx: 'afade=t=out:st=0:d=0.25:curve=exp', gain: 0.25 },
  ],
  // Coin dropped on the stack.
  clink: () => [
    { src: 'sine=frequency=1760:duration=0.25', fx: 'afade=t=out:st=0:d=0.22:curve=exp', gain: 0.45 },
  ],
  // Interest coin appearing: tiny bright tick.
  tick: () => [
    { src: 'sine=frequency=3136:duration=0.1', fx: 'afade=t=out:st=0:d=0.09:curve=exp', gain: 0.18 },
  ],
  // Till ringing up a sale.
  register: (seed) => [
    { src: `anoisesrc=color=white:amplitude=0.6:seed=${seed}:duration=0.06`, fx: 'highpass=f=1500,afade=t=out:st=0:d=0.05:curve=exp', gain: 0.35 },
    { src: 'sine=frequency=2093:duration=0.5', fx: 'adelay=50|50,afade=t=out:st=0:d=0.5:curve=exp', gain: 0.35 },
  ],
  // Paper bag picked up.
  rustle: (seed) => [
    { src: `anoisesrc=color=white:amplitude=0.6:seed=${seed}:duration=0.3`, fx: 'bandpass=f=3200:width_type=o:w=2,afade=t=in:d=0.02,afade=t=out:st=0.05:d=0.22:curve=exp', gain: 0.3 },
  ],
  // Pen scratching in a notebook.
  scribble: (seed) => [
    { src: `anoisesrc=color=pink:amplitude=0.6:seed=${seed}:duration=0.5`, fx: 'highpass=f=2500,lowpass=f=7000,tremolo=f=13:d=0.9,afade=t=out:st=0.3:d=0.2', gain: 0.22 },
  ],
  // Light switched off.
  click: (seed) => [
    { src: 'sine=frequency=1300:duration=0.04', fx: 'afade=t=out:st=0:d=0.035', gain: 0.35 },
    { src: `anoisesrc=color=brown:amplitude=0.6:seed=${seed}:duration=0.08`, fx: 'lowpass=f=900,afade=t=out:st=0:d=0.07:curve=exp', gain: 0.35 },
  ],
  // Stone block set down.
  block: (seed) => [
    { src: 'sine=frequency=70:duration=0.3', fx: 'afade=t=out:st=0:d=0.28:curve=exp', gain: 0.6 },
    { src: `anoisesrc=color=brown:amplitude=0.8:seed=${seed}:duration=0.2`, fx: 'lowpass=f=500,afade=t=out:st=0:d=0.18:curve=exp', gain: 0.55 },
  ],
  // Axe biting into wood.
  chop: (seed) => [
    { src: `anoisesrc=color=brown:amplitude=0.9:seed=${seed}:duration=0.25`, fx: 'bandpass=f=700:width_type=o:w=1.5,afade=t=out:st=0:d=0.2:curve=exp', gain: 0.6 },
    { src: 'sine=frequency=180:duration=0.12', fx: 'afade=t=out:st=0:d=0.1:curve=exp', gain: 0.35 },
  ],
  // Steel on a spinning grindstone.
  grind: (seed) => [
    { src: `anoisesrc=color=white:amplitude=0.5:seed=${seed}:duration=1.5`, fx: 'bandpass=f=4200:width_type=o:w=1,tremolo=f=9:d=0.5,afade=t=in:d=0.1,afade=t=out:st=1.2:d=0.3', gain: 0.18 },
  ],
  // Trunk giving way.
  creak: () => [
    { src: 'sine=frequency=140:duration=1.0', fx: 'vibrato=f=7:d=0.6,afade=t=in:d=0.2,afade=t=out:st=0.6:d=0.4', gain: 0.25 },
  ],
  // Tree hitting the ground.
  crash: (seed) => [
    { src: `anoisesrc=color=brown:amplitude=1:seed=${seed}:duration=1.2`, fx: 'lowpass=f=600,afade=t=out:st=0.05:d=1.1:curve=exp', gain: 0.9 },
    { src: 'sine=frequency=55:duration=0.6', fx: 'afade=t=out:st=0:d=0.55:curve=exp', gain: 0.7 },
  ],
  // Rifle shot: sharp crack over a low thump.
  shot: (seed) => [
    { src: `anoisesrc=color=white:amplitude=1:seed=${seed}:duration=0.3`, fx: 'highpass=f=500,afade=t=out:st=0:d=0.2:curve=exp', gain: 0.6 },
    { src: 'sine=frequency=60:duration=0.3', fx: 'afade=t=out:st=0:d=0.25:curve=exp', gain: 0.6 },
  ],
  // Short bugle call (an original phrase on the bugle's natural notes).
  bugle: () =>
    [
      [392, 0, 0.16],
      [523, 0.18, 0.16],
      [659, 0.36, 0.16],
      [784, 0.54, 0.42],
      [659, 1.0, 0.14],
      [784, 1.16, 0.5],
    ].flatMap(([f, at, len]) => {
      const ms = Math.round(at * 1000);
      return [
        { src: `sine=frequency=${f}:duration=${len + 0.08}`, fx: `afade=t=in:d=0.02,afade=t=out:st=${len - 0.04}:d=0.12,adelay=${ms}|${ms}`, gain: 0.55 },
        { src: `sine=frequency=${f * 2}:duration=${len + 0.08}`, fx: `afade=t=in:d=0.02,afade=t=out:st=${len - 0.04}:d=0.12,adelay=${ms}|${ms}`, gain: 0.2 },
      ];
    }),
  // Soft footstep on a plank.
  step: (seed) => [
    { src: `anoisesrc=color=brown:amplitude=0.5:seed=${seed}:duration=0.12`, fx: 'lowpass=f=900,afade=t=out:st=0:d=0.1:curve=exp', gain: 0.18 },
  ],
};

export function buildAudioArgs(cues, duration) {
  if (!cues || cues.length === 0) return [];
  const inputs = [];
  const chains = [];
  const labels = [];
  // Low room tone so the track never drops to digital silence.
  inputs.push('-f', 'lavfi', '-i', `anoisesrc=color=brown:amplitude=0.05:seed=3:duration=${duration.toFixed(2)}`);
  chains.push(`[1:a]lowpass=f=320,volume=0.35[bed]`);
  labels.push('[bed]');
  let n = 2;
  cues.forEach((cue, i) => {
    const layers = RECIPES[cue.type](11 + i * 7);
    for (const layer of layers) {
      inputs.push('-f', 'lavfi', '-i', layer.src);
      const ms = Math.max(0, Math.round(cue.t * 1000));
      const label = `[s${n}]`;
      chains.push(`[${n}:a]${layer.fx},volume=${(layer.gain * (cue.gain ?? 1)).toFixed(3)},adelay=${ms}|${ms},apad[t${n}];[t${n}]atrim=0:${duration.toFixed(2)}${label}`);
      labels.push(label);
      n++;
    }
  });
  const graph = `${chains.join(';')};${labels.join('')}amix=inputs=${labels.length}:normalize=0,volume=2.2,alimiter=limit=0.9,aformat=channel_layouts=stereo[aout]`;
  return [...inputs, '-filter_complex', graph, '-map', '0:v', '-map', '[aout]', '-c:a', 'aac', '-b:a', '192k'];
}
