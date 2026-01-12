import { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const checkAuth = async () => {
        try {
            const api = import.meta.env.VITE_API_URL;
            
            // Check if we have a user in localStorage first (optimization for immediate UI render while validating)
            const localUser = localStorage.getItem('user');
            if (localUser) {
                try {
                    setUser(JSON.parse(localUser));
                } catch (e) {
                    console.error("Invalid local user data", e);
                }
            }

            // Verify with server (this is the source of truth)
            const res = await fetch(`${api}/auth/profile`, { credentials: 'include' });
            if (res.ok) {
                const userData = await res.json();
                setUser(userData);
                localStorage.setItem('user', JSON.stringify(userData)); // Sync local storage
            } else {
                // If server says no, clear everything
                setUser(null);
                localStorage.removeItem('user');
                // We do NOT clear token here because we can't access it (HttpOnly), server handles it.
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
            const api = import.meta.env.VITE_API_URL;
            // Clear local storage IMMEDIATELY before request to prevent race conditions or "flicker"
            setUser(null);
            localStorage.removeItem('user');
            
            await fetch(`${api}/auth/logout`, { method: 'POST', credentials: 'include' });
        } catch (err) {
            console.error("Logout error", err);
        } finally {
            // Force redirect even if API fails
             window.location.href = '/auth';
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, checkAuth }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
