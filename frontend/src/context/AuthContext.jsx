import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true); // stays true until session is resolved

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            fetchUser();
        } else {
            setLoading(false); // no token → not logged in, stop spinner
        }
    }, []);

    // Called on every app load — restores session from saved token
    const fetchUser = async () => {
        try {
            const { data } = await api.get('/auth/me');
            setUser(data);
        } catch {
            // Token expired or invalid
            localStorage.removeItem('token');
            setUser(null);
        } finally {
            setLoading(false); // always unblock routes after attempt
        }
    };

    const login = async (credentials) => {
        // credentials = { email, password, role, adminSecretCode? }
        const { data } = await api.post('/auth/login', credentials);
        localStorage.setItem('token', data.token);
        setUser(data.user);
        return data.user;
    };

    const register = async (formData) => {
        const { data } = await api.post('/auth/register', formData);
        if (data.token) {
            localStorage.setItem('token', data.token);
            setUser(data.user);
        }
        return data; // includes pendingApproval flag for admin registration
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
    };

    const updateAadhaarVerification = () => {
        setUser(prev => ({ ...prev, aadhaarVerified: true }));
    };

    return (
        <AuthContext.Provider value={{ user, login, register, logout, updateAadhaarVerification, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);

// Named re-export for Fast Refresh compatibility
export { AuthContext };