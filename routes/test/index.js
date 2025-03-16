const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { Storage } = require('@google-cloud/storage');
const ImageController = require('../../controllers/imageController'); // Ensure this path is correct

const storageGoogleCloud = new Storage({
  projectId: 'arabatapp',
  keyFilename: path.join(__dirname, '../../config/arabatapp-921b727eef5f.json')
});
const imageController = new ImageController(storageGoogleCloud);

const multerStorageGoogleCloud = multer.memoryStorage();
const uploadGoogleCloud = multer({ storage: multerStorageGoogleCloud });

router.get('/', (req, res) => {
  res.render('test/index', { title: 'Test Page' });
});

router.get('/uploadGoogleCloud-webp', (req, res) => res.render('uploadGoogleCloud-webp')); // New route for the uploadGoogleCloud WebP page

router.post('/uploadGoogleCloud-webp', uploadGoogleCloud.single('image'), (req, res) => {
  imageController.uploadGoogleCloudAndConvertToWebP(req, res);
}); // New route for handling WebP uploadGoogleClouds

module.exports = router;
