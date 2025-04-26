const Message = require("../models/Message");
const path = require('path');
const fs = require('fs');
let { connectedUsers, sendNotification, userSocketId } = require('./../helpers');
const mongoose = require("mongoose");
const User = require("../models/User");

module.exports = (io, socket,connectedUsers) => {
    socket.on('disconnect', function() {
        console.log(`❌ Disconnected: User ${socket.userId || 'Unknown'}, Socket ID: ${socket.id}`);

        // Remove the user from tracking if userId exists
        if (socket.userId && connectedUsers[socket.userId]) {
            delete connectedUsers[socket.userId];
            console.log(`🛑 Removed User ${socket.userId} from connected users.`);
        }

        // Log updated connected users
        console.log("🔍 Updated Connected Users List:", Object.keys(connectedUsers).length, "users online.");
    });


    socket.on('disconnect-user', function() {
        socket.disconnect();
        console.log('---------------------');
        console.log(connectedUsers(io.sockets));
        console.log(`user disconnected (${Object.keys(connectedUsers(io.sockets)).length} connected)`);
    });

    socket.on('connect-user', (user_id) => {
        if (!user_id) {
            console.warn("⚠️ connect-user event received without user_id!");
            return;
        }
    
        socket.username = user_id;
        socket.userId = user_id; // Store user ID in socket object
    
        console.log(`✅ User connected: ${user_id}, Socket ID: ${socket.id}`);
    
        // Store the socket ID for the user
        connectedUsers[user_id] = socket.id; // 🔥 Ensure correct mapping
    
        console.log("🔍 Connected Users List:", connectedUsers);
    });
    
    

    socket.on('send-message', async (msg, image, ind) => {
        try {
            console.log(`📢 WebSocket Event Received: send-message`, msg);
    
            msg.from = msg.from || msg._from;
            msg.to = msg.to || msg._to;
            msg.text = msg.text || msg._text;
    
            if (!msg || !msg.from || !msg.to || !msg.text) {  // Ensure text exists
                console.error("❌ Invalid message format! Missing 'from', 'to', or 'text'.", msg);
                return;
            }
    
            console.log(`📩 Received message from ${msg.from} to ${msg.to}`);
    
            const sender = await User.findById(msg.from);
            const receiver = await User.findById(msg.to);
            if (!sender || !receiver) {
                console.error(`❌ Sender or Receiver not found!`);
                return;
            }
    
            const messageData = {
                text: msg.text,  // Ensure text is always included
                from: new mongoose.Types.ObjectId(msg.from),
                to: new mongoose.Types.ObjectId(msg.to),
                image: null,
                state: 'sent',
                type: msg.type || 'friend',
                productId: msg.productId || null
            };
    
            if (image && typeof image === 'string' && image.startsWith('data:image')) {
                const photoName = `${msg.from}_${msg.to}_${new Date().getTime()}.png`;
                const photoPath = path.join(__dirname, `./../../public/chats/${photoName}`);
                const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
                fs.writeFileSync(photoPath, Buffer.from(base64Data, 'base64'));
                messageData.image = { path: `/chats/${photoName}`, type: 'png' };
            }
    
            const message = new Message(messageData);
            const savedMessage = await message.save().catch(err => console.error("❌ MongoDB Save Error:", err));
            console.log("✅ Message saved:", savedMessage);
    
            // Add the message to the sender's messages array
            await User.findByIdAndUpdate(msg.from, {
                $push: { messages: savedMessage._id }
            });
    
            // Add the message to the receiver's messages array
            await User.findByIdAndUpdate(msg.to, {
                $push: { messages: savedMessage._id }
            });
    
            console.log("✅ Message added to sender and receiver's messages arrays");
    
            const toSocketId = connectedUsers[msg.to];
            const fromSocketId = connectedUsers[msg.from];
    
            if (toSocketId) {
                io.to(toSocketId).emit('new-message', savedMessage);
                console.log(`✅ Sent to receiver: ${toSocketId}`);
            } else {
                console.warn(`⚠️ User ${msg.to} is not online. Message saved but not delivered.`);
            }
    
            if (fromSocketId) {
                io.to(fromSocketId).emit('message-sent', savedMessage, ind);
                console.log(`✅ Sent back confirmation to sender: ${fromSocketId}`);
            }
    
        } catch (err) {
            console.error('❌ Error in send-message event:', err);
        }
    });
    
    
}
