import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FaSpinner } from 'react-icons/fa';

const ProtectedRoute = ({ children }) => {
    const { user, loading } = useAuth();
    
    if (loading) {
        return <div className="flex justify-center items-center h-screen"><FaSpinner className="animate-spin text-4xl text-blue-500" /></div>;
    }

    if (!user) {
        return <Navigate to="/auth" replace />;
    }

    return children;
};

export default ProtectedRoute;
