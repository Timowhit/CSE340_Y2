import { findUserByEmail } from '../models/users.js';
import { verifyPassword } from '../utils/password.js';
import { collectForm } from '../middleware/validation.js';

// Checked when the email is unknown so a missing account takes as long to reject as a wrong
// password. That keeps response time from revealing which emails have accounts.
const DUMMY_HASH =
    '0156f43e85322a62ca6f927dd569b617:df9b56698d028026bc25adce25492818d2288782114cb328040e45a4ac067a79f80d7e8f9b47768074fba1e9cf78dc7b8d27017fccf8caedeef7eca65fff9652';

/** Wraps the callback-style session.regenerate so it can be awaited. */
const regenerateSession = (req) =>
    new Promise((resolve, reject) => {
        req.session.regenerate((err) => (err ? reject(err) : resolve()));
    });

/** Only same-site paths are allowed as a post-login redirect (blocks open redirects). */
const isSafeReturnPath = (value) =>
    typeof value === 'string' && /^\/(?![/\\])/.test(value) && !value.startsWith('/login');

const renderLogin = (res, status, email, errors) =>
    res.status(status).render('login', { title: 'Log In', values: { email }, errors });

const showLoginForm = (req, res) => {
    if (req.session.user) return res.redirect('/dashboard');
    renderLogin(res, 200, '', []);
};

const processLogin = async (req, res, next) => {
    try {
        // The rules live in validateLogin (src/middleware/validation.js), which runs before this.
        const { values, data, errors } = collectForm(req, ['email']);
        if (errors.length > 0) return renderLogin(res, 400, values.email, errors);

        const { email, password } = data;

        const user = await findUserByEmail(email);
        const passwordMatches = await verifyPassword(password, user?.password_hash ?? DUMMY_HASH);

        if (!user || !passwordMatches) {
            return renderLogin(res, 401, email, [{ field: 'password', message: 'Invalid email or password.' }]);
        }

        // A fresh session ID on login prevents session fixation. Keep returnTo across the swap.
        const returnTo = req.session.returnTo;
        await regenerateSession(req);

        // Store only what the app needs; never the password hash.
        req.session.user = { id: user.user_id, name: user.name, email: user.email, role: user.role };
        req.session.flash = `Welcome back, ${user.name}.`;
        res.redirect(isSafeReturnPath(returnTo) ? returnTo : '/dashboard');
    } catch (err) {
        next(err);
    }
};

const processLogout = async (req, res, next) => {
    try {
        await regenerateSession(req); // drops the user and issues a new session ID
        req.session.flash = 'You have been logged out.';
        res.redirect('/');
    } catch (err) {
        next(err);
    }
};

export { showLoginForm, processLogin, processLogout };
