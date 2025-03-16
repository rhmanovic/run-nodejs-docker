# Node.js Express Image Upload

This project is a simple Node.js application using Express that allows users to upload images to Google Cloud Storage. It utilizes Bootstrap for styling and Pug (formerly Jade) as the templating engine for rendering views.

## Features

- Image upload functionality to Google Cloud Storage.
- Display of all uploaded images in a gallery format.
- Responsive design using Bootstrap.
- Simple and clean user interface with Pug templates.

## Project Structure

```
nodejs-express-image-upload
├── src
│   ├── controllers
│   │   └── imageController.js
│   ├── routes
│   │   └── index.js
│   ├── views
│   │   ├── index.pug
│   │   └── layout.pug
│   ├── public
│   │   ├── css
│   │   │   └── styles.css
│   │   └── js
│   │       └── scripts.js
│   └── app.js
├── package.json
├── .env
└── README.md
```

## Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd nodejs-express-image-upload
   ```

2. Install the dependencies:
   ```
   npm install
   ```

3. Set up your Google Cloud Storage credentials:
   - Create a service account in Google Cloud and download the JSON key file.
   - Set the `GOOGLE_APPLICATION_CREDENTIALS` environment variable in the `.env` file to point to your credentials file.

4. Start the application:
   ```
   npm start
   ```

## Usage

- Navigate to `http://localhost:3000` in your web browser.
- Use the form to upload images.
- All uploaded images will be displayed in a gallery format below the upload form.

## Contributing

Feel free to submit issues or pull requests for improvements or bug fixes.

## License

This project is licensed under the MIT License.