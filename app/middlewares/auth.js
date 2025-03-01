const expressJWT = require('express-jwt');
const Response = require('../controllers/Response');
const { adminCheck } = require('../helpers');
const User = require('../models/User');
require('dotenv').config();

exports.requireSignin = (req, res, next) => {
    console.log('requireSignin middleware called');

    expressJWT({
        secret: process.env.JWT_SECRET,
        algorithms: ['HS256'],
        userProperty: 'auth',
        credentialsRequired: true,
        getToken: (req) => {
            console.log('requireSignin middleware called');
            console.log('Authorization Header:', req.headers.authorization); // Log authorization header
            
            if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
                return req.headers.authorization.split(' ')[1]; // Extract token
            }
            return null;
        }
    })(req, res, (err) => {
        if (err) {
            console.log('JWT error:', err);
            return Response.sendError(res, 401, 'Unauthorized: Invalid token');
        }
        console.log('Decoded token:', req.auth); // Check if the token is attached to req.auth
        next();
    });
};



exports.isAuth = (req, res, next) => {
   try {
        console.log('isAuth middleware: Request headers:', req.headers);
        if(adminCheck(req)) next();
        else if(!req.user || !req.auth || req.auth._id != req.user._id)
            return Response.sendError(res, 403, 'Access denied');
        else next();
   } catch (error) {
       console.log('isAuth error:', error);
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
    console.log('withAuthUser middleware: Request headers:', req.headers);

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return Response.sendError(res, 401, 'Unauthorized: No token provided');
    }

    const token = authHeader.split(' ')[1];
    console.log('Token from Authorization header:', token);

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.auth = decoded;

        if (!req.auth._id) {
            console.error('Token does not contain _id:', decoded);
            return Response.sendError(res, 400, 'Invalid token structure');
        }

        const user = await User.findById(req.auth._id);
        if (!user) {
            return Response.sendError(res, 401, 'You are not signed in');
        }

        req.authUser = user;
        next(); // Ensure this is called after everything succeeds
    } catch (err) {
        console.error('Token verification failed:', err);
        return Response.sendError(res, 401, 'Unauthorized: Invalid token');
    }
};


