// balance.js - Complete Code

// ==================== Modal Initialization ====================

// Initialize Bootstrap Modals
let balanceModal;
let paymentMethodModal;

document.addEventListener('DOMContentLoaded', () => {
  balanceModal = new bootstrap.Modal(document.getElementById('balanceModal'));
  paymentMethodModal = new bootstrap.Modal(document.getElementById('paymentMethodModal'));
});

// Create Balance Modal
window.createBalanceForm = function() {
  // Reset form
  document.getElementById('balanceForm').reset();
  balanceModal.show();
};

// Create Payment Method Modal
window.createPaymentMethodForm = function() {
  // Reset form and populate balance dropdown
  document.getElementById('paymentMethodForm').reset();
  document.getElementById('feeInputContainer').style.display = 'none';
  paymentMethodModal.show();
};

// Toggle fee input visibility based on fee type
window.toggleFeeInput = function() {
  const feeType = document.getElementById('feeType').value;
  const feeContainer = document.getElementById('feeInputContainer');
  const feeInput = document.getElementById('fee');
  const feeLabel = document.getElementById('feeLabel');
  const feeSymbol = document.getElementById('feeSymbol');

  if (feeType === 'no_fee') {
    feeContainer.style.display = 'none';
    feeInput.value = '0';
    feeInput.required = false;
  } else {
    feeContainer.style.display = 'block';
    feeInput.required = true;

    if (feeType === 'fixed') {
      feeLabel.textContent = 'الرسوم الثابتة';
      feeSymbol.textContent = 'د.ك';
      feeInput.step = '0.001';
      feeInput.min = '0';
    } else if (feeType === 'percentage') {
      feeLabel.textContent = 'نسبة الرسوم';
      feeSymbol.textContent = '%';
      feeInput.step = '0.01';
      feeInput.min = '0';
      feeInput.max = '100';
    }
  }
};

// ==================== Form Reset Helpers ====================

// Reset form when modal hides
document.getElementById('balanceModal').addEventListener('hidden.bs.modal', () => {
  document.getElementById('balanceForm').reset();
});

document.getElementById('paymentMethodModal').addEventListener('hidden.bs.modal', () => {
  document.getElementById('paymentMethodForm').reset();
});


// Toast Notification System
function showToast(message, type = 'info') {
  const toastContainer = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast align-items-center text-white bg-${type} border-0`;
  toast.role = 'alert';
  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${message}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
    </div>
  `;
  toastContainer.appendChild(toast);
  new bootstrap.Toast(toast, { delay: 3000 }).show();
}

// ==================== Balance Operations ====================

// Create New Balance
document.getElementById('balanceForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = {
    name: document.getElementById('balanceName').value
  };

  try {
    const response = await fetch('/manager/cash/balance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    const data = await response.json();
    if (data.success) {
      showToast('تم إضافة الرصيد بنجاح', 'success');
      location.reload();
    } else {
      showToast(data.message || 'خطأ في الإضافة', 'danger');
    }
  } catch (error) {
    showToast('حدث خطأ في الشبكة', 'danger');
  }
});

// Edit Balance - Modal Population (Fix 2)
function editBalanceForm(id, name, balance) {
  document.getElementById('editBalanceId').value = id;
  document.getElementById('editBalanceName').value = name;
  document.getElementById('editBalanceAmount').value = balance || 0;
  new bootstrap.Modal(document.getElementById('editBalanceModal')).show();
}

// Edit Balance - Form Submission
async function handleEditBalanceSubmit(e) {
  e.preventDefault();
  const formData = {
    balanceId: document.getElementById('editBalanceId').value,
    name: document.getElementById('editBalanceName').value,
    balance: document.getElementById('editBalanceAmount').value
  };

  // Validation Fix (Fix 4)
  if (!formData.name.trim()) {
    showToast('يرجى إدخال اسم الرصيد', 'warning');
    return;
  }

  try {
    const response = await fetch('/manager/cash/balance/edit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    const data = await response.json();
    if (data.success) {
      showToast('تم تحديث الرصيد بنجاح', 'success');
      location.reload();
    } else {
      showToast(data.message || 'خطأ في التحديث', 'danger');
    }
  } catch (error) {
    showToast('حدث خطأ في الشبكة', 'danger');
  }
}

// Delete Balance
window.deleteBalance = function(id, name) {
  document.getElementById('deleteBalanceId').value = id;
  document.querySelector('#deleteConfirmModal .modal-body p').textContent = 
    `هل أنت متأكد من حذف الرصيد "${name}"؟`;
  new bootstrap.Modal(document.getElementById('deleteConfirmModal')).show();
};

window.confirmDelete = async function() {
  const balanceId = document.getElementById('deleteBalanceId').value;
  try {
    const response = await fetch(`/manager/cash/balance/${balanceId}`, {
      method: 'DELETE'
    });

    const data = await response.json();
    if (data.success) {
      showToast('تم الحذف بنجاح', 'success');
      location.reload();
    } else {
      showToast(data.message || 'خطأ في الحذف', 'danger');
    }
  } catch (error) {
    showToast('حدث خطأ في الشبكة', 'danger');
  }
};

// ==================== Payment Method Operations ====================

// Create New Payment Method
document.getElementById('paymentMethodForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = {
    name: document.getElementById('paymentMethodName').value,
    fee: document.getElementById('fee').value,
    feeType: document.getElementById('feeType').value,
    balance: document.getElementById('balance').value
  };

  // Validation Fix (Fix 4)
  if (!formData.name.trim() || !formData.balance) {
    showToast('يرجى ملء جميع الحقول المطلوبة', 'warning');
    return;
  }

  try {
    const response = await fetch('/manager/cash/payment-method', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    const data = await response.json();
    if (data.success) {
      showToast('تم الإضافة بنجاح', 'success');
      location.reload();
    } else {
      showToast(data.message || 'خطأ في الإضافة', 'danger');
    }
  } catch (error) {
    showToast('حدث خطأ في الشبكة', 'danger');
  }
});

// Toggle fee input visibility for edit modal
window.toggleEditFeeInput = function() {
  const feeType = document.getElementById('editFeeType').value;
  const feeContainer = document.getElementById('editFeeInputContainer');
  const feeInput = document.getElementById('editFee');
  const feeLabel = document.getElementById('editFeeLabel');
  const feeSymbol = document.getElementById('editFeeSymbol');

  if (feeType === 'no_fee') {
    feeContainer.style.display = 'none';
    feeInput.value = '0';
    feeInput.required = false;
  } else if (feeType === 'fixed') {
    feeContainer.style.display = 'block';
    feeInput.required = true;
    feeLabel.textContent = 'الرسوم الثابتة';
    feeSymbol.textContent = 'د.ك';
    feeInput.step = '0.001';
    feeInput.min = '0';
  } else if (feeType === 'percentage') {
    feeContainer.style.display = 'block';
    feeInput.required = true;
    feeLabel.textContent = 'نسبة الرسوم';
    feeSymbol.textContent = '%';
    feeInput.step = '0.01';
    feeInput.min = '0';
    feeInput.max = '100';
  }
};

window.editPaymentMethod = function(id, name, feeType, fee, balanceId) {
  document.getElementById('paymentMethodId').value = id;
  document.getElementById('editPaymentMethodName').value = name;
  document.getElementById('editFeeType').value = feeType;
  document.getElementById('editFee').value = fee;

  const balanceSelect = document.getElementById('editBalance');

  // Reset selection
  balanceSelect.value = ''; 

  // Check if balanceId is valid and exists in the dropdown options
  let found = false;
  Array.from(balanceSelect.options).forEach(option => {
    if (balanceId && option.value === balanceId) {
      option.selected = true;
      found = true;
    } else {
      option.selected = false;
    }
  });

  // If balanceId is null or not found, ensure the default option is selected
  if (!found) {
    balanceSelect.querySelector('option[value=""]').selected = true;
  }

  new bootstrap.Modal(document.getElementById('editPaymentMethodModal')).show();
};


// Edit Payment Method - Form Submission
async function handleEditPaymentMethodSubmit(e) {
  e.preventDefault();
  const formData = {
    paymentMethodId: document.getElementById('paymentMethodId').value,
    name: document.getElementById('editPaymentMethodName').value,
    fee: parseFloat(document.getElementById('editFee').value),
    feeType: document.getElementById('editFeeType').value,
    balance: document.getElementById('editBalance').value
  };

  // Validation Fix (Fix 4)
  if (!formData.name.trim() || isNaN(formData.fee) || !formData.balance) {
    showToast('يرجى ملء جميع الحقول بشكل صحيح', 'warning');
    return;
  }

  try {
    const response = await fetch('/manager/cash/payment-method/edit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    const data = await response.json();
    if (data.success) {
      showToast('تم التحديث بنجاح', 'success');
      location.reload();
    } else {
      showToast(data.message || 'خطأ في التحديث', 'danger');
    }
  } catch (error) {
    showToast('حدث خطأ في الشبكة', 'danger');
  }
}

// Delete Payment Method
window.deletePaymentMethod = function(id, name) {
  document.getElementById('deletePaymentMethodId').value = id;
  document.querySelector('#deletePaymentMethodModal .modal-body p').textContent = 
    `هل أنت متأكد من حذف وسيلة الدفع "${name}"؟`;
  new bootstrap.Modal(document.getElementById('deletePaymentMethodModal')).show();
};

window.confirmDeletePaymentMethod = async function() {
  const methodId = document.getElementById('deletePaymentMethodId').value;
  try {
    const response = await fetch(`/manager/cash/payment-method/${methodId}`, {
      method: 'DELETE'
    });

    const data = await response.json();
    if (data.success) {
      showToast('تم الحذف بنجاح', 'success');
      location.reload();
    } else {
      showToast(data.message || 'خطأ في الحذف', 'danger');
    }
  } catch (error) {
    showToast('حدث خطأ في الشبكة', 'danger');
  }
};
// Handle both payment method and fee calculation switches
document.addEventListener('change', async (event) => {
  if (event.target.classList.contains('payment-method-switch') || event.target.classList.contains('fee-calculation-switch')) {
    const methodId = event.target.dataset.id;
    const newStatus = event.target.checked;
    const switchElement = event.target;
    const labelElement = switchElement.closest('label');
    const isFeeCalc = event.target.classList.contains('fee-calculation-switch');

    try {
      // Disable switch and add opacity
      switchElement.disabled = true;
      labelElement.classList.add('disabled-opacity');

      const endpoint = '/manager/cash/payment-method/toggle';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          id: methodId, 
          [isFeeCalc ? 'enableFeeCalculation' : 'enabled']: newStatus 
        })
      });

      const data = await response.json();

      if (!data.success) {
        // Revert switch state on error
        switchElement.checked = !newStatus;
        showToast(data.message, 'danger');
      } else {
        showToast(isFeeCalc ? 'تم تحديث حالة حساب الرسوم بنجاح' : 'تم تحديث حالة وسيلة الدفع بنجاح', 'success');
      }

    } catch (error) {
      // Revert switch state on error
      switchElement.checked = !newStatus;
      showToast('حدث خطأ في الشبكة', 'danger');
    } finally {
      // Re-enable switch after 5 seconds
      setTimeout(() => {
        switchElement.disabled = false;
        labelElement.classList.remove('disabled-opacity');
      }, 5000);
    }
  }
});

// Toggle Payment Method Status
window.togglePaymentMethod = async function(id, enabled) {
  try {
    const response = await fetch('/manager/cash/payment-method/toggle', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ id, enabled })
    });

    const data = await response.json();
    if (data.success) {
      showToast('تم تحديث حالة وسيلة الدفع بنجاح', 'success');
    } else {
      showToast(data.message || 'حدث خطأ في تحديث الحالة', 'danger');
      // Revert the toggle if there was an error
      document.getElementById(`methodEnabled_${id}`).checked = !enabled;
    }
  } catch (error) {
    console.error('Error toggling payment method:', error);
    showToast('حدث خطأ في الشبكة', 'danger');
    // Revert the toggle if there was an error
    document.getElementById(`methodEnabled_${id}`).checked = !enabled;
  }
};