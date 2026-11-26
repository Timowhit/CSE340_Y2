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

/**
 * Looks up a user by id so a logged-in session can be checked against the current database row.
 * @param {number} id - The user_id stored in the session.
 * @returns {Promise<{user_id: number, name: string, email: string, role: string}|null>}
 *          The user without their password hash, or null if the account no longer exists.
 */
const findUserById = async (id) => {
    const query = `
        SELECT user_id, name, email, role
        FROM public.users
        WHERE user_id = $1;
    `;
    const result = await db.query(query, [id]);
    return result.rows[0] ?? null;
};

/**
 * Lists every registered user for the admin users page. Never includes password hashes.
 * @returns {Promise<Array<{user_id: number, name: string, email: string, role: string}>>}
 *          All users, ordered by name then email.
 */
const getAllUsers = async () => {
    const query = `
        SELECT user_id, name, email, role
        FROM public.users
        ORDER BY name, email;
    `;
    const result = await db.query(query);
    return result.rows;
};

/**
 * Creates a new account. The role is not a parameter: the column default ('volunteer')
 * applies, so a form can never choose its own role.
 * @param {{name: string, email: string, passwordHash: string}} user - Already validated values;
 *        email is trimmed and lower-cased, passwordHash comes from hashPassword.
 * @returns {Promise<{user_id: number, name: string, email: string, role: string}>} The new user.
 * @throws {Error} Database errors propagate; a duplicate email has `code === '23505'`.
 */
const createUser = async ({ name, email, passwordHash }) => {
    const query = `
        INSERT INTO public.users (name, email, password_hash)
        VALUES ($1, $2, $3)
        RETURNING user_id, name, email, role;
    `;
    const result = await db.query(query, [name, email, passwordHash]);
    return result.rows[0];
};

export { findUserByEmail, findUserById, getAllUsers, createUser };
