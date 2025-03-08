/**
 * Category page functionality
 */

document.addEventListener('DOMContentLoaded', function() {
  // Category search functionality
  const searchInput = document.getElementById('categorySearch');
  if (searchInput) {
    searchInput.addEventListener('keyup', function() {
      const searchTerm = this.value.toLowerCase();
      const tableRows = document.querySelectorAll('tbody tr');

      tableRows.forEach(row => {
        const categoryNumber = row.querySelector('td:nth-child(1)').textContent.toLowerCase();
        const englishName = row.querySelector('td:nth-child(3)').textContent.toLowerCase();
        const arabicName = row.querySelector('td:nth-child(4)').textContent.toLowerCase();

        if (categoryNumber.includes(searchTerm) || 
            englishName.includes(searchTerm) || 
            arabicName.includes(searchTerm)) {
          row.style.display = '';
        } else {
          row.style.display = 'none';
        }
      });
    });
  }

  // Delete modal functionality
  window.DeleteModalTrigger = function(categoryId, categoryName) {
    document.getElementById('categoryToDelete').textContent = categoryName;
    document.getElementById('categoryToDeleteID').value = categoryId;
    const deleteModal = new bootstrap.Modal(document.getElementById('deleteConfirmationModal'));
    deleteModal.show();
  };

  // Category switch functionality (single implementation)
  const categorySwitches = document.querySelectorAll('.category-switch');
  categorySwitches.forEach(switchEl => {
    switchEl.addEventListener('change', async function(event) {
      const categoryId = this.getAttribute('data-id');
      const isActive = this.checked;
      const checkmark = this.parentElement.querySelector('.checkmark');

      // Update checkmark visibility
      if (checkmark) {
        checkmark.style.display = isActive ? '' : 'none';
      }

      // Disable the switch element temporarily
      this.disabled = true;
      const labelElement = this.closest('label');
      if (labelElement) labelElement.classList.add('disabled-opacity');

      try {
        // Update category status via AJAX
        const response = await fetch('/manager/categories/update-status', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: categoryId,
            status: isActive
          })
        });

        const data = await response.json();

        // Show success toast regardless of data.success property
        const toast = document.getElementById('statusToast');
        if (toast) {
          toast.classList.remove('bg-danger');
          toast.classList.add('bg-success');

          const toastBody = toast.querySelector('.toast-body');
          if (toastBody) {
            toastBody.innerHTML = '<i class="fa fa-check-circle me-2"></i> تم تحديث حالة التصنيف بنجاح';
          }

          const toastInstance = new bootstrap.Toast(toast);
          toastInstance.show();
          
          // Ensure checkmark visibility matches the current switch state
          if (checkmark) {
            checkmark.style.display = isActive ? '' : 'none';
          }
        }
      } catch (error) {
        console.error('Error updating category status:', error);
        // Revert checkbox state
        this.checked = !isActive;
        if (checkmark) {
          checkmark.style.display = !isActive ? '' : 'none';
        }

        // Show error toast
        const toast = document.getElementById('statusToast');
        if (toast) {
          const toastBody = toast.querySelector('.toast-body');
          if (toastBody) {
            toastBody.innerHTML = '<i class="fa fa-exclamation-circle me-2"></i> حدث خطأ أثناء تحديث حالة التصنيف';
          }
          toast.classList.remove('bg-success');
          toast.classList.add('bg-danger');
          const toastInstance = new bootstrap.Toast(toast);
          toastInstance.show();
        }
      } finally {
        // Re-enable the switch after 3 seconds
        setTimeout(() => {
          this.disabled = false;
          if (labelElement) labelElement.classList.remove('disabled-opacity');
        }, 3000);
      }
    });
  });
});