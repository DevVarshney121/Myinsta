# Reelgram — Video-only Reels frontend

Built with plain HTML, CSS and JavaScript. No React, no backend and no external database.

## Run locally
1. Extract the ZIP.
2. Open the folder in VS Code.
3. Open `index.html` with Live Server.

## Deploy on Vercel
1. Push the project folder to GitHub.
2. Import the repository into Vercel.
3. Select Framework Preset: Other.
4. Leave Build Command blank and set Output Directory to `.`.
5. Deploy.

## Included
- Mobile-first Instagram-inspired reels UI
- No search, follow, or like controls in the feed
- Multi-video upload from desktop or phone
- Videos stored as original file blobs in IndexedDB; the app does not transcode or intentionally compress uploads
- Shuffled feed order on each page load and after adding/removing videos
- One-at-a-time vertical scroll snapping on mobile
- Auto-play for the most visible reel, pauses other reels
- Mute/unmute, caption display, download and remove
- Profile page with total post/reel counts and storage size
- Responsive desktop sidebar and mobile bottom navigation

## Important storage facts
This is a static frontend. Video files stay in the browser/device that uploaded them; they are not uploaded to Vercel and do not sync to other devices. IndexedDB storage limits vary by browser/device. 1,000+ videos may require many GB, and no frontend-only project can guarantee that storage will be available. Clearing site data can erase this library; keep original video backups.
