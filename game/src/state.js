// The world state: everything a step of the simulation reads and writes.
// Kept free of DOM and audio so the simulation can be tested on its own.

import { CENTER, ENEMIES, LANTERN, PLAYER, SCORES, TOTAL_WAVES, UPGRADES, VIEW, WAVES } from './config.js';
import { makeRandom, pickRandom, rimPoint, shuffleCopy } from './random.js';

let nextId = 1;

export function createState(seed) {
  const rng = makeRandom(seed);
  const state = {
    rng,
    seed,
    time: 0,
    screen: 'title',
    wave: 0,
    score: 0,
    kills: 0,
    best: 0,
    lanternHp: LANTERN.maxHp,
    player: {
      x: CENTER.x, y: CENTER.y + 150, radius: PLAYER.radius,
      hp: PLAYER.maxHp, maxHp: PLAYER.maxHp,
      speed: PLAYER.speed, damage: PLAYER.bulletDamage,
      fireInterval: PLAYER.fireInterval, shots: 1,
      aimX: CENTER.x, aimY: CENTER.y - 100,
      fireCooldown: 0, invulnerableUntil: 0, trail: [],
    },
    enemies: [],
    bullets: [],
    orbs: [],
    pickups: [],
    particles: [],
    floats: [],
    fireflies: [],
    spawnQueue: [],
    spawnTimer: 0,
    waveActive: false,
    waveClearTimer: 0,
    upgradeChoices: [],
    upgradeCounts: {},
    bossSpawned: false,
    bossTrickleTimer: 0,
    shake: 0,
    flash: 0,
    stats: { shotsFired: 0, shotsHit: 0, timePlayed: 0 },
    message: '',
    messageUntil: 0,
    muted: false,
  };
  for (let i = 0; i < 26; i += 1) {
    state.fireflies.push({
      x: rng() * VIEW.width, y: rng() * VIEW.height,
      phase: rng() * Math.PI * 2, speed: 0.3 + rng() * 0.7, size: 1 + rng() * 2,
    });
  }
  return state;
}

export function resetRun(state, seed) {
  const fresh = createState(seed);
  fresh.best = state.best;
  Object.keys(state).forEach((key) => delete state[key]);
  Object.assign(state, fresh);
}

export function startRun(state) {
  state.screen = 'play';
  state.score = 0;
  state.kills = 0;
  state.stats = { shotsFired: 0, shotsHit: 0, timePlayed: 0 };
  state.lanternHp = LANTERN.maxHp;
  beginWave(state, 1);
}

export function beginWave(state, wave) {
  const def = WAVES[wave - 1];
  state.wave = wave;
  state.waveActive = true;
  state.spawnQueue = [];
  const kinds = [];
  for (let i = 0; i < def.motes; i += 1) kinds.push('mote');
  for (let i = 0; i < def.husks; i += 1) kinds.push('husk');
  for (let i = 0; i < def.spitters; i += 1) kinds.push('spitter');
  state.spawnQueue = shuffleCopy(state.rng, kinds);
  state.spawnTimer = 0.6;
  state.bossSpawned = false;
  state.bossTrickleTimer = 4;
  if (def.boss) {
    state.spawnQueue.push('boss');
  }
  state.message = wave === TOTAL_WAVES ? 'Final wave — the Gloomlord comes' : `Wave ${wave} of ${TOTAL_WAVES}`;
  state.messageUntil = state.time + 2.4;
}

function spawnEnemy(state, kind) {
  const def = ENEMIES[kind];
  const at = rimPoint(state.rng, VIEW.width, VIEW.height, 40);
  const enemy = {
    id: nextId += 1,
    kind,
    x: at.x, y: at.y,
    radius: def.radius, hp: def.hp, maxHp: def.hp,
    speed: def.speed * (0.9 + state.rng() * 0.2),
    lanternDamage: def.lanternDamage,
    score: def.score, color: def.color,
    latchTimer: 0, shotTimer: 1 + state.rng() * 1.5,
    burstTimer: 3, trickleTimer: 6,
    wobble: state.rng() * Math.PI * 2,
    flash: 0,
  };
  state.enemies.push(enemy);
  return enemy;
}

export function stepSpawning(state, dt) {
  if (!state.waveActive) return;
  if (state.spawnQueue.length > 0) {
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      const kind = state.spawnQueue.shift();
      if (kind === 'boss') state.bossSpawned = true;
      spawnEnemy(state, kind);
      state.spawnTimer = WAVES[state.wave - 1].interval;
    }
  }
  const boss = state.enemies.find((e) => e.kind === 'boss');
  if (boss) {
    state.bossTrickleTimer -= dt;
    if (state.bossTrickleTimer <= 0) {
      state.bossTrickleTimer = 5;
      for (let i = 0; i < 2; i += 1) spawnEnemy(state, 'mote');
    }
  }
  if (state.spawnQueue.length === 0 && state.enemies.length === 0) {
    state.waveActive = false;
    state.waveClearTimer = 0.9;
    state.score += SCORES.waveClear * state.wave;
  }
}

// Roll three boons the keeper has not maxed out, for the between-wave pick.
export function rollUpgrades(state) {
  const available = UPGRADES.filter((u) => (state.upgradeCounts[u.id] ?? 0) < u.max);
  const pool = shuffleCopy(state.rng, available.length > 0 ? available : UPGRADES);
  state.upgradeChoices = pool.slice(0, 3);
  return state.upgradeChoices;
}

export function applyUpgrade(state, index) {
  const choice = state.upgradeChoices[index];
  if (!choice) return null;
  state.upgradeCounts[choice.id] = (state.upgradeCounts[choice.id] ?? 0) + 1;
  choice.apply(state.player, state);
  state.upgradeChoices = [];
  return choice;
}

export function addFloat(state, x, y, text, color) {
  state.floats.push({ x, y, text, color: color ?? '#eaf6ff', life: 1 });
}

export function burst(state, x, y, color, count, speed) {
  for (let i = 0; i < count; i += 1) {
    const angle = state.rng() * Math.PI * 2;
    const v = speed * (0.4 + state.rng() * 0.8);
    state.particles.push({
      x, y,
      vx: Math.cos(angle) * v, vy: Math.sin(angle) * v,
      life: 0.5 + state.rng() * 0.4, maxLife: 0.9,
      size: 2 + state.rng() * 3, color,
    });
  }
}

export function dropPickup(state, x, y) {
  const roll = state.rng();
  if (roll < 0.08 && state.player.hp < state.player.maxHp) {
    state.pickups.push({ kind: 'heart', x, y, vx: 0, vy: 0, life: 12 });
  } else if (roll < 0.72) {
    state.pickups.push({ kind: 'shard', x, y, vx: 0, vy: 0, life: 12 });
  }
}

export function pickEnemyTarget(state, enemy) {
  // Shades walk at the lantern; spitters stop at range and shoot.
  const dx = LANTERN.x - enemy.x;
  const dy = LANTERN.y - enemy.y;
  return { dx, dy, dist: Math.hypot(dx, dy) };
}

export function fireOrb(state, from, tx, ty, speed, radius) {
  const dx = tx - from.x;
  const dy = ty - from.y;
  const dist = Math.hypot(dx, dy) || 1;
  state.orbs.push({
    x: from.x, y: from.y,
    vx: (dx / dist) * speed, vy: (dy / dist) * speed,
    radius, life: 6, hostile: true,
  });
}
