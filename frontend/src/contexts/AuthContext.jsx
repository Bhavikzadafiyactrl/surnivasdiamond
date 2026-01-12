import { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const checkAuth = async () => {
        try {
            const api = import.meta.env.VITE_API_URL;
            
            // 1. ZOMBIE KILLER: Explicit Logout Check
            // If the user manually logged out, we IGNORE the server session.
            // This prevents "Stale Deployment" or "Old Cookie" issues from auto-logging them in.
            const isManualLogout = localStorage.getItem('manual_logout');
            if (isManualLogout) {
                console.log("Manual logout active. Forcing logout state.");
                setUser(null);
                setLoading(false);
                return;
            }

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
                // Clear manual logout flag if server confirms valid session AND we didn't just logout
                // (Handled by the check at the top)
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
        localStorage.removeItem('manual_logout'); // Clear the flag
    };

    const logout = async () => {
        // 1. Set the "Zombie Killer" flag
        localStorage.setItem('manual_logout', 'true');
        
        // 2. Clear State Immediately (Optimistic)
        setUser(null);
        localStorage.removeItem('user');

        try {
            const api = import.meta.env.VITE_API_URL;
            // Best effort network call
            const logoutUrl = `${api}/auth/logout`;
            await fetch(logoutUrl, { method: 'POST', credentials: 'include' });
        } catch (err) {
            console.error("Logout network error", err);
        } finally {
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
