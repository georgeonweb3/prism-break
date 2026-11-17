// Prism Break — the renderer: one canvas, a virtual 960x540 playfield
// letterboxed onto the window, neon glow, particles, floating score text,
// the HUD and every screen (title, play, paused, level clear, game over,
// victory). All colours are drawn in code; no images are loaded.

import { BRICK_COLORS, BRICK_GLOW, LEVEL_NAMES, VIEW_H, VIEW_W } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  // A static starfield, seeded once so the background never flickers.
  const stars = [];
  let seed = 1234567;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  for (let i = 0; i < 90; i += 1) {
    stars.push({ x: rnd() * VIEW_W, y: rnd() * VIEW_H, r: rnd() * 1.4 + 0.4, a: rnd() * 0.5 + 0.15 });
  }

  function fit() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = canvas.clientWidth || window.innerWidth;
    const ch = canvas.clientHeight || window.innerHeight;
    canvas.width = Math.floor(cw * dpr);
    canvas.height = Math.floor(ch * dpr);
    const scale = Math.min(canvas.width / VIEW_W, canvas.height / VIEW_H);
    const ox = (canvas.width - VIEW_W * scale) / 2;
    const oy = (canvas.height - VIEW_H * scale) / 2;
    return { dpr, scale, ox, oy };
  }

  function background(t) {
    const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    g.addColorStop(0, '#0b0620');
    g.addColorStop(0.55, '#12082e');
    g.addColorStop(1, '#05030f');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    // Slow-drifting nebula blobs.
    const blobs = [
      { x: 180 + Math.sin(t * 0.11) * 30, y: 130, r: 210, c: 'rgba(124,58,237,0.20)' },
      { x: 780 + Math.cos(t * 0.09) * 30, y: 330, r: 240, c: 'rgba(8,145,178,0.16)' },
      { x: 500, y: 470, r: 200, c: 'rgba(219,39,119,0.10)' },
    ];
    for (const b of blobs) {
      const rg = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
      rg.addColorStop(0, b.c);
      rg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = rg;
      ctx.fillRect(b.x - b.r, b.y - b.r, b.r * 2, b.r * 2);
    }

    for (const s of stars) {
      const tw = 0.6 + 0.4 * Math.sin(t * 1.5 + s.x);
      ctx.globalAlpha = s.a * tw;
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(s.x, s.y, s.r, s.r);
    }
    ctx.globalAlpha = 1;

    // Faint perspective grid at the bottom, for depth.
    ctx.strokeStyle = 'rgba(148,163,184,0.07)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= VIEW_W; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, 430);
      ctx.lineTo(VIEW_W / 2 + (x - VIEW_W / 2) * 1.6, VIEW_H);
      ctx.stroke();
    }
    for (let y = 430; y <= VIEW_H; y += 18) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(VIEW_W, y);
      ctx.stroke();
    }
  }

  function drawBricks(state) {
    for (const b of state.bricks) {
      const color = BRICK_COLORS[b.type] ?? '#22d3ee';
      ctx.save();
      ctx.shadowColor = BRICK_GLOW[b.type] ?? 'rgba(34,211,238,0.5)';
      ctx.shadowBlur = 14;
      const grad = ctx.createLinearGradient(b.x, b.y, b.x, b.y + b.h);
      grad.addColorStop(0, color);
      grad.addColorStop(1, '#0f172a');
      ctx.fillStyle = grad;
      roundRect(ctx, b.x, b.y, b.w, b.h, 5);
      ctx.fill();
      ctx.restore();

      // Prism bricks shimmer; damaged bricks show a crack.
      if (b.type === 'prism') {
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.fillRect(b.x + b.w / 2 - 1, b.y + 4, 2, b.h - 8);
        ctx.fillRect(b.x + 6, b.y + b.h / 2 - 1, b.w - 12, 2);
      } else if (b.hits < b.maxHits) {
        ctx.strokeStyle = 'rgba(15,23,42,0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(b.x + 8, b.y + 3);
        ctx.lineTo(b.x + b.w / 2, b.y + b.h / 2);
        ctx.lineTo(b.x + b.w - 10, b.y + b.h - 4);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(255,255,255,0.28)';
      ctx.fillRect(b.x + 3, b.y + 3, b.w - 6, 3);
    }
  }

  function drawPaddle(state, t) {
    const p = state.paddle;
    const w = p.w;
    ctx.save();
    ctx.shadowColor = 'rgba(56,189,248,0.8)';
    ctx.shadowBlur = 18;
    const grad = ctx.createLinearGradient(p.x - w / 2, 0, p.x + w / 2, 0);
    grad.addColorStop(0, '#0ea5e9');
    grad.addColorStop(0.5, '#e0f2fe');
    grad.addColorStop(1, '#0ea5e9');
    ctx.fillStyle = grad;
    roundRect(ctx, p.x - w / 2, 506, w, 14, 7);
    ctx.fill();
    ctx.restore();
    // Wide-paddle timer tick.
    if (p.wideTimer > 0) {
      ctx.fillStyle = 'rgba(34,211,238,0.9)';
      const frac = p.wideTimer / 12;
      ctx.fillRect(p.x - w / 2, 524, w * frac, 3);
    }
    void t;
  }

  function drawBalls(state) {
    for (const ball of state.balls) {
      const hue = ball.hue;
      // Trail: fading echoes of where the ball has been.
      const trail = ball.trail ?? [];
      trail.forEach((p, i) => {
        const f = (i + 1) / trail.length;
        ctx.globalAlpha = f * 0.35;
        ctx.fillStyle = `hsl(${hue} 100% 65%)`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, ball.r * f * 0.8, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      ctx.save();
      ctx.shadowColor = `hsl(${hue} 100% 60% / 0.9)`;
      ctx.shadowBlur = 16;
      const g = ctx.createRadialGradient(ball.x - 2, ball.y - 2, 1, ball.x, ball.y, ball.r + 2);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.45, `hsl(${hue} 100% 70%)`);
      g.addColorStop(1, `hsl(${hue} 100% 45%)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawPowerups(state) {
    for (const pu of state.powerups) {
      const color = pu.color;
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = 12;
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(pu.x, pu.y, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = color;
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pu.letter, pu.x, pu.y + 0.5);
    }
  }

  function drawParticles(state) {
    for (const pt of state.particles) {
      ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
      ctx.fillStyle = pt.color;
      ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
    }
    ctx.globalAlpha = 1;
  }

  function drawTexts(state) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const t of state.texts) {
      ctx.globalAlpha = Math.max(0, t.life / t.maxLife);
      ctx.font = `bold ${t.size}px system-ui, sans-serif`;
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  }

  function drawHud(state, best) {
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE ${state.score}`, 20, 26);
    ctx.textAlign = 'center';
    ctx.fillText(`LEVEL ${state.level + 1} · ${LEVEL_NAMES[state.level] ?? ''}`, VIEW_W / 2, 26);
    ctx.textAlign = 'right';
    ctx.fillText(`BEST ${Math.max(best, state.score)}`, VIEW_W - 20, 26);

    // Lives as hearts.
    ctx.textAlign = 'left';
    for (let i = 0; i < state.lives; i += 1) {
      const x = 24 + i * 24;
      ctx.fillStyle = '#f87171';
      ctx.font = '18px system-ui, sans-serif';
      ctx.fillText('♥', x, 52);
    }
    // Combo meter.
    if (state.combo > 1) {
      ctx.textAlign = 'right';
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 18px system-ui, sans-serif';
      ctx.fillText(`COMBO ×${state.combo}`, VIEW_W - 20, 52);
      ctx.fillStyle = 'rgba(251,191,36,0.35)';
      ctx.fillRect(VIEW_W - 120, 62, 100 * (state.comboTimer / 4), 4);
    }
  }

  function centerTitle(lines) {
    let y = 150;
    for (const line of lines) {
      ctx.font = line.font;
      ctx.fillStyle = line.color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (line.glow) {
        ctx.save();
        ctx.shadowColor = line.glow;
        ctx.shadowBlur = 26;
        ctx.fillText(line.text, VIEW_W / 2, y);
        ctx.restore();
      } else {
        ctx.fillText(line.text, VIEW_W / 2, y);
      }
      y += line.gap ?? 46;
    }
  }

  function drawTitle(state, best) {
    ctx.fillStyle = 'rgba(5,3,15,0.55)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    centerTitle([
      { text: 'PRISM', font: '900 84px system-ui, sans-serif', color: '#22d3ee', glow: 'rgba(34,211,238,0.9)', gap: 78 },
      { text: 'BREAK', font: '900 84px system-ui, sans-serif', color: '#e879f9', glow: 'rgba(232,121,249,0.9)', gap: 64 },
      { text: 'Smash the prisms. Chain the combo. Clear all three levels.', font: '20px system-ui, sans-serif', color: '#e2e8f0', gap: 40 },
      { text: 'MOUSE or ← → to move  ·  CLICK or SPACE to launch', font: 'bold 17px system-ui, sans-serif', color: '#94a3b8', gap: 30 },
      { text: 'P pause  ·  R restart  ·  M mute', font: '15px system-ui, sans-serif', color: '#64748b', gap: 52 },
    ]);
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillStyle = '#fbbf24';
    ctx.textAlign = 'center';
    ctx.fillText('▶  CLICK OR PRESS SPACE TO PLAY', VIEW_W / 2, 442);
    if (best > 0) {
      ctx.font = '17px system-ui, sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(`Best score: ${best}`, VIEW_W / 2, 482);
    }
    void state;
  }

  function drawPaused() {
    ctx.fillStyle = 'rgba(5,3,15,0.65)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    centerTitle([
      { text: 'PAUSED', font: '900 56px system-ui, sans-serif', color: '#e2e8f0', glow: 'rgba(226,232,240,0.7)', gap: 46 },
      { text: 'P or CLICK to resume  ·  R to restart', font: '18px system-ui, sans-serif', color: '#94a3b8', gap: 0 },
    ]);
  }

  function drawOver(state, best) {
    ctx.fillStyle = 'rgba(5,3,15,0.72)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const isBest = state.score >= best && state.score > 0;
    centerTitle([
      { text: 'GAME OVER', font: '900 64px system-ui, sans-serif', color: '#f87171', glow: 'rgba(248,113,113,0.9)', gap: 56 },
      { text: `SCORE  ${state.score}`, font: 'bold 30px system-ui, sans-serif', color: '#e2e8f0', gap: 40 },
      { text: isBest ? '★ NEW BEST ★' : `BEST  ${best}`, font: 'bold 20px system-ui, sans-serif', color: '#fbbf24', gap: 56 },
      { text: 'SPACE or CLICK to play again', font: '18px system-ui, sans-serif', color: '#94a3b8', gap: 0 },
    ]);
  }

  function drawWin(state, best) {
    ctx.fillStyle = 'rgba(5,3,15,0.6)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    centerTitle([
      { text: 'YOU BROKE', font: '900 56px system-ui, sans-serif', color: '#a3e635', glow: 'rgba(163,230,53,0.9)', gap: 60 },
      { text: 'EVERY PRISM', font: '900 56px system-ui, sans-serif', color: '#22d3ee', glow: 'rgba(34,211,238,0.9)', gap: 56 },
      { text: `FINAL SCORE  ${state.score}`, font: 'bold 28px system-ui, sans-serif', color: '#e2e8f0', gap: 40 },
      { text: `BEST  ${Math.max(best, state.score)}`, font: 'bold 20px system-ui, sans-serif', color: '#fbbf24', gap: 56 },
      { text: 'SPACE or CLICK to play again', font: '18px system-ui, sans-serif', color: '#94a3b8', gap: 0 },
    ]);
  }

  function drawLevelBanner(state) {
    if (state.levelClearTimer <= 0) return;
    ctx.save();
    ctx.globalAlpha = Math.min(1, state.levelClearTimer);
    ctx.font = '900 44px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#a3e635';
    ctx.shadowColor = 'rgba(163,230,53,0.9)';
    ctx.shadowBlur = 24;
    ctx.fillText('LEVEL CLEAR', VIEW_W / 2, VIEW_H / 2 - 20);
    ctx.restore();
  }

  return {
    /** Current transform (scale, x offset) for input conversion. */
    transform: { scale: 1, offsetX: 0 },

    draw(state, screen, best, opts = {}) {
      const { scale, ox, oy } = fit();
      this.transform.scale = scale;
      this.transform.offsetX = ox;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#05030f';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(scale, 0, 0, scale, ox, oy);

      // Screen shake: a few pixels, decaying with state.shake.
      if (state.shake > 0) {
        const s = state.shake;
        ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
      }

      const t = opts.time ?? state.time;
      background(t);
      drawBricks(state);
      drawPowerups(state);
      drawPaddle(state, t);
      drawBalls(state);
      drawParticles(state);
      drawTexts(state);
      drawHud(state, best);
      drawLevelBanner(state);

      if (screen === SCREEN_TITLE) drawTitle(state, best);
      else if (screen === SCREEN_PAUSED) drawPaused();
      else if (screen === SCREEN_OVER) drawOver(state, best);
      else if (screen === SCREEN_WIN) drawWin(state, best);

      if (state.flash > 0) {
        ctx.fillStyle = `rgba(163,230,53,${state.flash * 0.9})`;
        ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      }
    },
  };
}
