import type { ChatMessage, UserContext } from '@/types/ai';

const MODEL = 'claude-haiku-4-5';
const MAX_TOKENS = 1024;

function buildSystemPrompt(ctx: UserContext): string {
  const goalMap: Record<string, string> = {
    hypertrophy: 'ganar músculo',
    strength: 'ganar fuerza',
    endurance: 'mejorar resistencia',
    weight_loss: 'bajar de peso',
  };
  const expMap: Record<string, string> = {
    beginner: 'principiante',
    intermediate: 'intermedio',
    advanced: 'avanzado',
  };

  const goal = ctx.profile.goal
    ? (goalMap[ctx.profile.goal] ?? ctx.profile.goal)
    : 'no especificado';
  const exp = ctx.profile.experience
    ? (expMap[ctx.profile.experience] ?? ctx.profile.experience)
    : 'no especificado';
  const weight = ctx.profile.weightKg ? `${ctx.profile.weightKg} kg` : 'no especificado';

  const muscleLines = Object.entries(ctx.last30days.muscleFrequency)
    .sort(([, a], [, b]) => b - a)
    .map(([m, count]) => `  - ${m}: ${count} sesión${count !== 1 ? 'es' : ''}`)
    .join('\n');

  const exerciseLines = ctx.last30days.topExercises
    .map(
      (e) =>
        `  - ${e.name} (${e.muscle}): máx ${e.maxWeight} kg, ${e.sessionCount} sesión${e.sessionCount !== 1 ? 'es' : ''}`
    )
    .join('\n');

  const routineLines = ctx.routines.length === 0
    ? '  (sin rutinas definidas)'
    : ctx.routines
        .map((r) => {
          const exList = r.exercises.map((e) => `${e.name} (${e.muscle})`).join(', ');
          return `  - ${r.name}: ${exList || '(sin ejercicios)'}`;
        })
        .join('\n');

  return `Sos un asistente de entrenamiento para GymTracker. Respondés en español rioplatense, de forma concisa y práctica.

## Perfil del usuario
- Objetivo: ${goal}
- Nivel: ${exp}
- Peso corporal: ${weight}

## Rutinas definidas
${routineLines}

## Actividad últimos 30 días
- Sesiones completadas: ${ctx.last30days.totalSessions}
- Duración promedio: ${ctx.last30days.avgDurationMinutes} minutos
- Músculos entrenados:
${muscleLines || '  (sin datos)'}

## Ejercicios frecuentes
${exerciseLines || '  (sin datos)'}

## Historial total
- Total de sesiones: ${ctx.allTime.totalSessions}
- Primera sesión: ${ctx.allTime.firstSessionDate ?? 'sin datos'}

Respondé preguntas sobre el entrenamiento del usuario basándote en estos datos. Sé directo y accionable. No inventes datos que no estén en el contexto.`;
}

export async function sendChatMessage(
  messages: ChatMessage[],
  ctx: UserContext
): Promise<string> {
  const apiMessages = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: buildSystemPrompt(ctx),
      messages: apiMessages,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as { error?: { message?: string } })?.error?.message ?? `HTTP ${response.status}`);
  }

  const data = await response.json();
  return (data.content?.[0]?.text as string) ?? '';
}
