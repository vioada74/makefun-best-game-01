// Keyboard and mouse state, in game coordinates. The canvas scales the
// 1280x720 view to the window, so mouse positions are un-scaled here.

export function createInput(canvas) {
  const input = {
    keys: new Set(),
    mouse: { x: 640, y: 300, down: false },
    pressed: new Set(),
  };

  function toGame(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const scale = Math.min(rect.width / 1280, rect.height / 720);
    const offsetX = (rect.width - 1280 * scale) / 2;
    const offsetY = (rect.height - 720 * scale) / 2;
    return {
      x: (clientX - rect.left - offsetX) / scale,
      y: (clientY - rect.top - offsetY) / scale,
    };
  }

  window.addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) event.preventDefault();
    if (!event.repeat) input.pressed.add(event.key.toLowerCase());
    input.keys.add(event.key.toLowerCase());
  });
  window.addEventListener('keyup', (event) => {
    input.keys.delete(event.key.toLowerCase());
  });
  canvas.addEventListener('mousemove', (event) => {
    const p = toGame(event.clientX, event.clientY);
    input.mouse.x = p.x;
    input.mouse.y = p.y;
  });
  canvas.addEventListener('mousedown', (event) => {
    const p = toGame(event.clientX, event.clientY);
    input.mouse.x = p.x;
    input.mouse.y = p.y;
    input.mouse.down = true;
    input.pressed.add('mouse');
  });
  window.addEventListener('mouseup', () => {
    input.mouse.down = false;
  });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());
  return input;
}

// True while the key is held. `consume` reports a fresh press once.
export function keyDown(input, key) {
  return input.keys.has(key);
}

export function consumePress(input, key) {
  if (!input.pressed.has(key)) return false;
  input.pressed.delete(key);
  return true;
}

export function endFrame(input) {
  input.pressed.clear();
}
