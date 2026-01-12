import { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loggingOut, setLoggingOut] = useState(false);

    const checkAuth = async () => {
        // 1. ZOMBIE KILLER: State Guard
        // If we are currently logging out, DO NOT check auth.
        if (loggingOut) return;

        try {
            const api = import.meta.env.VITE_API_URL;
            
            // 2. Verify with server
            const res = await fetch(`${api}/auth/profile?_t=${Date.now()}`, { 
                credentials: 'include',
                headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
            });

            if (res.ok) {
                const userData = await res.json();
                setUser(userData);
                // removing localstorage trust for now as per user instruction
            } else {
                setUser(null);
                localStorage.removeItem('user');
            }
        } catch (err) {
            console.error("Auth check failed", err);
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
        setLoggingOut(false);
    };

    const logout = async () => {
        // 1. Set Guard
        setLoggingOut(true);
        
        try {
            const api = import.meta.env.VITE_API_URL;
            // Best effort network call
            const logoutUrl = `${api}/auth/logout`;
            await fetch(logoutUrl, { method: 'POST', credentials: 'include' });
        } catch (err) {
            console.error("Logout network error", err);
        } finally {
            // 2. Clear State
            setUser(null);
            localStorage.removeItem('user');
            setLoading(false);
             // 3. FORCE REDIRECT
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
