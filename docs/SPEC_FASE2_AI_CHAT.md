# Spec: Fase 2 — Chat IA de análisis de entrenamiento

## Contexto del proyecto

GymTracker es una SPA Vite + React 19 + TypeScript strict + Tailwind + Supabase.
La Fase 1 ya implementó `user_profiles`, planes y el hook `useAiAccess`.
AuthContext expone: `session`, `user`, `loading`, `signOut`, `profile`, `profileLoading`, `refreshProfile`.

Este spec agrega:
1. Función `buildUserContext()` que genera un resumen comprimido del historial
2. Página `/ai` con chat conversacional contra Claude API
3. Control de acceso por plan (solo `pro`) con contador de consultas
4. Acceso desde BottomNav solo para usuarios `pro`

NO se modifica ninguna lógica de entrenamiento existente.

---

## Paso 0 — Variable de entorno (MANUAL)

Agregar en `.env.local` y en Vercel (Settings → Environment Variables):

```
VITE_ANTHROPIC_API_KEY=<tu api key de Anthropic>
```

Documentar esto en `docs/SPEC_FASE2_AI_CHAT.md` como nota manual.

> **Advertencia de seguridad:** Exponer la API key en el frontend es aceptable
> para un MVP personal donde el acceso ya está restringido por Supabase Auth +
> plan `pro`. Para producción pública se debería mover a un edge function.
> Claude Code NO debe crear ningún backend/proxy en este spec.

---

## Paso 1 — Tipos del chat

### Archivo a crear: `src/types/ai.ts`

```ts
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface UserContext {
  profile: {
    goal: string | null;
    experience: string | null;
    weightKg: number | null;
  };
  last30days: {
    totalSessions: number;
    avgDurationMinutes: number;
    muscleFrequency: Record<string, number>;  // { 'Pecho': 4, 'Espalda': 5, ... }
    topExercises: Array<{
      name: string;
      muscle: string;
      maxWeight: number;
      sessionCount: number;
    }>;
  };
  allTime: {
    totalSessions: number;
    firstSessionDate: string | null;
  };
}
```

---

## Paso 2 — Función buildUserContext

### Archivo a crear: `src/services/aiContextService.ts`

Esta función consulta Supabase para construir un resumen estadístico comprimido.
El objetivo es minimizar tokens: NO se envían registros crudos al LLM.

```ts
import { supabase } from '@/lib/supabase';
import type { UserContext } from '@/types/ai';
import type { UserProfile } from '@/types/profile';

export async function buildUserContext(
  userId: string,
  profile: UserProfile
): Promise<UserContext> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const cutoff = thirtyDaysAgo.toISOString();

  // 1. Sesiones totales y primera sesión (all time)
  const { data: allSessions } = await supabase
    .from('workout_sessions')
    .select('id, started_at, finished_at')
    .eq('user_id', userId)
    .not('finished_at', 'is', null);

  const totalSessions = allSessions?.length ?? 0;
  const firstSessionDate = allSessions && allSessions.length > 0
    ? allSessions.sort((a, b) => a.started_at.localeCompare(b.started_at))[0].started_at.slice(0, 10)
    : null;

  // 2. Sesiones últimos 30 días
  const recentSessions = (allSessions ?? []).filter(s => s.started_at >= cutoff);
  const avgDurationMinutes = recentSessions.length === 0 ? 0 : Math.round(
    recentSessions
      .filter(s => s.finished_at)
      .reduce((sum, s) => {
        const mins = (new Date(s.finished_at!).getTime() - new Date(s.started_at).getTime()) / 60000;
        return sum + mins;
      }, 0) / recentSessions.length
  );

  // 3. Registros de series últimos 30 días
  const { data: recentRecords } = await supabase
    .from('workout_set_records')
    .select('exercise_name, muscle_group, weight, session_id, completed_at')
    .eq('user_id', userId)
    .gte('completed_at', cutoff);

  const records = recentRecords ?? [];

  // Frecuencia por grupo muscular (sesiones únicas)
  const muscleSessionMap: Record<string, Set<string>> = {};
  for (const r of records) {
    if (!muscleSessionMap[r.muscle_group]) muscleSessionMap[r.muscle_group] = new Set();
    muscleSessionMap[r.muscle_group].add(r.session_id);
  }
  const muscleFrequency: Record<string, number> = {};
  for (const [muscle, sessions] of Object.entries(muscleSessionMap)) {
    muscleFrequency[muscle] = sessions.size;
  }

  // Top ejercicios: peso máximo y cantidad de sesiones
  const exerciseMap: Record<string, { muscle: string; maxWeight: number; sessions: Set<string> }> = {};
  for (const r of records) {
    if (!exerciseMap[r.exercise_name]) {
      exerciseMap[r.exercise_name] = { muscle: r.muscle_group, maxWeight: 0, sessions: new Set() };
    }
    exerciseMap[r.exercise_name].maxWeight = Math.max(exerciseMap[r.exercise_name].maxWeight, Number(r.weight));
    exerciseMap[r.exercise_name].sessions.add(r.session_id);
  }

  const topExercises = Object.entries(exerciseMap)
    .map(([name, data]) => ({
      name,
      muscle: data.muscle,
      maxWeight: data.maxWeight,
      sessionCount: data.sessions.size,
    }))
    .sort((a, b) => b.sessionCount - a.sessionCount)
    .slice(0, 10); // máximo 10 ejercicios para no inflar el contexto

  return {
    profile: {
      goal: profile.goal,
      experience: profile.experience,
      weightKg: profile.weightKg,
    },
    last30days: {
      totalSessions: recentSessions.length,
      avgDurationMinutes,
      muscleFrequency,
      topExercises,
    },
    allTime: {
      totalSessions,
      firstSessionDate,
    },
  };
}
```

---

## Paso 3 — Servicio de llamada a Claude API

### Archivo a crear: `src/services/claudeService.ts`

```ts
import type { ChatMessage, UserContext } from '@/types/ai';

const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY as string;
const MODEL = 'claude-sonnet-4-20250514';
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

  const goal = ctx.profile.goal ? goalMap[ctx.profile.goal] ?? ctx.profile.goal : 'no especificado';
  const exp = ctx.profile.experience ? expMap[ctx.profile.experience] ?? ctx.profile.experience : 'no especificado';
  const weight = ctx.profile.weightKg ? `${ctx.profile.weightKg} kg` : 'no especificado';

  const muscleLines = Object.entries(ctx.last30days.muscleFrequency)
    .sort(([, a], [, b]) => b - a)
    .map(([m, count]) => `  - ${m}: ${count} sesión${count !== 1 ? 'es' : ''}`)
    .join('\n');

  const exerciseLines = ctx.last30days.topExercises
    .map(e => `  - ${e.name} (${e.muscle}): máx ${e.maxWeight} kg, ${e.sessionCount} sesión${e.sessionCount !== 1 ? 'es' : ''}`)
    .join('\n');

  return `Sos un asistente de entrenamiento para GymTracker. Respondés en español rioplatense, de forma concisa y práctica.

## Perfil del usuario
- Objetivo: ${goal}
- Nivel: ${exp}
- Peso corporal: ${weight}

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
  if (!API_KEY) throw new Error('VITE_ANTHROPIC_API_KEY no configurada');

  const apiMessages = messages.map(m => ({
    role: m.role,
    content: m.content,
  }));

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-client-side-key-allowed': 'true',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: buildSystemPrompt(ctx),
      messages: apiMessages,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as any)?.error?.message ?? `HTTP ${response.status}`);
  }

  const data = await response.json();
  return data.content?.[0]?.text ?? '';
}
```

---

## Paso 4 — Página AiChatPage

### Archivo a crear: `src/pages/AiChatPage.tsx`

Página completa de chat. Flujo:
1. Al montar: verificar `canUseAi` con `useAiAccess()`. Si `false`, mostrar pantalla de bloqueo.
2. Si tiene acceso: llamar `buildUserContext()` una sola vez y guardar en estado.
3. Interfaz de chat estándar: lista de mensajes + input fijo al fondo.
4. Al enviar: agregar mensaje del usuario, llamar `sendChatMessage`, agregar respuesta, llamar `incrementAiQueries` + `refreshProfile`.

#### Estado interno:
```ts
const [messages, setMessages] = useState<ChatMessage[]>([]);
const [userCtx, setUserCtx] = useState<UserContext | null>(null);
const [ctxLoading, setCtxLoading] = useState(true);
const [input, setInput] = useState('');
const [sending, setSending] = useState(false);
const [error, setError] = useState<string | null>(null);
const messagesEndRef = useRef<HTMLDivElement>(null);
```

#### Mensaje inicial del sistema (no del usuario):
Al cargar el contexto con éxito, agregar un mensaje inicial del asistente:
```ts
{
  id: 'welcome',
  role: 'assistant',
  content: '¡Hola! Puedo analizar tu entrenamiento de los últimos 30 días. ¿Qué querés saber?',
  createdAt: new Date().toISOString(),
}
```

#### Handler de envío:
```ts
async function handleSend() {
  if (!input.trim() || sending || !userCtx || !user) return;

  const userMsg: ChatMessage = {
    id: crypto.randomUUID(),
    role: 'user',
    content: input.trim(),
    createdAt: new Date().toISOString(),
  };

  const nextMessages = [...messages, userMsg];
  setMessages(nextMessages);
  setInput('');
  setSending(true);
  setError(null);

  try {
    const reply = await sendChatMessage(nextMessages, userCtx);
    setMessages(prev => [...prev, {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: reply,
      createdAt: new Date().toISOString(),
    }]);
    await incrementAiQueries(user.id);
    await refreshProfile();
  } catch (err) {
    setError('Error al conectar con el asistente. Intentá de nuevo.');
  } finally {
    setSending(false);
  }
}
```

#### Auto-scroll:
```ts
useEffect(() => {
  messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
}, [messages]);
```

#### Pantalla de bloqueo (plan free):
Si `!canUseAi` mostrar una pantalla centrada con:
- Ícono de candado (`Lock` de lucide-react)
- Título: "Feature Pro"
- Descripción: "El análisis con IA está disponible para usuarios Pro."
- Sin botón de upgrade (el admin activa el plan desde Supabase)

#### Contador visible:
En el header de la página mostrar `${queriesLeft} consultas restantes` solo si `isPro`.

#### Layout general:
```tsx
<div className="flex flex-col h-full">
  {/* Header fijo */}
  <div className="bg-slate-900 border-b border-slate-800 px-4 py-4 flex items-center justify-between">
    <h1 className="text-lg font-bold text-white">Asistente IA</h1>
    {isPro && (
      <span className="text-xs text-slate-400">{queriesLeft} consultas restantes</span>
    )}
  </div>

  {/* Lista de mensajes — scrolleable */}
  <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
    {/* mensajes */}
    <div ref={messagesEndRef} />
  </div>

  {/* Input fijo al fondo */}
  <div className="border-t border-slate-800 px-4 py-3 bg-slate-900">
    {/* input + botón enviar */}
  </div>
</div>
```

#### Burbuja de mensaje usuario:
- Alineada a la derecha
- `bg-primary-500 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[80%]`

#### Burbuja de mensaje asistente:
- Alineada a la izquierda
- `bg-slate-800 text-slate-100 rounded-2xl rounded-tl-sm px-4 py-2.5 max-w-[85%]`

#### Input de texto:
- `textarea` de una línea que expande hasta 3 líneas con `onKeyDown` que envía con Enter (sin shift)
- Botón de enviar con ícono `Send` de lucide-react, deshabilitado si `sending` o `input` vacío

---

## Paso 5 — Ruta en App.tsx

### Archivo a modificar: `src/App.tsx`

Agregar import y ruta:

```tsx
import AiChatPage from '@/pages/AiChatPage';

// Dentro de <Routes>:
<Route path="/ai" element={<ProtectedRoute><AiChatPage /></ProtectedRoute>} />
```

No modificar nada más del archivo.

---

## Paso 6 — BottomNav

### Archivo a modificar: `src/components/BottomNav.tsx`

Agregar tab de IA **solo visible para usuarios `pro`**.

```tsx
import { useAiAccess } from '@/hooks/useAiAccess';

// Dentro del componente:
const { isPro } = useAiAccess();
```

Agregar el tab condicionalmente en el array de tabs o en el JSX:
- Ícono: `Sparkles` de lucide-react
- Label: "IA"
- Ruta: `/ai`
- Solo renderizar si `isPro === true`

El tab debe insertarse entre "Progresión" y "Ajustes" (o al final si Settings no está en el nav).

---

## Paso 7 — Verificación

```bash
npx tsc --noEmit
npm run build
```

Sin errores ni warnings de TypeScript strict.

---

## Resumen de archivos

### Creados

| Archivo | Descripción |
|---|---|
| `src/types/ai.ts` | Tipos ChatMessage y UserContext |
| `src/services/aiContextService.ts` | buildUserContext — resumen estadístico |
| `src/services/claudeService.ts` | sendChatMessage — llamada a Claude API |
| `src/pages/AiChatPage.tsx` | Página de chat completa |

### Modificados

| Archivo | Cambio |
|---|---|
| `src/App.tsx` | + ruta `/ai` |
| `src/components/BottomNav.tsx` | + tab IA condicional para pro |

### No se tocan

- Todo `src/services/` existente
- Todo `src/pages/` existente
- `src/types/index.ts`
- `src/context/AuthContext.tsx`
- `src/db/`
- `vite.config.ts`

---

## Notas para Claude Code

- El header `anthropic-dangerous-client-side-key-allowed: true` es requerido por
  la API de Anthropic cuando la key se usa desde el browser. Sin este header la
  request falla con 403.
- `buildUserContext` hace 2 queries a Supabase (sessions + set_records). No hacer
  más queries — el objetivo es minimizar tokens y latencia.
- El historial de mensajes que se envía a Claude crece con cada turno. No hay
  límite implementado en este spec — con `max_tokens: 1024` y conversaciones
  típicas de gym, el context window no debería ser un problema a corto plazo.
- `incrementAiQueries` se llama DESPUÉS de recibir la respuesta exitosa, no antes.
  Si la llamada a Claude falla, no se descuenta la consulta.
- TypeScript strict: `crypto.randomUUID()` está disponible en browsers modernos.
  Si el linter se queja, castear `self.crypto.randomUUID()`.

## Workflow ClickUp obligatorio

1. Crear tarea en ClickUp lista `901711957073` con título:
   `feat: chat IA de análisis de entrenamiento — Fase 2`
2. Implementar todos los pasos en orden
3. Commitear con mensaje que incluya `CU-<task_id>` al final
4. Marcar tarea como completada en ClickUp
5. Crear `/tmp/claude_ready_for_testing.txt` con resumen de cambios realizados
