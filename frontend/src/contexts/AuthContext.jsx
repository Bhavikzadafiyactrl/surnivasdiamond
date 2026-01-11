import { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const checkAuth = async () => {
        try {
            const api = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
            
            const token = localStorage.getItem('token');

            // Check if we have a user in localStorage first (optimization for immediate UI render while validating)
            const localUser = localStorage.getItem('user');
            if (localUser) {
                try {
                    setUser(JSON.parse(localUser));
                } catch (e) {
                    console.error("Invalid local user data", e);
                }
            }

            if (!token) {
                // No token, so we are definitely not logged in. Don't call backend.
                setUser(null);
                setLoading(false);
                return;
            }

            // Verify with server (this is the source of truth)
            // Added x-auth-token header as used elsewhere in the app
            const res = await fetch(`${api}/auth/profile`, { 
                headers: {
                    'x-auth-token': token
                },
                credentials: 'include' 
            });

            if (res.ok) {
                const userData = await res.json();
                setUser(userData);
                localStorage.setItem('user', JSON.stringify(userData)); // Sync local storage
            } else {
                // If server says no, clear everything
                setUser(null);
                localStorage.removeItem('user');
                localStorage.removeItem('token'); 
            }
        } catch (err) {
            console.error("Auth check failed", err);
            // On network error, we might want to keep the userlogged in optimistically? 
            // For now, let's assume if check fails, we might be offline or session invalid.
            // But if we have localUser, maybe keep it? 
            // Safer to assume logged out if verification fails to prevent using stale token.
            // However, typical pattern: fail softly. 
            // If API is down, user experience is bad anyway.
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkAuth();
    }, []);

    const login = (userData) => {
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
    };

    const logout = async () => {
        try {
            const api = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
            await fetch(`${api}/auth/logout`, { method: 'POST', credentials: 'include' });
        } catch (err) {
            console.error(err);
        }
        setUser(null);
        localStorage.removeItem('user');
        window.location.href = '/auth';
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, checkAuth }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
