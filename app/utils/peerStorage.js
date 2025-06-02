const Peer = require('../models/Peer');

class PeerStore {
  async set(userId, peerId) {
    try {
      await Peer.updateOne(
        { userId },
        {
          $set: {
            peerId,
            lastUpdated: new Date()
          }
        },
        {
          upsert: true,
          setDefaultsOnInsert: true
        }
      );
    } catch (err) {
      console.error("❌ Failed to set peerId in DB:", err);
    }
  }

  async get(userId) {
    try {
      return await Peer.findOne({ userId });
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

  // Cleanup peers that haven't updated in the last 2 minutes
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


}

module.exports = new PeerStore();
