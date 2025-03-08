const User = require("../models/User");
const Message = require("../models/Message");
const path = require('path');
const fs = require('fs');
let { connectedUsers, userSocketId, sendNotification } = require('./../helpers');
const mongoose = require("mongoose");

module.exports = (io, socket) => {
    // Event for canceling a video call
    socket.on('cancel-video', (userId) => {
        try {
            console.log('cancel calling socket');
            const toSocketId = userSocketId(io.sockets, userId);

            if (toSocketId) {
                io.to(toSocketId).emit('video-canceled');
            } else {
                console.log(`User with ID ${userId} is not connected`);
            }
        } catch (err) {
            console.error(`Error during video call cancelation for user ${userId}:`, err);
        }
    });

    socket.on('video-call-request', async (data) => {
        try {
          console.log('📢 WebSocket Event Received: video-call-request', data);
    
          const { from, to, text } = data;
    
          // Validate the request
          if (!from || !to || !text) {
            console.error("❌ Invalid video call request format! Missing 'from', 'to', or 'text'.", data);
            return;
          }
    
          // Fetch sender and receiver details
          const sender = await User.findById(from);
          const receiver = await User.findById(to);
    
          if (!sender || !receiver) {
            console.error(`❌ Sender or Receiver not found!`);
            return;
          }
    
          // Save the video call request as a message
          const messageData = {
            text: text,
            from: new mongoose.Types.ObjectId(from),
            to: new mongoose.Types.ObjectId(to),
            state: 'sent',
            type: 'video-call-request', // Custom type for video call request
          };
    
          const message = new Message(messageData);
          const savedMessage = await message.save().catch(err => console.error("❌ MongoDB Save Error:", err));
          console.log("✅ Video call request saved:", savedMessage);
    
          // Add the message to the sender's and receiver's messages arrays
          await User.findByIdAndUpdate(from, {
            $push: { messages: savedMessage._id }
          });
    
          await User.findByIdAndUpdate(to, {
            $push: { messages: savedMessage._id }
          });
    
          console.log("✅ Video call request added to sender and receiver's messages arrays");
    
          // Notify the receiver
          const toSocketId = connectedUsers[to];
          if (toSocketId) {
            io.to(toSocketId).emit('new-message', savedMessage);
            console.log(`✅ Video call request sent to receiver: ${toSocketId}`);
          } else {
            console.warn(`⚠️ User ${to} is not online. Video call request saved but not delivered.`);
          }
    
          // Notify the sender
          const fromSocketId = connectedUsers[from];
          if (fromSocketId) {
            io.to(fromSocketId).emit('message-sent', savedMessage);
            console.log(`✅ Video call request confirmation sent to sender: ${fromSocketId}`);
          }
    
        } catch (err) {
          console.error('❌ Error in video-call-request event:', err);
        }
      });

      
      socket.on('video-call-started', (data) => {
        try {
            console.log("📞 Video call started:", data);
    
            const { from, to } = data;
            const toSocketId = userSocketId(io.sockets, to);
            if (toSocketId) {
                io.to(toSocketId).emit('video-call-started', { from, to });
                console.log(`✅ Video call started notification sent to ${toSocketId}`);
            }
        } catch (err) {
            console.error("❌ Error in video-call-started:", err);
        }
    });

    
    socket.on('video-call-ended', (data) => {
        try {
            console.log("📴 Video call ended:", data);
    
            const { from, to } = data;
            const toSocketId = userSocketId(io.sockets, to);
            if (toSocketId) {
                io.to(toSocketId).emit('video-call-ended', { from, to });
                console.log(`✅ Video call ended notification sent to ${toSocketId}`);
            }
        } catch (err) {
            console.error("❌ Error in video-call-ended:", err);
        }
    });
    
    socket.on('video-call-failed', (data) => {
        try {
            console.log("❌ Video call failed:", data);
    
            const { from, to, error } = data;
            const toSocketId = userSocketId(io.sockets, to);
            if (toSocketId) {
                io.to(toSocketId).emit('video-call-failed', { from, to, error });
                console.log(`⚠️ Video call failed notification sent to ${toSocketId}`);
            }
        } catch (err) {
            console.error("❌ Error in video-call-failed:", err);
        }
    });
    
    // Event for initiating a video call
    socket.on('calling', (userId, username, callerId) => {
        try {
            console.log('calling socket');
            sendNotification({ en: username }, { en: ' is calling you' }, {
                type: 'call',
                link: '/messages/video/' + callerId + '?answer=true'
            }, [], [userId], true);

            const toSocketId = userSocketId(io.sockets, userId);

            if (toSocketId) {
                io.to(toSocketId).emit('called');
            } else {
                console.log(`User with ID ${userId} is not connected`);
            }
        } catch (err) {
            console.error(`Error during calling process for user ${userId}:`, err);
        }
    });
};
