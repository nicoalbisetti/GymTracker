import { NavLink, useLocation } from 'react-router-dom';

const tabs = [
  { to: '/',          label: 'Rutinas',    icon: '💪' },
  { to: '/exercises', label: 'Ejercicios', icon: '📋' },
  { to: '/history',   label: 'Historial',  icon: '📅' },
  { to: '/progress',  label: 'Progresión', icon: '📈' },
];

export default function BottomNav() {
  const location = useLocation();
  if (location.pathname.startsWith('/routine/') || location.pathname.startsWith('/workout/')) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center h-16 z-40 max-w-lg mx-auto">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === '/'}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center flex-1 h-full text-xs gap-0.5 transition-colors ${
              isActive ? 'text-primary-500' : 'text-gray-400'
            }`
          }
        >
          <span className="text-xl leading-none">{tab.icon}</span>
          <span>{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
