// Prism Break — the world: one state object, stepped in fixed 1/60 s ticks.
// Everything the renderer paints lives here; nothing here touches the DOM,
// so a seeded world can be stepped offline for the staged screenshots.
//
// A brick: {x, y, w, h, type, hits, maxHits, hue}
//   type '1' | '2' | '3' (breakable, that many hits), 'steel' (unbreakable),
//   'prism' (bonus brick: worth more, and it repaints the ball's trail).
// A ball: {x, y, vx, vy, r, hue, stuck} — stuck balls ride the paddle.
// A power-up: {x, y, kind, vy} — kinds: 'wide', 'multi', 'slow', 'life'.
// A particle: {x, y, vx, vy, life, maxLife, size, color}.
// A float text: {x, y, text, life, maxLife, color, size}.

import {
  BALL_MAX_SPEED,
  BALL_R,
  BALL_SPEED,
  BRICK_GAP,
  BRICK_H,
  BRICK_W,
  COMBO_MAX,
  COMBO_WINDOW,
  DROP_CHANCE,
  GRID_COLS,
  GRID_LEFT,
  GRID_TOP,
  LEVELS,
  LIVES,
  PADDLE_H,
  PADDLE_SPEED,
  PADDLE_W,
  PADDLE_WIDE_W,
  PADDLE_Y,
  POWERUP_FALL_SPEED,
  POWERUP_R,
  SCORE_1,
  SCORE_2,
  SCORE_3,
  SCORE_LEVEL_CLEAR,
  SCORE_PRISM,
  SLOW_TIME,
  VIEW_H,
  VIEW_W,
  WIDE_TIME,
} from './config.js';

export const EVENT_NONE = 0;
export const EVENT_HIT = 1; // a brick broke
export const EVENT_LOST = 2; // a ball was lost (a life, unless it was the last)
export const EVENT_OVER = 4; // no lives left
export const EVENT_CLEAR = 8; // level cleared
export const EVENT_WIN = 16; // final level cleared
export const EVENT_POWER = 32; // a power-up was caught

const POWERUP_KINDS = ['wide', 'multi', 'slow', 'life'];
const POWERUP_COLORS = { wide: '#22d3ee', multi: '#e879f9', slow: '#38bdf8', life: '#f87171' };
const POWERUP_LETTERS = { wide: 'W', multi: 'M', slow: 'S', life: '+1' };

function brickScore(brick) {
  if (brick.type === '1') return SCORE_1;
  if (brick.type === '2') return SCORE_2;
  if (brick.type === '3') return SCORE_3;
  if (brick.type === 'prism') return SCORE_PRISM;
  return 0;
}

function buildBricks(levelIndex) {
  const rows = LEVELS[levelIndex % LEVELS.length];
  const bricks = [];
  rows.forEach((row, r) => {
    for (let c = 0; c < GRID_COLS; c += 1) {
      const ch = row[c] ?? '.';
      if (ch === '.') continue;
      const type = ch === '#' ? 'steel' : ch === 'P' ? 'prism' : ch;
      const hits = type === 'steel' ? Infinity : type === 'prism' ? 1 : Number(type);
      bricks.push({
        x: GRID_LEFT + c * (BRICK_W + BRICK_GAP),
        y: GRID_TOP + r * (BRICK_H + BRICK_GAP),
        w: BRICK_W,
        h: BRICK_H,
        type,
        hits,
        maxHits: hits,
      });
    }
  });
  return bricks;
}

export function createWorld(random) {
  const state = {
    score: 0,
    lives: LIVES,
    level: 0,
    combo: 1,
    comboTimer: 0,
    paddle: { x: VIEW_W / 2, w: PADDLE_W, wideTimer: 0 },
    balls: [],
    bricks: [],
    powerups: [],
    particles: [],
    texts: [],
    shake: 0,
    flash: 0,
    levelClearTimer: 0,
    time: 0,
    ballsServed: 0,
    attract: false, // attract mode (title screen): no score, no lives
    paddleVel: 0, // px/s, for bending the bounce off a moving paddle
  };

  function spawnBall(angle) {
    const a = angle ?? -Math.PI / 2 + random.range(-0.5, 0.5);
    state.balls.push({
      x: state.paddle.x,
      y: PADDLE_Y - BALL_R - 1,
      vx: Math.cos(a) * BALL_SPEED,
      vy: Math.sin(a) * BALL_SPEED,
      r: BALL_R,
      hue: 185,
      stuck: true,
      trail: [],
    });
  }

  function loadLevel(index) {
    state.level = index;
    state.bricks = buildBricks(index);
    state.powerups = [];
    state.balls = [];
    state.paddle.w = PADDLE_W;
    state.paddle.wideTimer = 0;
    state.combo = 1;
    state.comboTimer = 0;
    spawnBall();
  }

  function burst(x, y, color, count, speed) {
    for (let i = 0; i < count; i += 1) {
      const a = random.range(0, Math.PI * 2);
      const s = random.range(speed * 0.3, speed);
      state.particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 40,
        life: random.range(0.35, 0.8),
        maxLife: 0.8,
        size: random.range(2, 5),
        color,
      });
    }
  }

  function floatText(x, y, text, color, size) {
    state.texts.push({ x, y, text, life: 0.9, maxLife: 0.9, color, size: size ?? 15 });
  }

  function dropPowerup(x, y) {
    if (random.next() > DROP_CHANCE) return;
    const kind = random.pick(POWERUP_KINDS);
    state.powerups.push({ x, y, kind, vy: POWERUP_FALL_SPEED, color: POWERUP_COLORS[kind], letter: POWERUP_LETTERS[kind] });
  }

  function applyPowerup(kind) {
    if (kind === 'wide') {
      state.paddle.w = PADDLE_WIDE_W;
      state.paddle.wideTimer = WIDE_TIME;
      floatText(state.paddle.x, PADDLE_Y - 30, 'WIDE PADDLE', '#22d3ee', 16);
    } else if (kind === 'multi') {
      const source = state.balls[0];
      if (source && state.balls.length < 5) {
        [-0.6, 0.6].forEach((da) => {
          const speed = Math.hypot(source.vx, source.vy);
          const a = Math.atan2(source.vy, source.vx) + da;
          state.balls.push({
            x: source.x,
            y: source.y,
            vx: Math.cos(a) * speed,
            vy: Math.sin(a) * speed,
            r: BALL_R,
            hue: source.hue,
            stuck: false,
            trail: [],
          });
        });
      }
      floatText(state.paddle.x, PADDLE_Y - 30, 'MULTIBALL', '#e879f9', 16);
    } else if (kind === 'slow') {
      state.balls.forEach((b) => {
        const s = Math.hypot(b.vx, b.vy);
        const f = Math.max(0.55, (BALL_SPEED * 0.75) / s);
        b.vx *= f;
        b.vy *= f;
      });
      floatText(state.paddle.x, PADDLE_Y - 30, 'SLOW BALL', '#38bdf8', 16);
    } else if (kind === 'life') {
      state.lives += 1;
      floatText(state.paddle.x, PADDLE_Y - 30, '+1 LIFE', '#f87171', 16);
    }
  }

  function breakableLeft() {
    return state.bricks.some((b) => b.type !== 'steel');
  }

  function hitBrick(brick, ball) {
    if (brick.type === 'steel') {
      state.shake = Math.max(state.shake, 3);
      return { broke: false, steel: true };
    }
    brick.hits -= 1;
    if (brick.hits > 0) {
      burst(ball.x, ball.y, '#e879f9', 6, 160);
      return { broke: false, steel: false };
    }
    const base = brickScore(brick);
    const color = brick.type === 'prism' ? '#a3e635' : '#22d3ee';
    if (!state.attract) {
      const gained = base * state.combo;
      state.score += gained;
      state.combo = Math.min(state.combo + 1, COMBO_MAX);
      state.comboTimer = COMBO_WINDOW;
      floatText(brick.x + brick.w / 2, brick.y, `+${gained}`, color, 15);
    }
    burst(brick.x + brick.w / 2, brick.y + brick.h / 2, color, 16, 260);
    if (brick.type === 'prism') {
      ball.hue = 80 + random.range(0, 200);
      state.flash = 0.12;
    }
    if (!state.attract) dropPowerup(brick.x + brick.w / 2, brick.y + brick.h / 2);
    state.shake = Math.max(state.shake, 2);
    return { broke: true, steel: false };
  }

  function stepBall(ball, dt) {
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;
    // A short trail, so the ball's motion reads even in a still frame.
    ball.trail = ball.trail ?? [];
    ball.trail.push({ x: ball.x, y: ball.y });
    if (ball.trail.length > 12) ball.trail.shift();

    if (ball.x - ball.r < 0) {
      ball.x = ball.r;
      ball.vx = Math.abs(ball.vx);
    } else if (ball.x + ball.r > VIEW_W) {
      ball.x = VIEW_W - ball.r;
      ball.vx = -Math.abs(ball.vx);
    }
    if (ball.y - ball.r < 0) {
      ball.y = ball.r;
      ball.vy = Math.abs(ball.vy);
    }

    // Paddle: the bounce angle follows where the ball lands on the paddle.
    // The paddle's own sideways motion bends the shot, and a whisper of
    // seeded jitter keeps a perfect tracker from looping one column forever.
    const p = state.paddle;
    if (
      ball.vy > 0 &&
      ball.y + ball.r >= PADDLE_Y &&
      ball.y + ball.r <= PADDLE_Y + PADDLE_H + 8 &&
      Math.abs(ball.x - p.x) <= p.w / 2 + ball.r
    ) {
      const rel = Math.max(-1, Math.min(1, (ball.x - p.x) / (p.w / 2)));
      const speed = Math.min(Math.hypot(ball.vx, ball.vy) * 1.02, BALL_MAX_SPEED);
      const bend = Math.max(-0.25, Math.min(0.25, state.paddleVel * 0.0004));
      const angle = -Math.PI / 2 + rel * 1.1 + bend + random.range(-0.04, 0.04);
      ball.vx = Math.cos(angle) * speed;
      ball.vy = Math.sin(angle) * speed;
      ball.y = PADDLE_Y - ball.r - 0.5;
      burst(ball.x, PADDLE_Y, '#7dd3fc', 5, 120);
      return 'paddle';
    }

    // Bricks: circle vs rect, resolve on the smallest penetration axis.
    for (const brick of state.bricks) {
      const cx = Math.max(brick.x, Math.min(ball.x, brick.x + brick.w));
      const cy = Math.max(brick.y, Math.min(ball.y, brick.y + brick.h));
      const dx = ball.x - cx;
      const dy = ball.y - cy;
      if (dx * dx + dy * dy > ball.r * ball.r) continue;
      const overlapX = ball.r - Math.abs(dx);
      const overlapY = ball.r - Math.abs(dy);
      if (overlapX < overlapY) {
        ball.vx = dx >= 0 ? Math.abs(ball.vx) : -Math.abs(ball.vx);
        ball.x += dx >= 0 ? overlapX : -overlapX;
      } else {
        ball.vy = dy >= 0 ? Math.abs(ball.vy) : -Math.abs(ball.vy);
        ball.y += dy >= 0 ? overlapY : -overlapY;
      }
      const result = hitBrick(brick, ball);
      if (result.broke) {
        state.bricks = state.bricks.filter((b) => b !== brick);
        return 'brick';
      }
      return result.steel ? 'steel' : 'brick-chip';
    }
    return null;
  }

  return {
    state,
    POWERUP_COLORS,
    POWERUP_LETTERS,

    reset() {
      state.score = 0;
      state.lives = LIVES;
      state.combo = 1;
      state.comboTimer = 0;
      state.particles = [];
      state.texts = [];
      state.powerups = [];
      state.shake = 0;
      state.flash = 0;
      state.levelClearTimer = 0;
      state.time = 0;
      state.ballsServed = 0;
      state.attract = false;
      state.paddleVel = 0;
      loadLevel(0);
    },

    /** Serve a stuck ball, or spawn one after a loss. */
    launch() {
      const stuck = state.balls.find((b) => b.stuck);
      if (stuck) {
        stuck.stuck = false;
        const a = -Math.PI / 2 + random.range(-0.45, 0.45);
        stuck.vx = Math.cos(a) * BALL_SPEED;
        stuck.vy = Math.sin(a) * BALL_SPEED;
        state.ballsServed += 1;
        return true;
      }
      return false;
    },

    /** Make sure a ball is in play (staging helper): respawns one when the
     *  field lost them all, and serves it immediately. */
    serveBall() {
      if (state.balls.length === 0) spawnBall();
      return this.launch();
    },

    /** Advance the world one fixed step. `move` is -1/0/1 (keys), `pointerX`
     *  is the paddle target in virtual coordinates (null when untouched).
     *  Returns an event bitmask; `sound` collects which sounds to play. */
    step(dt, move, pointerX, sound) {
      state.time += dt;
      let events = EVENT_NONE;

      // Paddle: the pointer wins over the keys when it has moved.
      const p = state.paddle;
      const prevX = p.x;
      if (pointerX !== null && pointerX !== undefined) {
        const half = p.w / 2;
        p.x = Math.max(half, Math.min(VIEW_W - half, pointerX));
      } else if (move !== 0) {
        p.x = Math.max(p.w / 2, Math.min(VIEW_W - p.w / 2, p.x + move * PADDLE_SPEED * dt));
      }
      state.paddleVel = (p.x - prevX) / dt;
      if (p.wideTimer > 0) {
        p.wideTimer -= dt;
        if (p.wideTimer <= 0) p.w = PADDLE_W;
      }

      if (state.comboTimer > 0) {
        state.comboTimer -= dt;
        if (state.comboTimer <= 0) state.combo = 1;
      }
      if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 14);
      if (state.flash > 0) state.flash = Math.max(0, state.flash - dt);
      if (state.levelClearTimer > 0) state.levelClearTimer -= dt;

      // Balls.
      const lost = [];
      for (const ball of state.balls) {
        if (ball.stuck) {
          ball.x = p.x;
          ball.y = PADDLE_Y - BALL_R - 1;
          continue;
        }
        const hit = stepBall(ball, dt);
        if (hit === 'paddle' && sound) sound.paddle();
        else if (hit === 'brick' && sound) sound.brick(0);
        else if (hit === 'brick-chip' && sound) sound.brick(1);
        else if (hit === 'steel' && sound) sound.steel();
        if (hit === 'brick') events |= EVENT_HIT;
        if (ball.y - ball.r > VIEW_H + 20) lost.push(ball);
      }
      state.balls = state.balls.filter((b) => !lost.includes(b));

      if (lost.length > 0 && state.balls.length === 0) {
        state.lives -= 1;
        state.combo = 1;
        state.comboTimer = 0;
        if (state.lives <= 0) {
          events |= EVENT_OVER;
        } else {
          events |= EVENT_LOST;
          spawnBall();
        }
      }

      // Power-ups fall; catching one applies it.
      for (const pu of state.powerups) {
        pu.y += pu.vy * dt;
        if (
          pu.y + POWERUP_R >= PADDLE_Y &&
          pu.y - POWERUP_R <= PADDLE_Y + PADDLE_H &&
          Math.abs(pu.x - p.x) <= p.w / 2 + POWERUP_R
        ) {
          applyPowerup(pu.kind);
          events |= EVENT_POWER;
          if (sound) sound.powerup();
          pu.caught = true;
        }
      }
      state.powerups = state.powerups.filter((pu) => !pu.caught && pu.y < VIEW_H + 30);

      // Particles and floating texts age out.
      for (const pt of state.particles) {
        pt.life -= dt;
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.vy += 320 * dt;
      }
      state.particles = state.particles.filter((pt) => pt.life > 0);
      for (const t of state.texts) {
        t.life -= dt;
        t.y -= 34 * dt;
      }
      state.texts = state.texts.filter((t) => t.life > 0);

      // Level clear: no breakable bricks left.
      if (state.balls.length > 0 && !breakableLeft() && state.levelClearTimer <= 0) {
        state.score += SCORE_LEVEL_CLEAR;
        if (state.level >= LEVELS.length - 1) {
          events |= EVENT_WIN;
        } else {
          events |= EVENT_CLEAR;
          state.levelClearTimer = 1.6;
          loadLevel(state.level + 1);
        }
      }

      return events;
    },

    /** Attract mode for the title screen: bricks on the field, one ball
     *  bouncing on its own, no score, no lives at stake. */
    attract(dt) {
      state.attract = true;
      state.time += dt;
      if (state.balls.length === 0) {
        loadLevel(0);
        state.balls[0].stuck = false;
        state.balls[0].vy = Math.abs(state.balls[0].vy);
      }
      // A cleared field restocks itself so the title never goes quiet.
      if (!breakableLeft()) {
        loadLevel(0);
        state.balls[0].stuck = false;
        state.balls[0].vy = Math.abs(state.balls[0].vy);
      }
      const ball = state.balls[0];
      stepBall(ball, dt);
      if (ball.y - ball.r > VIEW_H + 20) {
        state.balls = [];
        return;
      }
      // The paddle follows the ball, lazily, like a demo.
      const p = state.paddle;
      const target = Math.max(p.w / 2, Math.min(VIEW_W - p.w / 2, ball.x));
      p.x += (target - p.x) * Math.min(1, dt * 4);
      for (const pt of state.particles) {
        pt.life -= dt;
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.vy += 320 * dt;
      }
      state.particles = state.particles.filter((pt) => pt.life > 0);
    },
  };
}
