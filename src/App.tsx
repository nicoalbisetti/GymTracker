import { Routes, Route, useLocation } from 'react-router-dom';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { AuthProvider } from '@/context/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import BottomNav from '@/components/BottomNav';
import LoginPage from '@/pages/LoginPage';
import HomePage from '@/pages/HomePage';
import ExercisesPage from '@/pages/ExercisesPage';
import RoutineDetailPage from '@/pages/RoutineDetailPage';
import ActiveWorkoutPage from '@/pages/ActiveWorkoutPage';
import HistoryPage from '@/pages/HistoryPage';
import SessionDetailPage from '@/pages/SessionDetailPage';
import ProgressPage from '@/pages/ProgressPage';
import { SettingsPage } from '@/pages/SettingsPage';
import InstallPrompt from '@/components/InstallPrompt';

function AppInner() {
  const location = useLocation();
  const fullscreen =
    location.pathname.startsWith('/routine/') ||
    location.pathname.startsWith('/workout/');

  return (
    <div className="flex flex-col min-h-full max-w-lg mx-auto">
      <main className={`flex-1 overflow-y-auto safe-area-top safe-area-left safe-area-right ${fullscreen ? '' : 'pb-16'}`}>
        <Routes>
          {/* Ruta pública */}
          <Route path="/login" element={<LoginPage />} />

          {/* Rutas protegidas */}
          <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
          <Route path="/exercises" element={<ProtectedRoute><ExercisesPage /></ProtectedRoute>} />
          <Route path="/routine/:id" element={<ProtectedRoute><RoutineDetailPage /></ProtectedRoute>} />
          <Route path="/workout/:sessionId" element={<ProtectedRoute><ActiveWorkoutPage /></ProtectedRoute>} />
          <Route path="/history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
          <Route path="/history/:sessionId" element={<ProtectedRoute><SessionDetailPage /></ProtectedRoute>} />
          <Route path="/progress" element={<ProtectedRoute><ProgressPage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
        </Routes>
      </main>
      <BottomNav />
      <InstallPrompt />
      <SpeedInsights />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}
