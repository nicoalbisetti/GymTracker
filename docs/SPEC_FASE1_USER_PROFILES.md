# Spec: Fase 1 — user_profiles, planes y hook useAiAccess

## Contexto del proyecto

GymTracker es una SPA Vite + React 19 + TypeScript strict + Tailwind + Supabase.
Auth ya implementada con Supabase (Google OAuth + email/password).
AuthContext en `src/context/AuthContext.tsx` expone: `session`, `user`, `loading`, `signOut`.
SettingsPage ya existe en `src/pages/SettingsPage.tsx`.

Este spec agrega la infraestructura base para features de IA:
1. Tabla `user_profiles` en Supabase con plan y datos de perfil
2. Onboarding al primer login (goal + experience) — funciona tanto para usuarios
   nuevos como para usuarios ya registrados que no completaron el onboarding
3. `profile` y `plan` disponibles en AuthContext
4. Hook `useAiAccess()` para controlar acceso a features de IA
5. Sección de perfil en SettingsPage (solo lectura para el plan — lo setea el admin desde Supabase)

NO se implementa ninguna feature de IA en este spec — solo la base.

---

## Paso 0 — SQL en Supabase (MANUAL, no lo hace Claude Code)

Documentar en `docs/SPEC_USER_PROFILES.md` el siguiente SQL para ejecutar
manualmente en el SQL Editor de Supabase antes de correr el código:

```sql
create table user_profiles (
  id                 uuid primary key references auth.users on delete cascade,
  plan               text not null default 'free',
  goal               text check (goal in ('hypertrophy','strength','endurance','weight_loss')),
  experience         text check (experience in ('beginner','intermediate','advanced')),
  birth_year         smallint,
  weight_kg          numeric,
  preferred_units    text not null default 'kg' check (preferred_units in ('kg','lb')),
  ai_queries_used    smallint not null default 0,
  ai_queries_reset_at date,
  created_at         timestamptz not null default now()
);

alter table user_profiles enable row level security;

create policy "users manage own profile"
  on user_profiles for all using (auth.uid() = id);

-- Función para crear perfil automáticamente al registrarse
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.user_profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

> **Nota:** El trigger solo aplica a usuarios nuevos. Los usuarios ya registrados
> no tienen fila en `user_profiles` todavía — el código maneja este caso
> mostrando el onboarding cuando `profile === null`.

---

## Paso 1 — Tipos TypeScript

### Archivo a crear: `src/types/profile.ts`

```ts
export type UserPlan = 'free' | 'pro';
export type UserGoal = 'hypertrophy' | 'strength' | 'endurance' | 'weight_loss';
export type UserExperience = 'beginner' | 'intermediate' | 'advanced';
export type PreferredUnits = 'kg' | 'lb';

export interface UserProfile {
  id: string;
  plan: UserPlan;
  goal: UserGoal | null;
  experience: UserExperience | null;
  birthYear: number | null;
  weightKg: number | null;
  preferredUnits: PreferredUnits;
  aiQueriesUsed: number;
  aiQueriesResetAt: string | null;
  createdAt: string;
}

export const AI_QUERY_LIMIT: Record<UserPlan, number> = {
  free: 0,
  pro: 20,
};
```

---

## Paso 2 — Servicio de perfil

### Archivo a crear: `src/services/profileService.ts`

```ts
import { supabase } from '@/lib/supabase';
import type { UserProfile, UserGoal, UserExperience, PreferredUnits } from '@/types/profile';

function mapProfile(row: any): UserProfile {
  return {
    id: row.id,
    plan: row.plan,
    goal: row.goal ?? null,
    experience: row.experience ?? null,
    birthYear: row.birth_year ?? null,
    weightKg: row.weight_kg ? Number(row.weight_kg) : null,
    preferredUnits: row.preferred_units,
    aiQueriesUsed: row.ai_queries_used,
    aiQueriesResetAt: row.ai_queries_reset_at ?? null,
    createdAt: row.created_at,
  };
}

export async function getProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) return null;
  return mapProfile(data);
}

export async function upsertProfile(
  userId: string,
  updates: Partial<Pick<UserProfile, 'goal' | 'experience' | 'birthYear' | 'weightKg' | 'preferredUnits'>>
): Promise<void> {
  const payload: Record<string, any> = { id: userId };
  if (updates.goal !== undefined) payload.goal = updates.goal;
  if (updates.experience !== undefined) payload.experience = updates.experience;
  if (updates.birthYear !== undefined) payload.birth_year = updates.birthYear;
  if (updates.weightKg !== undefined) payload.weight_kg = updates.weightKg;
  if (updates.preferredUnits !== undefined) payload.preferred_units = updates.preferredUnits;

  const { error } = await supabase
    .from('user_profiles')
    .upsert(payload, { onConflict: 'id' });
  if (error) throw error;
}

export async function incrementAiQueries(userId: string): Promise<void> {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const thisMonth = today.slice(0, 7); // 'YYYY-MM'

  const { data } = await supabase
    .from('user_profiles')
    .select('ai_queries_used, ai_queries_reset_at')
    .eq('id', userId)
    .single();

  if (!data) throw new Error('Profile not found');

  const resetAt = data.ai_queries_reset_at as string | null;
  const shouldReset = !resetAt || resetAt.slice(0, 7) < thisMonth;

  const { error } = await supabase
    .from('user_profiles')
    .update({
      ai_queries_used: shouldReset ? 1 : data.ai_queries_used + 1,
      ai_queries_reset_at: shouldReset ? today : resetAt,
    })
    .eq('id', userId);

  if (error) throw error;
}
```

---

## Paso 3 — Extender AuthContext

### Archivo a modificar: `src/context/AuthContext.tsx`

Agregar `profile`, `profileLoading` y `refreshProfile` al contexto.
No modificar nada de la lógica existente de sesión.

Cambios específicos:

1. Agregar imports:
```ts
import type { UserProfile } from '@/types/profile';
import { getProfile } from '@/services/profileService';
```

2. Agregar al interface `AuthContextValue`:
```ts
profile: UserProfile | null;
profileLoading: boolean;
refreshProfile: () => Promise<void>;
```

3. Agregar estado interno dentro de `AuthProvider`:
```ts
const [profile, setProfile] = useState<UserProfile | null>(null);
const [profileLoading, setProfileLoading] = useState(false);
```

4. Agregar función `refreshProfile`:
```ts
async function refreshProfile() {
  if (!session?.user) return;
  setProfileLoading(true);
  const p = await getProfile(session.user.id);
  setProfile(p);
  setProfileLoading(false);
}
```

5. En el `useEffect` que escucha `onAuthStateChange`, al recibir una sesión activa:
```ts
// Dentro del handler de onAuthStateChange, cuando session no es null:
if (session?.user) {
  getProfile(session.user.id).then(setProfile);
}
```

6. Exponer los nuevos valores en el Provider value:
```ts
value={{
  session,
  user: session?.user ?? null,
  loading,
  signOut,
  profile,
  profileLoading,
  refreshProfile,
}}
```

---

## Paso 4 — Hook useAiAccess

### Archivo a crear: `src/hooks/useAiAccess.ts`

```ts
import { useAuth } from '@/context/AuthContext';
import { AI_QUERY_LIMIT } from '@/types/profile';

export interface AiAccessResult {
  canUseAi: boolean;
  queriesLeft: number;
  queriesUsed: number;
  queryLimit: number;
  isPro: boolean;
}

export function useAiAccess(): AiAccessResult {
  const { profile } = useAuth();

  if (!profile) {
    return { canUseAi: false, queriesLeft: 0, queriesUsed: 0, queryLimit: 0, isPro: false };
  }

  const limit = AI_QUERY_LIMIT[profile.plan];
  const used = profile.aiQueriesUsed;
  const left = Math.max(0, limit - used);

  return {
    canUseAi: left > 0,
    queriesLeft: left,
    queriesUsed: used,
    queryLimit: limit,
    isPro: profile.plan === 'pro',
  };
}
```

---

## Paso 5 — Pantalla de onboarding

### Archivo a crear: `src/components/OnboardingModal.tsx`

Modal que bloquea la app hasta completar goal + experience.
Se dispara cuando `profile === null` (usuario existente sin perfil)
O cuando `profile.goal === null` (usuario nuevo con perfil vacío).
No se puede saltar.

Estructura visual:
- Overlay oscuro fullscreen con `z-50`
- Card centrada, `bg-slate-800`, `rounded-2xl`, `max-w-sm`, `p-6`
- Título: "Antes de empezar" + subtítulo explicativo
- Selección de **goal** (4 opciones como cards tocables):
  - `hypertrophy` → "Ganar músculo"
  - `strength` → "Ganar fuerza"
  - `endurance` → "Resistencia"
  - `weight_loss` → "Bajar de peso"
- Selección de **experience** (3 opciones como cards tocables):
  - `beginner` → "Principiante" · menos de 1 año
  - `intermediate` → "Intermedio" · 1–3 años
  - `advanced` → "Avanzado" · más de 3 años
- Botón "Continuar" al pie, deshabilitado hasta que ambos estén seleccionados
- Al confirmar: llama `upsertProfile` (crea o actualiza) + `refreshProfile`, luego se cierra

Estado interno:
```ts
const [selectedGoal, setSelectedGoal] = useState<UserGoal | null>(null);
const [selectedExp, setSelectedExp] = useState<UserExperience | null>(null);
const [saving, setSaving] = useState(false);
```

Handler de confirmación:
```ts
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
```

### Integración en `src/components/ProtectedRoute.tsx`

Agregar render del modal. La condición cubre ambos casos:
- `profile === null`: usuario existente sin fila en user_profiles
- `profile.goal === null`: usuario nuevo con perfil vacío (creado por trigger)

```tsx
import OnboardingModal from '@/components/OnboardingModal';
import { useAuth } from '@/context/AuthContext';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading, profile, profileLoading } = useAuth();

  if (loading || profileLoading) return null;
  if (!session) return <Navigate to="/login" replace />;

  const needsOnboarding = !profile || profile.goal === null;

  return (
    <>
      {needsOnboarding && <OnboardingModal />}
      {children}
    </>
  );
}
```

> **Importante:** `children` se renderiza detrás del modal para evitar
> un segundo loading state. El overlay con `z-50` bloquea la interacción.

---

## Paso 6 — Sección de perfil en SettingsPage

### Archivo a modificar: `src/pages/SettingsPage.tsx`

Agregar una sección "Mi perfil" al principio de la página, antes de "Gestión de Datos".

**El plan es de solo lectura** — lo setea el admin directamente desde el dashboard
de Supabase editando la columna `plan` en `user_profiles`. No hay UI de upgrade.

Contenido de la sección:

1. **Badge de plan** — solo informativo:
   - Free: badge gris `bg-slate-700 text-slate-300`
   - Pro: badge violeta `bg-primary-500/20 text-primary-400 border border-primary-500/30`

2. **Contador de consultas IA** — solo visible si `isPro`:
   - Texto: "Consultas IA este mes: X / 20"
   - Barra de progreso visual

3. **Campos editables** (dropdowns `<select>`):
   - Objetivo: las 4 opciones de `UserGoal` con labels en español
   - Experiencia: las 3 opciones de `UserExperience` con labels en español

4. **Botón "Guardar"** — llama `upsertProfile` + `refreshProfile`

Estado local del formulario inicializado desde `profile`:
```ts
const [goal, setGoal] = useState<UserGoal | null>(profile?.goal ?? null);
const [experience, setExperience] = useState<UserExperience | null>(profile?.experience ?? null);
const [saving, setSaving] = useState(false);
```

Usar `useAuth()` para `user`, `profile`, `refreshProfile`.
Usar `useAiAccess()` para `isPro`, `queriesUsed`, `queryLimit`.

---

## Paso 7 — Verificación

```bash
npx tsc --noEmit
npm run build
```

El build debe terminar sin errores ni warnings con TypeScript strict activo.

---

## Resumen de archivos

### Creados

| Archivo | Descripción |
|---|---|
| `src/types/profile.ts` | Tipos UserProfile, planes, constantes |
| `src/services/profileService.ts` | getProfile, upsertProfile, incrementAiQueries |
| `src/hooks/useAiAccess.ts` | Hook de acceso a features IA |
| `src/components/OnboardingModal.tsx` | Modal de primer uso (nuevos y existentes) |
| `docs/SPEC_USER_PROFILES.md` | SQL para ejecutar manualmente en Supabase |

### Modificados

| Archivo | Cambio |
|---|---|
| `src/context/AuthContext.tsx` | + profile, profileLoading, refreshProfile |
| `src/components/ProtectedRoute.tsx` | + render de OnboardingModal |
| `src/pages/SettingsPage.tsx` | + sección Mi perfil (plan read-only + goal/experience editables) |

### No se tocan

- Todo `src/services/` excepto el nuevo `profileService.ts`
- Todo `src/pages/` excepto `SettingsPage.tsx`
- `src/types/index.ts`
- `src/db/`
- `src/App.tsx`
- `vite.config.ts`

---

## Notas para Claude Code

- `getProfile` puede devolver `null` en dos casos: error de red, o usuario existente
  sin fila en `user_profiles`. Ambos se tratan igual — mostrar onboarding.
- `upsertProfile` usa `onConflict: 'id'` — es idempotente, funciona para crear
  y para actualizar sin distinción.
- El reset mensual de `ai_queries_used` ocurre en `incrementAiQueries` comparando
  el mes de `ai_queries_reset_at` con el mes actual. No hay cron job.
- TypeScript strict activo — no usar `any` salvo en los mappers de Supabase
  donde está justificado por ausencia de tipos generados.
- El plan `pro` se activa manualmente desde Supabase editando `user_profiles.plan`.
  No hay integración de pagos en este spec.
- No modificar la lógica de autenticación existente — solo extender el contexto.

---

## Workflow ClickUp obligatorio

1. Crear tarea en ClickUp lista `901711957073` con título:
   `feat: user profiles y planes — Fase 1 IA`
2. Implementar todos los pasos en orden
3. Commitear con mensaje que incluya `CU-<task_id>` al final
4. Marcar tarea como completada en ClickUp
5. Crear `/tmp/claude_ready_for_testing.txt` con resumen de cambios realizados
