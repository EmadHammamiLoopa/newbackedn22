const mongoose = require('mongoose');

// models/Peer.js
const peerSchema = new mongoose.Schema({
  userId:      { type: String, required: true, unique: true },
  peerId:      { type: String, required: true },
  lastUpdated: { type: Date,   default: Date.now },
  expiresAt:   { type: Date,   default: () => Date.now() + 5 * 60_000 } // 5‑min ttl
});

peerSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // Mongo deletes after 5 min
module.exports = mongoose.model('Peer', peerSchema);
