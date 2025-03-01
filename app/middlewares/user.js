const Response = require("../controllers/Response");
const User = require("../models/User");

exports.userById = (req, res, next, id) => {
    console.log('--- userById Middleware ---');
    console.log(`Initial received user ID: ${id}`);
    console.log('Received req.auth:', req.auth);  // Log req.auth for debugging

    if (id === 'me') {
        if (!req.auth || !req.auth._id) {
            console.error('No auth object found or user not authenticated!');
            return Response.sendError(res, 400, 'Authentication error: User not authenticated');
        }

        console.log(`Replacing 'me' with authenticated user's ID: ${req.auth._id}`);
        id = req.auth._id;
    }

    console.log(`Looking for user with ID: ${id}`);

    // Find the user by ID
    User.findById(id, (err, user) => {
        if (err) {
            console.error(`Error finding user with ID ${id}:`, err);
            return Response.sendError(res, 400, 'User not found');
        }

        if (!user) {
            console.error(`User not found with ID: ${id}`);
            return Response.sendError(res, 400, 'User not found');
        }

        if (!user.mainAvatar) {
            user.mainAvatar = getDefaultAvatar(user.gender);
        }
        if (!user.avatar || user.avatar.length === 0) {
            user.avatar = [user.mainAvatar];
        }

        console.log(`User found: ${JSON.stringify(user)}`);
        req.user = user;
        next();
    });
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

