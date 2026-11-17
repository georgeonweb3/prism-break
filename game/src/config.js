// Prism Break — configuration. The game runs in a fixed virtual playfield
// (960 x 540) that the renderer letterboxes onto any window, so the layout,
// the screenshots and the physics are identical on every desktop screen.

export const VIEW_W = 960;
export const VIEW_H = 540;

export const BEST_KEY = 'prism-break-best';

export const LIVES = 3;
export const STEP = 1 / 60;

/** Paddle. */
export const PADDLE_W = 112;
export const PADDLE_H = 14;
export const PADDLE_Y = 506;
export const PADDLE_SPEED = 620; // keyboard travel, px/s
export const PADDLE_WIDE_W = 168;
export const WIDE_TIME = 12; // seconds a wide paddle lasts

/** Ball. */
export const BALL_R = 8;
export const BALL_SPEED = 400;
export const BALL_MAX_SPEED = 560;
export const SLOW_TIME = 10; // seconds a slowed ball lasts

/** Brick grid. */
export const BRICK_W = 66;
export const BRICK_H = 22;
export const BRICK_GAP = 6;
export const GRID_LEFT = 66;
export const GRID_TOP = 64;
export const GRID_COLS = 12;

/** Score. */
export const SCORE_1 = 50; // one-hit brick
export const SCORE_2 = 100; // two-hit brick
export const SCORE_3 = 150; // three-hit brick
export const SCORE_PRISM = 250; // prism brick
export const SCORE_LEVEL_CLEAR = 500;
export const COMBO_MAX = 8; // combo multiplier cap
export const COMBO_WINDOW = 4; // seconds before the combo resets

/** Power-ups. */
export const POWERUP_FALL_SPEED = 130;
export const POWERUP_R = 11;
export const DROP_CHANCE = 0.14; // a broken brick drops a power-up

/** Brick colours by type (neon on near-black). */
export const BRICK_COLORS = {
  1: '#22d3ee', // cyan, one hit
  2: '#e879f9', // magenta, two hits
  3: '#fbbf24', // gold, three hits
  steel: '#64748b', // unbreakable
  prism: '#a3e635', // prism, bonus
};

export const BRICK_GLOW = {
  1: 'rgba(34,211,238,0.55)',
  2: 'rgba(232,121,249,0.55)',
  3: 'rgba(251,191,36,0.55)',
  steel: 'rgba(100,116,139,0.4)',
  prism: 'rgba(163,230,53,0.6)',
};

/** Three hand-built levels. Rows are strings, one character per brick:
 *  '.' empty, '1' one-hit, '2' two-hit, '3' three-hit, '#' steel, 'P' prism. */
export const LEVELS = [
  [
    '............',
    '.1111111111.',
    '.1222222221.',
    '.1111111111.',
    '..1P1111P1..',
    '............',
  ],
  [
    '.2........2.',
    '.2211111122.',
    '.2333333332.',
    '.2P111111P2.',
    '..22222222..',
    '...##..##...',
  ],
  [
    '.#33333333#.',
    '.3222222223.',
    '.31P1111P13.',
    '.3332222333.',
    '..2#2222#2..',
    '...P1111P...',
  ],
];

/** Floating level names, shown on the title screen and the level banner. */
export const LEVEL_NAMES = ['FIRST LIGHT', 'DOUBLE VISION', 'PRISM STORM'];
