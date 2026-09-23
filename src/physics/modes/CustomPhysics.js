/**
 * Custom physics mode – developer provides update function
 */
export function updateCustom(ball, dt) {
  if (typeof ball._customUpdate === 'function') {
    ball._customUpdate(ball, dt);
  }
}
