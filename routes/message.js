const express = require('express')
const { indexMessages, getUsersMessages, sendMessagePermission,deleteMessage } = require('../app/controllers/MessageController')
const { requireSignin, withAuthUser } = require('../app/middlewares/auth')
const { isFriend } = require('../app/middlewares/request')
const { userById, isNotBlocked } = require('../app/middlewares/user')
const router = express.Router()

router.param('userId', async (req, res, next, id) => {
    console.log(`🔍 Looking for user with ID: ${id}`);

    if (id === "me" && req.auth && req.auth._id) {
        console.log(`🔄 Replacing "me" with authenticated user ID: ${req.auth._id}`);
        id = req.auth._id;
    }

    try {
        const user = await User.findById(id);
        if (!user) {
            console.error(`❌ User not found with ID: ${id}`);
            return Response.sendError(res, 400, 'User not found');
        }

        req.user = user; // Attach user to request
        next();
    } catch (err) {
        console.error(`❌ Error finding user with ID ${id}:`, err);
        return Response.sendError(res, 500, 'Server error');
    }
});

router.get('/permission/:userId', [requireSignin, withAuthUser], sendMessagePermission);
router.get('/users', [requireSignin, withAuthUser], getUsersMessages);
router.get('/:userId', [requireSignin, withAuthUser], indexMessages);

router.delete('/:messageId', [requireSignin, withAuthUser], deleteMessage);




module.exports = router