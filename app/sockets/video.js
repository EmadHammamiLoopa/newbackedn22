const User = require("../models/User");
const Message = require("../models/Message");
const path = require('path');
const fs = require('fs');
let { connectedUsers, userSocketId, sendNotification } = require('./../helpers');
const mongoose = require("mongoose");

// Track ongoing video calls to prevent duplicates
let activeVideoCalls = {}; 

module.exports = (io, socket) => {
    /**
     * Cancel an ongoing video call
     */
    socket.on('cancel-video', (userId) => {
        try {
            console.log(`🚫 Canceling video call for user: ${userId}`);
            const toSocketId = userSocketId(io.sockets, userId);

            if (toSocketId) {
                io.to(toSocketId).emit('video-canceled');
                delete activeVideoCalls[userId];  // Remove from active calls
                delete activeVideoCalls[socket.userId]; 
            } else {
                console.log(`User ${userId} is not connected.`);
            }
        } catch (err) {
            console.error(`❌ Error during video call cancellation:`, err);
        }
    });

    /**
     * Handle video call request - Check if an active call exists before establishing a new one
     */
    socket.on('video-call-request', async (data) => {
        try {
            console.log('📢 Incoming Video Call Request:', data);
            const { from, to, text } = data;

            if (!from || !to || !text) {
                console.error("❌ Invalid video call request format. Missing required fields.");
                return;
            }

            // Check if there's already an active call involving either user
            if (activeVideoCalls[from] || activeVideoCalls[to]) {
                console.warn(`⚠️ Call already in progress between ${from} and ${to}`);
                io.to(socket.id).emit('video-call-busy', { message: "User is already in a call." });
                return;
            }

            // Fetch sender and receiver details
            const sender = await User.findById(from);
            const receiver = await User.findById(to);

            if (!sender || !receiver) {
                console.error(`❌ Sender or receiver not found!`);
                return;
            }

            // Mark users as in a call
            activeVideoCalls[from] = to;
            activeVideoCalls[to] = from;

            // Notify receiver about the incoming call
            const toSocketId = connectedUsers[to];
            if (toSocketId) {
                io.to(toSocketId).emit('incoming-video-call', { from, to, text });
                console.log(`✅ Video call request sent to ${toSocketId}`);
            } else {
                console.warn(`⚠️ Receiver ${to} is offline. Call request cannot be delivered.`);
            }
        } catch (err) {
            console.error('❌ Error in video-call-request:', err);
        }
    });

    /**
     * Handle video call started event
     */
    socket.on('video-call-started', (data) => {
        try {
            console.log("📞 Video call started:", data);
            const { from, to } = data;

            if (!activeVideoCalls[from] || !activeVideoCalls[to]) {
                console.warn(`⚠️ Attempt to start a call that wasn't requested.`);
                return;
            }

            const toSocketId = userSocketId(io.sockets, to);
            if (toSocketId) {
                io.to(toSocketId).emit('video-call-started', { from, to });
                console.log(`✅ Video call started notification sent to ${toSocketId}`);
            }
        } catch (err) {
            console.error("❌ Error in video-call-started:", err);
        }
    });

    /**
     * Handle video call ended event
     */
    socket.on('video-call-ended', (data) => {
        try {
            console.log("📴 Video call ended:", data);
            const { from, to } = data;

            if (activeVideoCalls[from] || activeVideoCalls[to]) {
                delete activeVideoCalls[from];
                delete activeVideoCalls[to];
            }

            const toSocketId = userSocketId(io.sockets, to);
            if (toSocketId) {
                io.to(toSocketId).emit('video-call-ended', { from, to });
                console.log(`✅ Video call ended notification sent to ${toSocketId}`);
            }
        } catch (err) {
            console.error("❌ Error in video-call-ended:", err);
        }
    });

    /**
     * Handle video call failure
     */
    socket.on('video-call-failed', (data) => {
        try {
            console.log("❌ Video call failed:", data);
            const { from, to, error } = data;

            if (activeVideoCalls[from] || activeVideoCalls[to]) {
                delete activeVideoCalls[from];
                delete activeVideoCalls[to];
            }

            const toSocketId = userSocketId(io.sockets, to);
            if (toSocketId) {
                io.to(toSocketId).emit('video-call-failed', { from, to, error });
                console.log(`⚠️ Video call failure notification sent to ${toSocketId}`);
            }
        } catch (err) {
            console.error("❌ Error in video-call-failed:", err);
        }
    });

    /**
     * Handle disconnect - Remove from active calls
     */
    socket.on('disconnect', () => {
        try {
            console.log(`❌ User disconnected: ${socket.userId || "Unknown"} (Socket ID: ${socket.id})`);

            if (socket.userId && activeVideoCalls[socket.userId]) {
                const otherUser = activeVideoCalls[socket.userId];
                delete activeVideoCalls[socket.userId];
                delete activeVideoCalls[otherUser];

                console.log(`🛑 Removed user ${socket.userId} from active video calls.`);
            }
        } catch (err) {
            console.error("❌ Error handling user disconnect:", err);
        }
    });
};
