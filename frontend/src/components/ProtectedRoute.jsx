import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Blocks unauthenticated users
export function ProtectedRoute({ children }) {
    const { user, loading } = useAuth();
    if (loading) return (
        <div className="min-h-screen flex items-center justify-center" style={{ background: '#03070f' }}>
            <div className="w-8 h-8 border-2 border-white/10 border-t-emerald-400 rounded-full animate-spin" />
        </div>
    );
    if (!user) return <Navigate to="/login" replace />;
    return children;
}

// Blocks non-admin users from admin routes
export function AdminRoute({ children }) {
    const { user, loading } = useAuth();
    if (loading) return (
        <div className="min-h-screen flex items-center justify-center" style={{ background: '#03070f' }}>
            <div className="w-8 h-8 border-2 border-white/10 border-t-emerald-400 rounded-full animate-spin" />
        </div>
    );
    if (!user) return <Navigate to="/login" replace />;
    if (user.role !== 'admin') return <Navigate to="/citizen" replace />;
    return children;
}

// Redirects logged-in users away from login/register
export function GuestRoute({ children }) {
    const { user, loading } = useAuth();
    if (loading) return (
        <div className="min-h-screen flex items-center justify-center" style={{ background: '#03070f' }}>
            <div className="w-8 h-8 border-2 border-white/10 border-t-emerald-400 rounded-full animate-spin" />
        </div>
    );
    if (user) return <Navigate to={user.role === 'admin' ? '/admin' : '/citizen'} replace />;
    return children;
}