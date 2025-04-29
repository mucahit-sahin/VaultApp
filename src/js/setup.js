document.addEventListener("DOMContentLoaded", () => {
  const pinInput = document.getElementById("pin");
  const confirmPinInput = document.getElementById("confirm-pin");
  const setupBtn = document.getElementById("setup-btn");
  const errorMessage = document.getElementById("error-message");

  // Automatically focus the first PIN input field when the page loads
  pinInput.focus();

  // Check for dark mode preference
  const darkMode = localStorage.getItem("darkMode") === "enabled";
  if (darkMode) {
    document.body.classList.add("dark-mode");
  }

  // Ensure only numbers can be entered
  const ensureNumericInput = (input) => {
    input.addEventListener("input", () => {
      input.value = input.value.replace(/\D/g, "");
    });
  };

  ensureNumericInput(pinInput);
  ensureNumericInput(confirmPinInput);

  // Handle Enter key in the first PIN input to move to confirm input
  pinInput.addEventListener("keyup", (event) => {
    if (event.key === "Enter" && pinInput.value.length >= 4) {
      confirmPinInput.focus();
    }
  });

  // Handle Enter key in confirm PIN input to submit
  confirmPinInput.addEventListener("keyup", (event) => {
    if (event.key === "Enter") {
      setupBtn.click();
    }
  });

  setupBtn.addEventListener("click", async () => {
    const pin = pinInput.value;
    const confirmPin = confirmPinInput.value;

    // Validate input
    if (pin.length < 4) {
      errorMessage.textContent = "PIN must be at least 4 digits";
      pinInput.focus();
      return;
    }

    if (pin !== confirmPin) {
      errorMessage.textContent = "PINs do not match";
      confirmPinInput.value = "";
      confirmPinInput.focus();
      return;
    }

    // Set up the PIN
    try {
      const success = await window.api.setupPin(pin);
      if (success) {
        // PIN setup successful, will automatically redirect to auth page
      } else {
        errorMessage.textContent = "Failed to set up PIN";
        pinInput.value = "";
        confirmPinInput.value = "";
        pinInput.focus();
      }
    } catch (error) {
      errorMessage.textContent = `Error: ${error.message}`;
      pinInput.value = "";
      confirmPinInput.value = "";
      pinInput.focus();
    }
  });
});
