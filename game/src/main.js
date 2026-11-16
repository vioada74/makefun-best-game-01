// Lumen Keep: boot, the fixed-step loop, screens and input.
// The only file that touches the DOM; the simulation lives in state.js
// and update.js, the drawing in render.js.

import { STEP, TOTAL_WAVES, VIEW } from './config.js';
import { createState, resetRun, startRun } from './state.js';
import { EVENT_DEFEAT, EVENT_ENEMY_DOWN, EVENT_HIT, EVENT_HURT, EVENT_LANTERN_HIT, EVENT_PICKUP, EVENT_SHOOT, EVENT_UPGRADE, EVENT_VICTORY, EVENT_WAVE, chooseUpgrade, stepPlay } from './update.js';
import { drawFrame } from './render.js';
import { consumePress, createInput, endFrame, keyDown } from './input.js';
import { sfx, startDrone, toggleMute } from './audio.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusLine = document.getElementById('status');
const BEST_KEY = 'lumen-keep-best';

// Surface page errors where a headless check can see them.
window.addEventListener('error', (event) => {
  document.body.dataset.error = String(event.message ?? event.error ?? 'error');
});

function loadBest() {
  try {
    return Number(window.localStorage.getItem(BEST_KEY) ?? 0) || 0;
  } catch {
    return 0;
  }
}

function saveBest(score) {
  try {
    window.localStorage.setItem(BEST_KEY, String(score));
  } catch {
    // Private mode or file://: the best score just does not persist.
  }
}

const input = createInput(canvas);
const state = createState(20261116);
state.best = loadBest();
window.__lumenKeep = state;

function fitCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  return dpr;
}

function renderFrame() {
  const dpr = fitCanvas();
  const scale = Math.min(window.innerWidth / VIEW.width, window.innerHeight / VIEW.height);
  const offsetX = (window.innerWidth - VIEW.width * scale) / 2;
  const offsetY = (window.innerHeight - VIEW.height * scale) / 2;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#050d14';
  ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
  ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * offsetX, dpr * offsetY);
  drawFrame(ctx, state, input.mouse);
}

function announce(text) {
  if (statusLine) statusLine.textContent = text;
}

function soundFor(events) {
  if (events & EVENT_SHOOT) sfx.shoot();
  if (events & EVENT_HIT) sfx.hit();
  if (events & EVENT_ENEMY_DOWN) sfx.enemyDown();
  if (events & EVENT_PICKUP) sfx.pickup();
  if (events & EVENT_HURT) sfx.hurt();
  if (events & EVENT_LANTERN_HIT) sfx.lanternHit();
  if (events & EVENT_WAVE) sfx.waveHorn();
  if (events & EVENT_UPGRADE) sfx.upgrade();
  if (events & EVENT_VICTORY) sfx.victory();
  if (events & EVENT_DEFEAT) sfx.defeat();
}

function finishRun() {
  if (state.score > state.best) {
    state.best = state.score;
    saveBest(state.best);
  }
}

function liveInput() {
  return {
    left: keyDown(input, 'a') || keyDown(input, 'arrowleft'),
    right: keyDown(input, 'd') || keyDown(input, 'arrowright'),
    up: keyDown(input, 'w') || keyDown(input, 'arrowup'),
    down: keyDown(input, 's') || keyDown(input, 'arrowdown'),
    aimX: input.mouse.x,
    aimY: input.mouse.y,
    firing: input.mouse.down || keyDown(input, ' '),
  };
}

function clickedButton(x, y, w, h) {
  return consumePress(input, 'mouse') && input.mouse.x >= x && input.mouse.x <= x + w && input.mouse.y >= y && input.mouse.y <= y + h;
}

// One frame of the live game: screens first, then the simulation.
function frame() {
  if (consumePress(input, 'm')) state.muted = toggleMute();

  if (state.screen === 'title') {
    state.time += STEP;
    if (consumePress(input, 'enter') || clickedButton(490, 412, 300, 56)) {
      startDrone();
      startRun(state);
      sfx.waveHorn();
      announce(`Wave 1 of ${TOTAL_WAVES}. Defend the lantern.`);
    }
  } else if (state.screen === 'play') {
    if (consumePress(input, 'p')) {
      state.screen = 'paused';
      announce('Paused.');
    } else {
      const events = stepPlay(state, liveInput(), STEP);
      soundFor(events);
      if (state.screen === 'victory' || state.screen === 'gameover') finishRun();
      if (state.screen === 'upgrade') announce(`Wave ${state.wave} clear. Choose a boon.`);
    }
  } else if (state.screen === 'paused') {
    if (consumePress(input, 'p') || consumePress(input, 'mouse')) state.screen = 'play';
  } else if (state.screen === 'upgrade') {
    let picked = -1;
    if (consumePress(input, '1')) picked = 0;
    if (consumePress(input, '2')) picked = 1;
    if (consumePress(input, '3')) picked = 2;
    if (picked === -1 && consumePress(input, 'mouse')) {
      const cardW = 300;
      const gap = 32;
      const total = cardW * 3 + gap * 2;
      const startX = (VIEW.width - total) / 2;
      for (let i = 0; i < 3; i += 1) {
        const x = startX + i * (cardW + gap);
        if (input.mouse.x >= x && input.mouse.x <= x + cardW && input.mouse.y >= 230 && input.mouse.y <= 450) picked = i;
      }
    }
    if (picked >= 0 && chooseUpgrade(state, picked)) {
      sfx.upgrade();
      sfx.waveHorn();
      announce(`Wave ${state.wave} of ${TOTAL_WAVES}.`);
    }
  } else if (state.screen === 'victory' || state.screen === 'gameover') {
    state.time += STEP;
    if (consumePress(input, 'r') || consumePress(input, 'enter') || clickedButton(490, 462, 300, 56)) {
      resetRun(state, (Date.now() % 2147483647) + 1);
      state.best = loadBest();
      startRun(state);
      announce(`Wave 1 of ${TOTAL_WAVES}. Defend the lantern.`);
    }
  }
  renderFrame();
  endFrame(input);
}

// Screenshot mode: stage one deterministic scene, paint it, and say so.
// The loop never runs here, so the frame cannot drift after the shot.
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
if (shot !== null) {
  const seed = Number(params.get('seed') ?? 1) || 1;
  stageShot(shot, state, seed);
  renderFrame();
  requestAnimationFrame(() => {
    renderFrame();
    window.__shotReady = true;
  });
} else {
  window.addEventListener('resize', renderFrame);
  let last = performance.now();
  let lag = 0;
  (function loop(now) {
    requestAnimationFrame(loop);
    const elapsed = Math.min(100, now - last);
    last = now;
    lag += elapsed / 1000;
    let steps = 0;
    while (lag >= STEP && steps < 5) {
      frame();
      lag -= STEP;
      steps += 1;
    }
    if (steps === 5) lag = 0;
    if (state.screen === 'title' || state.screen === 'victory' || state.screen === 'gameover') renderFrame();
  })(last);
}
