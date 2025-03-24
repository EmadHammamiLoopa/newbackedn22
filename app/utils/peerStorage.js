// Persistent storage solution
class PeerStore {
    constructor() {
        this.store = {};
        this.cleanupInterval = setInterval(() => {
            this.cleanupExpiredPeers();
        }, 60000); // Cleanup every minute
    }

    set(userId, peerId) {
        this.store[userId] = {
            peerId,
            lastUpdated: new Date()
        };
    }

    get(userId) {
        return this.store[userId];
    }

    cleanupExpiredPeers() {
        const now = new Date();
        Object.keys(this.store).forEach(userId => {
            const peer = this.store[userId];
            if ((now - new Date(peer.lastUpdated)) > 120000) { // 2 minutes
                delete this.store[userId];
                console.log(`🧹 Cleaned up expired peer: ${userId}`);
            }
        });
    }
}

module.exports = new PeerStore();