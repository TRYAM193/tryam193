import { ReactNode } from "react";
import { Navigate, useLocation, Outlet } from "react-router";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

export default function ProtectedRoute() {
  // 1. Extract the loading state from your auth hook (might be called 'loading' instead of 'isLoading')
  const { user, userProfile, isLoading } = useAuth(); 
  const location = useLocation();

  // 2. Loading State: Don't kick them out while Firebase is still thinking
  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  // 3. Auth Check: Firebase finished loading, and there is no user -> redirect to Login
  if (!user) {
    // 'state' saves where they were trying to go, so we can send them back there after login
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // 4. Banned Check
  if (userProfile?.isBanned) {
    return <Navigate to="/banned" replace />;
  }

  // 5. Success: Render the protected page
  return <Outlet />;
}