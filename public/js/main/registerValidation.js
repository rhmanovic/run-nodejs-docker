document.addEventListener('DOMContentLoaded', function() {
  // Form elements
  const nameInput = document.querySelector('#registerForm input[placeholder="أدخل الاسم الكريم"]');
  const emailInput = document.querySelector('#registerForm input[type="email"]');
  const phoneInput = document.querySelector('#registerForm input[type="tel"]');
  const passwordInput = document.querySelector('#registerForm input[type="password"]');
  const registerButton = document.querySelector('#registerForm button[type="submit"]');

  // Login form elements
  const loginEmailInput = document.querySelector('#loginForm input[type="email"]');
  const loginPasswordInput = document.querySelector('#loginForm input[type="password"]');
  const loginButton = document.querySelector('#loginForm button[type="submit"]');

  // Error containers - add these divs next to h5 elements
  function createErrorContainer(inputElement, errorMessage) {
    // Find the closest h5 sibling that's before this input's parent
    const h5Element = inputElement.parentNode.previousElementSibling;

    if (h5Element && h5Element.tagName === 'H5') {
      // Create a container div to hold both h5 and error message
      if (!h5Element.parentNode.classList.contains('d-flex')) {
        // Wrap h5 in a flex container if not already
        const container = document.createElement('div');
        container.className = 'd-flex justify-content-between align-items-center mb-4';
        h5Element.parentNode.insertBefore(container, h5Element);
        container.appendChild(h5Element);

        // Create error div
        const errorDiv = document.createElement('div');
        errorDiv.className = 'text-danger error-message';
        errorDiv.style.display = 'none';
        errorDiv.textContent = errorMessage;
        container.appendChild(errorDiv);
        return errorDiv;
      } else {
        // If flex container already exists, just add error div
        const errorDiv = document.createElement('div');
        errorDiv.className = 'text-danger error-message';
        errorDiv.style.display = 'none';
        errorDiv.textContent = errorMessage;
        h5Element.parentNode.appendChild(errorDiv);
        return errorDiv;
      }
    } else {
      // Fallback to old behavior if h5 not found
      const errorDiv = document.createElement('div');
      errorDiv.className = 'text-danger mt-1 mb-2 error-message';
      errorDiv.style.display = 'none';
      errorDiv.textContent = errorMessage;
      inputElement.parentNode.appendChild(errorDiv);
      return errorDiv;
    }
  }

  // Create error containers for register form
  const nameError = createErrorContainer(nameInput, 'الرجاء إدخال الاسم الكريم');
  const emailError = createErrorContainer(emailInput, 'الرجاء إدخال بريد إلكتروني صحيح');
  const phoneError = createErrorContainer(phoneInput, 'الرجاء إدخال رقم جوال صحيح');
  const passwordError = createErrorContainer(passwordInput, 'كلمة المرور يجب أن تحتوي على 6 أحرف على الأقل');

  // Create error containers for login form
  const loginEmailError = createErrorContainer(loginEmailInput, 'الرجاء إدخال بريد إلكتروني صحيح');
  const loginPasswordError = createErrorContainer(loginPasswordInput, 'الرجاء إدخال كلمة المرور');

  // Validation functions
  function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  function validatePhone(phone) {
    return phone.length === 8 && /^\d+$/.test(phone);
  }

  function validatePassword(password) {
    return password.length >= 6;
  }

  function validateName(name) {
    return name.trim().length > 0;
  }

  // Register form validation
  if (registerButton) {
    registerButton.addEventListener('click', function(event) {
      let isValid = true;

      // Validate name
      if (!validateName(nameInput.value)) {
        nameError.style.display = 'block';
        nameInput.classList.add('border-danger');
        isValid = false;
      } else {
        nameError.style.display = 'none';
        nameInput.classList.remove('border-danger');
      }

      // Validate email
      if (!validateEmail(emailInput.value)) {
        emailError.style.display = 'block';
        emailInput.classList.add('border-danger');
        isValid = false;
      } else {
        emailError.style.display = 'none';
        emailInput.classList.remove('border-danger');
      }

      // Validate phone
      if (!validatePhone(phoneInput.value)) {
        phoneError.style.display = 'block';
        phoneInput.classList.add('border-danger');
        isValid = false;
      } else {
        phoneError.style.display = 'none';
        phoneInput.classList.remove('border-danger');
      }

      // Validate password
      if (!validatePassword(passwordInput.value)) {
        passwordError.style.display = 'block';
        passwordInput.classList.add('border-danger');
        isValid = false;
      } else {
        passwordError.style.display = 'none';
        passwordInput.classList.remove('border-danger');
      }

      if (!isValid) {
        event.preventDefault();
      }
    });
  }

  // Login form validation
  if (loginButton) {
    loginButton.addEventListener('click', function(event) {
      let isValid = true;

      // Validate email
      if (!validateEmail(loginEmailInput.value)) {
        loginEmailError.style.display = 'block';
        loginEmailInput.classList.add('border-danger');
        isValid = false;
      } else {
        loginEmailError.style.display = 'none';
        loginEmailInput.classList.remove('border-danger');
      }

      // Validate password
      if (loginPasswordInput.value.trim() === '') {
        loginPasswordError.style.display = 'block';
        loginPasswordInput.classList.add('border-danger');
        isValid = false;
      } else {
        loginPasswordError.style.display = 'none';
        loginPasswordInput.classList.remove('border-danger');
      }

      if (!isValid) {
        event.preventDefault();
      }
    });
  }

  // Add form submission handler for the register form
  const registerForm = document.querySelector('#registerForm form');
  if (registerForm) {
    registerForm.addEventListener('submit', function(e) {
      // Clear previous error messages
      const existingErrorMsg = document.querySelector('#registerForm .error-alert');
      if (existingErrorMsg) {
        existingErrorMsg.remove();
      }

      // Basic validation
      const name = registerForm.querySelector('input[name="name"]').value;
      const project = registerForm.querySelector('input[name="project"]').value;
      const email = registerForm.querySelector('input[name="email"]').value;
      const phone = registerForm.querySelector('input[name="phone"]').value;
      const password = registerForm.querySelector('input[name="password"]').value;

      let hasError = false;
      let errorMessage = '';

      if (!name) {
        hasError = true;
        errorMessage = 'الرجاء إدخال الاسم الكريم';
      } else if (!project) {
        hasError = true;
        errorMessage = 'الرجاء إدخال اسم المشروع';
      } else if (!email) {
        hasError = true;
        errorMessage = 'الرجاء إدخال البريد الإلكتروني';
      } else if (!phone) {
        hasError = true;
        errorMessage = 'الرجاء إدخال رقم الجوال';
      } else if (!password) {
        hasError = true;
        errorMessage = 'الرجاء إدخال كلمة المرور';
      }

      if (hasError) {
        e.preventDefault(); // Prevent form submission

        // Create and show error message
        const errorAlert = document.createElement('div');
        errorAlert.className = 'alert alert-danger error-alert mb-3';
        errorAlert.textContent = errorMessage;

        // Insert before the submit button
        const submitButton = registerForm.querySelector('button[type="submit"]');
        submitButton.parentNode.insertBefore(errorAlert, submitButton);
      }
    });
  }

  // Similarly for login form
  const loginForm = document.querySelector('#loginForm form');
  if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
      // Clear previous error messages
      const existingErrorMsg = document.querySelector('#loginForm .error-alert');
      if (existingErrorMsg) {
        existingErrorMsg.remove();
      }

      // Basic validation
      const email = loginForm.querySelector('input[name="email"]').value;
      const password = loginForm.querySelector('input[name="password"]').value;

      let hasError = false;
      let errorMessage = '';

      if (!email) {
        hasError = true;
        errorMessage = 'الرجاء إدخال البريد الإلكتروني';
      } else if (!password) {
        hasError = true;
        errorMessage = 'الرجاء إدخال كلمة المرور';
      }

      if (hasError) {
        e.preventDefault(); // Prevent form submission

        // Create and show error message
        const errorAlert = document.createElement('div');
        errorAlert.className = 'alert alert-danger error-alert mb-3';
        errorAlert.textContent = errorMessage;

        // Insert before the submit button
        const submitButton = loginForm.querySelector('button[type="submit"]');
        submitButton.parentNode.insertBefore(errorAlert, submitButton);
      }
    });
  }

  // Toggle password visibility
  const togglePasswordIcons = document.querySelectorAll('.password-icon i, .fa-eye-slash');
  togglePasswordIcons.forEach(icon => {
    icon.addEventListener('click', function() {
      const container = this.closest('.password-input-container') || this.closest('.input-group');
      const passwordInput = container.querySelector('input[type="password"]') || container.querySelector('input[type="text"]');
      const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
      passwordInput.setAttribute('type', type);
      this.classList.toggle('fa-eye');
      this.classList.toggle('fa-eye-slash');
    });
  });
});
document.addEventListener('DOMContentLoaded', function() {
  // Phone validation
  const phoneInput = document.querySelector('input[name="phone"]');

  phoneInput.addEventListener('input', function() {
    // Remove non-digit characters
    this.value = this.value.replace(/\D/g, '');

    // Limit to 9 digits (excluding country code)
    if (this.value.length > 9) {
      this.value = this.value.slice(0, 9);
    }
  });

  // Form validation
  const registerForm = document.querySelector('form[action="/register"]');
  registerForm.addEventListener('submit', function(event) {
    let isValid = true;

    // Validate name
    const nameInput = this.querySelector('input[name="name"]');
    if (!nameInput.value.trim()) {
      isValid = false;
      nameInput.classList.add('is-invalid');
    } else {
      nameInput.classList.remove('is-invalid');
    }

    // Validate email
    const emailInput = this.querySelector('input[name="email"]');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailInput.value.trim() || !emailRegex.test(emailInput.value)) {
      isValid = false;
      emailInput.classList.add('is-invalid');
    } else {
      emailInput.classList.remove('is-invalid');
    }

    // Validate phone
    if (!phoneInput.value.trim() || phoneInput.value.length < 9) {
      isValid = false;
      phoneInput.classList.add('is-invalid');
    } else {
      phoneInput.classList.remove('is-invalid');
    }

    // Validate password
    const passwordInput = this.querySelector('input[name="password"]');
    if (!passwordInput.value || passwordInput.value.length < 6) {
      isValid = false;
      passwordInput.classList.add('is-invalid');
    } else {
      passwordInput.classList.remove('is-invalid');
    }

    if (!isValid) {
      event.preventDefault();
    }
  });

  // Password visibility toggle
  const togglePasswordBtn = document.querySelector('.fa-eye-slash');
  if (togglePasswordBtn) {
    togglePasswordBtn.addEventListener('click', function() {
      const passwordInput = document.querySelector('input[name="password"]');
      if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        this.classList.remove('fa-eye-slash');
        this.classList.add('fa-eye');
      } else {
        passwordInput.type = 'password';
        this.classList.remove('fa-eye');
        this.classList.add('fa-eye-slash');
      }
    });
  }
});
// Password visibility toggle
document.addEventListener('DOMContentLoaded', function() {
  const passwordIcon = document.querySelector('.password-icon');
  const passwordInput = document.querySelector('input[name="password"]');

  if (passwordIcon && passwordInput) {
    passwordIcon.addEventListener('click', function() {
      const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
      passwordInput.setAttribute('type', type);

      // Toggle the icon
      const icon = passwordIcon.querySelector('i');
      if (type === 'password') {
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
      } else {
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
      }
    });
  }
});