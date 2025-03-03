const Response = require("./controllers/Response");
const Report = require("./models/Report");
const request = require('request');

exports.manAvatarPath = '/avatars/male.webp'
exports.womenAvatarPath = '/avatars/female.webdp'
exports.ERROR_CODES = {
    SUBSCRIPTION_ERROR: 1001
}

exports.connectedUsers = {}

exports.connectedUsers = (sockets) => {
    const connectedUsers = {}
    sockets.sockets.forEach((socket, key) => {
        connectedUsers[socket.username] = key
    })
    return connectedUsers
}

exports.userSocketId = (sockets, user_id) => {
    let socket_id = null
    sockets.sockets.forEach((socket, key) => {
        if(socket.username == user_id){
            socket_id = key
            return
        }
    })
    return socket_id
}

exports.isUserConnected = (sockets, user_id) => {
    let res = false
    sockets.sockets.forEach((socket, key) => {
        if(socket.username == user_id){
            res = true
            return
        }
    })
    return res
}

exports.setOnlineUsers = (users) => {
    users.forEach(usr => {
        if(this.connectedUsers[usr._id]) usr.online = true
        else usr.online = false
    })
    return users
}

exports.extractDashParams = (req, searchFields) => {
    const page = req.query.page ? +req.query.page : 1;
    const limit = req.query.limit ? +req.query.limit : 10;  // Default limit to 10 if not provided
    const sortBy = req.query.sortBy ? req.query.sortBy : '_id';
    const sortDir = req.query.sortDir ? +req.query.sortDir : 1;
    const searchQuery = req.query.searchQuery ? req.query.searchQuery.trim() : "";
    
    const sort = {};
    sort[sortBy] = sortDir;

    // Build the search filter only if the searchQuery is present
    let searchFilter = [];
    if (searchQuery) {
        searchFields.forEach(field => {
            // Apply $regex only to string fields
            if (field === 'text' || field === 'description' || field === 'title') {
                let obj = {};
                obj[field] = { $regex: searchQuery, $options: 'i' };  // Apply case-insensitive search for string fields
                searchFilter.push(obj);
            } else {
                // For non-string fields, perform a direct match
                let obj = {};
                obj[field] = searchQuery;
                searchFilter.push(obj);
            }
        });
    }

    const filter = searchFilter.length > 0 ? { $or: searchFilter } : {};  // Add filter only if search fields are populated

    return {
        filter,
        sort,
        skip: limit * (page - 1),
        limit
    };
};



exports.report = async (req, res, entityName, entityId) => {
    try {
        const report = new Report({
            entity: entityId,
            entityModel: entityName.charAt(0).toUpperCase() + entityName.slice(1),  // Ensure correct capitalization
            user: req.auth._id,
            message: req.body.message,
            reportType: req.body.reportType // Ensure reportType is provided
        });

        await report.save();
        return report; // Return the saved report instead of using a callback
    } catch (error) {
        console.log('Error saving report:', error);
        return Response.sendError(res, 400, 'Failed to save report');
    }
};

 



exports.adminCheck = (req) => {
    return req.auth.role == 'ADMIN' || req.auth.role == 'SUPER ADMIN'
}

// ['Subscribed Users'],

const sendNotification = async (userIds, message, senderName, fromUserId) => {
    // Ensure userIds is always an array
    const recipientIds = Array.isArray(userIds) ? userIds : [userIds];

    // Generate a unique chat ID (sorting ensures consistency)
    const chatId = [fromUserId, recipientIds[0]].sort().join('-');

    const notificationPayload = {
        app_id: '3b993591-823b-4f45-94b0-c2d0f7d0f6d8', // Your OneSignal App ID
        headings: { en: String(senderName) || 'New Message' }, // Ensure string with fallback
        contents: { en: String(message) || 'You have a new message' }, // Ensure string with fallback
        included_segments: [], // Empty because we target specific users
        include_external_user_ids: recipientIds, // Ensures correct format
        data: { type: 'message', link: `/messages/chat/${chatId}` } // Correct chat link
    };

    try {
        const response = await fetch('https://onesignal.com/api/v1/notifications', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Basic os_v2_app_homtlemchnhulffqylippuhw3auw4vp7fmtu4xfrujbvrgzb536ngtne6z7hsyjy6r7yjvqpvx26bmpi42pvgguhvzdycwvca6ik3bi' // Your OneSignal REST API Key
            },
            body: JSON.stringify(notificationPayload)
        });

        const data = await response.json();
        console.log('Notification Response:', data);
    } catch (error) {
        console.error('Error sending notification:', error);
    }
};

// Export sendNotification
exports.sendNotification = sendNotification;

