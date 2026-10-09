'use strict';

const crypto = require('node:crypto');
const { promisify } = require('node:util');
const scrypt = promisify(crypto.scrypt);
const options = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

function validatePassword(password) {
  if (typeof password !== 'string' || password.length < 12 || password.length > 128) {
    throw Object.assign(new Error('Usa una contraseña de entre 12 y 128 caracteres.'), { status: 400 });
  }
}

async function hashPassword(password) {
  validatePassword(password);
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = await scrypt(password, salt, 64, options);
  return `scrypt$${salt}$${hash.toString('hex')}`;
}

async function verifyPassword(password, encoded) {
  if (typeof password !== 'string' || password.length > 128) return false;
  const parts = String(encoded || '').split('$');
  const valid = parts.length === 3 && parts[0] === 'scrypt' && /^[a-f0-9]{32}$/.test(parts[1]) && /^[a-f0-9]{128}$/.test(parts[2]);
  const actual = await scrypt(password, valid ? parts[1] : '00000000000000000000000000000000', 64, options);
  const expected = valid ? Buffer.from(parts[2], 'hex') : Buffer.alloc(64);
  return crypto.timingSafeEqual(actual, expected) && valid;
}

const tokenHash = token => crypto.createHash('sha256').update(token).digest('hex');
module.exports = { hashPassword, verifyPassword, tokenHash };
