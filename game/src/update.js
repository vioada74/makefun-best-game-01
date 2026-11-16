// One fixed step of the simulation: player, enemies, bullets, orbs,
// pickups, particles and the wave flow. Pure logic over the state object;
// it knows nothing about the canvas or the audio (the caller plays sounds
// from the events it returns).

import { CENTER, ENEMIES, LANTERN, SCORES, STEP, TOTAL_WAVES, VIEW } from './config.js';
import { addFloat, applyUpgrade, beginWave, burst, dropPickup, fireOrb, pickEnemyTarget, rollUpgrades, stepSpawning } from './state.js';

export const EVENT_NONE = 0;
export const EVENT_SHOOT = 1;
export const EVENT_HIT = 2;
export const EVENT_ENEMY_DOWN = 4;
export const EVENT_PICKUP = 8;
export const EVENT_HURT = 16;
export const EVENT_LANTERN_HIT = 32;
export const EVENT_WAVE = 64;
export const EVENT_UPGRADE = 128;
export const EVENT_VICTORY = 256;
export const EVENT_DEFEAT = 512;

function clampToArena(entity, margin) {
  entity.x = Math.max(margin, Math.min(VIEW.width - margin, entity.x));
  entity.y = Math.max(margin, Math.min(VIEW.height - margin, entity.y));
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// Move the player from input: WASD/arrows plus mouse aim; Space or the
// mouse button fires. Returns events for the caller to sound.
function stepPlayer(state, input, dt) {
  const p = state.player;
  let mx = 0;
  let my = 0;
  if (input.left) mx -= 1;
  if (input.right) mx += 1;
  if (input.up) my -= 1;
  if (input.down) my += 1;
  if (mx !== 0 || my !== 0) {
    const len = Math.hypot(mx, my);
    p.x += (mx / len) * p.speed * dt;
    p.y += (my / len) * p.speed * dt;
  }
  clampToArena(p, p.radius + 6);
  p.aimX = input.aimX;
  p.aimY = input.aimY;
  p.trail.unshift({ x: p.x, y: p.y, life: 0.25 });
  if (p.trail.length > 14) p.trail.pop();

  p.fireCooldown -= dt;
  let events = EVENT_NONE;
  if (input.firing && p.fireCooldown <= 0) {
    p.fireCooldown = p.fireInterval;
    for (let i = 0; i < p.shots; i += 1) {
      const offset = (i - (p.shots - 1) / 2) * 0.09;
      const base = Math.atan2(p.aimY - p.y, p.aimX - p.x);
      const a = base + offset;
      state.bullets.push({
        x: p.x + Math.cos(a) * (p.radius + 6),
        y: p.y + Math.sin(a) * (p.radius + 6),
        vx: Math.cos(a) * 640, vy: Math.sin(a) * 640,
        radius: 5, damage: p.damage, life: 1.1,
      });
    }
    state.stats.shotsFired += 1;
    events |= EVENT_SHOOT;
  }
  return events;
}

function stepEnemies(state, dt) {
  let events = EVENT_NONE;
  for (const enemy of state.enemies) {
    enemy.flash = Math.max(0, enemy.flash - dt);
    enemy.wobble += dt * 2;
    const target = pickEnemyTarget(state, enemy);
    const nx = target.dx / (target.dist || 1);
    const ny = target.dy / (target.dist || 1);
    if (enemy.kind === 'spitter') {
      // Hold at range and throw dark orbs at the lantern.
      if (target.dist > 280) {
        enemy.x += nx * enemy.speed * dt;
        enemy.y += ny * enemy.speed * dt;
      } else if (target.dist < 220) {
        enemy.x -= nx * enemy.speed * 0.6 * dt;
        enemy.y -= ny * enemy.speed * 0.6 * dt;
      }
      enemy.shotTimer -= dt;
      if (enemy.shotTimer <= 0 && target.dist < 520) {
        enemy.shotTimer = ENEMIES.spitter.shotInterval;
        fireOrb(state, enemy, LANTERN.x, LANTERN.y, 170, 7);
      }
    } else if (enemy.kind === 'boss') {
      enemy.x += nx * enemy.speed * dt;
      enemy.y += ny * enemy.speed * dt;
      enemy.burstTimer -= dt;
      if (enemy.burstTimer <= 0) {
        enemy.burstTimer = 3;
        for (let i = 0; i < 8; i += 1) {
          const a = (i / 8) * Math.PI * 2 + enemy.wobble;
          state.orbs.push({
            x: enemy.x, y: enemy.y,
            vx: Math.cos(a) * 130, vy: Math.sin(a) * 130,
            radius: 8, life: 6, hostile: true,
          });
        }
      }
    } else {
      // Motes and husks wobble toward the lantern.
      const wob = Math.sin(enemy.wobble) * 0.35;
      const px = -ny * wob;
      const py = nx * wob;
      enemy.x += (nx + px) * enemy.speed * dt;
      enemy.y += (ny + py) * enemy.speed * dt;
    }
    // Latched onto the lantern: gnaw at it until driven off.
    if (target.dist < LANTERN.radius + enemy.radius + 2) {
      enemy.latchTimer -= dt;
      if (enemy.latchTimer <= 0) {
        enemy.latchTimer = 1.0;
        state.lanternHp = Math.max(0, state.lanternHp - enemy.lanternDamage);
        state.flash = 0.35;
        burst(state, LANTERN.x, LANTERN.y - 20, '#ffd97a', 6, 120);
        events |= EVENT_LANTERN_HIT;
      }
    }
    // Touching the keeper hurts the keeper.
    const p = state.player;
    if (distance(enemy, p) < enemy.radius + p.radius) {
      if (state.time > p.invulnerableUntil) {
        p.hp -= 1;
        p.invulnerableUntil = state.time + 1.0;
        state.shake = 0.5;
        const kx = (p.x - enemy.x) / (distance(enemy, p) || 1);
        const ky = (p.y - enemy.y) / (distance(enemy, p) || 1);
        p.x += kx * 26;
        p.y += ky * 26;
        clampToArena(p, p.radius + 6);
        burst(state, p.x, p.y, '#ff6b81', 10, 200);
        events |= EVENT_HURT;
      }
    }
  }
  return events;
}

function stepBullets(state, dt) {
  let events = EVENT_NONE;
  for (const bullet of state.bullets) {
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    bullet.life -= dt;
    for (const enemy of state.enemies) {
      if (enemy.hp <= 0) continue;
      if (distance(bullet, enemy) < bullet.radius + enemy.radius) {
        enemy.hp -= bullet.damage;
        enemy.flash = 0.12;
        bullet.life = 0;
        state.stats.shotsHit += 1;
        burst(state, bullet.x, bullet.y, '#ffe9a8', 4, 140);
        events |= EVENT_HIT;
        if (enemy.hp <= 0) {
          state.kills += 1;
          state.score += enemy.score;
          addFloat(state, enemy.x, enemy.y - enemy.radius, `+${enemy.score}`, '#ffd97a');
          burst(state, enemy.x, enemy.y, enemy.color, enemy.kind === 'boss' ? 40 : 14, 240);
          dropPickup(state, enemy.x, enemy.y);
          events |= EVENT_ENEMY_DOWN;
          if (enemy.kind === 'boss') state.shake = 0.8;
        }
        break;
      }
    }
  }
  state.bullets = state.bullets.filter((b) => b.life > 0 && b.x > -20 && b.x < VIEW.width + 20 && b.y > -20 && b.y < VIEW.height + 20);
  state.enemies = state.enemies.filter((e) => e.hp > 0);
  return events;
}

function stepOrbs(state, dt) {
  let events = EVENT_NONE;
  const p = state.player;
  for (const orb of state.orbs) {
    orb.x += orb.vx * dt;
    orb.y += orb.vy * dt;
    orb.life -= dt;
    if (distance(orb, p) < orb.radius + p.radius && state.time > p.invulnerableUntil) {
      p.hp -= 1;
      p.invulnerableUntil = state.time + 1.0;
      orb.life = 0;
      state.shake = 0.5;
      events |= EVENT_HURT;
    }
    if (distance(orb, CENTER) < orb.radius + LANTERN.radius) {
      orb.life = 0;
      state.lanternHp = Math.max(0, state.lanternHp - 6);
      state.flash = 0.3;
      events |= EVENT_LANTERN_HIT;
    }
  }
  state.orbs = state.orbs.filter((o) => o.life > 0 && o.x > -30 && o.x < VIEW.width + 30 && o.y > -30 && o.y < VIEW.height + 30);
  return events;
}

function stepPickups(state, dt) {
  let events = EVENT_NONE;
  const p = state.player;
  for (const pickup of state.pickups) {
    pickup.life -= dt;
    const d = distance(pickup, p);
    if (d < PLAYER_PICKUP_RADIUS) {
      pickup.vx = 0;
      pickup.vy = 0;
      const pull = (1 - d / PLAYER_PICKUP_RADIUS) * 420;
      const nx = (p.x - pickup.x) / (d || 1);
      const ny = (p.y - pickup.y) / (d || 1);
      pickup.x += nx * pull * dt;
      pickup.y += ny * pull * dt;
    }
    if (d < p.radius + 14) {
      pickup.life = 0;
      if (pickup.kind === 'shard') {
        state.score += SCORES.shard;
        addFloat(state, pickup.x, pickup.y - 10, `+${SCORES.shard}`, '#ffd94a');
      } else {
        p.hp = Math.min(p.maxHp, p.hp + 1);
        addFloat(state, pickup.x, pickup.y - 10, '+1', '#ff6b81');
      }
      events |= EVENT_PICKUP;
    }
  }
  state.pickups = state.pickups.filter((k) => k.life > 0);
  return events;
}

const PLAYER_PICKUP_RADIUS = 130;

function stepAmbient(state, dt) {
  for (const f of state.fireflies) {
    f.phase += dt * f.speed;
    f.x += Math.cos(f.phase) * 12 * dt;
    f.y += Math.sin(f.phase * 0.7) * 10 * dt;
    if (f.x < 0) f.x = VIEW.width;
    if (f.x > VIEW.width) f.x = 0;
    if (f.y < 0) f.y = VIEW.height;
    if (f.y > VIEW.height) f.y = 0;
  }
  for (const particle of state.particles) {
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vx *= 0.92;
    particle.vy *= 0.92;
    particle.life -= dt;
  }
  state.particles = state.particles.filter((pt) => pt.life > 0);
  for (const fl of state.floats) {
    fl.y -= 34 * dt;
    fl.life -= dt * 0.9;
  }
  state.floats = state.floats.filter((fl) => fl.life > 0);
  for (const t of state.player.trail) t.life -= dt;
  state.player.trail = state.player.trail.filter((t) => t.life > 0);
  state.shake = Math.max(0, state.shake - dt);
  state.flash = Math.max(0, state.flash - dt);
}

// One step while playing. The caller owns screens and input mapping.
export function stepPlay(state, input, dt) {
  let events = EVENT_NONE;
  state.time += dt;
  state.stats.timePlayed += dt;
  events |= stepPlayer(state, input, dt);
  stepSpawning(state, dt);
  events |= stepEnemies(state, dt);
  events |= stepBullets(state, dt);
  events |= stepOrbs(state, dt);
  events |= stepPickups(state, dt);
  stepAmbient(state, dt);

  if (state.lanternHp <= 0 || state.player.hp <= 0) {
    state.screen = 'gameover';
    burst(state, LANTERN.x, LANTERN.y, '#ffd97a', 40, 260);
    return events | EVENT_DEFEAT;
  }
  if (!state.waveActive && state.spawnQueue.length === 0 && state.enemies.length === 0) {
    state.waveClearTimer -= dt;
    if (state.waveClearTimer <= 0) {
      if (state.wave >= TOTAL_WAVES) {
        state.screen = 'victory';
        return events | EVENT_VICTORY;
      }
      rollUpgrades(state);
      state.screen = 'upgrade';
      return events | EVENT_UPGRADE;
    }
  }
  return events;
}

// After the keeper picks a boon, the next wave begins.
export function chooseUpgrade(state, index) {
  const choice = applyUpgrade(state, index);
  if (choice === null) return false;
  beginWave(state, state.wave + 1);
  state.screen = 'play';
  return true;
}

export { STEP };
