const express = require('express');
const router = express.Router();
const { Storage } = require('@google-cloud/storage');
const path = require('path');
const ImageController = require('../controllers/imageController');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// Initialize Google Cloud Storage
const storage = new Storage({
  keyFilename: path.join(__dirname, '../config/arabatapp-921b727eef5f.json'),
});

const imageController = new ImageController(storage);

router.get('/', imageController.getAllImages.bind(imageController));
router.post('/upload', imageController.uploadImage.bind(imageController));
router.get('/all-images', imageController.displayAllImagesPage.bind(imageController)); // Ensure this route is defined
router.get('/upload-webp', (req, res) => res.render('upload-webp')); // New route for the upload WebP page
router.post('/upload-webp', upload.single('image'), imageController.uploadAndConvertToWebP.bind(imageController)); // New route for handling WebP uploads
router.get('/upload-to-folder', (req, res) => res.render('upload-to-folder')); // New route for the upload to folder page
router.post('/upload-to-folder', upload.single('image'), imageController.uploadToFolder.bind(imageController)); // New route for handling folder uploads
router.get('/folder/:folderName', imageController.displayFolderImagesPage.bind(imageController)); // New route for displaying images of a specific folder
router.post('/delete-image', imageController.deleteImage.bind(imageController)); // New route for deleting images

module.exports = router;