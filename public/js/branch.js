//
// Define the DeleteModalTrigger function
function DeleteModalTrigger(branchId, branchName) {
  // Implementation of DeleteModalTrigger function
  // This function should handle the click event for triggering the delete modal

  // Log something to indicate the function execution
  // console.log('Delete modal triggered');
  // Add a line to log the category ID and name
  // console.log(`Category ID: ${branchId}, Category Name: ${branchName}`);

  document.getElementById('branchToDelete').textContent = branchName;

  document.getElementById('branchToDeleteID').value = branchId;

   $('#deleteConfirmationModal').modal('show');
}

// Add event listener for all category switches
document.addEventListener('change', async (event) => {
  // console.log("xxx")
  if (event.target.classList.contains('category-switch')) {
    const branchId = event.target.dataset.id; // Get the category ID from the data-id attribute
    const name = event.target.dataset.name; // Get the category ID from the data-id attribute
    const newStatus = event.target.checked; // Get the new status from the checked property of the switch

    // console.log("branchId: " + branchId);
    // console.log("name: " + name);
    // console.log("newStatus: " + newStatus);

    try {
      // Disable the switch element and add a class to set opacity to the parent label element
      event.target.disabled = true;
      const labelElement = event.target.closest('label');
      labelElement.classList.add('disabled-opacity');

      // console.log("labelElement.classList:: " + labelElement.classList)

      // Send a POST request to update the category status
      const response = await fetch('/manager/branch/update-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id: branchId, status: newStatus, name: name })
      });

      if (!response.ok) {
        throw new Error('Failed to update category status');
      }

      // Update the category status on the frontend if the request is successful
      const categoryRow = event.target.closest('tr');
      //categoryRow.querySelector('.checkmark').style.display = newStatus ? 'block' : 'none'; // Show/hide the checkmark span based on the new status

      // Show toast notification
      const toast = new bootstrap.Toast(document.querySelector('.toast'));
      toast.show();

      // Re-enable the switch element after 8 seconds and remove the opacity class
      setTimeout(() => {
        labelElement.classList.remove('disabled-opacity');
        event.target.disabled = false;

      }, 5000);
    } catch (error) {
      // console.error('Error updating category status:', error);
      event.target.disabled = false;
      // Re-enable the switch element and remove the opacity class in case of error
      labelElement.classList.remove('disabled-opacity');
    }
  }
});

// Add event listener for delete button click
document.addEventListener('click', (event) => {
  if (event.target.classList.contains('delete-button')) {
    // Call the DeleteModalTrigger function
    DeleteModalTrigger();
  }
});
