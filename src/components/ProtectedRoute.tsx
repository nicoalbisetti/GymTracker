import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import OnboardingModal from '@/components/OnboardingModal';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading, profile, profileLoading } = useAuth();

  if (loading || profileLoading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!session) return <Navigate to="/login" replace />;

  const needsOnboarding = !profile || profile.goal === null;

  return (
    <>
      {needsOnboarding && <OnboardingModal />}
      {children}
    </>
  );
}
