let ioInstance;

const initSocket = (io) => {
    ioInstance = io;
};

const getIoInstance = () => {
    return ioInstance;
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
    initSocket,
    getIoInstance,
    broadcastDiamondUpdate
};
