import { useEffect } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { useNavigate, useLocation } from 'react-router-dom';

const SessionHandler = () => {
    const { socket } = useSocket();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        if (!socket) return;

        const handleUserUpdate = (data) => {
            const userStr = localStorage.getItem('user');
            if (!userStr) return;
            
            const currentUser = JSON.parse(userStr);
            console.log("Session Update Received:", data, "Current User:", currentUser);

            // Check if the update is for the current logged-in user
            if (data.userId === (currentUser.id || currentUser._id)) {
                
                // 1. Handle Unverification (Live Logout)
                // If verifiedByOwners becomes false or isVerified becomes false
                if (data.updates.verifiedByOwners === false || data.updates.isVerified === false) {
                    alert("Your account access has been revoked by the administrator.");
                    localStorage.removeItem('user');
                    localStorage.removeItem('token');
                    window.location.href = '/auth'; // Force hard redirect
                    return;
                }

                // 2. Handle Role Change (Live Update)
                if (data.updates.role && data.updates.role !== currentUser.role) {
                    // Update local storage
                    const newUser = { ...currentUser, role: data.updates.role };
                    localStorage.setItem('user', JSON.stringify(newUser));
                    
                    alert(`Your role has been updated to ${data.updates.role.toUpperCase()}. The page will refresh.`);
                    window.location.reload(); // Refresh to clear old route permissions
                }
            }
        };

        socket.on('user:updated', handleUserUpdate);

        return () => {
            socket.off('user:updated', handleUserUpdate);
        };
    }, [socket, navigate, location]);

    return null; // This component handles logic only, no UI
};

export default SessionHandler;
