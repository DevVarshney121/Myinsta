# Reelgram — Instagram-inspired Reels frontend

A responsive, mobile-first short-video feed made with plain **HTML, CSS and vanilla JavaScript**. No React, no backend, no database service, and no build step.

## Run locally
1. Extract the ZIP.
2. Open the folder in VS Code.
3. Install the Live Server extension if needed.
4. Right-click `index.html` → **Open with Live Server**.

## Deploy to Vercel
1. Push this folder to a GitHub repository.
2. In Vercel, choose **Add New → Project** and import the repository.
3. Framework Preset: **Other**.
4. Build Command: leave blank.
5. Output Directory: `.` (root).
6. Deploy.

This is a static frontend. No environment variables or backend functions are required.

## Features
- Instagram-inspired dark UI with a mobile-first Reels layout and bottom navigation
- Select multiple local videos in one upload
- Videos persist in the browser using IndexedDB
- Vertical feed, automatic play/pause for the mostly visible reel, likes, double-tap to like
- Search, sorting, mute/unmute, download, and delete
- Runs as a static site on Vercel

## Important
- Files selected in the browser are saved to **that browser/device only**. Vercel hosts the website files; it does not receive your videos.
- The same reels will not automatically appear on another phone, browser, or visitor's device. A shared, server-hosted library requires a backend or external storage.
- 1,000+ videos may use many gigabytes. Real capacity depends on video sizes, device space, and browser storage quota. Keep original backups.
- Clearing browser/site data may delete the local library.
- Video playback depends on browser-supported codecs; MP4/H.264 is a good compatibility choice.
- This is an Instagram-inspired independent project and does not use Instagram's proprietary source code, logos, or assets.
