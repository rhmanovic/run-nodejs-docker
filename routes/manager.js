const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const bucket = require('../config/storage');

// ...existing code...

router.post('/add-category', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send('No file uploaded.');
    }

    const blob = bucket.file(req.file.originalname);
    const blobStream = blob.createWriteStream({
      resumable: false,
    });

    blobStream.on('error', (err) => {
      res.status(500).send({ message: err.message });
    });

    blobStream.on('finish', () => {
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
      // Save the category with the image URL to your database
      // ...existing code to save category...
      res.status(200).send({ message: 'Category added successfully', imageUrl: publicUrl });
    });

    blobStream.end(req.file.buffer);