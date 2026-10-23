import { lerpSnap } from './rig.js';
import { clamp, smooth } from './math.js';

// A figure's performance as back-to-back clips. Each clip is
// { d: seconds, fn(u, localTime, d, t) => state, blend? }. When a clip starts,
// it eases in from where the previous clip ended over `blend` seconds.
export class Track {
  constructor(figure, clips, blend = 0.22) {
    this.fig = figure;
    this.blend = blend;
    let t = 0;
    this.clips = clips.map((c) => {
      const clip = { ...c, t0: t, t1: t + c.d };
      t += c.d;
      return clip;
    });
    this.duration = t;
  }

  stateAt(i, t) {
    const c = this.clips[i];
    const lt = clamp(t - c.t0, 0, c.d);
    return c.fn(c.d ? lt / c.d : 1, lt, c.d, t);
  }

  // Start time of the first clip with the given name.
  at(name) {
    const c = this.clips.find((clip) => clip.name === name);
    if (!c) throw new Error(`no clip named ${name}`);
    return c.t0;
  }

  sample(t) {
    let i = this.clips.findIndex((c) => t < c.t1);
    if (i < 0) i = this.clips.length - 1;
    const c = this.clips[i];
    const snap = this.fig.resolve(this.stateAt(i, t));
    const blend = c.blend ?? this.blend;
    if (i > 0 && blend > 0 && t - c.t0 < blend) {
      const prev = this.fig.resolve(this.stateAt(i - 1, c.t0));
      return lerpSnap(prev, snap, smooth((t - c.t0) / blend));
    }
    return snap;
  }

  apply(t) {
    this.fig.apply(this.sample(t));
  }
}
