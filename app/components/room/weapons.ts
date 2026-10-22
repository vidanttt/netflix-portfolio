/**
 * The hotbar loadout for the grid room. Distances are in room units (the room is 1 tall, so
 * 0.3 is roughly a metre); damage is against 100 HP practice bots.
 */
export type WeaponKind = 'hand' | 'melee' | 'pistol' | 'revolver' | 'smg' | 'rifle' | 'shotgun';

export type Weapon = {
  id: string;
  name: string;
  kind: WeaponKind;
  /** seconds between shots (or swings) */
  interval: number;
  auto?: boolean;
  mag?: number;
  reserve?: number;
  /** seconds; `reloadEmpty` when the chamber is empty too (slide / bolt / pump to rack) */
  reload?: number;
  reloadEmpty?: number;
  /** shotgun: seconds per shell loaded */
  perShell?: number;
  damage: number;
  head: number;
  pellets?: number;
  /** cone half-angle in radians: standing still, and how much movement adds */
  spread?: number;
  moveSpread?: number;
  /** view kick per shot (radians up), and its sideways wander */
  recoil?: number;
  recoilSide?: number;
  /** aim-down-sights zoom (field of view multiplier) */
  ads?: number;
  /** melee reach */
  range?: number;
  /** sound character */
  sound: 'knife' | 'light' | 'heavy' | 'magnum' | 'smg' | 'rifle' | 'shotgun' | 'none';
};

export const WEAPONS: Weapon[] = [
  { id: 'hand', name: 'Hands', kind: 'hand', interval: 0.3, damage: 0, head: 0, sound: 'none' },
  {
    id: 'karambit',
    name: 'Karambit',
    kind: 'melee',
    interval: 0.42,
    damage: 50,
    head: 50,
    range: 0.36,
    sound: 'knife',
  },
  {
    id: 'glock',
    name: 'Glock 19',
    kind: 'pistol',
    interval: 0.13,
    mag: 15,
    reserve: 60,
    reload: 1.45,
    reloadEmpty: 1.85,
    damage: 26,
    head: 78,
    spread: 0.004,
    moveSpread: 0.02,
    recoil: 0.014,
    recoilSide: 0.006,
    ads: 0.85,
    sound: 'light',
  },
  {
    id: 'sheriff',
    name: 'Sheriff',
    kind: 'revolver',
    interval: 0.4,
    mag: 6,
    reserve: 24,
    reload: 2.2,
    damage: 55,
    head: 159,
    spread: 0.0025,
    moveSpread: 0.035,
    recoil: 0.05,
    recoilSide: 0.012,
    ads: 0.8,
    sound: 'magnum',
  },
  {
    id: 'sw500',
    name: 'S&W Model 500',
    kind: 'revolver',
    interval: 0.62,
    mag: 5,
    reserve: 20,
    reload: 2.6,
    damage: 92,
    head: 220,
    spread: 0.003,
    moveSpread: 0.045,
    recoil: 0.11,
    recoilSide: 0.02,
    ads: 0.8,
    sound: 'magnum',
  },
  {
    id: 'deagle',
    name: 'Desert Eagle',
    kind: 'pistol',
    interval: 0.3,
    mag: 7,
    reserve: 35,
    reload: 1.8,
    reloadEmpty: 2.2,
    damage: 60,
    head: 165,
    spread: 0.003,
    moveSpread: 0.04,
    recoil: 0.065,
    recoilSide: 0.016,
    ads: 0.8,
    sound: 'heavy',
  },
  {
    id: 'mp5',
    name: 'MP5',
    kind: 'smg',
    interval: 60 / 800,
    auto: true,
    mag: 30,
    reserve: 120,
    reload: 2.1,
    reloadEmpty: 2.6,
    damage: 22,
    head: 56,
    spread: 0.008,
    moveSpread: 0.018,
    recoil: 0.0075,
    recoilSide: 0.005,
    ads: 0.78,
    sound: 'smg',
  },
  {
    id: 'ak47',
    name: 'AK-47',
    kind: 'rifle',
    interval: 0.1,
    auto: true,
    mag: 30,
    reserve: 90,
    reload: 2.4,
    reloadEmpty: 2.9,
    damage: 36,
    head: 143,
    spread: 0.005,
    moveSpread: 0.04,
    recoil: 0.016,
    recoilSide: 0.009,
    ads: 0.7,
    sound: 'rifle',
  },
  {
    id: 'shotgun',
    name: 'Pump Shotgun',
    kind: 'shotgun',
    interval: 0.85,
    mag: 6,
    reserve: 30,
    perShell: 0.48,
    damage: 17,
    head: 34,
    pellets: 9,
    spread: 0.05,
    moveSpread: 0.02,
    recoil: 0.07,
    recoilSide: 0.02,
    ads: 0.85,
    sound: 'shotgun',
  },
];

export const weaponById = (id: string) => WEAPONS.find((w) => w.id === id) ?? WEAPONS[0];
