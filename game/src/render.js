// Every pixel the game draws: the grove, the lantern, the shades, the
// keeper, the HUD and every screen. Drawing reads the state; it never
// changes it.

import { CENTER, LANTERN, PALETTE, TOTAL_WAVES, VIEW } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_UPGRADE = 'upgrade';
export const SCREEN_VICTORY = 'victory';
export const SCREEN_OVER = 'gameover';
export const SCREEN_PAUSED = 'paused';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, str, x, y, size, color, align = 'center', weight = 'bold') {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px Georgia, 'Times New Roman', serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

function smallText(ctx, str, x, y, size, color, align = 'center', weight = 'normal') {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px Verdana, Geneva, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

function drawBackground(ctx, state) {
  const sky = ctx.createLinearGradient(0, 0, 0, VIEW.height);
  sky.addColorStop(0, PALETTE.skyTop);
  sky.addColorStop(1, PALETTE.skyBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);

  // The grove floor: a soft ellipse of moss under the lantern.
  const ground = ctx.createRadialGradient(CENTER.x, CENTER.y, 40, CENTER.x, CENTER.y, 560);
  ground.addColorStop(0, PALETTE.groundEdge);
  ground.addColorStop(1, 'rgba(14, 42, 34, 0)');
  ctx.fillStyle = ground;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);

  // Fireflies drift through the dark.
  for (const f of state.fireflies) {
    const glow = 0.35 + 0.3 * Math.sin(f.phase * 2);
    ctx.globalAlpha = glow;
    ctx.fillStyle = '#cfe89a';
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // The stone circle the lantern stands on.
  ctx.strokeStyle = PALETTE.stone;
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(CENTER.x, CENTER.y, 108, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = PALETTE.stoneLight;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(CENTER.x, CENTER.y, 96, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * Math.PI * 2;
    ctx.fillStyle = PALETTE.stone;
    ctx.beginPath();
    ctx.arc(CENTER.x + Math.cos(a) * 108, CENTER.y + Math.sin(a) * 108, 7, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawLantern(ctx, state) {
  const flicker = 1 + 0.06 * Math.sin(state.time * 7) + 0.04 * Math.sin(state.time * 13.7);
  const glowR = 190 * flicker * (0.55 + 0.45 * (state.lanternHp / LANTERN.maxHp));
  const glow = ctx.createRadialGradient(CENTER.x, CENTER.y, 10, CENTER.x, CENTER.y, glowR);
  glow.addColorStop(0, 'rgba(255, 217, 122, 0.55)');
  glow.addColorStop(1, 'rgba(255, 217, 122, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(CENTER.x, CENTER.y, glowR, 0, Math.PI * 2);
  ctx.fill();

  // The lantern itself: a little brass house with a bright core.
  ctx.fillStyle = '#7a5a28';
  ctx.fillRect(CENTER.x - 26, CENTER.y - 34, 52, 12);
  ctx.beginPath();
  ctx.moveTo(CENTER.x - 30, CENTER.y - 34);
  ctx.lineTo(CENTER.x, CENTER.y - 52);
  ctx.lineTo(CENTER.x + 30, CENTER.y - 34);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#2c2113';
  ctx.fillRect(CENTER.x - 24, CENTER.y - 24, 48, 52);
  ctx.fillStyle = PALETTE.lanternCore;
  ctx.beginPath();
  ctx.arc(CENTER.x, CENTER.y + 2, 15 * flicker, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#7a5a28';
  ctx.fillRect(CENTER.x - 30, CENTER.y + 28, 60, 8);
}

function drawEnemies(ctx, state) {
  for (const enemy of state.enemies) {
    const blink = enemy.flash > 0;
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    if (enemy.kind === 'boss') {
      // The Gloomlord: a horned dark mass with a burning crown.
      ctx.fillStyle = blink ? '#ffffff' : enemy.color;
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2a0a0c';
      ctx.beginPath();
      ctx.moveTo(-34, -30);
      ctx.lineTo(-14, -52);
      ctx.lineTo(-6, -28);
      ctx.closePath();
      ctx.moveTo(34, -30);
      ctx.lineTo(14, -52);
      ctx.lineTo(6, -28);
      ctx.closePath();
      ctx.fill();
    } else {
      // Shades are dark blobs with glowing eyes; each kind has its own shape.
      ctx.fillStyle = blink ? '#ffffff' : enemy.color;
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      if (enemy.kind === 'mote') {
        ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
      } else if (enemy.kind === 'husk') {
        for (let i = 0; i < 6; i += 1) {
          const a = (i / 6) * Math.PI * 2 + enemy.wobble * 0.4;
          const px = Math.cos(a) * enemy.radius;
          const py = Math.sin(a) * enemy.radius;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
      } else {
        // Spitter: a diamond with a pale belly.
        ctx.moveTo(0, -enemy.radius);
        ctx.lineTo(enemy.radius, 0);
        ctx.lineTo(0, enemy.radius);
        ctx.lineTo(-enemy.radius, 0);
        ctx.closePath();
      }
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    // Eyes look toward the lantern.
    const look = Math.atan2(CENTER.y - enemy.y, CENTER.x - enemy.x);
    const ex = Math.cos(look) * enemy.radius * 0.32;
    const ey = Math.sin(look) * enemy.radius * 0.32;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ex - 5, ey - 3, 3.4, 0, Math.PI * 2);
    ctx.arc(ex + 5, ey - 3, 3.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a0b2e';
    ctx.beginPath();
    ctx.arc(ex - 5, ey - 3, 1.6, 0, Math.PI * 2);
    ctx.arc(ex + 5, ey - 3, 1.6, 0, Math.PI * 2);
    ctx.fill();
    // Wound bar once hurt.
    if (enemy.hp < enemy.maxHp) {
      const w = enemy.radius * 2;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.fillRect(-w / 2, -enemy.radius - 12, w, 5);
      ctx.fillStyle = '#ffd97a';
      ctx.fillRect(-w / 2, -enemy.radius - 12, w * (enemy.hp / enemy.maxHp), 5);
    }
    ctx.restore();
  }
}

function drawPlayer(ctx, state) {
  const p = state.player;
  // The keeper's trail: fading sparks where it flew.
  for (const t of p.trail) {
    ctx.globalAlpha = (t.life / 0.25) * 0.35;
    ctx.fillStyle = PALETTE.player;
    ctx.beginPath();
    ctx.arc(t.x, t.y, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  const blink = state.time < p.invulnerableUntil && Math.floor(state.time * 12) % 2 === 0;
  if (blink) return;
  const glow = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, 44);
  glow.addColorStop(0, 'rgba(191, 243, 255, 0.5)');
  glow.addColorStop(1, 'rgba(191, 243, 255, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(p.x, p.y, 44, 0, Math.PI * 2);
  ctx.fill();
  // A little wisp: bright core, two wings, a facing beak toward the aim.
  const aim = Math.atan2(p.aimY - p.y, p.aimX - p.x);
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(aim);
  ctx.fillStyle = PALETTE.player;
  ctx.beginPath();
  ctx.ellipse(-4, -10, 12, 5, -0.5, 0, Math.PI * 2);
  ctx.ellipse(-4, 10, 12, 5, 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.playerCore;
  ctx.beginPath();
  ctx.arc(0, 0, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0b1f2a';
  ctx.beginPath();
  ctx.arc(5, -3.5, 2.2, 0, Math.PI * 2);
  ctx.arc(5, 3.5, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawShotsAndPickups(ctx, state) {
  for (const pickup of state.pickups) {
    const bob = Math.sin(state.time * 4 + pickup.x) * 3;
    if (pickup.kind === 'shard') {
      ctx.save();
      ctx.translate(pickup.x, pickup.y + bob);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = PALETTE.shard;
      ctx.fillRect(-6, -6, 12, 12);
      ctx.fillStyle = '#fff3c4';
      ctx.fillRect(-3, -3, 6, 6);
      ctx.restore();
    } else {
      ctx.fillStyle = PALETTE.heart;
      ctx.beginPath();
      ctx.arc(pickup.x - 5, pickup.y + bob, 6, 0, Math.PI * 2);
      ctx.arc(pickup.x + 5, pickup.y + bob, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(pickup.x - 10, pickup.y + bob + 2);
      ctx.lineTo(pickup.x + 10, pickup.y + bob + 2);
      ctx.lineTo(pickup.x, pickup.y + bob + 13);
      ctx.closePath();
      ctx.fill();
    }
  }
  for (const bullet of state.bullets) {
    ctx.fillStyle = PALETTE.bullet;
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, bullet.radius + 3, 0, Math.PI * 2);
    ctx.globalAlpha = 0.35;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const orb of state.orbs) {
    ctx.fillStyle = PALETTE.orb;
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, orb.radius + 3, 0, Math.PI * 2);
    ctx.globalAlpha = 0.4;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#e9d5ff';
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const particle of state.particles) {
    ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (const fl of state.floats) {
    ctx.globalAlpha = Math.max(0, fl.life);
    smallText(ctx, fl.text, fl.x, fl.y, 16, fl.color, 'center', 'bold');
  }
  ctx.globalAlpha = 1;
}

function drawHud(ctx, state) {
  // Top bar: lantern light, hearts, wave, score.
  ctx.fillStyle = 'rgba(4, 12, 18, 0.72)';
  ctx.fillRect(0, 0, VIEW.width, 56);
  smallText(ctx, 'LANTERN', 24, 18, 13, PALETTE.dim, 'left', 'bold');
  const barW = 220;
  const frac = Math.max(0, state.lanternHp / LANTERN.maxHp);
  ctx.fillStyle = '#12303a';
  roundRect(ctx, 24, 28, barW, 14, 7);
  ctx.fill();
  ctx.fillStyle = frac > 0.5 ? '#ffd97a' : frac > 0.25 ? '#ff9a3d' : '#e5484d';
  roundRect(ctx, 24, 28, barW * frac, 14, 7);
  ctx.fill();
  smallText(ctx, `${Math.ceil(state.lanternHp)}`, 24 + barW + 10, 35, 15, PALETTE.text, 'left', 'bold');

  for (let i = 0; i < state.player.maxHp; i += 1) {
    const hx = 330 + i * 28;
    ctx.fillStyle = i < state.player.hp ? PALETTE.heart : 'rgba(255, 107, 129, 0.25)';
    ctx.beginPath();
    ctx.arc(hx - 4, 32, 6, 0, Math.PI * 2);
    ctx.arc(hx + 4, 32, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(hx - 9, 34);
    ctx.lineTo(hx + 9, 34);
    ctx.lineTo(hx, 45);
    ctx.closePath();
    ctx.fill();
  }

  smallText(ctx, `WAVE ${Math.max(1, state.wave)} / ${TOTAL_WAVES}`, 640, 22, 15, PALETTE.text, 'center', 'bold');
  const incoming = state.spawnQueue.length + state.enemies.length;
  const waveLine = state.wave === 0 ? 'Defend the lantern' : state.waveActive ? `${incoming} shades remain` : 'Wave clear!';
  smallText(ctx, waveLine, 640, 42, 12, PALETTE.dim, 'center');

  smallText(ctx, 'SCORE', 1256, 18, 13, PALETTE.dim, 'right', 'bold');
  smallText(ctx, `${state.score}`, 1256, 38, 18, PALETTE.gold, 'right', 'bold');

  // The boss gets its own bar under the top bar.
  const boss = state.enemies.find((e) => e.kind === 'boss');
  if (boss) {
    smallText(ctx, 'THE GLOOMLORD', 640, 78, 13, '#ff9a9e', 'center', 'bold');
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    roundRect(ctx, 440, 90, 400, 10, 5);
    ctx.fill();
    ctx.fillStyle = '#e5484d';
    roundRect(ctx, 440, 90, 400 * (boss.hp / boss.maxHp), 10, 5);
    ctx.fill();
  }

  // A wave banner fades in the middle of the screen.
  if (state.time < state.messageUntil && state.message) {
    ctx.globalAlpha = Math.min(1, (state.messageUntil - state.time) / 0.6);
    text(ctx, state.message, 640, 120, 30, PALETTE.text);
    ctx.globalAlpha = 1;
  }

  // The damage flash tints the whole view.
  if (state.flash > 0) {
    ctx.fillStyle = `rgba(229, 72, 77, ${state.flash * 0.25})`;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  }
}

function dimScreen(ctx, alpha = 0.78) {
  ctx.fillStyle = `rgba(3, 9, 13, ${alpha})`;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
}

function drawTitle(ctx, state) {
  dimScreen(ctx);
  const bob = Math.sin(state.time * 1.6) * 6;
  text(ctx, 'LUMEN KEEP', 640, 210 + bob, 72, PALETTE.lanternGlow);
  text(ctx, 'Defend the last lantern in the dark grove', 640, 272, 24, PALETTE.text, 'center', 'normal');
  smallText(ctx, 'Shades come for the light. Hold the circle for 8 waves.', 640, 308, 16, PALETTE.dim, 'center');
  smallText(ctx, 'WASD or arrows to move  ·  mouse to aim  ·  hold click or Space to shoot', 640, 352, 16, PALETTE.text, 'center');
  smallText(ctx, 'Between waves, pick one boon  ·  P pauses  ·  M mutes', 640, 378, 16, PALETTE.text, 'center');
  ctx.fillStyle = PALETTE.gold;
  roundRect(ctx, 490, 412, 300, 56, 12);
  ctx.fill();
  text(ctx, 'BEGIN THE WATCH', 640, 442, 22, '#241a05');
  if (state.best > 0) smallText(ctx, `Best score: ${state.best}`, 640, 500, 16, PALETTE.dim, 'center');
  smallText(ctx, 'An original game — no borrowed art, music or names', 640, 660, 13, PALETTE.dim, 'center');
}

function drawUpgrade(ctx, state, ui) {
  dimScreen(ctx);
  text(ctx, `Wave ${state.wave} clear — choose a boon`, 640, 130, 36, PALETTE.text);
  smallText(ctx, 'Click a card, or press 1, 2 or 3', 640, 170, 16, PALETTE.dim, 'center');
  const cardW = 300;
  const cardH = 220;
  const gap = 32;
  const total = cardW * 3 + gap * 2;
  const startX = (VIEW.width - total) / 2;
  const y = 230;
  state.upgradeChoices.forEach((choice, i) => {
    const x = startX + i * (cardW + gap);
    const hover = ui && ui.mouseX >= x && ui.mouseX <= x + cardW && ui.mouseY >= y && ui.mouseY <= y + cardH;
    ctx.fillStyle = hover ? '#1d3a44' : '#122a33';
    roundRect(ctx, x, y, cardW, cardH, 14);
    ctx.fill();
    ctx.strokeStyle = hover ? PALETTE.gold : '#2e5563';
    ctx.lineWidth = hover ? 3 : 2;
    roundRect(ctx, x, y, cardW, cardH, 14);
    ctx.stroke();
    smallText(ctx, `${i + 1}`, x + cardW / 2, y + 34, 15, PALETTE.dim, 'center', 'bold');
    text(ctx, choice.name, x + cardW / 2, y + 88, 26, PALETTE.gold);
    smallText(ctx, choice.text, x + cardW / 2, y + 132, 16, PALETTE.text, 'center');
    const owned = state.upgradeCounts[choice.id] ?? 0;
    smallText(ctx, owned > 0 ? `Owned: ${owned}` : 'New boon', x + cardW / 2, y + 178, 14, PALETTE.dim, 'center');
  });
  smallText(ctx, `Score ${state.score}  ·  Lantern ${Math.ceil(state.lanternHp)}  ·  Next: wave ${state.wave + 1}`, 640, 520, 16, PALETTE.text, 'center');
}

function drawEndScreen(ctx, state, victory) {
  dimScreen(ctx, 0.88);
  if (victory) {
    text(ctx, 'THE LIGHT ENDURES', 640, 180, 56, PALETTE.lanternGlow);
    text(ctx, 'Eight waves, and the lantern still burns.', 640, 238, 22, PALETTE.text, 'center', 'normal');
  } else {
    text(ctx, 'THE LANTERN FADES', 640, 180, 56, '#ff9a9e');
    text(ctx, state.lanternHp <= 0 ? 'The shades swallowed the last light.' : 'The keeper has fallen.', 640, 238, 22, PALETTE.text, 'center', 'normal');
  }
  const accuracy = state.stats.shotsFired > 0 ? Math.round((100 * state.stats.shotsHit) / state.stats.shotsFired) : 0;
  const minutes = Math.floor(state.stats.timePlayed / 60);
  const seconds = Math.floor(state.stats.timePlayed % 60);
  smallText(ctx, `Score  ${state.score}`, 640, 310, 22, PALETTE.gold, 'center', 'bold');
  smallText(ctx, `Waves cleared  ${victory ? TOTAL_WAVES : state.wave - 1}  ·  Shades banished  ${state.kills}`, 640, 352, 17, PALETTE.text, 'center');
  smallText(ctx, `Accuracy  ${accuracy}%  ·  Time  ${minutes}:${String(seconds).padStart(2, '0')}`, 640, 384, 17, PALETTE.text, 'center');
  if (state.score >= state.best && state.score > 0) smallText(ctx, 'A new best score!', 640, 420, 17, PALETTE.gold, 'center', 'bold');
  ctx.fillStyle = PALETTE.gold;
  roundRect(ctx, 490, 462, 300, 56, 12);
  ctx.fill();
  text(ctx, victory ? 'KEEP WATCH AGAIN' : 'TRY AGAIN', 640, 492, 22, '#241a05');
  smallText(ctx, 'Press R or click the button to restart', 640, 556, 15, PALETTE.dim, 'center');
}

function drawPaused(ctx) {
  dimScreen(ctx);
  text(ctx, 'PAUSED', 640, 320, 56, PALETTE.text);
  smallText(ctx, 'Press P or click to keep playing', 640, 380, 17, PALETTE.dim, 'center');
}

// The whole frame: the world, then the HUD, then the screen on top.
export function drawFrame(ctx, state, ui) {
  ctx.save();
  if (state.shake > 0) {
    const s = state.shake * 10;
    ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
  }
  drawBackground(ctx, state);
  drawLantern(ctx, state);
  drawShotsAndPickups(ctx, state);
  drawEnemies(ctx, state);
  drawPlayer(ctx, state);
  ctx.restore();
  if (state.screen === 'title') {
    drawHud(ctx, state);
    drawTitle(ctx, state);
  } else if (state.screen === 'upgrade') {
    drawHud(ctx, state);
    drawUpgrade(ctx, state, ui);
  } else if (state.screen === 'victory') {
    drawHud(ctx, state);
    drawEndScreen(ctx, state, true);
  } else if (state.screen === 'gameover') {
    drawHud(ctx, state);
    drawEndScreen(ctx, state, false);
  } else if (state.screen === 'paused') {
    drawHud(ctx, state);
    drawPaused(ctx);
  } else {
    drawHud(ctx, state);
    // Crosshair at the mouse while playing.
    if (ui) {
      ctx.strokeStyle = 'rgba(234, 246, 255, 0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(ui.mouseX, ui.mouseY, 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(ui.mouseX - 14, ui.mouseY);
      ctx.lineTo(ui.mouseX - 6, ui.mouseY);
      ctx.moveTo(ui.mouseX + 6, ui.mouseY);
      ctx.lineTo(ui.mouseX + 14, ui.mouseY);
      ctx.moveTo(ui.mouseX, ui.mouseY - 14);
      ctx.lineTo(ui.mouseX, ui.mouseY - 6);
      ctx.moveTo(ui.mouseX, ui.mouseY + 6);
      ctx.lineTo(ui.mouseX, ui.mouseY + 14);
      ctx.stroke();
    }
  }
}
