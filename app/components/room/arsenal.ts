import type { RoomControl } from '@/components/GridScan';
import { track } from '@/lib/track';
import { playBotDown, playDryFire, playHit, playShot, playSwish } from '@/lib/roomAudio';
import { WEAPONS, type Weapon } from './weapons';
import type { WeaponViewApi } from './WeaponView';

/** What a shot (or a swing) ran into, in either room. */
export type WorldHit = {
  t: number;
  point: number[];
  normal?: number[];
  bot?: number;
  head?: boolean;
  surface: 'main' | 'range';
};

export type RangeStats = { shots: number; hits: number; heads: number; kills: number; streak: number; best: number };

/** What the hotbar / HUD show; read with `subscribe` + `snapshot`. */
export type ArsenalState = {
  slot: number;
  owned: string[];
  ammo: Record<string, { mag: number; reserve: number }>;
  reloading: boolean;
  reloadDur: number;
  switchSeq: number;
  hit: { seq: number; kind: 'hit' | 'head' | 'kill' };
  stats: RangeStats;
  bloom: number;
  /** aiming down sights (the crosshair hides) */
  ads: boolean;
};

type Hooks = {
  traceWorld: (o: number[], d: number[], maxT?: number) => WorldHit | null;
  damageBot: (id: number, amount: number, head: boolean, point: number[]) => boolean;
  impact: (hit: WorldHit, kind: 'bullet' | 'blade') => void;
};

/**
 * Weapons for the grid room. You start empty-handed; weapons picked up from the armory bench go
 * into their own hotbar slot (an empty slot means bare hands, which keep clicks for using
 * things). Handles the trigger (semi and full auto), spread and spray, recoil, reloads, the
 * karambit's slash and stab, and what each shot hits.
 */
export class Arsenal {
  view: WeaponViewApi | null = null;
  control: RoomControl | null = null;
  hooks: Hooks | null = null;

  private state: ArsenalState;
  private listeners = new Set<() => void>();
  private trigger = false;
  private alt = false;
  private cooldown = 0;
  private reloadT = 0;
  private reloadShells = 0;
  private spray = 0;
  private motion = { speed: 0, grounded: true };
  private enabled = false;
  private stats: RangeStats = { shots: 0, hits: 0, heads: 0, kills: 0, streak: 0, best: 0 };

  constructor() {
    this.state = {
      slot: 0,
      owned: [],
      ammo: this.freshAmmo(),
      reloading: false,
      reloadDur: 0,
      switchSeq: 0,
      hit: { seq: 0, kind: 'hit' },
      stats: { ...this.stats },
      bloom: 0,
      ads: false,
    };
  }

  private freshAmmo() {
    const ammo: ArsenalState['ammo'] = {};
    for (const w of WEAPONS) if (w.mag) ammo[w.id] = { mag: w.mag, reserve: w.reserve ?? 0 };
    return ammo;
  }

  /* ── store for the UI ── */
  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };
  snapshot = () => this.state;
  private emit(patch: Partial<ArsenalState>) {
    this.state = { ...this.state, ...patch, stats: { ...this.stats } };
    this.listeners.forEach((fn) => fn());
  }

  /** the weapon in hand (an empty slot is bare hands) */
  get weapon(): Weapon {
    const w = WEAPONS[this.state.slot];
    return w.kind === 'hand' || this.state.owned.includes(w.id) ? w : WEAPONS[0];
  }
  get armed() {
    return this.weapon.kind !== 'hand';
  }
  has(id: string) {
    return this.state.owned.includes(id);
  }

  setEnabled(on: boolean) {
    this.enabled = on;
    if (!on) {
      this.trigger = false;
      this.setAlt(false);
    }
  }

  /** pick a weapon up (from the bench) and draw it */
  give(id: string) {
    if (this.has(id)) return;
    track('Weapon picked up', { weapon: id }, true);
    const owned = [...this.state.owned, id];
    const slot = WEAPONS.findIndex((w) => w.id === id);
    this.emit({ owned });
    this.select(slot, true);
  }

  /** put a weapon back (on the bench) */
  drop(id: string) {
    if (!this.has(id)) return;
    const owned = this.state.owned.filter((x) => x !== id);
    const wasHeld = this.weapon.id === id;
    this.emit({ owned });
    if (wasHeld) {
      this.cancelReload();
      this.setAlt(false);
      this.view?.equip('hand');
      this.control?.setPings(true);
      this.emit({ switchSeq: this.state.switchSeq + 1 });
    }
  }

  /** leaving first person: hands empty, magazines full, stats cleared */
  reset() {
    this.trigger = false;
    this.alt = false;
    this.stats = { shots: 0, hits: 0, heads: 0, kills: 0, streak: 0, best: 0 };
    this.view?.equip('hand');
    this.control?.setPings(true);
    this.control?.setZoom(1);
    this.emit({ slot: 0, owned: [], ammo: this.freshAmmo(), reloading: false });
  }

  select(slot: number, force = false) {
    const next = ((slot % WEAPONS.length) + WEAPONS.length) % WEAPONS.length;
    if (next === this.state.slot && !force) return;
    const before = this.weapon.id;
    this.cancelReload();
    this.setAlt(false);
    this.spray = 0;
    this.state = { ...this.state, slot: next };
    const w = this.weapon;
    if (w.id !== before || force) {
      this.cooldown = Math.max(this.cooldown, 0.3);
      this.view?.equip(w.id);
    }
    this.control?.setPings(w.kind === 'hand');
    this.emit({ slot: next, switchSeq: this.state.switchSeq + 1, reloading: false });
  }

  /** scroll: step through the slots you actually have something in (plus hands) */
  cycle(dir: 1 | -1) {
    const filled = WEAPONS.map((w, i) => (w.kind === 'hand' || this.has(w.id) ? i : -1)).filter((i) => i >= 0);
    const at = filled.indexOf(WEAPONS.findIndex((w) => w.id === this.weapon.id));
    const next = filled[(at + dir + filled.length) % filled.length];
    this.select(next);
  }

  setTrigger(down: boolean) {
    this.trigger = down && this.enabled;
    // the first round goes on the press itself, so a tap shorter than a frame still fires
    if (this.trigger) this.tryFire();
  }

  setAlt(down: boolean) {
    this.alt = down && this.enabled;
    const w = this.weapon;
    if (w.kind === 'melee') {
      if (this.alt) this.tryHeavy();
      return;
    }
    const aiming = this.alt && !!w.ads && !this.state.reloading;
    this.view?.setAds(aiming);
    this.control?.setZoom(aiming ? (w.ads ?? 1) : 1);
    if (aiming !== this.state.ads) this.emit({ ads: aiming });
  }

  inspect() {
    if (this.armed && !this.state.reloading) this.view?.inspect();
  }

  reload() {
    const w = this.weapon;
    const a = this.state.ammo[w.id];
    if (!a || !w.mag || this.state.reloading || a.mag >= w.mag) return;
    if (a.reserve <= 0) a.reserve = (w.reserve ?? 0) || w.mag * 4; // the range never runs dry
    const empty = a.mag === 0;
    let dur: number;
    if (w.kind === 'shotgun') {
      this.reloadShells = Math.min(w.mag - a.mag, a.reserve);
      dur = 0.3 + this.reloadShells * (w.perShell ?? 0.5) + (empty ? 0.45 : 0);
    } else {
      dur = empty && w.reloadEmpty ? w.reloadEmpty : (w.reload ?? 1.5);
    }
    this.reloadT = 0;
    this.view?.setAds(false);
    this.control?.setZoom(1);
    this.view?.reload(dur, empty, this.reloadShells);
    this.emit({ reloading: true, reloadDur: dur, ads: false });
  }

  private cancelReload() {
    if (this.state.reloading) this.state = { ...this.state, reloading: false };
  }

  setMotion(speed: number, grounded: boolean) {
    this.motion.speed = speed;
    this.motion.grounded = grounded;
  }

  update(dt: number) {
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.spray = Math.max(0, this.spray - dt * (this.trigger ? 1.2 : 4));
    if (this.state.reloading) {
      this.reloadT += dt;
      if (this.reloadT >= this.state.reloadDur) {
        const w = this.weapon;
        const a = this.state.ammo[w.id];
        if (a && w.mag) {
          const need = w.kind === 'shotgun' ? this.reloadShells : w.mag - a.mag;
          const take = Math.min(need, a.reserve);
          a.mag += take;
          a.reserve -= take;
        }
        this.emit({ reloading: false });
        if (this.alt) this.setAlt(true);
      }
    }
    if (this.trigger && this.weapon.auto) this.tryFire();
    const w = this.weapon;
    const moving = Math.min(1, this.motion.speed / 0.75);
    const bloom = w.kind === 'hand' || w.kind === 'melee' ? 0 : Math.min(1, (w.moveSpread ? moving * 0.6 : 0) + this.spray * 0.4 + (this.motion.grounded ? 0 : 0.5));
    if (Math.abs(bloom - this.state.bloom) > 0.02) this.emit({ bloom });
  }

  private tryHeavy() {
    const w = this.weapon;
    if (w.kind !== 'melee' || this.cooldown > 0) return;
    this.cooldown = 0.85;
    this.view?.melee(true);
    playSwish(true);
    window.setTimeout(() => this.meleeHit(Math.round(w.damage * 1.3), w.range ?? 0.35), 300);
  }

  private tryFire() {
    const w = this.weapon;
    if (!this.enabled || this.cooldown > 0 || this.view?.busy()) return;
    if (w.kind === 'hand') return;
    if (w.kind === 'melee') {
      this.cooldown = w.interval;
      this.view?.melee(false);
      playSwish(false);
      window.setTimeout(() => this.meleeHit(w.damage, w.range ?? 0.35), 140);
      return;
    }
    if (this.state.reloading) return;
    const a = this.state.ammo[w.id];
    if (!a) return;
    if (a.mag <= 0) {
      this.cooldown = 0.25;
      this.view?.fire(true);
      playDryFire();
      this.trigger = false;
      this.reload();
      return;
    }
    a.mag -= 1;
    this.cooldown = w.interval;
    this.view?.fire(false);
    playShot(w.sound, w.id);
    this.stats.shots += 1;
    const aiming = this.alt;
    // the shot goes where the crosshair is now; the recoil only moves the view afterwards
    const aim = this.control?.aim();
    const moving = Math.min(1, this.motion.speed / 0.75);
    // first-shot accuracy: standing still after a pause, the first round goes dead centre
    // (a shotgun keeps its pattern)
    const settled = this.spray < 0.05 && moving < 0.1 && this.motion.grounded && (w.pellets ?? 1) === 1;
    const spread =
      ((settled ? 0 : (w.spread ?? 0)) + (w.moveSpread ?? 0) * moving + (this.motion.grounded ? 0 : 0.035) + this.spray * (w.auto ? 0.006 : 0.002)) *
      (aiming ? 0.45 : 1);
    const climb = (w.recoil ?? 0) * (aiming ? 0.7 : 1) * (1 + this.spray * 0.5);
    const side = (Math.random() - 0.5) * 2 * (w.recoilSide ?? 0) * (1 + this.spray);
    this.control?.kick(climb, side);
    this.spray = Math.min(3, this.spray + (w.auto ? 0.35 : 0.6));
    if (!aim) return;
    let anyHit = false;
    const hitBots = new Set<number>();
    for (let i = 0; i < (w.pellets ?? 1); i++) {
      const d = cone(aim.d, spread);
      const hit = this.hooks?.traceWorld(aim.o, d);
      if (!hit) continue;
      if (hit.bot !== undefined) {
        const falloff = w.kind === 'shotgun' ? Math.max(0.35, 1 - Math.max(0, hit.t - 0.5) * 0.35) : 1;
        this.applyHit(hit, Math.round((hit.head ? w.head : w.damage) * falloff));
        anyHit = true;
        hitBots.add(hit.bot);
      } else {
        this.hooks?.impact(hit, 'bullet');
      }
    }
    if (anyHit) this.stats.hits += 1;
    else this.stats.streak = 0;
    this.emit({});
  }

  private meleeHit(amount: number, reach: number) {
    const aim = this.control?.aim();
    if (!aim || !this.hooks) return;
    let hit = this.hooks.traceWorld(aim.o, aim.d, reach);
    // a little forgiveness: also try lower, where bodies are
    if (!hit || hit.bot === undefined) {
      const low = this.hooks.traceWorld(aim.o, cone([aim.d[0], aim.d[1] - 0.15, aim.d[2]], 0), reach);
      if (low && low.bot !== undefined) hit = low;
    }
    if (!hit) return;
    this.stats.shots += 1;
    if (hit.bot !== undefined) {
      this.stats.hits += 1;
      this.applyHit(hit, Math.round(hit.head ? amount * 1.6 : amount));
    } else {
      this.hooks.impact(hit, 'blade');
    }
    this.emit({});
  }

  private applyHit(hit: WorldHit, amount: number) {
    if (hit.bot === undefined || !this.hooks) return;
    const killed = this.hooks.damageBot(hit.bot, amount, !!hit.head, hit.point);
    if (hit.head) this.stats.heads += 1;
    if (killed) {
      track('Bot killed', { weapon: this.weapon.id }, true); // once per weapon per visit, to keep the event count sane
      this.stats.kills += 1;
      this.stats.streak += 1;
      this.stats.best = Math.max(this.stats.best, this.stats.streak);
      playBotDown();
    }
    playHit(!!hit.head);
    this.emit({ hit: { seq: this.state.hit.seq + 1, kind: killed ? 'kill' : hit.head ? 'head' : 'hit' } });
  }
}

/** a direction jittered inside a cone of the given half-angle */
function cone(d: number[], angle: number) {
  const len = Math.hypot(d[0], d[1], d[2]) || 1;
  const n = [d[0] / len, d[1] / len, d[2] / len];
  if (angle <= 0) return n;
  const up = Math.abs(n[1]) < 0.95 ? [0, 1, 0] : [1, 0, 0];
  const a = [n[1] * up[2] - n[2] * up[1], n[2] * up[0] - n[0] * up[2], n[0] * up[1] - n[1] * up[0]];
  const al = Math.hypot(a[0], a[1], a[2]);
  const ax = [a[0] / al, a[1] / al, a[2] / al];
  const b = [n[1] * ax[2] - n[2] * ax[1], n[2] * ax[0] - n[0] * ax[2], n[0] * ax[1] - n[1] * ax[0]];
  const r = Math.sqrt(Math.random()) * Math.tan(angle);
  const th = Math.random() * Math.PI * 2;
  const x = Math.cos(th) * r;
  const y = Math.sin(th) * r;
  const v = [n[0] + ax[0] * x + b[0] * y, n[1] + ax[1] * x + b[1] * y, n[2] + ax[2] * x + b[2] * y];
  const vl = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / vl, v[1] / vl, v[2] / vl];
}
