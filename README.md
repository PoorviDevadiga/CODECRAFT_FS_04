# CODECRAFT_FS_04 — SwiftTalk (Realtime Chat App)

**Brief description**  
SwiftTalk is a lightweight realtime chat application built as a full-stack project for learning and demonstration. It supports public chat, rooms, direct messages (DMs), file/media sharing (base64 stored), and an online user list.

## 🚀Features
- Realtime messaging using Socket.io.
- Support for chat rooms (join a named room).
- Direct/private messages (DMs) between users.
- Upload and display small files (images, video, downloads).
- Persistent messages and users stored in MongoDB.
- Simple authentication (register & login).
- Online users list with names and avatars (placeholder).

## Languages used
- **Frontend:** HTML, CSS, JavaScript  
- **Backend:** JavaScript (Node.js / Express), MongoDB

## Tech stack (quick)
- Node.js + Express (server)
- Socket.io (realtime)
- MongoDB (data persistence)
- HTML/CSS/JS for frontend

## 📂Project structure
CODECRAFT_FS_04/
├─ backend/
│ ├─ models/
│ │ ├─ User.js
│ │ └─ Message.js
│ ├─ routes/
│ │ └─ auth.js
│ ├─ server.js
│ ├─ package.json
│ └─ ...
├─ frontend/
│ ├─ index.html
│ ├─ style.css
│ └─ assets/
└─ README.md

## 🛠️ Setup Instructions
### Backend
1. Go inside backend folder 
   ```bash
   cd backend
   npm install
   node server.js
### MongoDB 
1. Database Name: `chatApp`
2. Collection Name: `users`
                    `messages`

