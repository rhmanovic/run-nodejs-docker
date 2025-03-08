window.imageFiles = []; // Declare imageFiles as a global variable
const fileInput = document.getElementById('product_images');
const imagePreviewList = document.getElementById('image-preview-list');

fileInput.addEventListener('change', function() {
  const files = Array.from(fileInput.files); // Convert FileList to an array

  files.forEach(file => {
    if (!window.imageFiles.some(f => f.name === file.name)) { // Prevent duplicates
      window.imageFiles.push(file); // Add new files to the global array

      const reader = new FileReader();
      reader.onload = function(e) {
        const li = document.createElement('li');
        li.className = 'd-inline-block position-relative m-1'; // Styling

        const img = document.createElement('img');
        img.src = e.target.result;
        img.alt = 'Uploaded Image';
        img.width = 100;
        img.height = 100;
        img.style.objectFit = 'cover';

        // Delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '&times;';
        deleteBtn.className = 'btn btn-sm btn-danger position-absolute top-0 end-0';
        deleteBtn.style.borderRadius = '50%';
        deleteBtn.style.width = '20px';
        deleteBtn.style.height = '20px';
        deleteBtn.style.display = 'flex';
        deleteBtn.style.justifyContent = 'center';
        deleteBtn.style.alignItems = 'center';

        deleteBtn.addEventListener('click', function() {
          const index = window.imageFiles.indexOf(file);
          if (index > -1) {
            window.imageFiles.splice(index, 1); // Remove from array
            li.remove(); // Remove from UI
          }
        });

        li.appendChild(img);
        li.appendChild(deleteBtn);
        imagePreviewList.appendChild(li);
      };

      reader.readAsDataURL(file);
    }
  });

  fileInput.value = ''; // Reset input to allow re-selection of same files
});
