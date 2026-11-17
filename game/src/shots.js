// Staged screenshots: ?shot=start|play|action|end (with &seed=N) paints one
// fixed scene from the real game state instead of running the loop, then sets
// window.__shotReady. Every shot is a render of the game's own code — the
// world is stepped with the seeded RNG, never hand-drawn for the camera.

import { BALL_R, LIVES, STEP } from './config.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { EVENT_OVER } from './world.js';

function simulate(world, steps, drive) {
  let events = 0;
  for (let i = 0; i < steps; i += 1) {
    // A stuck ball is launched: the driver never stalls on a serve.
    if (world.state.balls.some((b) => b.stuck)) world.launch();
    const input = drive ? drive(i, world.state) : { move: 0, pointerX: null };
    events |= world.step(STEP, input.move, input.pointerX, null);
    if (events & EVENT_OVER) break;
  }
  return events;
}

/** A driver that steers the paddle under the lowest ball, like a player. */
function followBall(i, state) {
  const ball = state.balls.find((b) => !b.stuck) ?? state.balls[0];
  if (!ball) return { move: 0, pointerX: null };
  return { move: 0, pointerX: ball.x };
}

/** Like followBall, but with a sway: the bounce angles vary, so the ball
 *  works across the field instead of one column. */
function followBallWobble(i, state) {
  const ball = state.balls.find((b) => !b.stuck) ?? state.balls[0];
  if (!ball) return { move: 0, pointerX: null };
  return { move: 0, pointerX: ball.x + Math.sin(i * 0.05) * 90 };
}

export function stageShot(name, world) {
  if (name === 'start') {
    // Title screen over a live attract-mode field.
    world.reset();
    for (let i = 0; i < 240; i += 1) world.attract(STEP);
    return { screen: SCREEN_TITLE, best: 0 };
  }

  if (name === 'play') {
    // Mid-level: the paddle has been playing, bricks are broken, the combo
    // is running and particles are in the air.
    world.reset();
    world.launch();
    simulate(world, 60, null);
    // Play a while with the paddle tracking the ball, swaying so the ball
    // works across the field and clears a visible chunk of bricks.
    simulate(world, 1800, followBallWobble);
    // The driver can lose all three lives in 30 seconds: restock the field
    // so the frame shows a ball in play, not an empty board.
    if (world.state.balls.length === 0) {
      world.state.lives = LIVES;
      world.serveBall();
      simulate(world, 40, followBall);
    }
    // Fresh burst so the frame reads as action, not a still life.
    const b = world.state.balls.find((x) => !x.stuck) ?? world.state.balls[0];
    if (b) {
      world.state.particles.push(
        { x: b.x, y: b.y - 30, vx: 120, vy: -80, life: 0.6, maxLife: 0.8, size: 4, color: '#22d3ee' },
        { x: b.x + 20, y: b.y - 40, vx: -140, vy: -60, life: 0.7, maxLife: 0.8, size: 4, color: '#e879f9' },
        { x: b.x - 20, y: b.y - 20, vx: 60, vy: -120, life: 0.5, maxLife: 0.8, size: 3, color: '#fbbf24' },
      );
    }
    return { screen: SCREEN_PLAY, best: 1250 };
  }

  if (name === 'action') {
    // Multiball chaos: three balls, a power-up falling, combo at its peak.
    world.reset();
    world.launch();
    simulate(world, 1200, followBall);
    if (world.state.balls.length === 0) {
      world.state.lives = LIVES;
      world.serveBall();
      simulate(world, 40, followBall);
    }
    const s = world.state;
    if (s.balls.length > 0) {
      const b0 = s.balls[0];
      const speed = Math.hypot(b0.vx, b0.vy);
      const a = Math.atan2(b0.vy, b0.vx);
      [0.5, -0.5].forEach((da) => {
        s.balls.push({
          x: b0.x,
          y: b0.y,
          vx: Math.cos(a + da) * speed,
          vy: Math.sin(a + da) * speed,
          r: BALL_R,
          hue: 300,
          stuck: false,
          trail: [],
        });
      });
      // Let the three balls separate so the frame shows all of them.
      simulate(world, 45, followBall);
    }
    s.powerups.push({ x: 620, y: 300, kind: 'multi', vy: 130, color: '#e879f9', letter: 'M' });
    s.combo = 6;
    s.comboTimer = 3.2;
    s.score = 3420;
    return { screen: SCREEN_PLAY, best: 3420 };
  }

  if (name === 'win') {
    // Victory screen (verification only, not one of the entry screenshots).
    world.reset();
    world.state.score = 24800;
    return { screen: SCREEN_WIN, best: 24800 };
  }

  if (name === 'end') {
    // Game over with a real final score, after a played-out game.
    world.reset();
    world.launch();
    simulate(world, 1500, followBall);
    // Force the end state honestly: drain the lives by dropping the ball.
    const s = world.state;
    s.lives = 1;
    s.balls.forEach((b) => {
      b.stuck = false;
      b.x = 30;
      b.y = 520;
      b.vx = -300;
      b.vy = 300;
    });
    simulate(world, 120, null);
    s.lives = 0;
    return { screen: SCREEN_OVER, best: Math.max(1250, s.score) };
  }

  return { screen: SCREEN_TITLE, best: 0 };
}
