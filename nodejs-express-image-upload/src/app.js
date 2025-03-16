const express = require('express');
const multer = require('multer');
const path = require('path');
const imageRoutes = require('./routes/index');
require('dotenv').config();
const { Storage } = require('@google-cloud/storage');
const bodyParser = require('body-parser');

// Initialize Google Cloud Storage
const storage = new Storage({
  keyFilename: path.join(__dirname, 'config/arabatapp-921b727eef5f.json'),
});

const app = express();
const PORT = process.env.PORT || 3000;

// Set view engine to Pug
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// Middleware for serving static files
app.use(express.static(path.join(__dirname, 'public')));

// Middleware for parsing request bodies
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Middleware for file uploads
const multerStorage = multer.memoryStorage();
const upload = multer({ storage: multerStorage });

// Use routes
app.use('/images', upload.single('image'), imageRoutes);

// Home route
app.get('/', (req, res) => {
    res.render('index');
});

// Ensure the route for all-images is registered
app.use('/', imageRoutes);

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});