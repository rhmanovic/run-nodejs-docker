document.addEventListener("DOMContentLoaded", () => {
  const deleteConfirmationModal = new bootstrap.Modal(document.getElementById('deleteConfirmationModal'), {});

  // Function to trigger delete confirmation modal
  window.DeleteModalTrigger = (offerId, offerName) => {
    document.getElementById("offerToDelete").innerText = offerName; // Set offer name in modal
    document.getElementById("offerToDeleteID").value = offerId; // Set offer ID in hidden input
    deleteConfirmationModal.show(); // Show modal
  };
});
