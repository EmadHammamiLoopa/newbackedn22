const mongoose = require('mongoose');

const peerSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  peerId: { type: String, required: true },
  lastUpdated: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Peer', peerSchema);
