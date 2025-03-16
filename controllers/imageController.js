const sharp = require('sharp');
const path = require('path');

class ImageController {
    constructor(storage) {
        this.storage = storage;
        this.bucket = this.storage.bucket('arabat-bucket');
    }

    async uploadImage(req, res) {
        if (!req.file) {
            return res.status(400).send('No file uploaded.');
        }

        const blob = this.bucket.file(req.file.originalname);
        const blobStream = blob.createWriteStream({
            resumable: false,
        });

        blobStream.on('error', (err) => {
            res.status(500).send(err);
        });

        blobStream.on('finish', () => {
            res.status(200).send(`File uploaded: https://storage.googleapis.com/arabat-bucket/${req.file.originalname}`);
        });

        blobStream.end(req.file.buffer);
    }

    async getAllImages(req, res) {
        const [files] = await this.bucket.getFiles();
        const images = files.map(file => {
            return { url: `https://storage.googleapis.com/arabat-bucket/${file.name}`, name: file.name };
        });

        res.render('index', { images });
    }

    async displayAllImagesPage(req, res) {
        const [files] = await this.bucket.getFiles();
        const images = files.map(file => {
            return { url: `https://storage.googleapis.com/arabat-bucket/${file.name}`, name: file.name };
        });

        const folders = new Set();
        files.forEach(file => {
            const folderName = file.name.split('/')[0];
            if (folderName && folderName !== file.name) {
                folders.add(folderName);
            }
        });

        res.render('all-images', { images, folders: Array.from(folders) });
    }

    async displayFolderImagesPage(req, res) {
        const folderName = req.params.folderName;
        const [files] = await this.bucket.getFiles({ prefix: `${folderName}/` });
        const images = files.map(file => {
            return { url: `https://storage.googleapis.com/arabat-bucket/${file.name}`, name: file.name };
        });

        res.render('folder-images', { folderName, images });
    }

    async uploadGoogleCloudAndConvertToWebP(req, res, folder, subfolder) {
        return new Promise((resolve, reject) => {
            if (!req.file) {
                return reject(new Error('No file uploaded.'));
            }

            sharp(req.file.buffer)
                .webp()
                .toBuffer()
                .then(buffer => {
                    const fileName = `${Date.now()}.webp`;
                    const filePath = `${folder}/${subfolder}/${fileName}`;
                    const blob = this.bucket.file(filePath);
                    const blobStream = blob.createWriteStream({
                        resumable: false,
                    });

                    blobStream.on('error', (err) => {
                        console.error('Error uploading to Google Cloud:', err);
                        reject(new Error('Error uploading to Google Cloud.'));
                    });

                    blobStream.on('finish', () => {
                        const publicUrl = `https://storage.googleapis.com/${this.bucket.name}/${blob.name}`;
                        res.locals.uploadResult = { message: 'File uploaded and converted to WebP successfully.', publicUrl, fileName };
                        resolve(res.locals.uploadResult);
                    });

                    blobStream.end(buffer);
                })
                .catch(error => {
                    console.error('Error uploading and converting image:', error);
                    reject(new Error('Internal server error'));
                });
        });
    }

    async uploadToFolder(req, res) {
        if (!req.file || !req.body.folderName) {
            return res.status(400).send('No file uploaded or folder name specified.');
        }

        const folderName = req.body.folderName;
        const blob = this.bucket.file(`${folderName}/${req.file.originalname}`);
        const blobStream = blob.createWriteStream({
            resumable: false,
        });

        blobStream.on('error', (err) => {
            res.status(500).send(err);
        });

        blobStream.on('finish', () => {
            res.status(200).send(`File uploaded to folder: https://storage.googleapis.com/arabat-bucket/${folderName}/${req.file.originalname}`);
        });

        blobStream.end(req.file.buffer);
    }

    async deleteImage(req, res) {
        const { imageName } = req.body;
        if (!imageName) {
            return res.status(400).send('No image name specified.');
        }

        const file = this.bucket.file(imageName);
        await file.delete();

        res.status(200).send(`Image deleted: ${imageName}`);
    }
}

module.exports = ImageController;