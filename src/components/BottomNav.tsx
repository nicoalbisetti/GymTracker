import { NavLink, useLocation } from 'react-router-dom';
import { Dumbbell, ListChecks, CalendarDays, TrendingUp } from 'lucide-react';

const tabs = [
  { to: '/',          label: 'Rutinas',    Icon: Dumbbell },
  { to: '/exercises', label: 'Ejercicios', Icon: ListChecks },
  { to: '/history',   label: 'Historial',  Icon: CalendarDays },
  { to: '/progress',  label: 'Progresión', Icon: TrendingUp },
];

export default function BottomNav() {
  const location = useLocation();
  if (location.pathname.startsWith('/routine/') || location.pathname.startsWith('/workout/')) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur border-t border-slate-800 flex justify-around items-center h-16 z-40 max-w-lg mx-auto safe-area-bottom">
      {tabs.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors ${
              isActive ? 'text-primary-400' : 'text-slate-500'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <div className={`p-1.5 rounded-xl transition-colors ${isActive ? 'bg-primary-500/20' : ''}`}>
                <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
              </div>
              <span className={`text-[10px] font-medium tracking-tight ${isActive ? 'text-primary-400' : 'text-slate-500'}`}>
                {label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
