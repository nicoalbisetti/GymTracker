import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { upsertProfile } from '@/services/profileService';
import type { UserGoal, UserExperience } from '@/types/profile';

const GOALS: { value: UserGoal; label: string }[] = [
  { value: 'hypertrophy', label: 'Ganar músculo' },
  { value: 'strength', label: 'Ganar fuerza' },
  { value: 'endurance', label: 'Resistencia' },
  { value: 'weight_loss', label: 'Bajar de peso' },
];

const EXPERIENCES: { value: UserExperience; label: string; sub: string }[] = [
  { value: 'beginner', label: 'Principiante', sub: 'menos de 1 año' },
  { value: 'intermediate', label: 'Intermedio', sub: '1–3 años' },
  { value: 'advanced', label: 'Avanzado', sub: 'más de 3 años' },
];

export default function OnboardingModal() {
  const { user, refreshProfile } = useAuth();
  const [selectedGoal, setSelectedGoal] = useState<UserGoal | null>(null);
  const [selectedExp, setSelectedExp] = useState<UserExperience | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleConfirm() {
    if (!selectedGoal || !selectedExp || !user) return;
    setSaving(true);
    try {
      await upsertProfile(user.id, { goal: selectedGoal, experience: selectedExp });
      await refreshProfile();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-sm bg-slate-800 rounded-2xl p-6 space-y-6">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-white">Antes de empezar</h2>
          <p className="text-sm text-slate-400">
            Cuéntanos un poco sobre ti para personalizar tu experiencia.
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-300">¿Cuál es tu objetivo?</p>
          <div className="grid grid-cols-2 gap-2">
            {GOALS.map((g) => (
              <button
                key={g.value}
                onClick={() => setSelectedGoal(g.value)}
                className={`py-3 px-3 rounded-xl text-sm font-medium border transition-colors ${
                  selectedGoal === g.value
                    ? 'bg-violet-600 border-violet-500 text-white'
                    : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-300">¿Cuánta experiencia tenés?</p>
          <div className="space-y-2">
            {EXPERIENCES.map((e) => (
              <button
                key={e.value}
                onClick={() => setSelectedExp(e.value)}
                className={`w-full flex justify-between items-center py-3 px-4 rounded-xl text-sm border transition-colors ${
                  selectedExp === e.value
                    ? 'bg-violet-600 border-violet-500 text-white'
                    : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600'
                }`}
              >
                <span className="font-medium">{e.label}</span>
                <span className={`text-xs ${selectedExp === e.value ? 'text-violet-200' : 'text-slate-500'}`}>
                  {e.sub}
                </span>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleConfirm}
          disabled={!selectedGoal || !selectedExp || saving}
          className="w-full py-3 rounded-xl font-semibold text-white bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? 'Guardando...' : 'Continuar'}
        </button>
      </div>
    </div>
  );
}
