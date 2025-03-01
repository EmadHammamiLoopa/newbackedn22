const expressJWT = require('express-jwt');
const Response = require('../controllers/Response');
const { adminCheck } = require('../helpers');
const User = require('../models/User');
require('dotenv').config();

exports.requireSignin = expressJWT({
    secret: process.env.JWT_SECRET,
    algorithms: ['HS256'],
    userProperty: 'auth',
    credentialsRequired: true,
    getToken: (req) => {
        console.log('Authorization Header:', req.headers.authorization);
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
            return req.headers.authorization.split(' ')[1]; // Extract token correctly
        }
        return null;
    }
});



exports.isAuth = (req, res, next) => {
    try {
        console.log('isAuth middleware: Request headers:', req.headers);
        
        if (adminCheck(req)) return next();

        if (!req.user || !req.auth || req.auth._id.toString() !== req.user._id.toString()) {
            return Response.sendError(res, 403, 'Access denied');
        }

        next();
    } catch (error) {
        console.log('isAuth error:', error);
        return Response.sendError(res, 500, 'Server error');
    }
};


exports.isAdmin = (req, res, next) => {
    console.log('isAdmin middleware: Request headers:', req.headers);
    if(!adminCheck(req))
        return Response.sendError(res, 403, 'Access forbidden');
    next();
};

exports.isSuperAdmin = (req, res, next) => {
    console.log('isSuperAdmin middleware: Request headers:', req.headers);
    if(req.auth.role != 'SUPER ADMIN')
        return Response.sendError(res, 403, 'Access forbidden');
    next();
};

exports.withAuthUser = async (req, res, next) => {
    try {
        console.log('withAuthUser middleware: Request headers:', req.headers);
        
        if (!req.auth || !req.auth._id) {
            return Response.sendError(res, 401, 'Unauthorized: No valid user ID in token');
        }

        const userId = req.auth._id;
        console.log('withAuthUser: User ID from token:', userId);

        // Fetch user by ID
        const user = await User.findById(userId);
        if (!user) {
            console.log('withAuthUser error: User not found');
            return Response.sendError(res, 404, 'User not found');
        }

        console.log('User status:', user.enabled);

        req.authUser = user; // Attach user to request
        console.log('withAuthUser: Authenticated user:', user);
        next();
    } catch (err) {
        console.log('withAuthUser error:', err);
        return Response.sendError(res, 500, 'Server error');
    }
};


