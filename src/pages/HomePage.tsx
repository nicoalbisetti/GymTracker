import { useNavigate } from 'react-router-dom';

export default function HomePage() {
  const navigate = useNavigate();
  const today = new Date().toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <p className="text-sm text-gray-400 capitalize">{today}</p>
        <h1 className="text-3xl font-bold text-gray-900">GymTracker</h1>
      </div>

      <button
        onClick={() => navigate('/workouts')}
        className="w-full bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white rounded-2xl p-5 flex items-center gap-4 transition-colors"
      >
        <span className="text-4xl">💪</span>
        <div className="text-left">
          <p className="font-semibold text-lg">Nuevo entreno</p>
          <p className="text-primary-100 text-sm">Empezar sesión de hoy</p>
        </div>
      </button>

      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => navigate('/history')}
          className="bg-gray-50 rounded-2xl p-4 flex flex-col gap-2 active:bg-gray-100"
        >
          <span className="text-3xl">📅</span>
          <p className="font-semibold text-gray-800">Historial</p>
          <p className="text-xs text-gray-400">Ver entrenos anteriores</p>
        </button>
        <button
          onClick={() => navigate('/exercises')}
          className="bg-gray-50 rounded-2xl p-4 flex flex-col gap-2 active:bg-gray-100"
        >
          <span className="text-3xl">📋</span>
          <p className="font-semibold text-gray-800">Ejercicios</p>
          <p className="text-xs text-gray-400">Gestionar ejercicios</p>
        </button>
      </div>
    </div>
  );
}
