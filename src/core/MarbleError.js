/**
 * MarbleError - Clear, developer-friendly errors for Marble.js
 */
export class MarbleError extends Error {
  constructor(message, received = null) {
    const full = received !== null
      ? `MarbleError: ${message}\nReceived: ${typeof received === 'object' ? JSON.stringify(received) : String(received)}`
      : `MarbleError: ${message}`;
    super(full);
    this.name = 'MarbleError';
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, MarbleError);
    }
  }
}

export function assertNumber(value, name, allowNegative = true) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new MarbleError(`${name} must be a number.`, typeof value);
  }
  if (!allowNegative && value < 0) {
    throw new MarbleError(`${name} must be >= 0.`, value);
  }
}

export function assertBoolean(value, name) {
  if (typeof value !== 'boolean') {
    throw new MarbleError(`${name} must be a boolean.`, typeof value);
  }
}

export function assertString(value, name) {
  if (typeof value !== 'string') {
    throw new MarbleError(`${name} must be a string.`, typeof value);
  }
}

export function assertObject(value, name) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new MarbleError(`${name} must be an object.`, typeof value);
  }
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
