import express from 'express';
import { fileURLToPath } from 'url';
import path from 'path';
import { getOrganizations } from './src/models/organizations.js';

const NODE_ENV = process.env.NODE_ENV?.toLowerCase() || 'production';
const PORT = process.env.PORT || 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Templating
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src/views'));

// Middleware
app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
    res.locals.currentPath = req.path;
    next();
});

// Routes
app.get('/', (req, res) => {
    res.render('home', { title: 'Home' });
});

app.get('/organizations', (req, res) => {
    res.render('organizations', { title: 'Organizations' });
});

app.get('/api/organizations', async (req, res, next) => {
    try {
        const organizations = await getOrganizations();
        res.json(organizations);
    } catch (err) {
        next(err);
    }
});

app.get('/projects', (req, res) => {
    res.render('projects', { title: 'Service Projects' });
});

app.get('/categories', (req, res) => {
    res.render('categories', { title: 'Categories' });
});

// 404 handler: runs only if no route above matched
app.use((req, res) => {
    res.status(404).send('Page not found');
});

// Error handler: must be last, with four parameters
app.use((err, req, res, next) => {
    console.error(err);
    if (req.path.startsWith('/api/')) {
        return res.status(500).json({ error: 'Something went wrong' });
    }
    res.status(500).send('Something went wrong');
});

app.listen(PORT, () => {
    console.log(`Server is running at http://127.0.0.1:${PORT}`);
    console.log(`Environment: ${NODE_ENV}`);
});