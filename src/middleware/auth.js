import { findUserById } from '../models/users.js';

// Roles the app knows about. requireRole checks its arguments against this list so a
// typo like requireRole('admn') fails at startup instead of silently locking everyone out.
const ROLES = ['admin', 'volunteer'];

/**
 * Re-checks a logged-in session against the database on every request, so a role change or
 * a deleted account takes effect immediately instead of at the next login. The session keeps
 * only a copy of the user; the database row is the source of truth.
 * Costs one primary-key lookup per logged-in request. Anonymous requests skip it.
 * @type {import('express').RequestHandler}
 */
const refreshSessionUser = async (req, res, next) => {
    try {
        const sessionUser = req.session.user;
        if (!sessionUser) return next();

        const current = await findUserById(sessionUser.id);

        if (!current) {
            delete req.session.user;
            req.session.flash = 'Your account could not be found. Please log in again.';
            return next();
        }

        if (
            current.name !== sessionUser.name ||
            current.email !== sessionUser.email ||
            current.role !== sessionUser.role
        ) {
            req.session.user = { id: current.user_id, name: current.name, email: current.email, role: current.role };
        }
        next();
    } catch (err) {
        next(err);
    }
};

/**
 * Exposes the logged-in user to every view as `user` (or null) and `isAdmin`.
 * Views only read these values; the real access checks always happen in requireRole.
 */
const setCurrentUser = (req, res, next) => {
    const user = req.session.user ?? null;
    res.locals.user = user;
    res.locals.isAdmin = user?.role === 'admin';
    next();
};

/** Sends an anonymous visitor to the login page and remembers where they were going. */
const redirectToLogin = (req, res) => {
    // Only GET requests can be replayed safely after login; a POST would lose its form data.
    if (req.method === 'GET') req.session.returnTo = req.originalUrl;
    req.session.flash = 'You must be logged in to access that page.';
    res.redirect('/login');
};

/**
 * Lets any logged-in user through; everyone else is redirected to /login.
 * Put it before a controller in a route: router.get('/dashboard', requireLogin, showDashboard).
 * @type {import('express').RequestHandler}
 */
const requireLogin = (req, res, next) => {
    if (!req.session.user) return redirectToLogin(req, res);
    next();
};

/**
 * Builds middleware that only lets logged-in users with one of the given roles through.
 * - Not logged in: redirects to /login (and remembers the page for after login).
 * - Logged in with the wrong role: flashes a message and redirects to /dashboard, a page
 *   every logged-in user can open (so the redirect can never loop).
 * @param {...string} roles - One or more allowed roles, e.g. requireRole('admin').
 * @returns {import('express').RequestHandler}
 */
const requireRole = (...roles) => {
    if (roles.length === 0 || roles.some((role) => !ROLES.includes(role))) {
        throw new Error(`requireRole needs one or more of: ${ROLES.join(', ')}`);
    }

    return (req, res, next) => {
        const user = req.session.user;

        if (!user) return redirectToLogin(req, res);

        if (!roles.includes(user.role)) {
            req.session.flash = 'You do not have permission to view that page.';
            return res.redirect('/dashboard');
        }

        next();
    };
};

export { refreshSessionUser, requireLogin, requireRole, setCurrentUser };
