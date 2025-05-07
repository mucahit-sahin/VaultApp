# Vault App

A secure desktop application to store and protect your photos and videos behind PIN protection.

## Features

- PIN-based security for your media files
- Import photos and videos to secure vault
- Browse, view, and manage your protected media
- Search and filter functionality
- Securely delete media files

## Development Setup

1. Install dependencies:

   ```
   npm install
   ```

2. Start the application in development mode:
   ```
   npm run dev
   ```

## Building the Application

To create a distributable version of the application:

```
npm run build
```

The built application will be available in the `dist` folder.

## Using the Application

1. When starting the app for the first time, you will need to set up a PIN (4-6 digits)
2. Use your PIN to access the vault in future sessions
3. From the main interface, click "Import Media" to add photos and videos
4. Use the filters to view only images or videos
5. Search for specific files using the search field
6. Click on any media to view it full-size
7. When viewing media, you can delete it if needed

## Security Notes

- Media files are stored in a protected location on your computer
- The PIN is securely hashed and never stored in plain text
- Always remember your PIN, as there is no recovery option
- When deleting media from the vault, they are permanently removed

## Requirements

- Windows 10 or later
- 100MB free disk space (plus space for your media)
