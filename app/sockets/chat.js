const Message = require("../models/Message");
const path = require("path");
const fs = require("fs").promises;  // Use async file operations
let { connectedUsers, sendNotification, userSocketId } = require("./../helpers");
const mongoose = require("mongoose");
const User = require("../models/User");

let activeUsers = new Map(); // Global active users

module.exports = (io, socket) => {
    socket.on("connect-user", async (user_id) => {
        socket.username = user_id;
        activeUsers.set(user_id, socket.id);
        console.log(`User ${user_id} connected. Online users: ${activeUsers.size}`);

        try {
            const unseenMessages = await Message.find({ to: user_id, seen: false });
            if (unseenMessages.length > 0) {
                io.to(socket.id).emit("missedMessages", unseenMessages);
                await Message.updateMany({ to: user_id, seen: true });
            }
        } catch (err) {
            console.error("Error fetching missed messages:", err);
        }
    });

    socket.on("disconnect", async () => {
        if (!socket.username) return;

        activeUsers.delete(socket.username);
        console.log(`User ${socket.username} went offline`);

        try {
            const user = await User.findById(socket.username);
            if (user) {
                user.setOffline();
                user.lastSeen = new Date();
                await user.save();
            }
        } catch (err) {
            console.error("Error setting user offline:", err);
        }
    });

    socket.on("getMissedMessages", async ({ userId }) => {
        try {
            const missedMessages = await Message.find({ to: userId, seen: false }).sort({ createdAt: -1 }).limit(50);
            if (missedMessages.length > 0) {
                socket.emit("missedMessages", missedMessages);
                await Message.updateMany({ to: userId, seen: true });
            }
        } catch (err) {
            console.error("Error fetching missed messages:", err);
        }
    });

    socket.on("send-message", async (msg, image, ind) => {
        try {
            if (!msg.text && !image) return;

            let photo = undefined;
            if (image) {
                const photoName = `${msg.from}_${msg.to}_${Date.now()}.png`;
                const photoPath = path.join(__dirname, `./../../public/chats/${photoName}`);
                await fs.writeFile(photoPath, image);  // Use async version
                photo = { path: `/chats/${photoName}`, type: "png" };
            }

            const messageData = new Message({
                text: msg.text,
                from: new mongoose.Types.ObjectId(msg.from),
                to: new mongoose.Types.ObjectId(msg.to),
                image: photo,
                state: "sent",
                type: msg.type,
                productId: msg.type === "product" ? msg.productId : null,
                seen: false
            });

            await messageData.save();

            const toSocketId = userSocketId(io.sockets, msg.to);
            if (toSocketId) {
                io.to(toSocketId).emit("new-message", messageData);
            } else {
                console.log(`User ${msg.to} is offline. Message saved.`);
            }

            const fromSocketId = userSocketId(io.sockets, msg.from);
            if (fromSocketId) {
                io.to(fromSocketId).emit("message-sent", messageData, ind);
            }

            await Promise.all([
                User.findByIdAndUpdate(msg.from, { $push: { messagedUsers: msg.to, messages: messageData._id } }),
                User.findByIdAndUpdate(msg.to, { $push: { messagedUsers: msg.from, messages: messageData._id } })
            ]);

        } catch (err) {
            console.error("Error sending message:", err);
            const fromSocketId = userSocketId(io.sockets, msg.from);
            if (fromSocketId) {
                io.to(fromSocketId).emit("message-not-sent", { ind, error: err.message });
            }
        }
    });
};
