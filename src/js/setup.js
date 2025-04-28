document.addEventListener("DOMContentLoaded", () => {
  const pinInput = document.getElementById("pin");
  const confirmPinInput = document.getElementById("confirm-pin");
  const setupBtn = document.getElementById("setup-btn");
  const errorMessage = document.getElementById("error-message");

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

  setupBtn.addEventListener("click", async () => {
    const pin = pinInput.value;
    const confirmPin = confirmPinInput.value;

    // Validate input
    if (pin.length < 4) {
      errorMessage.textContent = "PIN must be at least 4 digits";
      return;
    }

    if (pin !== confirmPin) {
      errorMessage.textContent = "PINs do not match";
      return;
    }

    // Set up the PIN
    try {
      const success = await window.api.setupPin(pin);
      if (success) {
        // PIN setup successful, will automatically redirect to auth page
      } else {
        errorMessage.textContent = "Failed to set up PIN";
      }
    } catch (error) {
      errorMessage.textContent = `Error: ${error.message}`;
    }
  });
});
