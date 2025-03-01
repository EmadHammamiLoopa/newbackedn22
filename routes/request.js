const express = require('express')
const { storeRequest, requests, acceptRequest, rejectRequest, cancelRequest} = require('../app/controllers/RequestController')
const { requireSignin, withAuthUser } = require('../app/middlewares/auth')
const { userById, isNotFriend, isNotBlocked } = require('../app/middlewares/user')
const { requestById, requestSender, requestReceiver, requestNotExist, sendRequestPermission } = require('../app/middlewares/request')
const router = express.Router()
router.param('requestId', requestById)
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
router.get('/requests', [requireSignin], requests)

// router.get('/', indexRequests)

router.post('/accept/:requestId', [requireSignin, requestReceiver, isNotBlocked, withAuthUser], acceptRequest)
router.post('/reject/:requestId', [requireSignin, requestReceiver, isNotBlocked], rejectRequest)
router.post('/cancel/:requestId', [requireSignin, withAuthUser, requestSender, isNotBlocked], cancelRequest);
router.post('/:userId', [requireSignin, withAuthUser, isNotFriend, requestNotExist, sendRequestPermission], storeRequest);



module.exports = router