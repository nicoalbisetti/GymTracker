import { Routes, Route, useLocation } from 'react-router-dom';
import BottomNav from '@/components/BottomNav';
import HomePage from '@/pages/HomePage';
import ExercisesPage from '@/pages/ExercisesPage';
import RoutineDetailPage from '@/pages/RoutineDetailPage';
import ActiveWorkoutPage from '@/pages/ActiveWorkoutPage';
import HistoryPage from '@/pages/HistoryPage';
import SessionDetailPage from '@/pages/SessionDetailPage';
import ProgressPage from '@/pages/ProgressPage';

export default function App() {
  const location = useLocation();
  const fullscreen = location.pathname.startsWith('/routine/') || location.pathname.startsWith('/workout/');

  return (
    <div className="flex flex-col min-h-full max-w-lg mx-auto">
      <main className={`flex-1 overflow-y-auto ${fullscreen ? '' : 'pb-16'}`}>
        <Routes>
          <Route path="/"                     element={<HomePage />} />
          <Route path="/exercises"            element={<ExercisesPage />} />
          <Route path="/routine/:id"          element={<RoutineDetailPage />} />
          <Route path="/workout/:sessionId"   element={<ActiveWorkoutPage />} />
          <Route path="/history"              element={<HistoryPage />} />
          <Route path="/history/:sessionId"   element={<SessionDetailPage />} />
          <Route path="/progress"             element={<ProgressPage />} />
        </Routes>
      </main>
      <BottomNav />
    </div>
  );
}
