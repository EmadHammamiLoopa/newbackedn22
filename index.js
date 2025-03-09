const express = require('express');
const mongoose = require('mongoose');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const Agenda = require("agenda");
const path = require('path');
const session = require('express-session');
const passport = require('./routes/passport');  // Adjust the path to your passport configuration
const schedule = require('node-schedule');
const Comment = require("./app/models/Comment")

// import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const productRoutes = require('./routes/product');
const jobRoutes = require('./routes/job');
const serviceRoutes = require('./routes/service');
const requestRoutes = require('./routes/request');
const messageRoutes = require('./routes/message');
const channelRoutes = require('./routes/channel');
const postRoutes = require('./routes/post');
const commentRoutes = require('./routes/comment');
const subscriptionRoutes = require('./routes/subscription');
const reportRoutes = require('./routes/report');

// import middlewares
const { notFoundError, invalidTokenError } = require('./app/middlewares/errors');
const { setUrlInfo, updateUserInfo, allowAccess, checkVersion } = require('./app/middlewares/others');
const Subscription = require('./app/models/Subscription');
const Product = require('./app/models/Product');
const Report = require('./app/models/Report');
const User = require('./app/models/User');
const Follow = require('./app/models/Follow');
const Channel = require('./app/models/Channel');
const Service = require('./app/models/Service');
const Job = require('./app/models/Job');
const { sendNotification } = require('./app/helpers');
const Message = require('./app/models/Message');
const Post = require('./app/models/Post');
const { deleteUser } = require('./app/controllers/UserController');

require('dotenv').config();
const app = express();
app.use(cors({
  origin: ['https://newbackedn22.onrender.com', 'http://localhost:3300', 'https://localhost'],
  credentials: true
}));

app.use(allowAccess);


const removeExpiredMedia = async () => {
  const now = new Date();
  try {
      const result = await Comment.updateMany(
          { 'media.expiryDate': { $lte: now } },  // Find media that has expired
          { $unset: { 'media.url': '' } }  // Remove the media URL but keep the comment/post intact
      );
      console.log('Expired media removed:', result);
  } catch (err) {
      console.error('Error removing expired media:', err);
  }
};



const http = require('http').Server(app);
const io = require('socket.io')(http, {
    cors: {
        origins: "*"
    }
});
const { ExpressPeerServer } = require('peer');
const peerServer = ExpressPeerServer(http, {
    debug: true
});

schedule.scheduleJob('0 * * * *', removeExpiredMedia);  // Runs every hour

const port = process.env.PORT || 3300;
http.listen(port, () => console.log("server connected at 127.0.0.1:" + port + " ..."));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/products', express.static(path.join(__dirname, 'products')));

app.use(helmet({
    crossOriginResourcePolicy: false,
  }));
app.use(morgan('tiny'));
app.use(cookieParser());
app.use('/peerjs', peerServer);

mongoose.connect('mongodb+srv://isenappnorway:S3WlOS8nf8EwWMmN@cluster0.gwb9wev.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0', {
  socketTimeoutMS: 600000,    // 60 seconds for socket timeout
  connectTimeoutMS: 600000,   // 60 seconds for connection timeout
  serverSelectionTimeoutMS: 600000, // Increase server selection timeout
  maxPoolSize: 10,           // Set max pool size for better connection handling (updated option for poolSize)
  retryWrites: true          // Enable retrying writes
})
.then(() => console.log("Database connected successfully..."))
.catch((err) => console.log("Could not connect to database...", err));



const agenda = new Agenda({ db: { address: process.env.MONGODB_URL } });
require('./app/jobs')(agenda);

const routePrefix = '/api/v1';

app.use(checkVersion);
app.use(setUrlInfo);
app.use(updateUserInfo);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/message', messageRoutes);
app.use('/api/v1', reportRoutes);

app.use(session({
  secret: process.env.SESSION_SECRET || 'your_secret_key',
  resave: false,
  saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());


app.get(`${routePrefix}/`, (req, res) => res.send('api is working'));
app.use(`${routePrefix}/auth`, authRoutes);
app.use(`${routePrefix}/user`, userRoutes);
app.use(`${routePrefix}/request`, requestRoutes);
app.use(`${routePrefix}/product`, productRoutes);
app.use(`${routePrefix}/job`, jobRoutes);
app.use(`${routePrefix}/service`, serviceRoutes);
app.use(`${routePrefix}/message`, messageRoutes);
app.use(`${routePrefix}/channel`, channelRoutes);
app.use(`${routePrefix}/channel`, postRoutes);  // corrected this line
app.use(`${routePrefix}/channel`, commentRoutes);
app.use(`${routePrefix}/subscription`, subscriptionRoutes);
app.use(`${routePrefix}/report`, reportRoutes);
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
app.use('/public/images/avatars', express.static(path.join(__dirname, 'public/images/avatars')));
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));



function listRoutes(app) {
    app._router.stack.forEach(middleware => {
      if (middleware.name === 'router') {
        middleware.handle.stack.forEach(handler => {
          if (handler.route) {
            console.log(`Method: ${handler.route.stack[0].method.toUpperCase()}, Path: ${routePrefix}${handler.route.path}`);
          }
        });
      }
    });
  }
  



// Log routes
listRoutes(app);
app.use(invalidTokenError);
app.use(notFoundError);
const connectedUsers = {}; // ✅ Declare connectedUsers as an empty object

io.sockets.on('connection', (socket) => {
  console.log('connection');
  const userId = socket.handshake.query.userId; // Adjust based on your implementation

  // Set user as online when they connect
  if (userId) {
    connectedUsers[userId] = socket.id;  // ✅ Add user to connectedUsers
    console.log(`✅ User ${userId} added to connectedUsers with socket ID: ${socket.id}`);

    // Set user as online when they connect
    User.findById(userId).then(user => {
        if (user) {
            user.setOnline();
        }
    });
} else {
    console.warn("⚠️ No userId provided in handshake query.");
}


  socket.onAny((event, ...args) => {
    console.log(`📢 WebSocket Event Received: ${event}`, args);
});


socket.on('disconnect', async () => {
  console.log(`❌ Disconnected: User ${userId || "Unknown"}, Socket ID: ${socket.id}`);

  // Wait for a short time before marking the user offline (prevents refresh issues)
  setTimeout(async () => {
      if (connectedUsers[userId]) {
          console.log(`🔄 User ${userId} reconnected quickly, skipping offline update.`);
          return; // The user has already reconnected
      }

      try {
          delete connectedUsers[userId]; // ✅ Remove from active users list
          console.log(`❌ User ${userId} permanently removed from connectedUsers`);

          const user = await User.findById(userId);
          if (user) {
              user.setOffline();
              user.lastSeen = new Date();
              await user.save();
              console.log(`💤 User ${userId} marked as offline.`);
          }
      } catch (err) {
          console.error('❌ Error setting user offline:', err);
      }
  }, 5000); // ✅ Wait 5 seconds before marking offline
});


  require('./app/sockets/chat')(io, socket);
  require('./app/sockets/video')(io, socket);
});

// Serve the Cordova application for the browser platform
app.use(express.static(path.join(__dirname, 'platforms/browser/www')));

// Handle all other routes and return the index file
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'platforms/browser/www', 'index.html'));
});

(async () => {
    const subscription = new Subscription();
    subscription.offers = [];
    subscription.dayPrice = 120;
    subscription.weekPrice = 6;
    subscription.monthPrice = 20;
    subscription.yearPrice = 120;
    subscription.currency = 'usd';
    await subscription.save();
    console.log('done');
})();
