// src/utils/helpers.js
export const createId = () => (
  (window.crypto && window.crypto.randomUUID && window.crypto.randomUUID())
    || `${Date.now()}-${Math.random().toString(36).slice(2)}`
);