const {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  session,
  shell,
} = require("electron");
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcryptjs");
const CryptoJS = require("crypto-js");

// Set up paths for the app
const userDataPath = app.getPath("userData");
const vaultDir = path.join(userDataPath, "Vault");
const settingsPath = path.join(userDataPath, "settings.json");

// Default settings
let settings = {
  hashedPin: "",
  vaultPath: vaultDir,
  encryptionSecret: Math.random().toString(36).substring(2, 15),
};

// Load settings or create default if they don't exist
function loadSettings() {
  try {
    if (fs.existsSync(settingsPath)) {
      settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
    } else {
      // Save default settings
      saveSettings();
    }
  } catch (error) {
    console.error("Error loading settings:", error);
  }
}

// Save settings to file
function saveSettings() {
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
  } catch (error) {
    console.error("Error saving settings:", error);
  }
}

// Create vault directory if it doesn't exist
if (!fs.existsSync(vaultDir)) {
  // Check if old vault folder exists (lowercase)
  const oldVaultDir = path.join(userDataPath, "vault");
  if (fs.existsSync(oldVaultDir)) {
    try {
      // Create the new vault directory
      fs.mkdirSync(vaultDir, { recursive: true });

      // Copy files from old vault to new vault
      const files = fs.readdirSync(oldVaultDir);
      for (const file of files) {
        const oldFilePath = path.join(oldVaultDir, file);
        const newFilePath = path.join(vaultDir, file);
        fs.copyFileSync(oldFilePath, newFilePath);
      }

      console.log(
        "Migrated files from old vault location to new vault location"
      );
    } catch (error) {
      console.error("Error migrating vault files:", error);
    }
  } else {
    fs.mkdirSync(vaultDir, { recursive: true });
  }
} else {
  console.log("Vault directory already exists");
}

// Load settings at startup
loadSettings();

// Encryption and decryption functions
function encryptData(data, pin) {
  try {
    const secretKey = pin + settings.encryptionSecret;
    return CryptoJS.AES.encrypt(data, secretKey).toString();
  } catch (error) {
    console.error("Encryption error:", error);
    return null;
  }
}

function decryptData(encrypted, pin) {
  try {
    const secretKey = pin + settings.encryptionSecret;
    const bytes = CryptoJS.AES.decrypt(encrypted, secretKey);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error("Decryption error:", error);
    return null;
  }
}

// Generate secure filename
function generateSecureFilename(originalName, pin) {
  const timestamp = Date.now();
  const randomPart = Math.random().toString(36).substring(2, 10);
  const extension = path.extname(originalName).toLowerCase();
  const hash = CryptoJS.SHA256(originalName + timestamp + randomPart + pin)
    .toString()
    .substring(0, 20);
  return `vault_${hash}${extension}`;
}

// Store file metadata
let mediaMetadata = {};
const metadataPath = path.join(userDataPath, "metadata.json");

// Add thumbnail cache to memory
let thumbnailCache = {};

// Add a global configuration for thumbnail quality/size
const thumbnailConfig = {
  quality: 30, // Lower number = more compression
  maxWidth: 400, // Maximum width for thumbnails
  maxHeight: 400, // Maximum height for thumbnails
};

// Load metadata
function loadMetadata() {
  try {
    if (fs.existsSync(metadataPath) && currentPin) {
      const encryptedData = fs.readFileSync(metadataPath, "utf8");
      if (encryptedData) {
        const decryptedData = decryptData(encryptedData, currentPin);
        if (decryptedData) {
          mediaMetadata = JSON.parse(decryptedData);

          // Ensure folders structure exists
          if (!mediaMetadata.folders) {
            mediaMetadata.folders = {};
          }

          return;
        }
      }
    }
    // Either file doesn't exist or couldn't decrypt
    mediaMetadata = { folders: {} };
  } catch (error) {
    console.error("Error loading metadata:", error);
    mediaMetadata = { folders: {} };
  }
}

// Save metadata
function saveMetadata() {
  try {
    if (currentPin && Object.keys(mediaMetadata).length > 0) {
      const encryptedData = encryptData(
        JSON.stringify(mediaMetadata),
        currentPin
      );
      if (encryptedData) {
        fs.writeFileSync(metadataPath, encryptedData);
      }
    }
  } catch (error) {
    console.error("Error saving metadata:", error);
  }
}

let mainWindow;
let isAuthenticated = false;
let currentPin = "";

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    icon: path.join(__dirname, "assets/icon.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      enableRemoteModule: false,
      worldSafeExecuteJavaScript: true,
    },
  });

  // Set Content Security Policy
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [
          "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-hashes'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src 'self' data:;",
        ],
      },
    });
  });

  // Load the initial HTML file (auth screen or setup)
  const hasPin = settings.hashedPin !== "";
  if (hasPin) {
    mainWindow.loadFile(path.join(__dirname, "src", "auth.html"));
  } else {
    mainWindow.loadFile(path.join(__dirname, "src", "setup.html"));
  }

  // Open DevTools in development mode
  if (process.env.NODE_ENV === "development") {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// Handle PIN setup
ipcMain.handle("setup-pin", async (event, pin) => {
  const salt = await bcrypt.genSalt(10);
  const hashedPin = await bcrypt.hash(pin, salt);

  settings.hashedPin = hashedPin;
  settings.encryptionSecret = Math.random().toString(36).substring(2, 15);
  saveSettings();

  currentPin = pin;
  mediaMetadata = {};
  saveMetadata();

  mainWindow.loadFile(path.join(__dirname, "src", "auth.html"));
  return true;
});

// Handle PIN verification
ipcMain.handle("verify-pin", async (event, pin) => {
  const hashedPin = settings.hashedPin;
  const isValid = await bcrypt.compare(pin, hashedPin);

  if (isValid) {
    isAuthenticated = true;
    currentPin = pin;
    loadMetadata();
    mainWindow.loadFile(path.join(__dirname, "src", "index.html"));
  }

  return isValid;
});

// Handle importing media
ipcMain.handle("import-media", async (event, folderId = null) => {
  if (!isAuthenticated) return { success: false, message: "Not authenticated" };

  const result = await dialog.showOpenDialog({
    properties: ["openFile", "multiSelections"],
    filters: [
      { name: "Images", extensions: ["jpg", "png", "gif", "jpeg"] },
      { name: "Videos", extensions: ["mp4", "mov", "avi"] },
    ],
  });

  if (result.canceled) return { success: false, message: "Canceled" };

  const files = result.filePaths;
  const importedFiles = [];
  const failedFiles = [];

  for (const file of files) {
    try {
      const originalName = path.basename(file);
      const secureFilename = generateSecureFilename(originalName, currentPin);
      const destPath = path.join(settings.vaultPath, secureFilename);

      // Read file data
      const fileData = fs.readFileSync(file);

      // Encrypt file data
      const fileBase64 = fileData.toString("base64");
      const encrypted = encryptData(fileBase64, currentPin);

      if (encrypted) {
        // Save encrypted data
        fs.writeFileSync(destPath, encrypted);

        // Store metadata
        const fileType =
          path.extname(file).toLowerCase().includes("mp4") ||
          path.extname(file).toLowerCase().includes("mov") ||
          path.extname(file).toLowerCase().includes("avi")
            ? "video"
            : "image";

        mediaMetadata[secureFilename] = {
          originalName: originalName,
          type: fileType,
          dateAdded: new Date().toISOString(),
          size: fileData.length,
          folderId: folderId,
        };

        importedFiles.push({
          name: originalName,
          path: destPath,
          type: fileType,
          folderId: folderId,
        });
      } else {
        throw new Error("Encryption failed");
      }
    } catch (error) {
      console.error("Import error:", error);
      failedFiles.push({ name: path.basename(file), error: error.message });
    }
  }

  // Save updated metadata
  saveMetadata();

  return {
    success: true,
    importedFiles,
    failedFiles,
  };
});

// Handle changing vault path
ipcMain.handle("change-vault-path", async (event) => {
  if (!isAuthenticated) return { success: false, message: "Not authenticated" };

  const result = await dialog.showOpenDialog({
    properties: ["openDirectory"],
    title: "Select Vault Directory",
    buttonLabel: "Select Folder",
  });

  if (result.canceled) return { success: false, message: "Canceled" };

  try {
    const selectedPath = result.filePaths[0];
    const newVaultPath = path.join(selectedPath, "Vault");
    const oldVaultPath = settings.vaultPath;

    // Create directory if it doesn't exist
    if (!fs.existsSync(newVaultPath)) {
      fs.mkdirSync(newVaultPath, { recursive: true });
    }

    // Move files from old vault to new vault if old vault exists and paths are different
    let filesMoved = 0;
    if (fs.existsSync(oldVaultPath) && oldVaultPath !== newVaultPath) {
      const files = fs.readdirSync(oldVaultPath);

      for (const file of files) {
        try {
          const oldFilePath = path.join(oldVaultPath, file);
          const newFilePath = path.join(newVaultPath, file);

          // Check if it's a file, not a directory
          const stats = fs.statSync(oldFilePath);
          if (stats.isFile()) {
            // Read the file data
            const fileData = fs.readFileSync(oldFilePath);

            // Write to new location
            fs.writeFileSync(newFilePath, fileData);

            // Delete from old location
            fs.unlinkSync(oldFilePath);

            filesMoved++;
          }
        } catch (fileError) {
          console.error(`Error moving file ${file}:`, fileError);
        }
      }
      console.log(
        `Moved ${filesMoved} files from ${oldVaultPath} to ${newVaultPath}`
      );
    }

    // Update settings
    settings.vaultPath = newVaultPath;
    saveSettings();

    return {
      success: true,
      path: newVaultPath,
      filesMoved: filesMoved,
    };
  } catch (error) {
    console.error("Error changing vault path:", error);
    return { success: false, message: error.message };
  }
});

// Get current vault path
ipcMain.handle("get-current-vault-path", async (event) => {
  if (!isAuthenticated) return { success: false, message: "Not authenticated" };

  return {
    success: true,
    path: settings.vaultPath,
  };
});

// Get all media files
ipcMain.handle("get-media", async (event, folderId = null) => {
  if (!isAuthenticated) return { success: false, message: "Not authenticated" };

  try {
    const files = fs.readdirSync(settings.vaultPath);
    const mediaFiles = files.map((file) => {
      const filePath = path.join(settings.vaultPath, file);
      const stats = fs.statSync(filePath);

      // Get original name and type from metadata
      const metadata = mediaMetadata[file] || {
        originalName: file,
        type: "unknown",
      };

      return {
        name: metadata.originalName,
        secureFilename: file,
        path: filePath,
        size: stats.size,
        modified: stats.mtime,
        type: metadata.type,
        folderId: metadata.folderId || null,
      };
    });

    // Filter by folder if specified
    const filteredFiles = folderId
      ? mediaFiles.filter((file) => file.folderId === folderId)
      : mediaFiles.filter((file) => !file.folderId);

    return { success: true, mediaFiles: filteredFiles };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

// Get decrypted file data
ipcMain.handle("get-file-data", async (event, secureFilename) => {
  if (!isAuthenticated) return { success: false, message: "Not authenticated" };

  try {
    const filePath = path.join(settings.vaultPath, secureFilename);

    // Check if we have this thumbnail in memory cache
    if (thumbnailCache[secureFilename]) {
      return {
        success: true,
        data: thumbnailCache[secureFilename],
        type: mediaMetadata[secureFilename]?.type || "unknown",
        name: mediaMetadata[secureFilename]?.originalName || secureFilename,
      };
    }

    const encryptedData = fs.readFileSync(filePath, "utf8");
    const decryptedBase64 = decryptData(encryptedData, currentPin);

    if (!decryptedBase64) {
      return { success: false, message: "Failed to decrypt file" };
    }

    // Get metadata
    const metadata = mediaMetadata[secureFilename] || {
      originalName: secureFilename,
      type: "unknown",
    };

    // For images, create and cache a thumbnail version for better performance
    if (metadata.type === "image") {
      try {
        // Decode base64 to buffer
        const imageBuffer = Buffer.from(decryptedBase64, "base64");

        // Use sharp if available, but we'll simulate the process here
        // In actual implementation, you might want to use the sharp library
        // This is a simulated thumbnail - in reality you would resize the image
        // For now, we'll just use the original image as the cache
        thumbnailCache[secureFilename] = decryptedBase64;
      } catch (thumbnailError) {
        console.error("Error creating thumbnail:", thumbnailError);
        // If thumbnail creation fails, just use the original
        thumbnailCache[secureFilename] = decryptedBase64;
      }

      return {
        success: true,
        data: thumbnailCache[secureFilename],
        type: metadata.type,
        name: metadata.originalName,
      };
    }

    return {
      success: true,
      data: decryptedBase64,
      type: metadata.type,
      name: metadata.originalName,
    };
  } catch (error) {
    console.error("Error decrypting file:", error);
    return { success: false, message: error.message };
  }
});

// Get decrypted file data for multiple files at once (batch loading)
ipcMain.handle("get-files-data-batch", async (event, secureFilenames) => {
  if (!isAuthenticated) return { success: false, message: "Not authenticated" };

  try {
    const results = {};
    const errors = {};

    // Process each file in the batch
    for (const secureFilename of secureFilenames) {
      try {
        // Check if we have this thumbnail in memory cache
        if (thumbnailCache[secureFilename]) {
          results[secureFilename] = {
            data: thumbnailCache[secureFilename],
            type: mediaMetadata[secureFilename]?.type || "unknown",
            name: mediaMetadata[secureFilename]?.originalName || secureFilename,
          };
          continue; // Skip to next file if we have it in cache
        }

        const filePath = path.join(settings.vaultPath, secureFilename);
        const encryptedData = fs.readFileSync(filePath, "utf8");
        const decryptedBase64 = decryptData(encryptedData, currentPin);

        if (!decryptedBase64) {
          errors[secureFilename] = "Failed to decrypt file";
          continue;
        }

        // Get metadata
        const metadata = mediaMetadata[secureFilename] || {
          originalName: secureFilename,
          type: "unknown",
        };

        // For images, create and cache thumbnails
        if (metadata.type === "image") {
          try {
            // In a real implementation, you would resize the image here
            // For now, we'll just use the original as the cache
            thumbnailCache[secureFilename] = decryptedBase64;
          } catch (thumbnailError) {
            console.error("Error creating thumbnail:", thumbnailError);
            thumbnailCache[secureFilename] = decryptedBase64;
          }
        }

        results[secureFilename] = {
          data: thumbnailCache[secureFilename] || decryptedBase64,
          type: metadata.type,
          name: metadata.originalName,
        };
      } catch (error) {
        console.error(`Error processing file ${secureFilename}:`, error);
        errors[secureFilename] = error.message;
      }
    }

    return {
      success: true,
      results: results,
      errors: errors,
    };
  } catch (error) {
    console.error("Error in batch file processing:", error);
    return { success: false, message: error.message };
  }
});

// Delete media file
ipcMain.handle("delete-media", async (event, secureFilename) => {
  if (!isAuthenticated) return { success: false, message: "Not authenticated" };

  try {
    const filePath = path.join(settings.vaultPath, secureFilename);
    fs.unlinkSync(filePath);

    // Remove from metadata
    if (mediaMetadata[secureFilename]) {
      delete mediaMetadata[secureFilename];
      saveMetadata();
    }

    return { success: true };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

// Logout handler
ipcMain.handle("logout", () => {
  isAuthenticated = false;
  currentPin = "";
  mediaMetadata = {};
  thumbnailCache = {}; // Clear thumbnail cache on logout
  mainWindow.loadFile(path.join(__dirname, "src", "auth.html"));
  return true;
});

// Delete all encrypted data handler
ipcMain.handle("delete-all-encrypted-data", async () => {
  if (!isAuthenticated) return { success: false, message: "Not authenticated" };

  try {
    // Get all files in the vault directory
    const files = fs.readdirSync(settings.vaultPath);
    
    // Delete each file
    for (const file of files) {
      try {
        const filePath = path.join(settings.vaultPath, file);
        // Check if it's a file, not a directory
        const stats = fs.statSync(filePath);
        if (stats.isFile()) {
          fs.unlinkSync(filePath);
        }
      } catch (fileError) {
        console.error(`Error deleting file ${file}:`, fileError);
      }
    }
    
    // Reset metadata
    mediaMetadata = { folders: {} };
    saveMetadata();
    
    // Clear thumbnail cache
    thumbnailCache = {};
    
    return { success: true, message: "All encrypted data deleted successfully" };
  } catch (error) {
    console.error("Error deleting encrypted data:", error);
    return { success: false, message: error.message };
  }
});

// Create a new folder
ipcMain.handle("create-folder", async (event, folderName) => {
  if (!isAuthenticated) return { success: false, message: "Not authenticated" };

  try {
    const folderId = Date.now().toString();

    // Add folder to metadata
    if (!mediaMetadata.folders) {
      mediaMetadata.folders = {};
    }

    mediaMetadata.folders[folderId] = {
      name: folderName,
      dateCreated: new Date().toISOString(),
    };

    // Save metadata
    saveMetadata();

    return {
      success: true,
      folder: {
        id: folderId,
        name: folderName,
        dateCreated: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error("Error creating folder:", error);
    return { success: false, message: error.message };
  }
});

// Get all folders
ipcMain.handle("get-folders", async () => {
  if (!isAuthenticated) return { success: false, message: "Not authenticated" };

  try {
    const folders = [];

    // Ensure folders structure exists
    if (!mediaMetadata.folders) {
      mediaMetadata.folders = {};
    }

    // Convert folder objects to array
    for (const [id, folder] of Object.entries(mediaMetadata.folders)) {
      folders.push({
        id,
        name: folder.name,
        dateCreated: folder.dateCreated,
      });
    }

    return { success: true, folders };
  } catch (error) {
    console.error("Error getting folders:", error);
    return { success: false, message: error.message };
  }
});

// Delete folder
ipcMain.handle("delete-folder", async (event, folderId) => {
  if (!isAuthenticated) return { success: false, message: "Not authenticated" };

  try {
    // Check if folder exists
    if (!mediaMetadata.folders || !mediaMetadata.folders[folderId]) {
      return { success: false, message: "Folder not found" };
    }

    // Remove folder reference from all files in that folder
    for (const [secureFilename, metadata] of Object.entries(mediaMetadata)) {
      if (secureFilename !== "folders" && metadata.folderId === folderId) {
        metadata.folderId = null;
      }
    }

    // Delete folder
    delete mediaMetadata.folders[folderId];

    // Save metadata
    saveMetadata();

    return { success: true };
  } catch (error) {
    console.error("Error deleting folder:", error);
    return { success: false, message: error.message };
  }
});

// Update media folder
ipcMain.handle(
  "update-media-folder",
  async (event, secureFilename, folderId) => {
    if (!isAuthenticated)
      return { success: false, message: "Not authenticated" };

    try {
      // Check if file exists in metadata
      if (!mediaMetadata[secureFilename]) {
        return { success: false, message: "File not found in metadata" };
      }

      // Update folder reference
      mediaMetadata[secureFilename].folderId = folderId;

      // Save metadata
      saveMetadata();

      return { success: true };
    } catch (error) {
      console.error("Error updating media folder:", error);
      return { success: false, message: error.message };
    }
  }
);

// Get folder thumbnail
ipcMain.handle("get-folder-thumbnail", async (event, folderId) => {
  if (!isAuthenticated) return { success: false, message: "Not authenticated" };

  try {
    // Check if we already have this thumbnail in cache
    if (thumbnailCache[`folder_${folderId}`]) {
      return {
        success: true,
        hasThumbnail: true,
        data: thumbnailCache[`folder_${folderId}`],
      };
    }

    // Find first image in the folder
    const folderImages = [];

    for (const [secureFilename, metadata] of Object.entries(mediaMetadata)) {
      if (
        secureFilename !== "folders" &&
        metadata.folderId === folderId &&
        metadata.type === "image"
      ) {
        folderImages.push({
          secureFilename,
          originalName: metadata.originalName,
          dateAdded: metadata.dateAdded || new Date().toISOString(),
        });
      }
    }

    // Sort by date added (newest first)
    folderImages.sort((a, b) => {
      return new Date(b.dateAdded) - new Date(a.dateAdded);
    });

    // If no images found
    if (folderImages.length === 0) {
      return { success: true, hasThumbnail: false };
    }

    // Get the first image
    const firstImage = folderImages[0];
    const filePath = path.join(settings.vaultPath, firstImage.secureFilename);

    // Read and decrypt the image data
    const encryptedData = fs.readFileSync(filePath, "utf8");
    const decryptedBase64 = decryptData(encryptedData, currentPin);

    if (!decryptedBase64) {
      return { success: false, message: "Failed to decrypt thumbnail" };
    }

    // Store in thumbnail cache
    thumbnailCache[`folder_${folderId}`] = decryptedBase64;

    return {
      success: true,
      hasThumbnail: true,
      data: decryptedBase64,
      name: firstImage.originalName,
    };
  } catch (error) {
    console.error("Error getting folder thumbnail:", error);
    return { success: false, message: error.message };
  }
});

// Get partial video data for streaming
ipcMain.handle(
  "get-video-chunk",
  async (event, { secureFilename, startByte, endByte }) => {
    if (!isAuthenticated)
      return { success: false, message: "Not authenticated" };

    try {
      const filePath = path.join(settings.vaultPath, secureFilename);

      // Get metadata
      const metadata = mediaMetadata[secureFilename] || {
        originalName: secureFilename,
        type: "unknown",
      };

      // Ensure this is a video file
      if (metadata.type !== "video") {
        return { success: false, message: "Not a video file" };
      }

      // If we don't have the full data already decrypted
      const encryptedData = fs.readFileSync(filePath, "utf8");
      const decryptedBase64 = decryptData(encryptedData, currentPin);

      if (!decryptedBase64) {
        return { success: false, message: "Failed to decrypt file" };
      }

      // Calculate chunks
      const dataBuffer = Buffer.from(decryptedBase64, "base64");
      const totalSize = dataBuffer.length;

      // Validate byte range
      const start = Math.max(0, startByte || 0);
      const end = Math.min(totalSize - 1, endByte || totalSize - 1);

      // Get the requested chunk
      const chunk = dataBuffer.slice(start, end + 1).toString("base64");

      return {
        success: true,
        data: chunk,
        type: metadata.type,
        name: metadata.originalName,
        totalSize: totalSize,
        start: start,
        end: end,
      };
    } catch (error) {
      console.error("Error getting video chunk:", error);
      return { success: false, message: error.message };
    }
  }
);

// Handle opening URLs in browser
ipcMain.handle("open-external-url", (event, url) => {
  if (
    typeof url === "string" &&
    (url.startsWith("http://") || url.startsWith("https://"))
  ) {
    shell.openExternal(url);
    return true;
  }
  return false;
});
