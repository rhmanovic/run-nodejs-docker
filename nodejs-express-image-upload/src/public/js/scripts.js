document.querySelector('#imageUploadForm').addEventListener('submit', function(event) {
    event.preventDefault();

    const formData = new FormData(this);
    
    fetch('/upload', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            const imgElement = document.createElement('img');
            imgElement.src = data.imageUrl;
            imgElement.alt = 'Uploaded Image';
            imgElement.classList.add('img-thumbnail', 'm-2');
            document.querySelector('#imageGallery').appendChild(imgElement);
            this.reset(); // Reset the form after successful upload
        } else {
            alert('Image upload failed: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('An error occurred while uploading the image.');
    });
});