import { Routes, Route } from 'react-router-dom';
import BottomNav from '@/components/BottomNav';
import HomePage from '@/pages/HomePage';
import WorkoutsPage from '@/pages/WorkoutsPage';
import ExercisesPage from '@/pages/ExercisesPage';
import HistoryPage from '@/pages/HistoryPage';
import ProfilePage from '@/pages/ProfilePage';

export default function App() {
  return (
    <div className="flex flex-col min-h-full max-w-lg mx-auto">
      <main className="flex-1 overflow-y-auto pb-16">
        <Routes>
          <Route path="/"           element={<HomePage />} />
          <Route path="/workouts"   element={<WorkoutsPage />} />
          <Route path="/exercises"  element={<ExercisesPage />} />
          <Route path="/history"    element={<HistoryPage />} />
          <Route path="/profile"    element={<ProfilePage />} />
        </Routes>
      </main>
      <BottomNav />
    </div>
  );
}
