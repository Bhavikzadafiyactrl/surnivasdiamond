import { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const checkAuth = async () => {
        try {
            const api = import.meta.env.VITE_API_URL;
            
            // 1. Explicit Logout Check (The "Redesign")
            // If the user explicitly logged out, DO NOT even ask the server.
            // This prevents "Zombie Sessions" from showing up in the UI.
            const isExplicitlyLoggedOut = localStorage.getItem('logout_marker');
            if (isExplicitlyLoggedOut) {
                console.log("User is explicitly logged out. Skipping server check.");
                setUser(null);
                setLoading(false);
                return;
            }

            // 2. Check if we have a user in localStorage (Optimization)
            const localUser = localStorage.getItem('user');
            if (localUser) {
                try {
                    setUser(JSON.parse(localUser));
                } catch (e) {
                    console.error("Invalid local user data", e);
                }
            }

            // 3. Verify with server
            const res = await fetch(`${api}/auth/profile?_t=${Date.now()}`, { 
                credentials: 'include',
                headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
            });

            if (res.ok) {
                const userData = await res.json();
                setUser(userData);
                localStorage.setItem('user', JSON.stringify(userData));
                // Ensure marker is gone if server says we are valid (and we weren't explicitly out)
                localStorage.removeItem('logout_marker'); 
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
        localStorage.removeItem('logout_marker'); // Clear the ban
    };

    const logout = async () => {
        try {
            const api = import.meta.env.VITE_API_URL;
            
            // Set the "Ban" flag immediately
            localStorage.setItem('logout_marker', 'true');
            
            setUser(null);
            localStorage.removeItem('user');
            
            await fetch(`${api}/auth/logout`, { method: 'POST', credentials: 'include' });
        } catch (err) {
            console.error("Logout error", err);
        } finally {
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
