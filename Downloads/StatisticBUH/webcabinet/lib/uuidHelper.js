// Функція для конвертування ID в UUID (використовується в API)
const crypto = require('crypto');

function idToUUID(id) {
  if (typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return id;
  }
  const hash = crypto.createHash('md5').update(String(id || '')).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
}

module.exports = { idToUUID };
