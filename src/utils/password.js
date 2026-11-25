import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

// scrypt is built into Node, so password hashing needs no extra dependency.
const scryptAsync = promisify(scrypt);
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

/**
 * Hashes a password with scrypt and a random per-password salt.
 * @param {string} password - The plain-text password.
 * @returns {Promise<string>} "<saltHex>:<keyHex>", safe to store in users.password_hash.
 */
const hashPassword = async (password) => {
    const salt = randomBytes(SALT_LENGTH);
    const key = await scryptAsync(password, salt, KEY_LENGTH);
    return `${salt.toString('hex')}:${key.toString('hex')}`;
};

/**
 * Checks a password against a stored hash in constant time.
 * @param {string} password - The plain-text password to check.
 * @param {string} storedHash - A value produced by hashPassword.
 * @returns {Promise<boolean>} True when the password matches.
 */
const verifyPassword = async (password, storedHash) => {
    const [saltHex, keyHex] = String(storedHash).split(':');
    if (!saltHex || !keyHex) return false;

    const expected = Buffer.from(keyHex, 'hex');
    const actual = await scryptAsync(password, Buffer.from(saltHex, 'hex'), expected.length);
    return expected.length === actual.length && timingSafeEqual(expected, actual);
};

export { hashPassword, verifyPassword };
