
$(document).ready(function() {
  // Form validation
  $('#bigform').on('submit', function(e) {
    let isValid = true;
    
    // Validate required fields
    $(this).find('input[required]').each(function() {
      if (!$(this).val()) {
        $(this).siblings('.spanLocalError').removeClass('hidden');
        isValid = false;
      } else {
        $(this).siblings('.spanLocalError').addClass('hidden');
      }
    });

    // Phone validation
    const phone = $('input[name="phone"]');
    if (phone.val() && !/^\d{8}$/.test(phone.val())) {
      phone.siblings('.spanLocalError').removeClass('hidden');
      isValid = false;
    }

    if (!isValid) {
      e.preventDefault();
    }
  });

  // Toggle status switch and checkmark
  $('#statusSwitch').change(function() {
    const checkmark = $(this).closest('label').siblings('.checkmark');
    checkmark.toggle(this.checked);
  });
});
