const Peer = require('../models/Peer');

class PeerStore {
  async set(userId, peerId) {
    await Peer.updateOne(
      { userId },
      {
        peerId,
        lastUpdated: new Date(),
        expiresAt:   new Date(Date.now() + 5*60_000)   // refresh ttl
      },
      { upsert: true }
    );
  }
  
  

  async get(userId) {
    try {
      const record = await Peer.findOne({ userId });
      return record;
    } catch (err) {
      console.error("❌ Failed to fetch peerId from DB:", err);
      return null;
    }
  }

  async delete(userId) {
    try {
      await Peer.deleteOne({ userId });
      console.log(`❌ DB: Deleted peerId for userId ${userId}`);
    } catch (err) {
      console.error("❌ Failed to delete peerId from DB:", err);
    }
  }

  // Cleanup expired peer records older than 2 minutes
  async cleanupExpiredPeers() {
    const expirationTime = new Date(Date.now() - 2 * 60 * 1000);
    try {
      const result = await Peer.deleteMany({ lastUpdated: { $lt: expirationTime } });
      if (result.deletedCount > 0) {
        console.log(`🧹 Cleaned ${result.deletedCount} expired peers`);
      }
    } catch (err) {
      console.error("❌ Failed to clean expired peers from DB:", err);
    }
  }

  // Optional: Automatically run cleanup every 60 seconds
  startAutoCleanup() {
    setInterval(() => this.cleanupExpiredPeers(), 60000);
  }
}

module.exports = new PeerStore();
