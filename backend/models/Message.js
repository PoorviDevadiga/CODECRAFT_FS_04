// backend/models/Message.js
const mongoose = require('mongoose');

const FileSubSchema = new mongoose.Schema({
  name: { type: String, default: '' },
  type: { type: String, default: '' },   // mime type
  data: { type: String, default: '' }    // data URI (data:<mime>;base64,<...>)
}, { _id: false });

const MessageSchema = new mongoose.Schema({
  user: { type: String, required: true },
  userName: { type: String, default: '' },
  msg: { type: String, default: '' },
  room: { type: String, default: null },
  to: { type: String, default: null },
  toName: { type: String, default: null },
  isPrivate: { type: Boolean, default: false },
  file: { type: FileSubSchema, default: null },
  time: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Message', MessageSchema);
