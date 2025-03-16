const { Storage } = require('@google-cloud/storage');
const path = require('path');

const storage = new Storage({
  keyFilename: path.join(__dirname, 'arabatapp-921b727eef5f.json'),
  projectId: 'arabatapp',
});

const bucket = storage.bucket('your-bucket-name'); // Replace with your bucket name

module.exports = bucket;
