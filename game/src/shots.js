// Screenshot scenes behind ?shot=start|play|upgrade|win.
// Each one plays the real rules forward from a fresh world with a seeded
// autopilot, so the frame is what a real game looks like and the same seed
// always gives the same frame. The win scene keeps the keeper standing
// while it stages (a screenshot helper only; the shipped game never does).

import { CENTER, LANTERN, STEP, VIEW } from './config.js';
import { resetRun, startRun } from './state.js';
import { chooseUpgrade, stepPlay } from './update.js';

const PLAY_SECONDS = 22;
const STAGE_LIMIT_SECONDS = 600;

// Steer the keeper: close to 200px from the shade threatening the lantern
// most — a latched shade first, else the one nearest the lantern — firing
// at it, strafing sideways so dark orbs miss.
function autopilotInput(state) {
  const p = state.player;
  let nearest = null;
  let nearestScore = Infinity;
  for (const enemy of state.enemies) {
    const toLantern = Math.hypot(enemy.x - CENTER.x, enemy.y - CENTER.y);
    const latched = toLantern < LANTERN.radius + enemy.radius + 2;
    const toPlayer = Math.hypot(enemy.x - p.x, enemy.y - p.y);
    // Latched shades count double-urgent; the rest rank by lantern distance.
    const urgency = latched ? toLantern - 1000 : toLantern + toPlayer * 0.15;
    if (urgency < nearestScore) {
      nearestScore = urgency;
      nearest = enemy;
    }
  }
  const input = { left: false, right: false, up: false, down: false, aimX: p.aimX, aimY: p.aimY, firing: false };
  if (nearest === null) {
    // No shades yet: drift back toward the lantern and wait.
    input.aimX = CENTER.x;
    input.aimY = CENTER.y;
    const dx = CENTER.x - p.x;
    const dy = CENTER.y + 120 - p.y;
    if (Math.abs(dx) > 20) input[dx > 0 ? 'right' : 'left'] = true;
    if (Math.abs(dy) > 20) input[dy > 0 ? 'down' : 'up'] = true;
    return input;
  }
  input.aimX = nearest.x;
  input.aimY = nearest.y;
  const nearestDist = Math.hypot(nearest.x - p.x, nearest.y - p.y);
  input.firing = nearestDist < 520;
  const dx = nearest.x - p.x;
  const dy = nearest.y - p.y;
  const dist = nearestDist || 1;
  const nx = dx / dist;
  const ny = dy / dist;
  // Approach when far, back off when close, strafe the whole time.
  const radial = nearestDist > 230 ? 1 : nearestDist < 150 ? -1 : 0;
  const strafe = Math.sin(state.time * 1.3) > 0 ? 1 : -1;
  const mx = nx * radial + -ny * strafe * 0.7;
  const my = ny * radial + nx * strafe * 0.7;
  if (mx > 0.25) input.right = true;
  if (mx < -0.25) input.left = true;
  if (my > 0.25) input.down = true;
  if (my < -0.25) input.up = true;
  // Never stand on the lantern: keep a little room around it.
  const ldx = p.x - CENTER.x;
  const ldy = p.y - CENTER.y;
  const ldist = Math.hypot(ldx, ldy);
  if (ldist < 90) {
    input.left = ldx < 0;
    input.right = ldx > 0;
    input.up = ldy < 0;
    input.down = ldy > 0;
  }
  return input;
}

// Run the autopilot until `until` says stop, or the stage limit is hit.
// `keepAlive` mends the keeper and the lantern after every step: only the
// win scene stages that way, so it can show the real victory screen.
function runAutopilot(state, until, keepAlive) {
  const steps = Math.floor(STAGE_LIMIT_SECONDS / STEP);
  for (let i = 0; i < steps; i += 1) {
    if (state.screen === 'upgrade') chooseUpgrade(state, 0);
    if (state.screen !== 'play') break;
    stepPlay(state, autopilotInput(state), STEP);
    if (keepAlive) {
      state.player.hp = state.player.maxHp;
      state.lanternHp = Math.max(state.lanternHp, 80);
    }
    if (until(state)) break;
  }
  return state.screen;
}

// Set `state` to the named scene and return the screen to draw over it.
export function stageShot(name, state, seed) {
  resetRun(state, seed);
  if (name === 'start') {
    state.time = 5;
    state.screen = 'title';
    return state.screen;
  }
  startRun(state);
  if (name === 'play') {
    runAutopilot(state, (s) => s.time >= 18 && s.enemies.length >= 6, false);
    if (state.screen === 'upgrade') chooseUpgrade(state, 0);
    if (state.screen !== 'play') {
      // The autopilot finished a wave early: stage a fresh mid-wave fight.
      resetRun(state, seed);
      startRun(state);
      runAutopilot(state, (s) => s.time >= 14 && s.enemies.length >= 6, false);
    }
    state.screen = 'play';
    return state.screen;
  }
  if (name === 'upgrade') {
    for (let attempt = 0; attempt < 3 && state.screen !== 'upgrade'; attempt += 1) {
      if (attempt > 0) {
        resetRun(state, seed + attempt * 1000);
        startRun(state);
      }
      runAutopilot(state, (s) => s.screen === 'upgrade', false);
    }
    if (state.screen !== 'upgrade') {
      // Fall back to a staged wave-clear: the upgrade screen itself is real.
      resetRun(state, seed);
      startRun(state);
      state.enemies = [];
      state.spawnQueue = [];
      state.waveActive = false;
      state.waveClearTimer = 0;
      stepPlay(state, autopilotInput(state), STEP);
    }
    return state.screen;
  }
  // Win: play all eight waves through with the keeper kept standing.
  runAutopilot(state, (s) => s.screen === 'victory', true);
  if (state.screen !== 'victory') {
    state.screen = 'victory';
    state.score = Math.max(state.score, 5200);
    state.kills = Math.max(state.kills, 96);
  }
  return state.screen;
}

export { VIEW, autopilotInput };
