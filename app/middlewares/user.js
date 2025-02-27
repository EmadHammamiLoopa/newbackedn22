const Response = require("../controllers/Response");
const User = require("../models/User");


exports.userById = async (req, res, next, id) => {
    try {
        console.log("🔹 userById middleware triggered");
        console.log("🔹 Looking for user with ID:", id);
        console.log("🔹 req.auth:", req.auth);
        console.log("🔹 req.authUser:", req.authUser);

        let userId = id;

        // ✅ Ensure `req.authUser` is available
        if (!req.authUser || !req.authUser._id) {
            console.error("🚨 Unauthorized: No authenticated user found");
            return Response.sendError(res, 401, "Unauthorized: No authenticated user found");
        }

        // ✅ Handle "me" case correctly
        if (id === "me") {
            console.log("🔹 'me' detected, replacing with authenticated user ID:", req.authUser._id);
            userId = req.authUser._id.toString(); // Ensure it's a string
        }

        // ✅ Validate ObjectId format to prevent MongoDB errors
        if (!userId || !userId.match(/^[0-9a-fA-F]{24}$/)) {
            console.error(`🚨 Invalid user ID: ${userId}`);
            return Response.sendError(res, 400, "Invalid user ID");
        }

        // ✅ Fetch user from the database
        const user = await User.findById(userId);
        if (!user) {
            console.error(`🚨 User not found with ID: ${userId}`);
            return Response.sendError(res, 404, "User not found");
        }

        req.user = user;
        console.log(`✅ Fetched user: ${user._id}`);
        next();
    } catch (err) {
        console.error("❌ Error in userById:", err);
        return Response.sendError(res, 500, "Internal server error");
    }
};


function getDefaultAvatar(gender) {
    switch (gender) {
        case 'male':
            return '/public/images/avatars/male.webp';
        case 'female':
            return '/public/images/avatars/female.webp';
        default:
            return '/public/images/avatars/other.webp';
    }
}

exports.isNotFriend = (req, res, next) => {
    const user = req.user;
    if(user.friends.includes(req.auth._id))
        return Response.sendError(res, 400, 'user already friend');
    next();
}

exports.isNotBlocked = async (req, res, next) => {
    try {
        const user = req.user;

        // Find the authenticated user using async/await
        const authUser = await User.findOne({ _id: req.auth._id });

        // Check if either user has blocked the other
        if (authUser.blockedUsers.includes(user._id) || user.blockedUsers.includes(authUser._id)) {
            return Response.sendError(res, 404, 'Not found');
        }

        // Proceed to the next middleware
        next();
    } catch (err) {
        // Log any error that occurs and respond with a server error message
        console.error('Error in isNotBlocked middleware:', err);
        return Response.sendError(res, 500, 'Server error');
    }
};

