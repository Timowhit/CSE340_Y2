import express from 'express';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import helmet from 'helmet';
import { fileURLToPath } from 'url';
import path from 'path';
import router from './src/routes/index.js';
import { pool, testConnection } from './src/models/db.js';
import { refreshSessionUser, setCurrentUser } from './src/middleware/auth.js';
import { csrfProtection } from './src/middleware/csrf.js';


const NODE_ENV = process.env.NODE_ENV?.toLowerCase() || 'production';
const PORT = process.env.PORT || 3000;
const SESSION_MAX_AGE_MS = 8 * 60 * 60 * 1000; // a login lasts 8 hours, then the user logs in again
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Render (and most hosts) terminate HTTPS at a proxy. Without this, Express thinks the
// request is insecure and express-session refuses to set the `secure` cookie.
if (NODE_ENV === 'production') app.set('trust proxy', 1);


if (!process.env.SESSION_SECRET) {
    throw new Error('SESSION_SECRET is not set. Add it to your environment (.env in development).');
}

// Security headers (CSP, clickjacking protection, no MIME sniffing, ...). First, so every
// response gets them, including static files. The default Content-Security-Policy only allows
// this site's own scripts, styles, and images, so views must not use inline event handlers.
// `upgrade-insecure-requests` is production-only because it would break plain-http local dev.
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            'upgrade-insecure-requests': NODE_ENV === 'production' ? [] : null
        }
    }
}));

// Templating
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src/views'));

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.get('/favicon.ico', (req, res) => res.status(204).end()); // keeps favicon requests from consuming the flash
app.use(express.urlencoded({ extended: true })); // parses HTML form POST bodies into req.body

// Sessions: only the session ID lives in the cookie; the data stays on the server, in the
// `session` table (see src/setup.sql). The default in-memory store leaks memory and loses every
// login on restart, so it is not used.
const PgSessionStore = connectPgSimple(session);

app.use(session({
    // createTableIfMissing builds the `session` table on first use, so a database that was set
    // up before sessions existed does not break every login (setup.sql still defines it).
    store: new PgSessionStore({ pool, createTableIfMissing: true }),
    secret: process.env.SESSION_SECRET,
    resave: false,            // don't re-save sessions that didn't change
    saveUninitialized: false, // don't create a session (or cookie) until we store something
    cookie: {
        httpOnly: true,       // JavaScript in the page can't read the cookie
        sameSite: 'lax',
        secure: NODE_ENV === 'production',
        maxAge: SESSION_MAX_AGE_MS
    }
}));

// Re-reads the logged-in user from the database so role changes apply immediately.
// Runs before the flash middleware so its "please log in again" message can be shown.
app.use(refreshSessionUser);

app.use((req, res, next) => {
    res.locals.currentPath = req.path;
    // Flash = read once, then delete. Moving it to res.locals makes it
    // available to every view as `locals.flash`.
    res.locals.flash = req.session.flash ?? null;
    delete req.session.flash;
    next();
});

// Makes `user` and `isAdmin` available to every view (header links, Add/Edit buttons)
app.use(setCurrentUser);

// Rejects POSTs that lack the session's CSRF token. After setCurrentUser so the 403 page can
// render the header, and after express.urlencoded because the token arrives in the form body.
app.use(csrfProtection);

// Routes
app.use(router);

// 404 handler: runs only if no route matched
app.use((req, res) => {
    res.status(404).render('errors/404', { title: 'Page Not Found' });
});

// Error handler: must be last, with four parameters
app.use((err, req, res, next) => {
    console.error(err);
    if (res.headersSent) return next(err);
    res.status(500).render('errors/500', { title: 'Server Error' });
});

app.listen(PORT, async () => {
  try {
    await testConnection();
    console.log(`Server is running at http://127.0.0.1:${PORT}`);
    console.log(`Environment: ${NODE_ENV}`);
  } catch (error) {
    console.error('Error connecting to the database:', error);
  }
});
