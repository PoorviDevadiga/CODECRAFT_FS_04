// backend/server.js
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const User = require('./models/User');
const { Server } = require('socket.io');
const io = new Server(http, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  // allow larger packet sizes (100 MB here) — adjust as needed
  maxHttpBufferSize: 100 * 1024 * 1024
});

const mongoose = require('mongoose');
const path = require('path');
const cors = require("cors");
const bodyParser = require('body-parser');

const Message = require('./models/Message');


// Middleware
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../frontend')));

// Connect to MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/chatApp')
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.log(err));

// Auth routes
const authRoutes = require('./routes/auth');
app.use('/auth', authRoutes);

// Serve frontend index if user opens backend root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// In-memory online users: socket.id => { email, name, room }
let onlineUsers = {};

// Helper to broadcast user list as array { email, name, room }
function broadcastOnlineUsers() {
  const list = Object.values(onlineUsers).map(u => ({ email: u.email, name: u.name, room: u.room || null }));
  io.emit('onlineUsers', list);
}

io.on('connection', (socket) => {
  console.log('socket connected', socket.id);

  // When logged-in client connects and announces itself
  socket.on('joinChat', async (user) => {
  if (!user || !user.email) return;

  // fetch full user from DB
  const dbUser = await User.findOne({ email: user.email });
  const finalName = dbUser ? dbUser.username : user.name || user.email;

  onlineUsers[socket.id] = { email: user.email, name: finalName, room: null };

  // send public chat history
  const publicMessages = await Message.find({ room: null, isPrivate: false }).sort({ time: 1 }).limit(200);
  socket.emit('chatHistory', publicMessages);

  broadcastOnlineUsers();
});


  // Join a room
  socket.on('joinRoom', async (payload) => {
    // payload: { room: string, user: email, userName?: string }
    const room = payload?.room;
    if (!room) return;

    socket.join(room);

    if (onlineUsers[socket.id]) onlineUsers[socket.id].room = room;

    // Send room-specific history (only messages with this room)
    const roomMessages = await Message.find({ room: room }).sort({ time: 1 }).limit(500);
    socket.emit('roomHistory', roomMessages);

    // Optionally inform room members who joined
    io.to(room).emit('systemMessage', { text: `${payload.userName || payload.user} joined ${room}`, time: new Date() });

    broadcastOnlineUsers();
  });

  // Chat message (public or room)
  socket.on('chatMessage', async (data) => {
  const dbUser = await User.findOne({ email: data.user });
  const finalName = dbUser ? dbUser.username : data.userName || data.user;

  const userEntry = onlineUsers[socket.id] || {};
  const room = userEntry.room || data.room || null;

  const newMsg = new Message({
    user: data.user,
    userName: finalName,
    msg: data.msg,
    room,
    isPrivate: false,
    time: new Date()
  });
  await newMsg.save();
  console.log("💾 Chat message saved:", newMsg);


  if (room) {
    io.to(room).emit('chatMessage', newMsg);
  } else {
    io.emit('chatMessage', newMsg);
  }
});


  // inside io.on('connection', socket => { ... })
// inside io.on('connection', socket) in server.js
socket.on('fileMessage', async (data, cb) => {
  try {
    const fileObj = data?.file;
    if (!fileObj || typeof fileObj !== 'object' || !fileObj.data) {
      const errMsg = 'Invalid file payload';
      if (typeof cb === 'function') cb({ ok: false, error: errMsg });
      return;
    }

    // Ensure data looks like data:<mime>;base64,...
    const base64Full = fileObj.data;
    const commaIdx = base64Full.indexOf(',');
    if (commaIdx === -1) {
      if (typeof cb === 'function') cb({ ok: false, error: 'Malformed data URI' });
      return;
    }
    const b64 = base64Full.slice(commaIdx + 1);
    const padding = b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0;
    const approxBytes = Math.ceil(b64.length * 3 / 4 - padding);

    const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
    if (approxBytes > MAX_BYTES) {
      const msg = `File too large (${Math.round(approxBytes/1024)} KB). Max allowed ${Math.round(MAX_BYTES/1024)} KB.`;
      if (typeof cb === 'function') cb({ ok: false, error: msg });
      return;
    }

    // find username for nicer display (optional)
    const dbUser = await User.findOne({ email: data.user });
    const finalName = dbUser ? dbUser.username : data.userName || data.user;

    const newMsg = new Message({
      user: data.user,
      userName: finalName,
      msg: `[File] ${fileObj.name || ''}`,
      file: { name: fileObj.name || '', type: fileObj.type || '', data: base64Full },
      room: data.room || null,
      isPrivate: false,
      time: new Date()
    });

    await newMsg.save();
    console.log('💾 File message saved:', newMsg._id);

    if (data.room) io.to(data.room).emit('fileMessage', newMsg);
    else io.emit('fileMessage', newMsg);

    if (typeof cb === 'function') cb({ ok: true, id: newMsg._id });
  } catch (err) {
    console.error('❌ File upload error:', err);
    if (typeof cb === 'function') cb({ ok: false, error: err.message });
  }
});

  // Private message (DM) with persistence
  socket.on('privateMessage', async (data) => {
  const { to, from, msg } = data;
  if (!to || !from) return;

  const dbUser = await User.findOne({ email: from });
  const fromName = dbUser ? dbUser.username : data.fromName || from;

  const targetSocketId = Object.keys(onlineUsers).find(k => onlineUsers[k].email === to);
  const toName = targetSocketId ? onlineUsers[targetSocketId].name : data.toName || to;

  const newDM = new Message({
    user: from,
    userName: fromName,
    msg,
    to,
    toName,
    isPrivate: true,
    room: null,
    time: new Date()
  });
  await newDM.save();
  console.log("💾 Private message saved:", newDM);


  const payload = {
    user: newDM.user,
    userName: newDM.userName,
    msg: newDM.msg,
    to: newDM.to,
    toName: newDM.toName,
    isPrivate: newDM.isPrivate,
    time: newDM.time,
    _id: newDM._id
  };

  if (targetSocketId) io.to(targetSocketId).emit('privateMessage', payload);
  socket.emit('privateMessage', payload);
});

  // Typing indicator: respect room if set
  socket.on('typing', (username) => {
    const entry = onlineUsers[socket.id];
    if (entry && entry.room) socket.to(entry.room).emit('typing', username);
    else socket.broadcast.emit('typing', username);
  });
  socket.on('stopTyping', (username) => {
    const entry = onlineUsers[socket.id];
    if (entry && entry.room) socket.to(entry.room).emit('stopTyping', username);
    else socket.broadcast.emit('stopTyping', username);
  });

  // On disconnect
  socket.on('disconnect', () => {
    delete onlineUsers[socket.id];
    broadcastOnlineUsers();
    console.log('socket disconnected', socket.id);
  });
});

// Start server
const PORT = 4000;
http.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
