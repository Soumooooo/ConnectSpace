# ConnectSpace

A modern full-stack real-time video conferencing and collaboration platform.

## Features

- **Multi-User WebRTC Calling**: Ultra low-latency peer-to-peer audio and video mesh with STUN signaling over Socket.io.
- **Microphone & Camera Controls**: Live audio/video toggles, active speaker voice detection indicator, and video-off fallback avatars.
- **Native Screen Sharing**: Share applications, browser tabs, or full displays using `getDisplayMedia()`.
- **Collaborative Whiteboard**: Synchronized HTML5 Canvas with pen, highlighter, straight lines, rectangles, circles, eraser, undo, and PNG export.
- **Client-Side E2EE with Web Crypto API**: Client-side AES-GCM 256-bit encryption for sensitive in-meeting chat and notes using browser-native `crypto.subtle`.
- **Real-Time In-Meeting Chat**: Instant messaging with emoji reactions, delivery timestamps, and unread counters.
- **In-Meeting File Sharing**: Drag-and-drop file upload with live room notification and direct download.
- **Authentication & Persistence**: JWT-based authentication with bcrypt password hashing and zero-configuration SQLite database.
- **Responsive SaaS Interface**: Clean dark-mode workspace, pre-meeting device setup lobby, grid & spotlight layouts, and collapsible collaboration drawer.

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons, Web Crypto API
- **Backend**: Node.js, Express, Socket.io
- **Signaling & Collaboration**: Socket.io
- **Media Engine**: WebRTC (`RTCPeerConnection`, `getUserMedia`, `getDisplayMedia`)
- **Database**: SQLite (`sql.js`)
- **File Upload**: Multer

## Getting Started

### 1. Install dependencies
```bash
npm install
```

### 2. Configure Environment (Optional)
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

### 3. Run Development Server
```bash
npm run dev
```
The server will boot on `http://localhost:3000` with both Express API routes, Socket.io signaling, and Vite middleware.

### 4. Testing Multi-User Collaboration
1. Open `http://localhost:3000` in your main browser window.
2. Click **Start Instant Meeting** (or create a room with custom topic).
3. Copy the room invite link or note the room code (e.g., `cns-xxxx-yyyy`).
4. Open an **Incognito / Private Window** or second browser profile and navigate to the copied URL.
5. In the lobby, enter a participant name and click **Join Meeting Now**.
6. Both peers are now connected via WebRTC video/audio with real-time synchronized whiteboard, chat, and file sharing!
