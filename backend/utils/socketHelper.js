// Socket.io utility to broadcast diamond status changes
// Bandwidth-efficient: only sends minimal data (ID + status)

const getIoInstance = () => {
    const server = require('./server');
    return server.io;
};

// Broadcast diamond status change to all connected clients
const broadcastDiamondUpdate = (diamondId, updates) => {
    try {
        const io = getIoInstance();
        if (io) {
            // Send minimal payload to reduce bandwidth
            io.emit('diamond:update', {
                id: diamondId,
                ...updates
            });
        }
    } catch (error) {
        console.error('Socket broadcast error:', error);
    }
};

module.exports = {
    broadcastDiamondUpdate
};
