const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 12;

/**
 * Хешує пароль через bcrypt.
 * @param {string} plainPassword — відкритий пароль
 * @returns {Promise<string>} bcrypt-хеш
 */
async function hashPassword(plainPassword) {
  return bcrypt.hash(String(plainPassword), SALT_ROUNDS);
}

/**
 * Перевіряє пароль. Підтримує:
 *   1. bcrypt-хеші (починаються з $2)
 *   2. Legacy — відкритий текст (для зворотної сумісності)
 * 
 * @param {string} plainPassword — введений користувачем пароль
 * @param {string} storedPassword — збережений пароль (хеш або текст)
 * @returns {Promise<boolean>}
 */
async function verifyPassword(plainPassword, storedPassword) {
  if (!plainPassword || !storedPassword) return false;
  if (storedPassword.startsWith('$2')) {
    // bcrypt hash
    return bcrypt.compare(String(plainPassword), storedPassword);
  }
  // Legacy plaintext fallback
  return String(plainPassword) === String(storedPassword);
}

/**
 * Чи є пароль вже захешованим?
 * @param {string} password
 * @returns {boolean}
 */
function isHashed(password) {
  return typeof password === 'string' && password.startsWith('$2');
}

module.exports = { hashPassword, verifyPassword, isHashed };
