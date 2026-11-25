// Roles the app knows about. requireRole checks its arguments against this list so a
// typo like requireRole('admn') fails at startup instead of silently locking everyone out.
const ROLES = ['admin', 'volunteer'];

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

/**
 * Builds middleware that only lets logged-in users with one of the given roles through.
 * - Not logged in: redirects to /login (and remembers the page for after login).
 * - Logged in with the wrong role: renders the 403 page.
 * @param {...string} roles - One or more allowed roles, e.g. requireRole('admin').
 * @returns {import('express').RequestHandler}
 */
const requireRole = (...roles) => {
    if (roles.length === 0 || roles.some((role) => !ROLES.includes(role))) {
        throw new Error(`requireRole needs one or more of: ${ROLES.join(', ')}`);
    }

    return (req, res, next) => {
        const user = req.session.user;

        if (!user) {
            // Only GET requests can be replayed safely after login; a POST would lose its form data.
            if (req.method === 'GET') req.session.returnTo = req.originalUrl;
            req.session.flash = 'Please log in to continue.';
            return res.redirect('/login');
        }

        if (!roles.includes(user.role)) {
            return res.status(403).render('errors/403', { title: 'Access Denied' });
        }

        next();
    };
};

export { requireRole, setCurrentUser };
