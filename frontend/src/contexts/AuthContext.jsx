import { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const checkAuth = async () => {
        try {
            const api = import.meta.env.VITE_API_URL;
            
            // 1. OPTIMIZATION REMOVED: Do not trust localStorage blindly.
            // We wait for the server to confirm validity.
            // const localUser = localStorage.getItem('user');
            // if (localUser) { ... }

            // 2. Verify with server
            const res = await fetch(`${api}/auth/profile?_t=${Date.now()}`, { 
                credentials: 'include',
                headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
            });

            if (res.ok) {
                const userData = await res.json();
                setUser(userData);
                localStorage.setItem('user', JSON.stringify(userData));
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
    };

    const logout = async () => {
        try {
            const api = import.meta.env.VITE_API_URL;
            
            // Wait for server to invalidate session
            const res = await fetch(`${api}/auth/logout`, { method: 'POST', credentials: 'include' });
            
            if (res.ok) {
                console.log("Server logout successful - V4");
            } else {
                console.error("Server logout failed - V4", res.status);
            }

        } catch (err) {
            console.error("Logout network error", err);
        } finally {
            // Always clear local state and redirect, but ONLY after the attempt
            setUser(null);
            localStorage.removeItem('user');
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
