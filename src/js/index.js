document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
  const importBtn = document.getElementById("import-btn");
  const createFolderBtn = document.getElementById("create-folder-btn");
  const selectModeBtn = document.getElementById("select-mode-btn");
  const logoutBtn = document.getElementById("logout-btn");
  const themeToggleBtn = document.getElementById("theme-toggle");
  const themeToggleIcon = document.querySelector(".theme-toggle-icon");
  const mediaContainer = document.getElementById("media-container");
  const emptyState = document.getElementById("empty-state");
  const searchInput = document.getElementById("search-input");
  const viewAllBtn = document.getElementById("view-all");
  const viewImagesBtn = document.getElementById("view-images");
  const viewVideosBtn = document.getElementById("view-videos");
  const mediaModal = document.getElementById("media-modal");
  const mediaViewer = document.getElementById("media-viewer");
  const closeModal = document.querySelector(".close-modal");
  const deleteMediaBtn = document.getElementById("delete-media");
  const currentFolderPath = document.getElementById("current-folder-path");
  const backBtn = document.getElementById("back-btn");
  const folderModal = document.getElementById("folder-modal");
  const folderNameInput = document.getElementById("folder-name");
  const saveFolderBtn = document.getElementById("save-folder-btn");
  const cancelFolderBtn = document.getElementById("cancel-folder-btn");
  const closeFolderModal = document.querySelector(".close-folder-modal");

  // Selection mode elements
  const selectionActions = document.getElementById("selection-actions");
  const selectedCount = document.getElementById("selected-count");
  const moveToFolderBtn = document.getElementById("move-to-folder-btn");
  const deleteSelectedBtn = document.getElementById("delete-selected-btn");
  const cancelSelectionBtn = document.getElementById("cancel-selection-btn");

  // Move to folder modal elements
  const moveModal = document.getElementById("move-modal");
  const closeMoveModal = document.querySelector(".close-move-modal");
  const destinationFolders = document.getElementById("destination-folders");

  // Settings modal elements - will create these dynamically
  let settingsModal;
  let closeSettingsModal;
  let slideshowIntervalInput;
  let saveSettingsBtn;
  let currentVaultPathDisplay;

  // Application state
  let mediaFiles = [];
  let filteredMediaFiles = [];
  let folders = [];
  let currentFilter = "all";
  let currentMediaFile = null;
  let currentFolderId = null;
  let mediaCache = {}; // Cache for decrypted media data
  let folderHistory = []; // Track folder navigation history
  let isSelectionMode = false; // Track selection mode
  let selectedItems = []; // Track selected items
  let darkMode = localStorage.getItem("darkMode") === "enabled"; // Track theme preference

  // Gallery keyboard navigation state
  let focusedItemIndex = -1; // Track currently focused item
  let galleryItems = []; // Keep track of all items in the gallery for keyboard navigation

  // Slideshow state
  let slideshowInterval = localStorage.getItem("slideshowInterval") || 3000; // Default 3 seconds
  let slideshowTimer = null;
  let isSlideshow = false;

  // Long press support for selection mode
  let longPressTimer = null;
  const longPressDuration = 500; // 500ms for long press

  // Add loading overlay
  const loadingOverlay = document.createElement("div");
  loadingOverlay.className = "loading-overlay";
  loadingOverlay.innerHTML = `
    <div class="loading-spinner"></div>
    <div class="loading-text">Loading media...</div>
  `;
  document.body.appendChild(loadingOverlay);

  // Function to show/hide loading overlay
  const showLoading = (show) => {
    loadingOverlay.style.display = show ? "flex" : "none";
  };

  // Initially hide the loading overlay
  showLoading(false);

  // Initialize the application
  const init = async () => {
    // Show loading overlay during initialization
    showLoading(true);

    try {
      // Initialize theme
      if (darkMode) {
        enableDarkMode();
      } else {
        disableDarkMode();
      }

      // Load media and folders
      await Promise.all([loadMedia(), loadFolders()]);

      // Ensure the loading overlay is visible for at least 500ms
      // This helps users see the loading state even if loading is very fast
      const startTime = Date.now();
      const minLoadingTime = 500; // minimum time to show loading in milliseconds
      const elapsed = Date.now() - startTime;
      if (elapsed < minLoadingTime) {
        await new Promise((resolve) =>
          setTimeout(resolve, minLoadingTime - elapsed)
        );
      }

      // Update display after both operations are complete
      updateMediaDisplay();
      setupEventListeners();

      // Update button labels to show shortcuts
      updateButtonLabels();

      // Add settings button to main header
      addSettingsButton();
    } catch (error) {
      console.error("Error initializing application:", error);
      alert(
        "An error occurred while starting the application. Please try again."
      );
      // Hide loading overlay in case of error
      showLoading(false);
    }
  };

  // Toggle dark mode
  const toggleDarkMode = () => {
    if (darkMode) {
      disableDarkMode();
    } else {
      enableDarkMode();
    }
  };

  // Enable dark mode
  const enableDarkMode = () => {
    document.body.classList.add("dark-mode");
    themeToggleIcon.textContent = "☀️";
    localStorage.setItem("darkMode", "enabled");
    darkMode = true;
  };

  // Disable dark mode
  const disableDarkMode = () => {
    document.body.classList.remove("dark-mode");
    themeToggleIcon.textContent = "🌙";
    localStorage.setItem("darkMode", "disabled");
    darkMode = false;
  };

  // Load media from the vault
  const loadMedia = async () => {
    try {
      const result = await window.api.getMedia(currentFolderId);
      if (result.success) {
        mediaFiles = result.mediaFiles || [];
        filteredMediaFiles = [...mediaFiles];
      } else {
        console.error("Failed to load media:", result.message);
      }
    } catch (error) {
      console.error("Error loading media:", error);
    }
  };

  // Load folders
  const loadFolders = async () => {
    try {
      const result = await window.api.getFolders();
      if (result.success) {
        folders = result.folders || [];
      } else {
        console.error("Failed to load folders:", result.message);
      }
    } catch (error) {
      console.error("Error loading folders:", error);
    }
  };

  // Set up event listeners
  const setupEventListeners = () => {
    // Theme toggle button
    if (themeToggleBtn) {
      themeToggleBtn.addEventListener("click", toggleDarkMode);
    }

    // Import button
    if (importBtn) {
      importBtn.addEventListener("click", handleImport);
    }

    // Create folder button
    if (createFolderBtn) {
      createFolderBtn.addEventListener("click", openFolderModal);
    }

    // Select mode button
    if (selectModeBtn) {
      selectModeBtn.addEventListener("click", toggleSelectionMode);
    }

    // Move to folder button
    if (moveToFolderBtn) {
      moveToFolderBtn.addEventListener("click", openMoveModal);
    }

    // Cancel selection button
    if (cancelSelectionBtn) {
      cancelSelectionBtn.addEventListener("click", cancelSelection);
    }

    // Delete selected button
    if (deleteSelectedBtn) {
      deleteSelectedBtn.addEventListener("click", handleDeleteSelected);
    }

    // Logout button
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        // Clear cache before logout
        mediaCache = {};
        window.api.logout();
      });
    }

    // View filters
    if (viewAllBtn) {
      viewAllBtn.addEventListener("click", () => applyFilter("all"));
    }

    if (viewImagesBtn) {
      viewImagesBtn.addEventListener("click", () => applyFilter("image"));
    }

    if (viewVideosBtn) {
      viewVideosBtn.addEventListener("click", () => applyFilter("video"));
    }

    // Search
    if (searchInput) {
      searchInput.addEventListener("input", handleSearch);
    }

    // Media modal controls
    if (closeModal && mediaModal) {
      closeModal.addEventListener("click", closeMediaModal);
      mediaModal.addEventListener("click", (event) => {
        if (event.target === mediaModal) {
          closeMediaModal();
        }
      });
    }

    // Delete media button
    if (deleteMediaBtn) {
      deleteMediaBtn.addEventListener("click", handleDeleteMedia);
    }

    // Back button
    if (backBtn) {
      backBtn.addEventListener("click", handleBackButton);
    }

    // Folder Modal controls
    if (closeFolderModal && cancelFolderBtn) {
      closeFolderModal.addEventListener("click", closeFolderModalHandler);
      cancelFolderBtn.addEventListener("click", closeFolderModalHandler);
    }

    // Form submission
    const folderForm = document.getElementById("folder-form");
    if (folderForm) {
      folderForm.addEventListener("submit", (e) => {
        e.preventDefault();
        handleCreateFolder();
      });
    }

    if (saveFolderBtn) {
      // Instead of directly calling handleCreateFolder, we'll submit the form
      // This way only one event handler (the form submission) calls handleCreateFolder
      saveFolderBtn.addEventListener("click", (e) => {
        e.preventDefault();
        const form = document.getElementById("folder-form");
        if (form) {
          form.dispatchEvent(new Event("submit"));
        }
      });
    }

    if (folderModal) {
      folderModal.addEventListener("click", (event) => {
        if (event.target === folderModal) {
          closeFolderModalHandler();
        }
      });
    }

    // Move modal controls
    if (closeMoveModal && moveModal) {
      closeMoveModal.addEventListener("click", closeMoveModalHandler);
      moveModal.addEventListener("click", (event) => {
        if (event.target === moveModal) {
          closeMoveModalHandler();
        }
      });
    }

    // ESC key to close modals
    document.addEventListener("keydown", handleModalKeyEvents);

    // Keyboard shortcuts for main gallery navigation
    document.addEventListener("keydown", handleGalleryKeyNavigation);

    // Keyboard shortcuts for application actions
    document.addEventListener("keydown", handleAppShortcuts);

    // Ensure initial focus is set in the gallery
    setupGalleryFocus();
  };

  // Create settings modal
  const createSettingsModal = () => {
    // Check if the modal already exists
    if (document.getElementById("settings-modal")) {
      return;
    }

    // Create the modal
    settingsModal = document.createElement("div");
    settingsModal.id = "settings-modal";
    settingsModal.className = "modal";

    // Create the modal content
    const modalContent = document.createElement("div");
    modalContent.className = "settings-modal-content";

    // Add modal title
    const modalTitle = document.createElement("h3");
    modalTitle.textContent = "Settings";
    modalContent.appendChild(modalTitle);

    // Add close button
    closeSettingsModal = document.createElement("span");
    closeSettingsModal.className = "close-modal";
    closeSettingsModal.innerHTML = "&times;";
    closeSettingsModal.addEventListener("click", closeSettingsModalHandler);
    modalContent.appendChild(closeSettingsModal);

    // Create settings form
    const settingsForm = document.createElement("form");
    settingsForm.id = "settings-form";
    settingsForm.addEventListener("submit", (e) => e.preventDefault());

    // Add interval setting
    const intervalGroup = document.createElement("div");
    intervalGroup.className = "form-group";

    const intervalLabel = document.createElement("label");
    intervalLabel.htmlFor = "slideshow-interval";
    intervalLabel.textContent = "Slideshow Interval (seconds):";

    slideshowIntervalInput = document.createElement("input");
    slideshowIntervalInput.type = "number";
    slideshowIntervalInput.id = "slideshow-interval";
    slideshowIntervalInput.className = "form-input";
    slideshowIntervalInput.min = "1";
    slideshowIntervalInput.max = "60";
    slideshowIntervalInput.step = "1";
    slideshowIntervalInput.value = slideshowInterval / 1000;

    intervalGroup.appendChild(intervalLabel);
    intervalGroup.appendChild(slideshowIntervalInput);

    // Add vault path setting
    const vaultPathGroup = document.createElement("div");
    vaultPathGroup.className = "form-group";

    const vaultPathLabel = document.createElement("label");
    vaultPathLabel.textContent = "Encrypted Files Location:";

    const vaultPathDescription = document.createElement("p");
    vaultPathDescription.className = "setting-description";
    vaultPathDescription.textContent =
      "Files will be stored in a 'Vault' folder at the selected location.";

    const vaultPathContainer = document.createElement("div");
    vaultPathContainer.className = "vault-path-container";

    currentVaultPathDisplay = document.createElement("div");
    currentVaultPathDisplay.className = "vault-path-display";
    currentVaultPathDisplay.textContent = "Loading...";

    const changeVaultPathBtn = document.createElement("button");
    changeVaultPathBtn.type = "button";
    changeVaultPathBtn.className = "btn secondary-btn";
    changeVaultPathBtn.textContent = "Change";
    changeVaultPathBtn.addEventListener("click", handleChangeVaultPath);

    vaultPathContainer.appendChild(currentVaultPathDisplay);
    vaultPathContainer.appendChild(changeVaultPathBtn);

    vaultPathGroup.appendChild(vaultPathLabel);
    vaultPathGroup.appendChild(vaultPathDescription);
    vaultPathGroup.appendChild(vaultPathContainer);

    // Add shortcuts customization section
    const shortcutsGroup = document.createElement("div");
    shortcutsGroup.className = "form-group shortcuts-section";

    const shortcutsLabel = document.createElement("label");
    shortcutsLabel.textContent = "Keyboard Shortcuts:";

    const shortcutsDescription = document.createElement("p");
    shortcutsDescription.className = "setting-description";
    shortcutsDescription.textContent =
      "Customize keyboard shortcuts for common actions. Leave empty to disable a shortcut.";

    shortcutsGroup.appendChild(shortcutsLabel);
    shortcutsGroup.appendChild(shortcutsDescription);

    // Create shortcut settings table
    const shortcutsTable = document.createElement("table");
    shortcutsTable.className = "shortcuts-table";

    // Add header row
    const headerRow = document.createElement("tr");
    
    const actionHeader = document.createElement("th");
    actionHeader.textContent = "Action";
    
    const shortcutHeader = document.createElement("th");
    shortcutHeader.textContent = "Shortcut";
    
    headerRow.appendChild(actionHeader);
    headerRow.appendChild(shortcutHeader);
    shortcutsTable.appendChild(headerRow);

    // Define shortcuts to customize
    const shortcuts = [
      { id: "import", action: "Import Media", defaultKey: "F1" },
      { id: "createFolder", action: "Create Folder", defaultKey: "F2" },
      { id: "selectItems", action: "Select Items", defaultKey: "F3" },
      { id: "settings", action: "Settings", defaultKey: "S" },
      { id: "logout", action: "Logout", defaultKey: "Control" },
      { id: "filterAll", action: "Filter All", defaultKey: "1" },
      { id: "filterImages", action: "Filter Images", defaultKey: "2" },
      { id: "filterVideos", action: "Filter Videos", defaultKey: "3" },
    ];

    // Get saved shortcuts from localStorage or use defaults
    const savedShortcuts = JSON.parse(localStorage.getItem("customShortcuts")) || {};

    // Create input fields for each shortcut
    shortcuts.forEach(shortcut => {
      const row = document.createElement("tr");
      
      const actionCell = document.createElement("td");
      actionCell.textContent = shortcut.action;
      
      const shortcutCell = document.createElement("td");
      shortcutCell.className = "shortcut-controls";
      
      // Create a container for all shortcut controls to be in one line
      const controlsContainer = document.createElement("div");
      controlsContainer.className = "controls-flex-container";
      
      // Add enable/disable checkbox
      const enableCheckbox = document.createElement("input");
      enableCheckbox.type = "checkbox";
      enableCheckbox.className = "shortcut-enable";
      enableCheckbox.id = `enable-${shortcut.id}`;
      enableCheckbox.title = "Enable/disable shortcut";
      
      // Check if the shortcut exists in saved shortcuts
      const shortcutExists = shortcut.id in savedShortcuts;
      
      // For new installations or upgrades, default all shortcuts to disabled
      // Only set to true if explicitly saved as enabled before
      let isEnabled = false;
      if (shortcutExists) {
        isEnabled = savedShortcuts[shortcut.id] !== "";
      }
      
      enableCheckbox.checked = isEnabled;
      
      const shortcutInput = document.createElement("input");
      shortcutInput.type = "text";
      shortcutInput.className = "shortcut-input";
      shortcutInput.id = `shortcut-${shortcut.id}`;
      shortcutInput.placeholder = shortcut.defaultKey;
      shortcutInput.value = savedShortcuts[shortcut.id] || "";
      
      // Disable input when checkbox is unchecked
      shortcutInput.disabled = !enableCheckbox.checked;
      
      // Add event listener to toggle input disabled state
      enableCheckbox.addEventListener("change", () => {
        shortcutInput.disabled = !enableCheckbox.checked;
        if (!enableCheckbox.checked) {
          shortcutInput.value = ""; // Clear value when disabled
        } else if (shortcutInput.value === "") {
          shortcutInput.value = shortcut.defaultKey; // Set to default when enabled and empty
        }
      });
      
      // Add button to reset to default
      const resetBtn = document.createElement("button");
      resetBtn.type = "button";
      resetBtn.className = "reset-shortcut-btn";
      resetBtn.textContent = "Reset";
      resetBtn.title = "Reset to default";
      resetBtn.addEventListener("click", () => {
        shortcutInput.value = shortcut.defaultKey;
        enableCheckbox.checked = true;
        shortcutInput.disabled = false;
      });
      
      // Add all elements to the controls container
      controlsContainer.appendChild(enableCheckbox);
      controlsContainer.appendChild(shortcutInput);
      controlsContainer.appendChild(resetBtn);
      
      // Add the controls container to the cell
      shortcutCell.appendChild(controlsContainer);
      
      row.appendChild(actionCell);
      row.appendChild(shortcutCell);
      
      shortcutsTable.appendChild(row);
    });

    shortcutsGroup.appendChild(shortcutsTable);

    // Add delete all encrypted data section
    const deleteDataGroup = document.createElement("div");
    deleteDataGroup.className = "form-group danger-section";

    const deleteDataLabel = document.createElement("label");
    deleteDataLabel.textContent = "Danger Zone:";

    const deleteDataDescription = document.createElement("p");
    deleteDataDescription.className = "setting-description";
    deleteDataDescription.textContent =
      "This will permanently delete all your encrypted files and cannot be undone.";

    const deleteAllDataBtn = document.createElement("button");
    deleteAllDataBtn.type = "button";
    deleteAllDataBtn.className = "btn danger-btn";
    deleteAllDataBtn.textContent = "Delete All Encrypted Data";
    deleteAllDataBtn.addEventListener("click", handleDeleteAllEncryptedData);

    deleteDataGroup.appendChild(deleteDataLabel);
    deleteDataGroup.appendChild(deleteDataDescription);
    deleteDataGroup.appendChild(deleteAllDataBtn);

    // Add GitHub link
    const githubGroup = document.createElement("div");
    githubGroup.className = "form-group github-section";

    const githubLabel = document.createElement("label");
    githubLabel.textContent = "Project Repository:";

    const githubLink = document.createElement("a");
    githubLink.href = "#";
    githubLink.className = "github-link";
    githubLink.textContent = "VaultApp on GitHub";
    githubLink.addEventListener("click", (e) => {
      e.preventDefault();
      window.api.openExternalUrl("https://github.com/mucahit-sahin/VaultApp");
    });

    // Add GitHub icon
    const githubIcon = document.createElement("span");
    githubIcon.className = "github-icon";
    githubIcon.innerHTML = "★"; // Simple star icon instead of FontAwesome

    githubLink.prepend(githubIcon);
    githubGroup.appendChild(githubLabel);
    githubGroup.appendChild(githubLink);

    // Add form actions
    const formActions = document.createElement("div");
    formActions.className = "form-actions";

    saveSettingsBtn = document.createElement("button");
    saveSettingsBtn.type = "button";
    saveSettingsBtn.className = "btn primary-btn";
    saveSettingsBtn.textContent = "Save";
    saveSettingsBtn.addEventListener("click", saveSettings);

    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "btn secondary-btn";
    cancelBtn.textContent = "Cancel";
    cancelBtn.addEventListener("click", () => {
      settingsModal.style.display = "none";
    });

    formActions.appendChild(saveSettingsBtn);
    formActions.appendChild(cancelBtn);

    // Assemble form
    settingsForm.appendChild(intervalGroup);
    settingsForm.appendChild(vaultPathGroup);
    settingsForm.appendChild(shortcutsGroup);
    settingsForm.appendChild(formActions);
    settingsForm.appendChild(deleteDataGroup);
    settingsForm.appendChild(githubGroup);

    // Assemble modal content
    modalContent.appendChild(closeSettingsModal);
    modalContent.appendChild(modalTitle);
    modalContent.appendChild(settingsForm);

    // Assemble modal
    settingsModal.appendChild(modalContent);

    // Add to document
    document.body.appendChild(settingsModal);

    // Close modal when clicking outside
    settingsModal.addEventListener("click", (event) => {
      if (event.target === settingsModal) {
        settingsModal.style.display = "none";
      }
    });

    // Get the current vault path
    getCurrentVaultPath();
  };

  // Handle importing media
  const handleImport = async () => {
    try {
      // Show loading overlay
      showLoading(true);

      const result = await window.api.importMedia(currentFolderId);
      if (result.success) {
        // Reload media after importing
        await loadMedia();
        // Make sure to call updateMediaDisplay explicitly since we removed it from loadMedia
        updateMediaDisplay();

        // Show notification
        if (result.importedFiles.length > 0) {
          alert(
            `Successfully imported ${result.importedFiles.length} file(s).`
          );
        }

        if (result.failedFiles.length > 0) {
          alert(`Failed to import ${result.failedFiles.length} file(s).`);
        }
      } else {
        alert(`Import failed: ${result.message}`);
      }
    } catch (error) {
      console.error("Error importing media:", error);
      alert("An error occurred during import.");
    } finally {
      // Hide loading overlay
      showLoading(false);
    }
  };

  // Apply filter to media files
  const applyFilter = (filter) => {
    // Update active button
    viewAllBtn.classList.toggle("active", filter === "all");
    viewImagesBtn.classList.toggle("active", filter === "image");
    viewVideosBtn.classList.toggle("active", filter === "video");

    currentFilter = filter;

    // Apply filter and search
    filterAndSearchMedia();
  };

  // Handle search
  const handleSearch = () => {
    filterAndSearchMedia();
  };

  // Filter and search media
  const filterAndSearchMedia = () => {
    const searchTerm = searchInput.value.toLowerCase();

    filteredMediaFiles = mediaFiles.filter((file) => {
      // Apply type filter
      const matchesFilter =
        currentFilter === "all" || file.type === currentFilter;

      // Apply search filter
      const matchesSearch =
        searchTerm === "" || file.name.toLowerCase().includes(searchTerm);

      return matchesFilter && matchesSearch;
    });

    updateMediaDisplay();
  };

  // Get thumbnail for a file
  const getThumbnailElement = async (file) => {
    const thumbnail = document.createElement("div");
    thumbnail.className = "thumbnail";

    if (file.type === "image") {
      try {
        // Use placeholder immediately for better perceived performance
        const img = document.createElement("img");
        img.alt = file.name;
        img.className = "thumbnail-image placeholder";
        thumbnail.appendChild(img);

        // Check if we have the file data in cache
        if (!mediaCache[file.secureFilename]) {
          // Load and cache file data
          const result = await window.api.getFileData(file.secureFilename);
          if (result.success) {
            mediaCache[file.secureFilename] = result.data;
          } else {
            throw new Error(result.message || "Failed to load file");
          }
        }

        // Update image with actual data
        img.src = `data:image/jpeg;base64,${mediaCache[file.secureFilename]}`;
        img.classList.remove("placeholder");
      } catch (error) {
        console.error("Error loading thumbnail:", error);

        // Show error thumbnail
        const errorIcon = document.createElement("div");
        errorIcon.className = "error-icon";
        errorIcon.textContent = "!";
        thumbnail.appendChild(errorIcon);
      }
    } else {
      // For videos, use a video icon
      const videoIcon = document.createElement("div");
      videoIcon.className = "video-icon";
      videoIcon.innerHTML = "▶";
      thumbnail.appendChild(videoIcon);
    }

    return thumbnail;
  };

  // Update the media display
  const updateMediaDisplay = async () => {
    // Show loading overlay
    showLoading(true);

    try {
      // Clear the container
      mediaContainer.innerHTML = "";

      // Create a document fragment for better performance
      const fragment = document.createDocumentFragment();

      // Reset gallery navigation state
      focusedItemIndex = -1;
      galleryItems = [];

      // Add folders if we're not searching
      if (searchInput.value === "") {
        const relevantFolders = folders.filter((folder) => {
          if (currentFolderId === null) {
            return true; // Show all folders at root level
          }
          return false; // Don't show folders inside other folders (for now)
        });

        for (const folder of relevantFolders) {
          const folderItem = document.createElement("div");
          folderItem.className = "folder-item";
          if (isSelectionMode) {
            folderItem.classList.add("selectable");

            // Don't select folders in selection mode
            folderItem.addEventListener("click", (e) => {
              e.stopPropagation();
            });

            // Double click still works to open folder
            folderItem.addEventListener("dblclick", (e) => {
              e.stopPropagation();
              if (!isSelectionMode) {
                openFolder(folder.id);
              }
            });
          } else {
            // Double click to open folder when not in selection mode
            folderItem.addEventListener("dblclick", () =>
              openFolder(folder.id)
            );

            // Single click to focus folder item
            folderItem.addEventListener("click", () => {
              focusGalleryItem(galleryItems.indexOf(folderItem));
            });
          }

          folderItem.dataset.folderId = folder.id;
          folderItem.dataset.itemType = "folder";

          // Add to gallery items array for keyboard navigation
          galleryItems.push(folderItem);

          const folderIcon = document.createElement("div");
          folderIcon.className = "folder-icon";

          // Defer folder thumbnail loading
          folderIcon.innerHTML = "📁"; // Default folder icon first
          fragment.appendChild(folderItem);
          folderItem.appendChild(folderIcon);

          const folderName = document.createElement("div");
          folderName.className = "folder-name";
          folderName.textContent = folder.name;
          folderItem.appendChild(folderName);

          // Add delete button
          const folderActions = document.createElement("div");
          folderActions.className = "folder-actions";

          const deleteBtn = document.createElement("button");
          deleteBtn.innerHTML = "×";
          deleteBtn.title = "Delete folder";
          deleteBtn.addEventListener("click", (e) => {
            e.stopPropagation(); // Prevent folder opening when clicking delete
            handleDeleteFolder(folder.id, folder.name);
          });

          folderActions.appendChild(deleteBtn);
          folderItem.appendChild(folderActions);

          // Add long press handlers to the folder item
          addLongPressHandlers(folderItem, {
            type: "folder",
            id: folder.id,
            name: folder.name,
          });

          // Try to get folder thumbnail after DOM insertion
          setTimeout(async () => {
            try {
              const result = await window.api.getFolderThumbnail(folder.id);

              if (result.success && result.hasThumbnail) {
                // Create image element with base64 data
                const img = document.createElement("img");
                img.src = `data:image/jpeg;base64,${result.data}`;
                img.alt = folder.name;
                img.className = "folder-thumbnail";
                folderIcon.innerHTML = ""; // Clear default icon
                folderIcon.appendChild(img);

                // Add folder overlay without the folder icon, just darkening effect
                const folderOverlay = document.createElement("div");
                folderOverlay.className = "folder-overlay";
                folderIcon.appendChild(folderOverlay);
              }
            } catch (error) {
              console.error("Error loading folder thumbnail:", error);
            }
          }, 100);
        }
      }

      // Set up intersection observer for lazy loading
      const observer = new IntersectionObserver(
        (entries, observer) => {
          entries.forEach(async (entry) => {
            if (entry.isIntersecting) {
              const mediaItem = entry.target;
              const secureFilename = mediaItem.dataset.secureFilename;
              const fileType = mediaItem.dataset.type;

              // Only load image thumbnails lazily, video icons are already light
              if (fileType === "image") {
                const thumbnailDiv = mediaItem.querySelector(".thumbnail");

                // Load the actual thumbnail
                try {
                  // Check if we have the file data in cache
                  if (!mediaCache[secureFilename]) {
                    // Show a loading state
                    const loadingImg = thumbnailDiv.querySelector("img");
                    if (!loadingImg) {
                      const img = document.createElement("img");
                      img.alt = mediaItem.dataset.name;
                      img.className = "thumbnail-image placeholder";
                      thumbnailDiv.appendChild(img);
                    }

                    // Load and cache file data
                    const result = await window.api.getFileData(secureFilename);
                    if (result.success) {
                      mediaCache[secureFilename] = result.data;
                    } else {
                      throw new Error(result.message || "Failed to load file");
                    }
                  }

                  // Update image with actual data
                  const img =
                    thumbnailDiv.querySelector("img") ||
                    document.createElement("img");
                  img.src = `data:image/jpeg;base64,${mediaCache[secureFilename]}`;
                  img.alt = mediaItem.dataset.name;
                  img.classList.remove("placeholder");
                  if (!thumbnailDiv.contains(img)) {
                    thumbnailDiv.appendChild(img);
                  }
                } catch (error) {
                  console.error("Error loading thumbnail:", error);
                  // Show error thumbnail
                  thumbnailDiv.innerHTML = "";
                  const errorIcon = document.createElement("div");
                  errorIcon.className = "error-icon";
                  errorIcon.textContent = "!";
                  thumbnailDiv.appendChild(errorIcon);
                }
              }

              // Stop observing this item once it's loaded
              observer.unobserve(mediaItem);
            }
          });
        },
        { rootMargin: "100px" } // Start loading when within 100px of viewport
      );

      // Also create a batch observer for preloading images in batches
      const batchObserver = new IntersectionObserver(
        (entries, observer) => {
          // Get all intersecting image items
          const intersectingItems = entries
            .filter((entry) => entry.isIntersecting)
            .map((entry) => entry.target)
            .filter((item) => item.dataset.type === "image");

          if (intersectingItems.length > 0) {
            // Unobserve all these items first
            intersectingItems.forEach((item) => {
              observer.unobserve(item);
            });

            // Extract filenames for batch loading
            const filenames = intersectingItems.map(
              (item) => item.dataset.secureFilename
            );

            // Only load those not in cache already
            const filenamesNotInCache = filenames.filter(
              (filename) => !mediaCache[filename]
            );

            if (filenamesNotInCache.length > 0) {
              // Load them in a batch
              loadImageBatch(filenamesNotInCache, intersectingItems);
            }
          }
        },
        {
          rootMargin: "200px", // Look further ahead for batch loading
          threshold: 0.01, // Trigger when just a tiny bit is visible
        }
      );

      // Add media files with placeholder thumbnails
      for (const file of filteredMediaFiles) {
        const mediaItem = document.createElement("div");
        mediaItem.className = "media-item";
        if (isSelectionMode) {
          mediaItem.classList.add("selectable");

          // Make item selectable in selection mode with explicit binding to current item
          const boundFile = { ...file, type: "media" }; // Ensure the type is set
          mediaItem.addEventListener("click", function () {
            toggleItemSelection(mediaItem, boundFile);
          });
        } else {
          // Open in modal when clicked outside selection mode
          mediaItem.addEventListener("click", () => {
            openMediaModal(file);
            focusGalleryItem(galleryItems.indexOf(mediaItem));
          });
        }

        mediaItem.dataset.secureFilename = file.secureFilename;
        mediaItem.dataset.name = file.name;
        mediaItem.dataset.type = file.type;
        mediaItem.dataset.itemType = "media";

        // Add to gallery items array for keyboard navigation
        galleryItems.push(mediaItem);

        // Create a basic placeholder thumbnail
        const thumbnail = document.createElement("div");
        thumbnail.className = "thumbnail";

        if (file.type === "image") {
          // Create a placeholder for images
          const placeholderIcon = document.createElement("div");
          placeholderIcon.className = "placeholder-icon";
          thumbnail.appendChild(placeholderIcon);
        } else {
          // For videos, use a video icon (no need to lazy load)
          const videoIcon = document.createElement("div");
          videoIcon.className = "video-icon";
          videoIcon.innerHTML = "▶";
          thumbnail.appendChild(videoIcon);
        }

        // Add the filename
        const fileName = document.createElement("div");
        fileName.className = "file-name";
        fileName.textContent = file.name;

        mediaItem.appendChild(thumbnail);
        mediaItem.appendChild(fileName);

        // Add long press handlers to the media item
        addLongPressHandlers(mediaItem, file);

        // Add to fragment
        fragment.appendChild(mediaItem);

        // Check if this item is in our selectedItems array and mark it as selected
        if (
          selectedItems.some(
            (item) =>
              item.type === "media" &&
              item.secureFilename === file.secureFilename
          )
        ) {
          mediaItem.classList.add("selected");
        }

        // Start observing this item
        if (file.type === "image") {
          observer.observe(mediaItem);
          batchObserver.observe(mediaItem);
        }
      }

      // Append fragment to container (single DOM operation)
      mediaContainer.appendChild(fragment);

      // Show empty state if there are no folders and no media files
      emptyState.style.display =
        mediaContainer.childElementCount === 0 ? "flex" : "none";

      // If empty state is being displayed, make sure it's in the container
      if (
        emptyState.style.display === "flex" &&
        !mediaContainer.contains(emptyState)
      ) {
        mediaContainer.appendChild(emptyState);
      }

      // Update back button visibility
      backBtn.style.display = currentFolderId ? "block" : "none";

      // Update selection UI if in selection mode
      updateSelectionUI();

      // Set focus on the first item after updating display if there are items
      if (galleryItems.length > 0 && focusedItemIndex === -1) {
        focusGalleryItem(0);
      }
    } finally {
      // Hide loading overlay when done, regardless of success or error
      showLoading(false);
    }
  };

  // Function to batch load images
  const loadImageBatch = async (filenames, mediaItems) => {
    if (filenames.length === 0) return;

    try {
      // Start batch loading
      const result = await window.api.getFilesDataBatch(filenames);

      if (result.success) {
        // Process the results
        Object.entries(result.results).forEach(([filename, fileData]) => {
          // Add to cache
          mediaCache[filename] = fileData.data;

          // Find the corresponding media item
          const item = mediaItems.find(
            (item) => item.dataset.secureFilename === filename
          );

          if (item) {
            const thumbnailDiv = item.querySelector(".thumbnail");
            // Update the image
            const img =
              thumbnailDiv.querySelector("img") ||
              document.createElement("img");
            img.src = `data:image/jpeg;base64,${fileData.data}`;
            img.alt = fileData.name;
            img.classList.remove("placeholder");

            // Remove placeholder if it exists
            const placeholder = thumbnailDiv.querySelector(".placeholder-icon");
            if (placeholder) {
              thumbnailDiv.removeChild(placeholder);
            }

            if (!thumbnailDiv.contains(img)) {
              thumbnailDiv.appendChild(img);
            }
          }
        });

        // Handle errors
        if (result.errors && Object.keys(result.errors).length > 0) {
          Object.entries(result.errors).forEach(([filename, errorMsg]) => {
            console.error(`Error loading ${filename}: ${errorMsg}`);

            // Find the corresponding media item
            const item = mediaItems.find(
              (item) => item.dataset.secureFilename === filename
            );

            if (item) {
              const thumbnailDiv = item.querySelector(".thumbnail");
              thumbnailDiv.innerHTML = "";
              const errorIcon = document.createElement("div");
              errorIcon.className = "error-icon";
              errorIcon.textContent = "!";
              thumbnailDiv.appendChild(errorIcon);
            }
          });
        }
      }
    } catch (error) {
      console.error("Error in batch loading:", error);
    }
  };

  // Open media modal
  const openMediaModal = async (file) => {
    // Don't open modal in selection mode
    if (isSelectionMode) return;

    currentMediaFile = file;
    mediaViewer.innerHTML = "";

    // Show loading overlay
    showLoading(true);

    try {
      if (file.type === "image") {
        // Check if we have the file data in cache
        if (!mediaCache[file.secureFilename]) {
          // Show loading indicator
          const loading = document.createElement("div");
          loading.className = "loading";
          loading.textContent = "Loading...";
          mediaViewer.appendChild(loading);

          // Load and cache file data
          const result = await window.api.getFileData(file.secureFilename);
          if (result.success) {
            mediaCache[file.secureFilename] = result.data;
          } else {
            throw new Error(result.message || "Failed to load file");
          }

          // Remove loading indicator
          mediaViewer.innerHTML = "";
        }

        const img = document.createElement("img");
        img.src = `data:image/jpeg;base64,${mediaCache[file.secureFilename]}`;
        img.alt = file.name;

        // Make the image fill the entire screen
        img.style.width = "100%";
        img.style.height = "100%";
        img.style.maxWidth = "100vw";
        img.style.maxHeight = "100vh";
        img.style.objectFit = "contain";
        img.style.margin = "0";
        img.style.padding = "0";

        mediaViewer.appendChild(img);
      } else if (file.type === "video") {
        // Create video element with initial loading state
        const video = document.createElement("video");
        video.controls = true;
        video.autoplay = true;

        // Show loading indicator before video loads
        const loadingSpinner = document.createElement("div");
        loadingSpinner.className = "video-loading-spinner";
        loadingSpinner.innerHTML = "Loading video...";
        mediaViewer.appendChild(loadingSpinner);

        // Make the video fill the entire screen
        video.style.width = "100%";
        video.style.height = "100%";
        video.style.maxWidth = "100vw";
        video.style.maxHeight = "100vh";
        video.style.objectFit = "contain";
        video.style.margin = "0";
        video.style.padding = "0";
        video.style.display = "none"; // Hide until loaded

        // Get the initial chunk (first 500KB) for quick start
        const initialChunkResult = await window.api.getVideoChunk(
          file.secureFilename,
          0,
          500 * 1024 // Initial 500KB
        );

        if (!initialChunkResult.success) {
          throw new Error(initialChunkResult.message || "Failed to load video");
        }

        // Set the source and append to viewer
        video.src = `data:video/mp4;base64,${initialChunkResult.data}`;
        mediaViewer.appendChild(video);

        // Load the rest of the video in the background
        video.addEventListener("canplay", () => {
          // Remove loading spinner and show video
          if (loadingSpinner && loadingSpinner.parentNode) {
            loadingSpinner.parentNode.removeChild(loadingSpinner);
          }
          video.style.display = "block";
        });

        // This avoids re-downloading if we've already cached the full video
        if (!mediaCache[file.secureFilename]) {
          // Load the complete video in the background
          const fullVideoResult = await window.api.getFileData(
            file.secureFilename
          );
          if (fullVideoResult.success) {
            mediaCache[file.secureFilename] = fullVideoResult.data;
            // Update video source with full video once loaded
            video.src = `data:video/mp4;base64,${fullVideoResult.data}`;

            // Store current playback position and state
            const currentTime = video.currentTime;
            const wasPlaying = !video.paused;

            // Set video to same position
            video.addEventListener(
              "loadedmetadata",
              () => {
                video.currentTime = currentTime;
                if (wasPlaying) {
                  video
                    .play()
                    .catch((err) =>
                      console.error("Error resuming playback:", err)
                    );
                }
              },
              { once: true }
            );
          }
        }
      }

      // Create and add delete button to modal content
      const modalContent = mediaModal.querySelector(".modal-content");

      // Remove existing delete button if any
      const existingDeleteBtn = modalContent.querySelector(".delete-btn");
      if (existingDeleteBtn) {
        existingDeleteBtn.remove();
      }

      // Create new delete button
      const deleteBtn = document.createElement("button");
      deleteBtn.id = "delete-media";
      deleteBtn.className = "delete-btn";
      deleteBtn.innerHTML = "🗑️";
      deleteBtn.title = "Delete";
      deleteBtn.addEventListener("click", handleDeleteMedia);

      // Add to modal content
      modalContent.appendChild(deleteBtn);

      // Add navigation arrows if there are multiple media items
      if (filteredMediaFiles.length > 1) {
        addNavigationArrows();

        // Add slideshow controls for images
        if (file.type === "image") {
          addSlideshowControls();
        }
      }

      // Ensure modal is properly sized for fullscreen
      mediaModal.style.display = "block";

      // Remove any potential scrollbars
      document.body.style.overflow = "hidden";

      // Enable keyboard navigation
      document.addEventListener("keydown", handleKeyNavigation);

      // Stop slideshow on touch/click
      mediaModal.addEventListener("click", handleModalClick);
    } catch (error) {
      console.error("Error loading media:", error);
      alert(`Error loading media: ${error.message}`);
    } finally {
      // Hide loading overlay
      showLoading(false);
    }
  };

  // Add navigation arrows to the media modal
  const addNavigationArrows = () => {
    // Create navigation container
    const navContainer = document.createElement("div");
    navContainer.className = "media-navigation";

    // Previous button
    const prevBtn = document.createElement("button");
    prevBtn.className = "nav-btn prev-btn";
    prevBtn.innerHTML = "&#10094;"; // Left arrow
    prevBtn.addEventListener("click", navigateToPrevious);

    // Next button
    const nextBtn = document.createElement("button");
    nextBtn.className = "nav-btn next-btn";
    nextBtn.innerHTML = "&#10095;"; // Right arrow
    nextBtn.addEventListener("click", navigateToNext);

    // Add buttons to container
    navContainer.appendChild(prevBtn);
    navContainer.appendChild(nextBtn);

    // Add container to the modal
    mediaModal.querySelector(".modal-content").appendChild(navContainer);
  };

  // Handle keyboard navigation
  const handleKeyNavigation = (event) => {
    // Only process keyboard events when the modal is open
    if (mediaModal.style.display !== "block") return;

    switch (event.key) {
      case "ArrowLeft":
        navigateToPrevious();
        break;
      case "ArrowRight":
        navigateToNext();
        break;
      case "Escape":
        closeMediaModal();
        break;
    }
  };

  // Navigate to the previous media in the current directory
  const navigateToPrevious = () => {
    if (!currentMediaFile || filteredMediaFiles.length <= 1) return;

    // Find the index of the current file
    const currentIndex = filteredMediaFiles.findIndex(
      (file) => file.secureFilename === currentMediaFile.secureFilename
    );

    if (currentIndex > 0) {
      // Navigate to the previous file
      const prevFile = filteredMediaFiles[currentIndex - 1];
      openMediaModal(prevFile);
    } else {
      // Wrap around to the last file
      const lastFile = filteredMediaFiles[filteredMediaFiles.length - 1];
      openMediaModal(lastFile);
    }
  };

  // Navigate to the next media in the current directory
  const navigateToNext = () => {
    if (!currentMediaFile || filteredMediaFiles.length <= 1) return;

    // Find the index of the current file
    const currentIndex = filteredMediaFiles.findIndex(
      (file) => file.secureFilename === currentMediaFile.secureFilename
    );

    if (currentIndex < filteredMediaFiles.length - 1) {
      // Navigate to the next file
      const nextFile = filteredMediaFiles[currentIndex + 1];
      openMediaModal(nextFile);
    } else {
      // Wrap around to the first file
      const firstFile = filteredMediaFiles[0];
      openMediaModal(firstFile);
    }
  };

  // Close media modal
  const closeMediaModal = () => {
    mediaModal.style.display = "none";
    currentMediaFile = null;
    mediaViewer.innerHTML = "";

    // Stop slideshow
    stopSlideshow();
    isSlideshow = false;

    // Reset body overflow
    document.body.style.overflow = "";

    // Remove event listeners
    document.removeEventListener("keydown", handleKeyNavigation);
    mediaModal.removeEventListener("click", handleModalClick);
  };

  // Handle media deletion
  const handleDeleteMedia = async () => {
    if (!currentMediaFile) return;

    if (
      confirm(`Are you sure you want to delete "${currentMediaFile.name}"?`)
    ) {
      try {
        // Show loading overlay
        showLoading(true);

        const result = await window.api.deleteMedia(
          currentMediaFile.secureFilename
        );

        if (result.success) {
          // Close the modal
          closeMediaModal();

          // Reload media
          await loadMedia();
          // Make sure to call updateMediaDisplay explicitly since we removed it from loadMedia
          updateMediaDisplay();
        } else {
          alert(`Failed to delete: ${result.message}`);
        }
      } catch (error) {
        console.error("Error deleting media:", error);
        alert("An error occurred while deleting.");
      } finally {
        // Hide loading overlay
        showLoading(false);
      }
    }
  };

  // Open a folder
  const openFolder = async (folderId) => {
    // Show loading overlay
    showLoading(true);

    try {
      // Exit selection mode when navigating
      if (isSelectionMode) {
        cancelSelection();
      }

      // Add current folder to history if changing folders
      if (currentFolderId !== folderId) {
        if (currentFolderId !== null) {
          folderHistory.push(currentFolderId);
        }
        currentFolderId = folderId;
      }

      // Update folder path display
      const folder = folders.find((f) => f.id === folderId);
      if (folder) {
        currentFolderPath.textContent = folder.name;
      }

      // Reload media for this folder
      await loadMedia();

      // Add a small delay to ensure loading overlay is visible
      // This helps with visual feedback when quickly opening folders
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Update display
      updateMediaDisplay();

      // Ensure back button is visible when in a folder
      backBtn.style.display = "block";
    } catch (error) {
      console.error("Error opening folder:", error);
      alert("An error occurred while opening the folder.");
      // Hide loading overlay in case of error
      showLoading(false);
    }
  };

  // Handle back button click
  const handleBackButton = async () => {
    // Show loading overlay
    showLoading(true);

    try {
      // Exit selection mode when navigating
      if (isSelectionMode) {
        cancelSelection();
      }

      let goingToRoot = false;
      if (folderHistory.length > 0) {
        // Go to previous folder
        currentFolderId = folderHistory.pop();
        if (currentFolderId) {
          const folder = folders.find((f) => f.id === currentFolderId);
          currentFolderPath.textContent = folder
            ? folder.name
            : "Unknown Folder";
        }
      } else {
        // Go to root
        currentFolderId = null;
        currentFolderPath.textContent = "All Media";
        goingToRoot = true;
      }

      // Reload media
      await loadMedia();

      // Make sure to call updateMediaDisplay explicitly
      // We set a short timeout to ensure the loading overlay is visible
      // This helps with the visual feedback when quickly navigating back
      if (goingToRoot) {
        // Artificial delay for root navigation to ensure loading is visible
        await new Promise((resolve) => setTimeout(resolve, 300));
      }

      // Update display
      updateMediaDisplay();

      // Update back button visibility
      backBtn.style.display = currentFolderId !== null ? "block" : "none";
    } catch (error) {
      console.error("Error navigating back:", error);
      alert("An error occurred while navigating back.");
      // Hide loading overlay in case of error
      showLoading(false);
    }
  };

  // Open folder creation modal
  const openFolderModal = () => {
    folderNameInput.value = "";
    folderModal.style.display = "block";

    // Focus the input field after a small delay
    setTimeout(() => {
      folderNameInput.focus();
    }, 100);
  };

  // Close folder creation modal
  const closeFolderModalHandler = () => {
    folderModal.style.display = "none";
  };

  // Open move to folder modal
  const openMoveModal = () => {
    if (selectedItems.length === 0) {
      alert("Please select items to move");
      return;
    }

    populateDestinationFolders();
    moveModal.style.display = "block";
  };

  // Close move to folder modal
  const closeMoveModalHandler = () => {
    moveModal.style.display = "none";
  };

  // Populate destination folders in move modal
  const populateDestinationFolders = () => {
    destinationFolders.innerHTML = "";

    // Add option to move to root (except when already at root)
    if (currentFolderId !== null) {
      const rootOption = document.createElement("div");
      rootOption.className = "destination-folder-item destination-root-folder";

      const rootIcon = document.createElement("span");
      rootIcon.className = "destination-folder-icon";
      rootIcon.textContent = "🏠";

      const rootName = document.createElement("span");
      rootName.className = "destination-folder-name";
      rootName.textContent = "Root (All Media)";

      rootOption.appendChild(rootIcon);
      rootOption.appendChild(rootName);

      rootOption.addEventListener("click", () => moveSelectedItems(null));

      destinationFolders.appendChild(rootOption);
    }

    // Add all folders except the current folder
    folders.forEach((folder) => {
      // Don't show current folder as a destination
      if (folder.id === currentFolderId) return;

      const folderItem = document.createElement("div");
      folderItem.className = "destination-folder-item";

      const folderIcon = document.createElement("span");
      folderIcon.className = "destination-folder-icon";
      folderIcon.textContent = "📁";

      const folderName = document.createElement("span");
      folderName.className = "destination-folder-name";
      folderName.textContent = folder.name;

      folderItem.appendChild(folderIcon);
      folderItem.appendChild(folderName);

      folderItem.addEventListener("click", () => moveSelectedItems(folder.id));

      destinationFolders.appendChild(folderItem);
    });

    // If no destinations available
    if (destinationFolders.childElementCount === 0) {
      const noFolders = document.createElement("div");
      noFolders.className = "no-folders-message";
      noFolders.textContent =
        "No destination folders available. Please create a folder first.";
      destinationFolders.appendChild(noFolders);
    }
  };

  // Move selected items to target folder
  const moveSelectedItems = async (targetFolderId) => {
    try {
      const mediaItemsToMove = selectedItems.filter(
        (item) => item.type === "media"
      );

      if (mediaItemsToMove.length === 0) {
        alert("No media files selected to move");
        return;
      }

      // Show loading overlay
      showLoading(true);

      // Update each item with new folder ID
      for (const item of mediaItemsToMove) {
        await window.api.updateMediaFolder(item.secureFilename, targetFolderId);
      }

      // Close modal
      closeMoveModalHandler();

      // Exit selection mode
      cancelSelection();

      // Reload media
      await loadMedia();
      // Make sure to call updateMediaDisplay explicitly since we removed it from loadMedia
      updateMediaDisplay();

      // Show success message
      const folderName = targetFolderId
        ? folders.find((f) => f.id === targetFolderId)?.name
        : "Root (All Media)";

      alert(
        `Successfully moved ${mediaItemsToMove.length} item(s) to ${folderName}`
      );
    } catch (error) {
      console.error("Error moving items:", error);
      alert("An error occurred while moving the items.");
    } finally {
      // Hide loading overlay
      showLoading(false);
    }
  };

  // Handle folder creation
  const handleCreateFolder = async () => {
    const folderName = folderNameInput.value.trim();

    if (!folderName) {
      alert("Please enter a folder name");
      folderNameInput.focus();
      return;
    }

    try {
      // Show loading overlay
      showLoading(true);

      const result = await window.api.createFolder(folderName);

      if (result.success) {
        // Close modal
        closeFolderModalHandler();

        // Reload folders and update display
        await loadFolders();
        updateMediaDisplay();
      } else {
        alert(`Failed to create folder: ${result.message}`);
      }
    } catch (error) {
      console.error("Error creating folder:", error);
      alert("An error occurred while creating the folder.");
    } finally {
      // Hide loading overlay
      showLoading(false);
    }
  };

  // Handle folder deletion
  const handleDeleteFolder = async (folderId, folderName) => {
    if (
      confirm(
        `Are you sure you want to delete the folder "${folderName}"?\nMedia files in this folder will not be deleted.`
      )
    ) {
      try {
        // Show loading overlay
        showLoading(true);

        const result = await window.api.deleteFolder(folderId);

        if (result.success) {
          // If current folder is deleted, go back to root
          if (currentFolderId === folderId) {
            currentFolderId = null;
            currentFolderPath.textContent = "All Media";
            folderHistory = []; // Clear history
          }

          // Reload both media and folders data, then update display once
          await Promise.all([loadMedia(), loadFolders()]);
          updateMediaDisplay();
        } else {
          alert(`Failed to delete folder: ${result.message}`);
        }
      } catch (error) {
        console.error("Error deleting folder:", error);
        alert("An error occurred while deleting the folder.");
      } finally {
        // Hide loading overlay
        showLoading(false);
      }
    }
  };

  // Toggle selection mode
  const toggleSelectionMode = () => {
    isSelectionMode = !isSelectionMode;

    if (isSelectionMode) {
      document.body.classList.add("selection-mode");
      selectModeBtn.textContent = "Cancel Selection";
      selectionActions.style.display = "flex";

      // Initially disable action buttons as no items are selected yet
      moveToFolderBtn.disabled = true;
      deleteSelectedBtn.disabled = true;
    } else {
      document.body.classList.remove("selection-mode");
      selectModeBtn.textContent = "Select Items";
      selectionActions.style.display = "none";
      selectedItems = [];
    }

    // Refresh the display
    updateMediaDisplay();
  };

  // Cancel selection mode
  const cancelSelection = () => {
    if (isSelectionMode) {
      isSelectionMode = false;
      document.body.classList.remove("selection-mode");
      selectModeBtn.textContent = "Select Items";
      selectionActions.style.display = "none";
      selectedItems = [];
      updateMediaDisplay();
    }
  };

  // Toggle selection of an item
  const toggleItemSelection = (element, item) => {
    if (!isSelectionMode) return;

    const isSelected = element.classList.contains("selected");

    if (isSelected) {
      // Remove selection
      element.classList.remove("selected");

      // Create a new array without this item
      selectedItems = selectedItems.filter((selectedItem) => {
        // For media items, check the secureFilename
        if (item.type === "media" && selectedItem.type === "media") {
          return selectedItem.secureFilename !== item.secureFilename;
        }
        // For folders, check the id
        if (item.type === "folder" && selectedItem.type === "folder") {
          return selectedItem.id !== item.id;
        }
        // Keep items of different types
        return true;
      });
    } else {
      // Add selection
      element.classList.add("selected");

      // Check if already in the array to avoid duplicates
      const alreadySelected = selectedItems.some(
        (selectedItem) =>
          (item.type === "media" &&
            selectedItem.type === "media" &&
            selectedItem.secureFilename === item.secureFilename) ||
          (item.type === "folder" &&
            selectedItem.type === "folder" &&
            selectedItem.id === item.id)
      );

      if (!alreadySelected) {
        if (item.type === "media") {
          selectedItems.push({
            type: "media",
            secureFilename: item.secureFilename,
            name: item.name,
          });
        } else if (item.type === "folder") {
          selectedItems.push({
            type: "folder",
            id: item.id,
            name: item.name,
          });
        }
      }
    }

    updateSelectionUI();
  };

  // Update selection UI
  const updateSelectionUI = () => {
    if (isSelectionMode) {
      selectedCount.textContent = `${selectedItems.length} item${
        selectedItems.length !== 1 ? "s" : ""
      } selected`;

      // Disable move and delete buttons when no items are selected
      const hasSelectedItems = selectedItems.length > 0;
      moveToFolderBtn.disabled = !hasSelectedItems;
      deleteSelectedBtn.disabled = !hasSelectedItems;
    }
  };

  // Add long press detection
  const addLongPressHandlers = (element, file) => {
    element.addEventListener("mousedown", (e) => {
      // Only handle left mouse button
      if (e.button !== 0) return;

      // Clear any existing timer
      if (longPressTimer) {
        clearTimeout(longPressTimer);
      }

      // Add visual feedback class after a short delay
      setTimeout(() => {
        if (longPressTimer) {
          element.classList.add("long-press");
        }
      }, 100);

      // Start long press timer
      longPressTimer = setTimeout(() => {
        // Remove visual feedback
        element.classList.remove("long-press");

        // Ignore long press if already in selection mode
        if (!isSelectionMode) {
          // Capture the item details for selection before toggling mode
          const itemToSelect = {
            type: "media",
            secureFilename: element.dataset.secureFilename,
            name: element.dataset.name,
            element: element,
          };

          // Enter selection mode
          toggleSelectionMode();

          // After display is updated, find the same element and select it
          // We need to do this because toggleSelectionMode causes DOM refresh
          if (itemToSelect.type === "media") {
            // Find the element in the refreshed DOM
            const updatedElement = document.querySelector(
              `.media-item[data-secure-filename="${itemToSelect.secureFilename}"]`
            );

            if (updatedElement) {
              // Create the complete item object for selection
              const itemToToggle = {
                type: "media",
                secureFilename: itemToSelect.secureFilename,
                name: itemToSelect.name,
              };

              // Add the item to selectedItems
              selectedItems.push(itemToToggle);

              // Mark as selected visually
              updatedElement.classList.add("selected");

              // Update UI counters and buttons
              updateSelectionUI();
            }
          }
        }
      }, longPressDuration);
    });

    // Cancel timer if mouse moves too much (consider it a drag)
    element.addEventListener("mousemove", (e) => {
      if (
        longPressTimer &&
        (Math.abs(e.movementX) > 5 || Math.abs(e.movementY) > 5)
      ) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
        element.classList.remove("long-press");
      }
    });

    // Cancel timer on mouse up
    element.addEventListener("mouseup", () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
        element.classList.remove("long-press");
      }
    });

    // Cancel timer if mouse leaves the element
    element.addEventListener("mouseleave", () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
        element.classList.remove("long-press");
      }
    });

    // Touch support for mobile
    element.addEventListener("touchstart", () => {
      // Clear any existing timer
      if (longPressTimer) {
        clearTimeout(longPressTimer);
      }

      // Add visual feedback class after a short delay
      setTimeout(() => {
        if (longPressTimer) {
          element.classList.add("long-press");
        }
      }, 100);

      // Start long press timer for touchstart
      longPressTimer = setTimeout(() => {
        // Remove visual feedback
        element.classList.remove("long-press");

        // Ignore long press if already in selection mode
        if (!isSelectionMode) {
          // Capture the item details for selection before toggling mode
          const itemToSelect = {
            type: "media",
            secureFilename: element.dataset.secureFilename,
            name: element.dataset.name,
            element: element,
          };

          // Enter selection mode
          toggleSelectionMode();

          // After display is updated, find the same element and select it
          // We need to do this because toggleSelectionMode causes DOM refresh
          if (itemToSelect.type === "media") {
            // Find the element in the refreshed DOM
            const updatedElement = document.querySelector(
              `.media-item[data-secure-filename="${itemToSelect.secureFilename}"]`
            );

            if (updatedElement) {
              // Create the complete item object for selection
              const itemToToggle = {
                type: "media",
                secureFilename: itemToSelect.secureFilename,
                name: itemToSelect.name,
              };

              // Add the item to selectedItems
              selectedItems.push(itemToToggle);

              // Mark as selected visually
              updatedElement.classList.add("selected");

              // Update UI counters and buttons
              updateSelectionUI();
            }
          }
        }
      }, longPressDuration);
    });

    // Cancel timer on touch end
    element.addEventListener("touchend", () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
        element.classList.remove("long-press");
      }
    });

    // Cancel timer on touch move
    element.addEventListener("touchmove", () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
        element.classList.remove("long-press");
      }
    });
  };

  // Add slideshow controls to the media modal
  const addSlideshowControls = () => {
    // Create slideshow button (play/pause icon)
    const slideshowBtn = document.createElement("button");
    slideshowBtn.className = "slideshow-btn";
    slideshowBtn.innerHTML = isSlideshow ? "⏸️" : "▶️";
    slideshowBtn.title = isSlideshow ? "Pause Slideshow" : "Start Slideshow";
    slideshowBtn.addEventListener("click", toggleSlideshow);

    // Add button to the modal
    mediaModal.querySelector(".modal-content").appendChild(slideshowBtn);

    // If slideshow was active, restart it
    if (isSlideshow) {
      startSlideshow();
    }
  };

  // Toggle slideshow
  const toggleSlideshow = (event) => {
    // Prevent event propagation to avoid closing modal
    if (event) {
      event.stopPropagation();
    }

    isSlideshow = !isSlideshow;

    // Update button icon and title
    const slideshowBtn = document.querySelector(".slideshow-btn");
    if (slideshowBtn) {
      slideshowBtn.innerHTML = isSlideshow ? "⏸️" : "▶️";
      slideshowBtn.title = isSlideshow ? "Pause Slideshow" : "Start Slideshow";
    }

    if (isSlideshow) {
      startSlideshow();
    } else {
      stopSlideshow();
    }
  };

  // Start slideshow
  const startSlideshow = () => {
    // Clear any existing timer
    stopSlideshow();

    // Only run slideshow if we have multiple image files
    if (
      filteredMediaFiles.filter((file) => file.type === "image").length <= 1
    ) {
      return;
    }

    // Set interval to change image
    slideshowTimer = setInterval(() => {
      // Find next image (not video)
      let nextFile = findNextImage();
      if (nextFile) {
        openMediaModal(nextFile);
      } else {
        // If no next image found, stop slideshow
        stopSlideshow();
      }
    }, slideshowInterval);
  };

  // Stop slideshow
  const stopSlideshow = () => {
    if (slideshowTimer) {
      clearInterval(slideshowTimer);
      slideshowTimer = null;
    }
  };

  // Find next image for slideshow
  const findNextImage = () => {
    if (!currentMediaFile || filteredMediaFiles.length <= 1) return null;

    // Find the index of the current file
    const currentIndex = filteredMediaFiles.findIndex(
      (file) => file.secureFilename === currentMediaFile.secureFilename
    );

    // Start from the next index and loop through all files
    for (let i = 1; i <= filteredMediaFiles.length; i++) {
      const nextIndex = (currentIndex + i) % filteredMediaFiles.length;
      const nextFile = filteredMediaFiles[nextIndex];

      // Only return if it's an image
      if (nextFile.type === "image") {
        return nextFile;
      }
    }

    return null;
  };

  // Handle modal click
  const handleModalClick = (event) => {
    // If clicking the modal background or image, stop slideshow
    if (event.target === mediaModal || event.target.tagName === "IMG") {
      if (isSlideshow) {
        toggleSlideshow();
      }
    }
  };

  // Open settings modal
  const openSettingsModal = (event) => {
    // Prevent event propagation to avoid closing media modal
    if (event) {
      event.stopPropagation();
    }

    // Create modal if it doesn't exist
    createSettingsModal();

    // Update interval input
    slideshowIntervalInput.value = slideshowInterval / 1000;

    // Get current vault path
    getCurrentVaultPath();

    // Show modal
    settingsModal.style.display = "block";
  };

  // Get current vault path
  const getCurrentVaultPath = async () => {
    try {
      const result = await window.api.getCurrentVaultPath();
      if (result.success) {
        currentVaultPathDisplay.textContent = result.path;
      } else {
        currentVaultPathDisplay.textContent = "Default location";
      }
    } catch (error) {
      console.error("Error getting vault path:", error);
      currentVaultPathDisplay.textContent = "Error loading path";
    }
  };

  // Handle changing vault path
  const handleChangeVaultPath = async () => {
    try {
      showLoading(true);
      const result = await window.api.changeVaultPath();
      showLoading(false);

      if (result.success) {
        currentVaultPathDisplay.textContent = result.path;

        // Create message about path change and moved files
        let message =
          "Vault path changed successfully. A 'Vault' folder has been created at the selected location.";

        // If files were moved, add that info
        if (result.filesMoved && result.filesMoved > 0) {
          message += ` ${result.filesMoved} encrypted files have been moved to the new location.`;
        } else {
          message += " New files will be saved there.";
        }

        alert(message);

        // Refresh the media display if available
        if (typeof loadMedia === "function") {
          loadMedia();
        }
      }
    } catch (error) {
      showLoading(false);
      console.error("Error changing vault path:", error);
      alert("Failed to change vault path. " + error.message);
    }
  };

  // Save settings
  const saveSettings = () => {
    // Get interval value
    const intervalSeconds = parseInt(slideshowIntervalInput.value, 10);

    // Validate
    if (isNaN(intervalSeconds) || intervalSeconds < 1 || intervalSeconds > 60) {
      alert("Please enter a valid interval between 1 and 60 seconds.");
      return;
    }

    // Update interval
    slideshowInterval = intervalSeconds * 1000;

    // Save to localStorage
    localStorage.setItem("slideshowInterval", slideshowInterval.toString());

    // Save shortcuts
    const customShortcuts = {};
    document.querySelectorAll(".shortcut-input").forEach(input => {
      const shortcutId = input.id.replace("shortcut-", "");
      const enableCheckbox = document.getElementById(`enable-${shortcutId}`);
      
      // Only save value if the shortcut is enabled
      if (enableCheckbox && enableCheckbox.checked) {
        customShortcuts[shortcutId] = input.value.trim();
      } else {
        customShortcuts[shortcutId] = ""; // Empty string means disabled
      }
    });
    
    localStorage.setItem("customShortcuts", JSON.stringify(customShortcuts));

    // Close modal
    settingsModal.style.display = "none";

    // Restart slideshow if active
    if (isSlideshow) {
      startSlideshow();
    }
    
    // Immediately update button labels with new shortcuts
    updateButtonLabels();
    
    // Recreate settings button to update its shortcut
    const oldSettingsBtn = document.getElementById("settings-btn");
    if (oldSettingsBtn) {
      oldSettingsBtn.remove();
      addSettingsButton();
    }
    
    // Alert user about successful save
    alert("Settings saved successfully. Shortcuts have been updated.");
  };

  // Handle deleting all encrypted data
  const handleDeleteAllEncryptedData = async () => {
    // Show a confirmation dialog
    const confirmDelete = confirm(
      "WARNING: This will permanently delete ALL your encrypted files. This action CANNOT be undone. Are you sure you want to continue?"
    );

    // If not confirmed, do nothing
    if (!confirmDelete) {
      return;
    }

    // Show loading indicator
    showLoading(true);

    try {
      // Call the API to delete all data
      const result = await window.api.deleteAllEncryptedData();
      
      // Hide loading indicator
      showLoading(false);

      if (result.success) {
        // Close settings modal
        settingsModal.style.display = "none";
        
        // Clear media arrays and update display
        mediaFiles = [];
        filteredMediaFiles = [];
        folders = [];
        mediaCache = {};
        
        // Update display
        updateMediaDisplay();
        
        // Show success message
        alert("All encrypted data has been successfully deleted.");
      } else {
        alert("Error deleting encrypted data: " + result.message);
      }
    } catch (error) {
      showLoading(false);
      console.error("Error deleting all encrypted data:", error);
      alert("An error occurred while deleting encrypted data.");
    }
  };

  // Add settings button to the main header
  const addSettingsButton = () => {
    // Only add if we don't already have a settings button
    if (!document.getElementById("settings-btn")) {
      const settingsBtn = document.createElement("button");
      settingsBtn.id = "settings-btn";
      settingsBtn.className = "btn secondary-btn";

      // Add settings icon
      const settingsIcon = document.createTextNode("⚙️");
      settingsBtn.appendChild(settingsIcon);

      // Get saved shortcuts from localStorage or use defaults
      const savedShortcuts = JSON.parse(localStorage.getItem("customShortcuts")) || {};
      const settingsShortcut = savedShortcuts.settings === "" ? null : (savedShortcuts.settings || "S");

      // Add shortcut hint if shortcut exists AND is enabled
      if (settingsShortcut) {
        const shortcutSpan = document.createElement("span");
        shortcutSpan.className = "shortcut-hint";
        shortcutSpan.textContent = settingsShortcut;
        settingsBtn.appendChild(document.createTextNode(" "));
        settingsBtn.appendChild(shortcutSpan);
      }

      settingsBtn.addEventListener("click", openSettingsModal);

      // Add it to the header actions
      const headerActions = document.querySelector(".header-actions");
      if (headerActions) {
        headerActions.appendChild(settingsBtn);
      }
    }
  };

  // Handle deletion of selected items
  const handleDeleteSelected = async () => {
    if (selectedItems.length === 0) {
      alert("Please select items to delete");
      return;
    }

    const deleteCount = selectedItems.length;
    const confirmMessage =
      deleteCount === 1
        ? `Are you sure you want to delete the selected item?`
        : `Are you sure you want to delete ${deleteCount} selected items?`;

    if (confirm(confirmMessage)) {
      try {
        // Show loading overlay
        showLoading(true);

        let successCount = 0;
        let failCount = 0;

        // Process deletion of all selected media items
        for (const item of selectedItems) {
          if (item.type === "media") {
            const result = await window.api.deleteMedia(item.secureFilename);
            if (result.success) {
              successCount++;
            } else {
              failCount++;
              console.error(`Failed to delete ${item.name}: ${result.message}`);
            }
          }
        }

        // Show results
        if (failCount > 0) {
          alert(
            `Deleted ${successCount} items. Failed to delete ${failCount} items.`
          );
        }

        // Exit selection mode
        cancelSelection();

        // Reload media and update display
        await loadMedia();
        updateMediaDisplay();
      } catch (error) {
        console.error("Error deleting selected items:", error);
        alert("An error occurred while deleting selected items.");
      } finally {
        // Hide loading overlay
        showLoading(false);
      }
    }
  };

  // Handle keyboard navigation in the gallery
  const handleGalleryKeyNavigation = (event) => {
    // Don't process keyboard events when a modal is open or in selection mode
    if (
      mediaModal.style.display === "block" ||
      folderModal.style.display === "block" ||
      moveModal.style.display === "block" ||
      (settingsModal && settingsModal.style.display === "block") ||
      isSelectionMode ||
      document.activeElement === searchInput
    )
      return;

    switch (event.key) {
      case "ArrowLeft":
        navigateGalleryLeft();
        break;
      case "ArrowRight":
        navigateGalleryRight();
        break;
      case "ArrowUp":
        navigateGalleryUp();
        break;
      case "ArrowDown":
        navigateGalleryDown();
        break;
      case "Enter":
        activateFocusedItem();
        break;
      case "Backspace":
        if (currentFolderId !== null) {
          handleBackButton();
        }
        break;
      case "Delete":
        deleteFocusedItem();
        break;
    }
  };

  // Handle application-wide keyboard shortcuts
  const handleAppShortcuts = (event) => {
    // Don't process keyboard events when input elements are focused
    if (
      document.activeElement.tagName === "INPUT" ||
      document.activeElement.tagName === "TEXTAREA" ||
      document.activeElement.isContentEditable
    )
      return;

    // Get saved shortcuts from localStorage or use defaults
    const savedShortcuts = JSON.parse(localStorage.getItem("customShortcuts")) || {};
    
    // Check each shortcut - empty string means the shortcut is disabled
    const importShortcut = savedShortcuts.import === "" ? null : (savedShortcuts.import || "F1");
    const createFolderShortcut = savedShortcuts.createFolder === "" ? null : (savedShortcuts.createFolder || "F2");
    const selectItemsShortcut = savedShortcuts.selectItems === "" ? null : (savedShortcuts.selectItems || "F3");
    const settingsShortcut = savedShortcuts.settings === "" ? null : (savedShortcuts.settings || "S");
    const logoutShortcut = savedShortcuts.logout === "" ? null : (savedShortcuts.logout || "Control");
    const filterAllShortcut = savedShortcuts.filterAll === "" ? null : (savedShortcuts.filterAll || "1");
    const filterImagesShortcut = savedShortcuts.filterImages === "" ? null : (savedShortcuts.filterImages || "2");
    const filterVideosShortcut = savedShortcuts.filterVideos === "" ? null : (savedShortcuts.filterVideos || "3");

    switch (event.key) {
      case importShortcut:
        // Import media shortcut
        event.preventDefault(); // Prevent browser's default F1 help
        if (importShortcut) handleImport();
        break;
      case createFolderShortcut:
        // Create folder shortcut
        event.preventDefault();
        if (createFolderShortcut) openFolderModal();
        break;
      case selectItemsShortcut:
        // Select items shortcut
        event.preventDefault();
        if (selectItemsShortcut) toggleSelectionMode();
        break;
      case settingsShortcut.toLowerCase():
      case settingsShortcut.toUpperCase():
        // Settings shortcut (only if not typing in a field)
        if (!event.ctrlKey && settingsShortcut) { // Avoid triggering with Ctrl+S (save)
          event.preventDefault();
          openSettingsModal();
        }
        break;
      case logoutShortcut:
        // Logout shortcut
        if (logoutShortcut && confirm("Are you sure you want to log out?")) {
          // Clear cache before logout
          mediaCache = {};
          window.api.logout();
        }
        break;
      case filterAllShortcut:
        // Filter: All
        if (filterAllShortcut) applyFilter("all");
        break;
      case filterImagesShortcut:
        // Filter: Images
        if (filterImagesShortcut) applyFilter("image");
        break;
      case filterVideosShortcut:
        // Filter: Videos
        if (filterVideosShortcut) applyFilter("video");
        break;
    }
  };

  // Update button labels to show keyboard shortcuts
  const updateButtonLabels = () => {
    // Get saved shortcuts from localStorage or use defaults
    const savedShortcuts = JSON.parse(localStorage.getItem("customShortcuts")) || {};
    
    const importShortcut = savedShortcuts.import === "" ? null : (savedShortcuts.import || "F1");
    const createFolderShortcut = savedShortcuts.createFolder === "" ? null : (savedShortcuts.createFolder || "F2");
    const selectItemsShortcut = savedShortcuts.selectItems === "" ? null : (savedShortcuts.selectItems || "F3");
    const settingsShortcut = savedShortcuts.settings === "" ? null : (savedShortcuts.settings || "S");
    const logoutShortcut = savedShortcuts.logout === "" ? null : (savedShortcuts.logout || "Control");
    const filterAllShortcut = savedShortcuts.filterAll === "" ? null : (savedShortcuts.filterAll || "1");
    const filterImagesShortcut = savedShortcuts.filterImages === "" ? null : (savedShortcuts.filterImages || "2");
    const filterVideosShortcut = savedShortcuts.filterVideos === "" ? null : (savedShortcuts.filterVideos || "3");

    if (importBtn) {
      // Clear any existing content
      importBtn.innerHTML = "";
      
      // Add the text
      importBtn.appendChild(document.createTextNode("Import Media"));
      
      // Add shortcut hint if available AND enabled
      if (importShortcut) {
        const shortcutSpan = document.createElement("span");
        shortcutSpan.className = "shortcut-hint";
        shortcutSpan.textContent = importShortcut;
        importBtn.appendChild(document.createTextNode(" "));
        importBtn.appendChild(shortcutSpan);
      }
    }

    if (createFolderBtn) {
      // Clear any existing content
      createFolderBtn.innerHTML = "";
      
      // Add the text
      createFolderBtn.appendChild(document.createTextNode("Create Folder"));
      
      // Add shortcut hint if available AND enabled
      if (createFolderShortcut) {
        const shortcutSpan = document.createElement("span");
        shortcutSpan.className = "shortcut-hint";
        shortcutSpan.textContent = createFolderShortcut;
        createFolderBtn.appendChild(document.createTextNode(" "));
        createFolderBtn.appendChild(shortcutSpan);
      }
    }

    if (selectModeBtn) {
      // Preserve the current text which may be "Cancel Selection" or "Select Items"
      const currentText = selectModeBtn.textContent.replace(/\s+[A-Z0-9]+$/, "").trim();
      
      // Clear any existing content
      selectModeBtn.innerHTML = "";
      
      // Add the current text back
      selectModeBtn.appendChild(document.createTextNode(currentText));
      
      // Add shortcut hint if available AND enabled
      if (selectItemsShortcut) {
        const shortcutSpan = document.createElement("span");
        shortcutSpan.className = "shortcut-hint";
        shortcutSpan.textContent = selectItemsShortcut;
        selectModeBtn.appendChild(document.createTextNode(" "));
        selectModeBtn.appendChild(shortcutSpan);
      }
    }

    if (logoutBtn) {
      // Clear any existing content
      logoutBtn.innerHTML = "";
      
      // Add the text
      logoutBtn.appendChild(document.createTextNode("Logout"));
      
      // Add shortcut hint if available AND enabled
      if (logoutShortcut) {
        const shortcutSpan = document.createElement("span");
        shortcutSpan.className = "shortcut-hint";
        shortcutSpan.textContent = logoutShortcut;
        logoutBtn.appendChild(document.createTextNode(" "));
        logoutBtn.appendChild(shortcutSpan);
      }
    }

    // Add shortcut hints to filter buttons
    if (viewAllBtn) {
      // Clear any existing content
      viewAllBtn.innerHTML = "";
      
      // Add the text
      viewAllBtn.appendChild(document.createTextNode("All"));
      
      // Add shortcut hint if available AND enabled
      if (filterAllShortcut) {
        const shortcutSpan = document.createElement("span");
        shortcutSpan.className = "shortcut-hint";
        shortcutSpan.textContent = filterAllShortcut;
        viewAllBtn.appendChild(document.createTextNode(" "));
        viewAllBtn.appendChild(shortcutSpan);
      }
    }

    if (viewImagesBtn) {
      // Clear any existing content
      viewImagesBtn.innerHTML = "";
      
      // Add the text
      viewImagesBtn.appendChild(document.createTextNode("Images"));
      
      // Add shortcut hint if available AND enabled
      if (filterImagesShortcut) {
        const shortcutSpan = document.createElement("span");
        shortcutSpan.className = "shortcut-hint";
        shortcutSpan.textContent = filterImagesShortcut;
        viewImagesBtn.appendChild(document.createTextNode(" "));
        viewImagesBtn.appendChild(shortcutSpan);
      }
    }

    if (viewVideosBtn) {
      // Clear any existing content
      viewVideosBtn.innerHTML = "";
      
      // Add the text
      viewVideosBtn.appendChild(document.createTextNode("Videos"));
      
      // Add shortcut hint if available AND enabled
      if (filterVideosShortcut) {
        const shortcutSpan = document.createElement("span");
        shortcutSpan.className = "shortcut-hint";
        shortcutSpan.textContent = filterVideosShortcut;
        viewVideosBtn.appendChild(document.createTextNode(" "));
        viewVideosBtn.appendChild(shortcutSpan);
      }
    }
  };

  // Delete the currently focused item
  const deleteFocusedItem = () => {
    if (focusedItemIndex < 0 || focusedItemIndex >= galleryItems.length) return;

    const focusedItem = galleryItems[focusedItemIndex];
    const itemType = focusedItem.dataset.itemType;

    if (itemType === "folder") {
      const folderId = focusedItem.dataset.folderId;
      const folder = folders.find((f) => f.id === folderId);
      if (folder) {
        handleDeleteFolder(folderId, folder.name);
      }
    } else if (itemType === "media") {
      // Find the matching file object
      const secureFilename = focusedItem.dataset.secureFilename;
      const file = filteredMediaFiles.find(
        (f) => f.secureFilename === secureFilename
      );
      if (file) {
        // Create temporary currentMediaFile for deletion
        currentMediaFile = file;
        handleDeleteMedia();
        currentMediaFile = null;
      }
    }
  };

  // Navigate gallery left with keyboard
  const navigateGalleryLeft = () => {
    if (galleryItems.length === 0) return;

    if (focusedItemIndex <= 0) {
      // Wrap around to the last item
      focusGalleryItem(galleryItems.length - 1);
    } else {
      focusGalleryItem(focusedItemIndex - 1);
    }
  };

  // Navigate gallery right with keyboard
  const navigateGalleryRight = () => {
    if (galleryItems.length === 0) return;

    if (focusedItemIndex >= galleryItems.length - 1) {
      // Wrap around to the first item
      focusGalleryItem(0);
    } else {
      focusGalleryItem(focusedItemIndex + 1);
    }
  };

  // Navigate gallery up with keyboard
  const navigateGalleryUp = () => {
    if (galleryItems.length === 0) return;

    // Calculate the number of items per row based on the container width and item width
    const containerWidth = mediaContainer.clientWidth;
    const itemWidth = galleryItems[0].offsetWidth + 20; // Add margin/gap
    const itemsPerRow = Math.floor(containerWidth / itemWidth);

    if (focusedItemIndex - itemsPerRow >= 0) {
      focusGalleryItem(focusedItemIndex - itemsPerRow);
    } else {
      // Go to the first item or maintain current position
      focusGalleryItem(focusedItemIndex % itemsPerRow);
    }
  };

  // Navigate gallery down with keyboard
  const navigateGalleryDown = () => {
    if (galleryItems.length === 0) return;

    // Calculate the number of items per row
    const containerWidth = mediaContainer.clientWidth;
    const itemWidth = galleryItems[0].offsetWidth + 20; // Add margin/gap
    const itemsPerRow = Math.floor(containerWidth / itemWidth);

    if (focusedItemIndex + itemsPerRow < galleryItems.length) {
      focusGalleryItem(focusedItemIndex + itemsPerRow);
    } else {
      // Go to the last row at same column position
      const lastRowItemCount = galleryItems.length % itemsPerRow;
      const column = focusedItemIndex % itemsPerRow;

      if (lastRowItemCount > 0 && column >= lastRowItemCount) {
        // If column is beyond the last item in the last row, go to the last item
        focusGalleryItem(galleryItems.length - 1);
      } else {
        // Otherwise go to the same column in the last row
        focusGalleryItem(
          galleryItems.length - lastRowItemCount + (column % lastRowItemCount)
        );
      }
    }
  };

  // Focus a gallery item by index
  const focusGalleryItem = (index) => {
    if (index < 0 || index >= galleryItems.length) return;

    // Remove focus from the currently focused item
    if (focusedItemIndex >= 0 && focusedItemIndex < galleryItems.length) {
      galleryItems[focusedItemIndex].classList.remove("keyboard-focused");
    }

    // Set focus on the new item
    focusedItemIndex = index;
    galleryItems[focusedItemIndex].classList.add("keyboard-focused");
    galleryItems[focusedItemIndex].scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  };

  // Activate the currently focused item (respond to Enter key)
  const activateFocusedItem = () => {
    if (focusedItemIndex < 0 || focusedItemIndex >= galleryItems.length) return;

    const focusedItem = galleryItems[focusedItemIndex];
    const itemType = focusedItem.dataset.itemType;

    if (itemType === "folder") {
      const folderId = focusedItem.dataset.folderId;
      openFolder(folderId);
    } else if (itemType === "media") {
      // Find the matching file object
      const secureFilename = focusedItem.dataset.secureFilename;
      const file = filteredMediaFiles.find(
        (f) => f.secureFilename === secureFilename
      );
      if (file) {
        openMediaModal(file);
      }
    }
  };

  // Setup initial focus for gallery
  const setupGalleryFocus = () => {
    // Focus the first item if there are any
    if (galleryItems.length > 0 && focusedItemIndex === -1) {
      focusGalleryItem(0);
    }
  };

  // Close settings modal
  const closeSettingsModalHandler = () => {
    if (settingsModal) {
      settingsModal.style.display = "none";
    }
  };

  // Handle keyboard events for modals (ESC to close)
  const handleModalKeyEvents = (event) => {
    if (event.key === "Escape") {
      // Close folder modal if open
      if (folderModal && folderModal.style.display === "block") {
        closeFolderModalHandler();
      }

      // Close settings modal if open
      if (settingsModal && settingsModal.style.display === "block") {
        settingsModal.style.display = "none";
      }

      // Close move modal if open
      if (moveModal && moveModal.style.display === "block") {
        closeMoveModalHandler();
      }
    }
  };

  // Start the application
  init();
});
