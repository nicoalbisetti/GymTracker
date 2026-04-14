import { useState } from 'react';
import { Settings } from 'lucide-react';
import { ImportWorkout } from '@/components/ImportWorkout';
import { ExportImportDB } from '@/components/ExportImportDB';
import { useAuth } from '@/context/AuthContext';
import { useAiAccess } from '@/hooks/useAiAccess';
import { upsertProfile } from '@/services/profileService';
import type { UserGoal, UserExperience } from '@/types/profile';

const GOAL_LABELS: Record<UserGoal, string> = {
  hypertrophy: 'Ganar músculo',
  strength: 'Ganar fuerza',
  endurance: 'Resistencia',
  weight_loss: 'Bajar de peso',
};

const EXPERIENCE_LABELS: Record<UserExperience, string> = {
  beginner: 'Principiante',
  intermediate: 'Intermedio',
  advanced: 'Avanzado',
};

export function SettingsPage() {
  const { user, profile, refreshProfile } = useAuth();
  const { isPro, queriesUsed, queryLimit } = useAiAccess();

  const [goal, setGoal] = useState<UserGoal | ''>(profile?.goal ?? '');
  const [experience, setExperience] = useState<UserExperience | ''>(profile?.experience ?? '');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    try {
      await upsertProfile(user.id, {
        goal: goal || undefined,
        experience: experience || undefined,
      });
      await refreshProfile();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-purple-500/20 text-purple-400 rounded-xl">
          <Settings size={28} />
        </div>
        <h1 className="text-3xl font-bold text-white">Ajustes</h1>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-200 border-b border-white/10 pb-2">Mi perfil</h2>

        <div className="bg-slate-800 rounded-xl p-4 space-y-4">
          {/* Plan badge */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-400">Plan</span>
            {isPro ? (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-500/20 text-violet-400 border border-violet-500/30">
                Pro
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-700 text-slate-300">
                Free
              </span>
            )}
          </div>

          {/* AI queries counter — pro only */}
          {isPro && (
            <div className="space-y-1.5">
              <p className="text-sm text-slate-400">
                Consultas IA este mes:{' '}
                <span className="text-white font-medium">
                  {queriesUsed} / {queryLimit}
                </span>
              </p>
              <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-violet-500 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (queriesUsed / queryLimit) * 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Goal selector */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-300">Objetivo</label>
            <select
              value={goal}
              onChange={(e) => setGoal(e.target.value as UserGoal | '')}
              className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="">Sin especificar</option>
              {(Object.entries(GOAL_LABELS) as [UserGoal, string][]).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Experience selector */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-300">Experiencia</label>
            <select
              value={experience}
              onChange={(e) => setExperience(e.target.value as UserExperience | '')}
              className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="">Sin especificar</option>
              {(Object.entries(EXPERIENCE_LABELS) as [UserExperience, string][]).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-2.5 rounded-xl font-semibold text-white bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm"
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-200 border-b border-white/10 pb-2">Gestión de Datos</h2>
        <ExportImportDB />
        <ImportWorkout />
      </section>
    </div>
  );
}
