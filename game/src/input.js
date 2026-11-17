// Input: the mouse steers the paddle, the keyboard does too, and a click or
// Space confirms (start, launch, restart). P pauses, R restarts, M mutes.
// Pointer coordinates arrive in canvas pixels and are converted to the
// virtual playfield by the renderer scale the caller passes in.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_RESTART = 4;
export const ACTION_MUTE = 8;

export function createInput(canvas) {
  let actions = 0;
  let pointerX = null; // virtual x of the pointer, null until it moves
  let pointerSeen = false;
  let left = false;
  let right = false;
  let scale = 1;
  let offsetX = 0;

  function toVirtual(clientX) {
    const rect = canvas.getBoundingClientRect();
    return (clientX - rect.left - offsetX) / scale;
  }

  canvas.addEventListener('pointermove', (event) => {
    pointerX = toVirtual(event.clientX);
    pointerSeen = true;
  });
  canvas.addEventListener('pointerdown', (event) => {
    pointerX = toVirtual(event.clientX);
    pointerSeen = true;
    actions |= ACTION_CONFIRM;
  });
  window.addEventListener('keydown', (event) => {
    if (event.code === 'Space' || event.code === 'Enter') {
      actions |= ACTION_CONFIRM;
      event.preventDefault();
    } else if (event.code === 'KeyP' || event.code === 'Escape') {
      actions |= ACTION_PAUSE;
    } else if (event.code === 'KeyR') {
      actions |= ACTION_RESTART;
    } else if (event.code === 'KeyM') {
      actions |= ACTION_MUTE;
    } else if (event.code === 'ArrowLeft' || event.code === 'KeyA') {
      left = true;
      event.preventDefault();
    } else if (event.code === 'ArrowRight' || event.code === 'KeyD') {
      right = true;
      event.preventDefault();
    }
  });
  window.addEventListener('keyup', (event) => {
    if (event.code === 'ArrowLeft' || event.code === 'KeyA') left = false;
    else if (event.code === 'ArrowRight' || event.code === 'KeyD') right = false;
  });
  // A click anywhere on the page also confirms (the canvas covers the page).
  canvas.addEventListener('click', () => {
    actions |= ACTION_CONFIRM;
  });

  return {
    /** The renderer calls this every frame with its current scale/offset. */
    setTransform(nextScale, nextOffsetX) {
      scale = nextScale;
      offsetX = nextOffsetX;
    },
    /** -1, 0 or 1 from the arrow keys. */
    direction() {
      return (right ? 1 : 0) - (left ? 1 : 0);
    },
    /** Virtual pointer x, or null when the pointer has never moved. */
    pointer() {
      return pointerSeen ? pointerX : null;
    },
    /** Actions since the last call, then cleared. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
