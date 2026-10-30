import express from 'express';
import { fileURLToPath } from 'url';
import path from 'path';

// Define the application environment
const NODE_ENV = process.env.NODE_ENV?.toLowerCase() || 'production';
// Define the port number the server will listen on
const PORT = process.env.PORT || 3000;
// import.meta.url gives the URL of the current module
const __filename = fileURLToPath(import.meta.url);
// path.dirname() returns the directory name of a path
const __dirname = path.dirname(__filename);

const app = express();

app.get('/', (req, res) => {
  res.send('Hello from Express!');
});

app.listen(PORT, () => {
  console.log(`Server is running in ${NODE_ENV} mode on port ${PORT}`);
});