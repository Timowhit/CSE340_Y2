import db from './db.js';

/**
 * Looks up a user by email for login.
 * @param {string} email - The (already trimmed and lower-cased) email address.
 * @returns {Promise<{user_id: number, name: string, email: string, password_hash: string, role: string}|null>}
 *          The user including their password hash, or null if no account uses that email.
 */
const findUserByEmail = async (email) => {
    const query = `
        SELECT user_id, name, email, password_hash, role
        FROM public.users
        WHERE email = $1;
    `;
    const result = await db.query(query, [email]);
    return result.rows[0] ?? null;
};

export { findUserByEmail };
