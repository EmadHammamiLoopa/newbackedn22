const express = require('express');
const mongoose = require('mongoose');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const Agenda = require('agenda');
const path = require('path');
const session = require('express-session');
const passport = require('./routes/passport');  // Adjust the path to your passport configuration
const schedule = require('node-schedule');
const Comment = require('./app/models/Comment');
const Subscription = require('./app/models/Subscription');
const User = require('./app/models/User');
const { sendNotification } = require('./app/helpers');
const http = require('http').Server(app);
const io = require('socket.io')(http, {
  cors: {
    origin: [
      'https://newbackedn22.onrender.com',
      'http://localhost:3300',
      'https://localhost',
      'http://localhost:4200' // Add this for Angular development
    ],
    methods: ['GET', 'POST'],
    credentials: true
  }
});
const { ExpressPeerServer } = require('peer');
const peerServer = ExpressPeerServer(http, {
  debug: true
});

require('dotenv').config();
const app = express();

// Middleware
app.use(cors({
  origin: [
    'https://newbackedn22.onrender.com',
    'http://localhost:3300',
    'https://localhost',
    'http://localhost:4200' // Add this for Angular development
  ],
  credentials: true
}));
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(morgan('tiny'));
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/products', express.static(path.join(__dirname, 'products')));
app.use('/peerjs', peerServer);

// MongoDB Connection
mongoose.connect('mongodb+srv://isenappnorway:S3WlOS8nf8EwWMmN@cluster0.gwb9wev.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0', {
  socketTimeoutMS: 600000,
  connectTimeoutMS: 600000,
  serverSelectionTimeoutMS: 600000,
  maxPoolSize: 10,
  retryWrites: true
})
.then(() => console.log('Database connected successfully...'))
.catch((err) => console.log('Could not connect to database...', err));

// Agenda Job Scheduler
const agenda = new Agenda({ db: { address: process.env.MONGODB_URL } });
require('./app/jobs')(agenda);

// Session Configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your_secret_key',
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  }
}));

// Passport Initialization
app.use(passport.initialize());
app.use(passport.session());

// Routes
const routePrefix = '/api/v1';
app.use(checkVersion);
app.use(setUrlInfo);
app.use(updateUserInfo);
app.use(`${routePrefix}/auth`, authRoutes);
app.use(`${routePrefix}/user`, userRoutes);
app.use(`${routePrefix}/request`, requestRoutes);
app.use(`${routePrefix}/product`, productRoutes);
app.use(`${routePrefix}/job`, jobRoutes);
app.use(`${routePrefix}/service`, serviceRoutes);
app.use(`${routePrefix}/message`, messageRoutes);
app.use(`${routePrefix}/channel`, channelRoutes);
app.use(`${routePrefix}/channel`, postRoutes);
app.use(`${routePrefix}/channel`, commentRoutes);
app.use(`${routePrefix}/subscription`, subscriptionRoutes);
app.use(`${routePrefix}/report`, reportRoutes);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/public/images/avatars', express.static(path.join(__dirname, 'public/images/avatars')));
app.use('/public', express.static(path.join(__dirname, 'public')));

// Error Handling Middleware
app.use(invalidTokenError);
app.use(notFoundError);

// Socket.IO
io.sockets.on('connection', (socket) => {
  console.log('connection');
  const userId = socket.handshake.query.userId;

  // Set user as online when they connect
  User.findById(userId).then(user => {
    if (user) {
      user.setOnline();
    }
  });

  socket.on('disconnect', async () => {
    try {
      const user = await User.findById(userId);
      if (user) {
        user.setOffline();
        user.lastSeen = new Date();
        await user.save();
      }
    } catch (err) {
      console.error('Error setting user offline:', err);
    }
  });

  require('./app/sockets/chat')(io, socket);
  require('./app/sockets/video')(io, socket);
});

// Serve the Cordova application for the browser platform
app.use(express.static(path.join(__dirname, 'platforms/browser/www')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'platforms/browser/www', 'index.html'));
});

// Start Server
const port = process.env.PORT || 3300;
http.listen(port, () => console.log(`Server connected at http://localhost:${port} ...`));

// Initialize Subscription
(async () => {
  const subscription = new Subscription();
  subscription.offers = [];
  subscription.dayPrice = 120;
  subscription.weekPrice = 6;
  subscription.monthPrice = 20;
  subscription.yearPrice = 120;
  subscription.currency = 'usd';
  await subscription.save();
  console.log('Subscription initialized');
})();