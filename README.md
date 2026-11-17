# prism-break

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/georgeonweb3/prism-break/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/georgeonweb3/prism-break/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

A neon breakout game: smash the prism bricks, chain the combo, clear all three levels. Built for make.fun's "Make the best game" bounty (best-game-01).

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=quiet-stork-13&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>

## How to play

Move the paddle with the **mouse** or the **← →** arrow keys. **Click** or
press **Space** to launch the ball, start, and restart. **P** pauses,
**R** restarts, **M** mutes.

- Break bricks to score. Consecutive breaks without losing the ball build a
  combo multiplier, up to ×8.
- Cyan bricks break in one hit, magenta in two, gold in three. Steel bricks
  never break. Green **prism** bricks are worth 250 points and repaint the
  ball's trail.
- Broken bricks sometimes drop a power-up: **W** wide paddle, **M**
  multiball, **S** slow ball, **+1** extra life.
- You have 3 lives. Lose the ball and you lose a life; clear all three
  levels to win.

Or serve `game/` with any static server and open `index.html`. It runs in
any current desktop browser. No build step, no network.

## Screenshots

`shots.json` lists the four staged renders, each a real render of the
game's own code in headless Chromium (seeded, so they reproduce exactly):

| File | Scene |
| --- | --- |
| `1-start.jpg` | Title screen over the live attract-mode field |
| `2-play.jpg` | Mid-game, ball in flight with its trail |
| `3-action.jpg` | Multiball, combo ×6, a power-up falling |
| `4-end.jpg` | Game over with the final score |

The game also accepts `?shot=win&seed=N` for the victory screen
(verification only) and `?seed=N` to fix the random pattern of a normal
run.

## Files

- `game/index.html` — the page (canvas + status line)
- `game/src/main.js` — boot and the fixed-step game loop
- `game/src/world.js` — state, physics, bricks, power-ups, particles
- `game/src/render.js` — canvas renderer, HUD and screens
- `game/src/config.js` — tuning and the three level layouts
- `game/src/input.js` — mouse + keyboard
- `game/src/audio.js` — synthesised WebAudio sound effects (no files)
- `game/src/random.js` — seeded RNG
- `game/src/shots.js` — staged screenshot scenes
- `main.ts` — hands the entry in (copies `game/` + `screenshots/`,
  writes `dossier.json`)
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged
- `serve.ts` — tiny static server for local play-testing

Everything is original: the code, the art (drawn in canvas), the sounds
(synthesised) and the names. No libraries are vendored. The game makes no
network requests.

## License

MIT. See `LICENSE`.
