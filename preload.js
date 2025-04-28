const { contextBridge, ipcRenderer } = require("electron");

// Expose protected methods that allow the renderer process
// to use the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("api", {
  // PIN management
  setupPin: (pin) => ipcRenderer.invoke("setup-pin", pin),
  verifyPin: (pin) => ipcRenderer.invoke("verify-pin", pin),

  // Media management
  importMedia: (folderId) => ipcRenderer.invoke("import-media", folderId),
  getMedia: (folderId) => ipcRenderer.invoke("get-media", folderId),
  getFileData: (secureFilename) =>
    ipcRenderer.invoke("get-file-data", secureFilename),
  getFilesDataBatch: (secureFilenames) =>
    ipcRenderer.invoke("get-files-data-batch", secureFilenames),
  getVideoChunk: (secureFilename, startByte, endByte) =>
    ipcRenderer.invoke("get-video-chunk", {
      secureFilename,
      startByte,
      endByte,
    }),
  deleteMedia: (secureFilename) =>
    ipcRenderer.invoke("delete-media", secureFilename),
  updateMediaFolder: (secureFilename, folderId) =>
    ipcRenderer.invoke("update-media-folder", secureFilename, folderId),

  // Folder management
  createFolder: (folderName) => ipcRenderer.invoke("create-folder", folderName),
  getFolders: () => ipcRenderer.invoke("get-folders"),
  deleteFolder: (folderId) => ipcRenderer.invoke("delete-folder", folderId),
  getFolderThumbnail: (folderId) =>
    ipcRenderer.invoke("get-folder-thumbnail", folderId),

  // Settings management
  changeVaultPath: () => ipcRenderer.invoke("change-vault-path"),
  getCurrentVaultPath: () => ipcRenderer.invoke("get-current-vault-path"),

  // Authentication
  logout: () => ipcRenderer.invoke("logout"),
});
