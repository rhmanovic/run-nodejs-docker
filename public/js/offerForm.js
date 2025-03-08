document.addEventListener('DOMContentLoaded', function() {
  const productSelect = document.getElementById('product');
  const originalPriceInput = document.getElementById('originalPrice'); // This will be filled with sale_price
  const offerNameArInput = document.getElementById('offerNameAr');
  const offerNameEnInput = document.getElementById('offerNameEn');
  const offerQuantityInput = document.getElementById('offerQuantity');

  // Auto-fill fields when a product is selected
  productSelect.addEventListener('change', function() {
    const selectedProductId = this.value;
    const selectedProduct = products.find(product => product._id === selectedProductId);

    if (selectedProduct) {
      originalPriceInput.value = selectedProduct.sale_price || ''; // Fill originalPrice with sale_price
      offerNameArInput.value = selectedProduct.product_name_ar || '';
      offerNameEnInput.value = selectedProduct.product_name_en || '';
      offerQuantityInput.value = 1;
    } else {
      originalPriceInput.value = '';
      offerNameArInput.value = '';
      offerNameEnInput.value = '';
      offerQuantityInput.value = '';
    }
  });

  // Form validation on form click
  document.querySelector('#bigform').addEventListener('click', function() {
    let errors = [];
    const requiredFields = document.querySelectorAll('input[required], select[required]');

    requiredFields.forEach(field => {
      const spanLocalError = field.parentElement.querySelector('.spanLocalError');
      if (!field.value.trim()) {
        errors.push('الرجاء تعبئة: ' + (field.placeholder || field.getAttribute('placeholderselect')));
        spanLocalError.classList.remove('hidden');
        field.classList.add('border-danger');
      } else {
        spanLocalError.classList.add('hidden');
        field.classList.remove('border-danger');
      }
    });

    const errorContainer = document.getElementById('textValidationError');
    errorContainer.innerHTML = ''; // Clear previous errors

    if (errors.length > 0) {
      const ul = document.createElement('ul');
      errors.forEach(error => {
        const li = document.createElement('li');
        li.textContent = error;
        ul.appendChild(li);
      });
      errorContainer.appendChild(ul);
      errorContainer.style.display = 'block';
    } else {
      errorContainer.style.display = 'none';
    }
  });

  // Form submit handler for rich text editor fields
  document.querySelector('form').addEventListener('submit', function() {
    document.getElementById('hiddenDescriptionAr').value = quill32.root.innerHTML;
    document.getElementById('hiddenDescriptionEn').value = quill33.root.innerHTML;
  });

  // Image preview function
  function previewImage(event) {
    const reader = new FileReader();
    reader.onload = function() {
      const output = document.getElementById('imagePreview');
      output.src = reader.result;
    };
    reader.readAsDataURL(event.target.files[0]);
  }

  // Attach the previewImage function to image input
  document.getElementById('offer_image').addEventListener('change', previewImage);
});
