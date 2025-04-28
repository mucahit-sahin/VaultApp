document.addEventListener("DOMContentLoaded", () => {
  const pinInput = document.getElementById("pin");
  const loginBtn = document.getElementById("login-btn");
  const errorMessage = document.getElementById("error-message");

  // Check for dark mode preference
  const darkMode = localStorage.getItem("darkMode") === "enabled";
  if (darkMode) {
    document.body.classList.add("dark-mode");
  }

  // Ensure only numbers can be entered
  pinInput.addEventListener("input", () => {
    pinInput.value = pinInput.value.replace(/\D/g, "");
  });

  // Handle Enter key
  pinInput.addEventListener("keyup", (event) => {
    if (event.key === "Enter") {
      loginBtn.click();
    }
  });

  loginBtn.addEventListener("click", async () => {
    const pin = pinInput.value;

    // Validate input
    if (pin.length < 4) {
      errorMessage.textContent = "PIN must be at least 4 digits";
      return;
    }

    // Verify the PIN
    try {
      const isValid = await window.api.verifyPin(pin);
      if (!isValid) {
        errorMessage.textContent = "Invalid PIN";
        pinInput.value = "";
      }
      // If valid, will automatically redirect to main app
    } catch (error) {
      errorMessage.textContent = `Error: ${error.message}`;
    }
  });
});
