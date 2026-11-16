// Lumen Keep: tuning, palette, waves and upgrades.
// One job: every number the game balances on, in one place.

export const VIEW = { width: 1280, height: 720 };
export const CENTER = { x: 640, y: 360 };
export const STEP = 1 / 60;
export const TOTAL_WAVES = 8;

export const PALETTE = {
  skyTop: '#0b1f2a',
  skyBottom: '#050d14',
  ground: '#0e2a22',
  groundEdge: '#123527',
  stone: '#3a4a52',
  stoneLight: '#5b707c',
  lanternGlow: '#ffd97a',
  lanternCore: '#fff3c4',
  player: '#bff3ff',
  playerCore: '#ffffff',
  bullet: '#ffe9a8',
  mote: '#8a5cff',
  husk: '#c94f6d',
  spitter: '#4fd1a5',
  boss: '#e5484d',
  orb: '#b678ff',
  shard: '#ffd94a',
  heart: '#ff6b81',
  text: '#eaf6ff',
  dim: '#9fc3c9',
  gold: '#ffd97a',
};

// The lantern the shades want: its health is the game's real clock.
export const LANTERN = { radius: 46, maxHp: 150, x: CENTER.x, y: CENTER.y };

export const PLAYER = {
  radius: 14,
  speed: 265,
  maxHp: 3,
  fireInterval: 0.2,
  bulletSpeed: 640,
  bulletDamage: 2,
  bulletRadius: 5,
  invulnerableSeconds: 1.0,
  pickupRadius: 96,
};

// Enemy kinds. Shades drift in from the dark and gnaw at the lantern;
// spitters hold their distance and throw dark orbs; the Gloomlord is the
// final wave's boss.
export const ENEMIES = {
  mote: { radius: 12, hp: 2, speed: 98, lanternDamage: 6, score: 50, color: PALETTE.mote },
  husk: { radius: 20, hp: 9, speed: 50, lanternDamage: 14, score: 120, color: PALETTE.husk },
  spitter: { radius: 14, hp: 4, speed: 72, lanternDamage: 8, score: 140, color: PALETTE.spitter, holdRange: 265, shotInterval: 2.4 },
  boss: { radius: 46, hp: 130, speed: 40, lanternDamage: 25, score: 2000, color: PALETTE.boss },
};

// What each wave sends. The boss wave also trickles motes while it lasts.
export const WAVES = [
  { motes: 6, husks: 0, spitters: 0, boss: false, interval: 1.1 },
  { motes: 9, husks: 2, spitters: 0, boss: false, interval: 1.0 },
  { motes: 10, husks: 3, spitters: 2, boss: false, interval: 0.95 },
  { motes: 12, husks: 4, spitters: 3, boss: false, interval: 0.9 },
  { motes: 14, husks: 5, spitters: 4, boss: false, interval: 0.85 },
  { motes: 14, husks: 6, spitters: 5, boss: false, interval: 0.8 },
  { motes: 15, husks: 7, spitters: 6, boss: false, interval: 0.75 },
  { motes: 0, husks: 0, spitters: 0, boss: true, interval: 1.0 },
];

// Between waves the keeper picks one of three boons. Each has a cap;
// Lantern Mend is the only one that never caps out.
export const UPGRADES = [
  { id: 'twin', name: 'Twin Light', text: '+1 bolt per shot', max: 2, apply: (p) => { p.shots += 1; } },
  { id: 'bright', name: 'Bright Bolts', text: '+1 bolt damage', max: 4, apply: (p) => { p.damage += 1; } },
  { id: 'rapid', name: 'Rapid Glow', text: 'Shoot 15% faster', max: 4, apply: (p) => { p.fireInterval *= 0.85; } },
  { id: 'swift', name: 'Swift Boots', text: 'Move 12% faster', max: 4, apply: (p) => { p.speed *= 1.12; } },
  { id: 'mend', name: 'Lantern Mend', text: 'Restore 40 lantern light', max: 99, apply: (p, s) => { s.lanternHp = Math.min(LANTERN.maxHp, s.lanternHp + 40); } },
  { id: 'heart', name: 'Swift Heart', text: '+1 max heart, heal 1', max: 2, apply: (p) => { p.maxHp += 1; p.hp = Math.min(p.maxHp, p.hp + 1); } },
];

export const SCORES = { shard: 25, waveClear: 200 };
