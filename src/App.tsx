import { Routes, Route, useLocation } from 'react-router-dom';
import BottomNav from '@/components/BottomNav';
import HomePage from '@/pages/HomePage';
import ExercisesPage from '@/pages/ExercisesPage';
import RoutineDetailPage from '@/pages/RoutineDetailPage';
import ActiveWorkoutPage from '@/pages/ActiveWorkoutPage';
import HistoryPage from '@/pages/HistoryPage';
import SessionDetailPage from '@/pages/SessionDetailPage';
import ProgressPage from '@/pages/ProgressPage';
import { useEffect } from "react";
//import { seedExercises } from "@/db/seed";
//import { seedFullRoutine } from "@/db/seedFullRoutine";
import { SettingsPage } from "@/pages/SettingsPage";
import { db } from "@/db/database";

;(window as any).db = db

export default function App() {
  const location = useLocation();
  const fullscreen = location.pathname.startsWith('/routine/') || location.pathname.startsWith('/workout/');

  useEffect(() => {
    async function init() {
      console.log("🚀 RUNNING SEED")

      // await seedExercises()
      // await seedFullRoutine()

      console.log("✅ SEED DONE")
    }

    init().catch(console.error)
  }, [])

  return (
    <div className="flex flex-col min-h-full max-w-lg mx-auto">
      <main className={`flex-1 overflow-y-auto ${fullscreen ? '' : 'pb-16'}`}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/exercises" element={<ExercisesPage />} />
          <Route path="/routine/:id" element={<RoutineDetailPage />} />
          <Route path="/workout/:sessionId" element={<ActiveWorkoutPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/history/:sessionId" element={<SessionDetailPage />} />
          <Route path="/progress" element={<ProgressPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
      <BottomNav />
    </div>
  );
}
