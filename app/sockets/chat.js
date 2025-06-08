// app/sockets/chat.js
// ────────────────────────────────────────────────────────────────────
const Message = require('../models/Message');
const path     = require('path');
const fs       = require('fs');
const mongoose = require('mongoose');
const User     = require('../models/User');

/* helpers:
   ─ connectedUsers(socketServer) → returns a *function* that lists users
   ─ sendNotification(...)
   ─ userSocketId(id) → socketId
*/
const {
  connectedUsers: listOnline,      // ✨ keep helper-function under a new name
  sendNotification,
  userSocketId
} = require('./../helpers');

/**
 * Exported socket-handler
 * @param {import('socket.io').Server} io         – socket.io server
 * @param {import('socket.io').Socket} socket     – this client socket
 * @param {Object.<string,string>}     userMap    – userId → socketId map (shared)
 */
module.exports = (io, socket, userMap) => {

  /* ───────────── connection / disconnection ───────────── */

  socket.on('disconnect', () => {
    console.log(`❌ Disconnected: user ${socket.userId || 'Unknown'} – ${socket.id}`);

    if (socket.userId && userMap[socket.userId]) {
      delete userMap[socket.userId];
      console.log(`🗑️  Removed ${socket.userId} from userMap`);
    }
    console.log('🔍 Online users:', Object.keys(userMap).length);
  });

  socket.on('disconnect-user', () => {
    socket.disconnect(true);
    console.log('---------------------');
    console.log(listOnline(io.sockets));                                 // helper-function
    console.log(`user disconnected (${Object.keys(listOnline(io.sockets)).length} connected)`);
  });

  socket.on('connect-user', (user_id) => {
    if (!user_id) {
      console.warn('⚠️ connect-user without user_id');
      return;
    }

    socket.userId = user_id;
    userMap[user_id] = socket.id;                                        // record

    console.log(`✅ User ${user_id} connected: ${socket.id}`);
    console.log('🔍 userMap →', userMap);
  });

  /* ───────────── chat messages ───────────── */

  socket.on('send-message', async (msg, image, ind) => {
    try {
      console.log('📢 send-message:', msg);

      // normalise field names coming from mobile app
      msg = {
        from  : msg.from  || msg._from,
        to    : msg.to    || msg._to,
        text  : msg.text  || msg._text,
        type  : msg.type  || 'friend',
        productId : msg.productId || null
      };

      if (!msg.from || !msg.to || !msg.text) {
        console.error('❌ Invalid message format', msg);
        return;
      }

      /* ─── persist in DB ─── */
      const messageData = {
        text : msg.text,
        from : new mongoose.Types.ObjectId(msg.from),
        to   : new mongoose.Types.ObjectId(msg.to),
        image: null,
        state: 'sent',
        type : msg.type,
        productId: msg.productId
      };

      if (image && typeof image === 'string' && image.startsWith('data:image')) {
        const photoName = `${msg.from}_${msg.to}_${Date.now()}.png`;
        const photoPath = path.join(__dirname, '../../public/chats', photoName);
        fs.writeFileSync(photoPath, Buffer.from(image.split(',')[1], 'base64'));
        messageData.image = { path: `/chats/${photoName}`, type: 'png' };
      }

      const savedMessage = await new Message(messageData).save();
      await User.updateMany(
        { _id: { $in: [msg.from, msg.to] } },
        { $push: { messages: savedMessage._id } }
      );

      /* ─── deliver in real-time ─── */
      const toSocket   = userMap[msg.to];
      const fromSocket = userMap[msg.from];

      if (toSocket) {
        io.to(toSocket).emit('new-message',  savedMessage);
        console.log(`✅ delivered to receiver (${toSocket})`);
      } else {
        console.warn(`⚠️ receiver ${msg.to} offline – stored only`);
      }

      if (fromSocket) {
        io.to(fromSocket).emit('message-sent', savedMessage, ind);
      }

    } catch (err) {
      console.error('❌ send-message error:', err);
    }
  });

};
