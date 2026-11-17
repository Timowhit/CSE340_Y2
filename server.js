import express from 'express';
import { fileURLToPath } from 'url';
import path from 'path';
import router from './src/routes/index.js';
import { testConnection } from './src/models/db.js';


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
app.use(express.urlencoded({ extended: true })); // parses HTML form POST bodies into req.body

app.use((req, res, next) => {
    res.locals.currentPath = req.path;
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