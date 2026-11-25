import express from 'express';
import session from 'express-session';
import { fileURLToPath } from 'url';
import path from 'path';
import router from './src/routes/index.js';
import { testConnection } from './src/models/db.js';


const NODE_ENV = process.env.NODE_ENV?.toLowerCase() || 'production';
const PORT = process.env.PORT || 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Render (and most hosts) terminate HTTPS at a proxy. Without this, Express thinks the
// request is insecure and express-session refuses to set the `secure` cookie.
if (NODE_ENV === 'production') app.set('trust proxy', 1);


if (!process.env.SESSION_SECRET) {
    throw new Error('SESSION_SECRET is not set. Add it to your environment (.env in development).');
}

// Templating
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src/views'));

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.get('/favicon.ico', (req, res) => res.status(204).end()); // keeps favicon requests from consuming the flash
app.use(express.urlencoded({ extended: true })); // parses HTML form POST bodies into req.body

// Sessions: only the session ID lives in the cookie; the data stays on the server.
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,            // don't re-save sessions that didn't change
    saveUninitialized: false, // don't create a session (or cookie) until we store something
    cookie: {
        httpOnly: true,       // JavaScript in the page can't read the cookie
        sameSite: 'lax',
        secure: NODE_ENV === 'production'
    }
}));

app.use((req, res, next) => {
    res.locals.currentPath = req.path;
    // Flash = read once, then delete. Moving it to res.locals makes it
    // available to every view as `locals.flash`.
    res.locals.flash = req.session.flash ?? null;
    delete req.session.flash;
    next();
});

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