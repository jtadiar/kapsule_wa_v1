import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useRevenueCat } from '../hooks/useRevenueCat';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiresArtistAccess?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiresArtistAccess = false 
}) => {
  const { user } = useAuthStore();
  const location = useLocation();
  const { hasArtistAccess, isLoading } = useRevenueCat();

  // Not authenticated
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Still checking entitlements
  if (requiresArtistAccess && isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin mx-auto mb-4" size={48} />
          <p className="text-gray-400">Checking subscription status...</p>
        </div>
      </div>
    );
  }

  // Requires artist access but user doesn't have it
  if (requiresArtistAccess && !hasArtistAccess) {
    return <Navigate to="/artist-subscription" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;