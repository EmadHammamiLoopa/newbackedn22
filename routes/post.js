const express = require('express')

const {
    storePost,
    getPosts, 
    deletePost, 
    voteOnPost,
    reportPost,
    getDashPosts,
    updateVisibility,
    showPost,
    channelPosts,
    showDashPost,
    allPosts
} = require('../app/controllers/PostController');

const { requireSignin, withAuthUser, isAdmin } = require('../app/middlewares/auth');
const { channelById, isFollowedChannel } = require('../app/middlewares/channel');
const { postById, postOwner, isFollowedChannelPost } = require('../app/middlewares/post');
const { storePostValidator } = require('../app/middlewares/validators/PostValidator');

const router = express.Router()

router.get('/post/:postId/dash', [requireSignin, isAdmin], showDashPost)
router.delete('/post/:postId', [requireSignin, postOwner], deletePost)
router.get('/:channelId/posts', [requireSignin, isAdmin], channelPosts)

router.post('/post/:postId/vote', [requireSignin, isFollowedChannelPost, withAuthUser], voteOnPost)
router.post('/post/:postId/report', [requireSignin, withAuthUser], reportPost)

router.get('/post/:postId', [requireSignin, withAuthUser], showPost)
router.post('/:channelId/post/', [requireSignin, isFollowedChannel, withAuthUser], storePost)
router.get('/:channelId/getposts/', [requireSignin, withAuthUser], getPosts)

router.put('/post/:postId/visibility', [requireSignin, withAuthUser], updateVisibility);

router.param('postId', postById)
router.param('channelId', channelById)

module.exports = router