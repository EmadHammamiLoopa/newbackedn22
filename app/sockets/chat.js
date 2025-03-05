const Message = require("../models/Message");
const path = require('path');
const fs = require('fs');
let { connectedUsers, sendNotification, userSocketId } = require('./../helpers');
const mongoose = require("mongoose");
const User = require("../models/User");

module.exports = (io, socket) => {
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
    
        // Track the socket connection
        connectedUsers[user_id] = socket.id;
    
        console.log("🔍 Connected Users List:", connectedUsers);
    });
    

    socket.on('send-message', async (msg, image, ind) => {
        try {
            socket.username = msg.from;
            if (!msg.text && !image) return;
    
            let photo = undefined;
            if (image) {
                const photoName = `${msg.from}_${msg.to}_${new Date().getTime()}.png`;
                const photoPath = path.join(__dirname, `./../../public/chats/${photoName}`);
                fs.writeFileSync(photoPath, image);
                photo = {
                    path: `/chats/${photoName}`,
                    type: 'png'
                };
            }
    
            const message = new Message({
                text: msg.text,
                from: new mongoose.Types.ObjectId(msg.from),
                to: new mongoose.Types.ObjectId(msg.to),
                image: photo,
                state: 'sent',
                type: msg.type,
                productId: msg.type === 'product' ? msg.productId : null
            });
    
            console.log('Saving message:', message);
    
            try {
                const savedMessage = await message.save();
    
                const fromSocketId = userSocketId(io.sockets, msg.from);
                const toSocketId = connectedUsers[msg.to]; // Use stored socket ID
                console.log(`🎯 Trying to send message to User: ${msg.to}, Socket ID: ${toSocketId}`);

                if (!toSocketId) {
                    console.warn(`⚠️ User ${msg.to} is NOT connected. Message will be stored but NOT delivered in real time.`);
                } else {
                    io.to(toSocketId).emit('new-message', msg);
                    console.log(`✅ Message sent to receiver: ${toSocketId}`);
}
    
                if (savedMessage.image && savedMessage.image.path) {
                    savedMessage.image.path = process.env.BASEURL + savedMessage.image.path;
                }
    
                if (fromSocketId) {
                    io.to(fromSocketId).emit('message-sent', savedMessage, ind);
                    console.log(`Message sent to sender: ${fromSocketId}`);
                }
    
                if (toSocketId) {
                    io.to(toSocketId).emit('new-message', savedMessage);
                    console.log(`Message sent to receiver: ${toSocketId}`);
                }
    
                await User.findOneAndUpdate({ _id: msg.from }, { $push: { messagedUsers: msg.to, messages: savedMessage._id } });
                await User.findOneAndUpdate({ _id: msg.to }, { $push: { messagedUsers: msg.from, messages: savedMessage._id } });
    
                const user = await User.findOne({ _id: msg.from });
                sendNotification({ en: user.firstName + ' ' + user.lastName }, { en: msg.text }, {
                    type: 'message',
                    link: '/messages/chat/' + msg.from
                }, [], [msg.to]);
    
            } catch (saveError) {
                console.error('Error saving message:', saveError);
                if (userSocketId(io.sockets, msg.from)) {
                    io.to(userSocketId(io.sockets, msg.from)).emit('message-not-sent', ind);
                }
            }
    
        } catch (err) {
            console.error('Error in send-message event:', err);
        }
    });
}
