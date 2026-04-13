# Spec: Autenticación con Supabase — Login, Google OAuth y código de invitación

## Contexto

GymTracker es una SPA con Vite 6 + React 19 + TypeScript strict + Tailwind + Dexie/IndexedDB.
Actualmente no tiene autenticación — cualquier persona que acceda a la URL puede usar la app.

Esta iteración agrega:
1. Login con Google OAuth y email/password vía Supabase Auth
2. Un código de invitación hardcodeado que el usuario debe ingresar antes de registrarse
3. Protección de rutas — sin sesión activa, redirigir a `/login`
4. La base de datos Dexie/IndexedDB no se modifica en absoluto

El flujo completo después de este cambio:
```
URL pública → /login → [código de invitación válido] → login/registro → app
```

---

## Variables de entorno

Crear el archivo `.env.local` en la raíz del proyecto con:

```
VITE_SUPABASE_URL=https://rttsihkcfhuxffdsixuc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0dHNpaGtjZmh1eGZmZHNpeHVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwOTU2MDYsImV4cCI6MjA5MTY3MTYwNn0.pVIIZuHYbE0DVU6Fu4dZFVvQyX9PON4yx5tnawcII6M
VITE_INVITE_CODE=GYMTRACKER2025
```

El código de invitación `GYMTRACKER2025` es el hardcodeado inicial. Se puede cambiar
simplemente modificando esta variable — sin tocar código.

Verificar que `.env.local` esté en `.gitignore`. Si no está, agregarlo.

---

## Dependencias a instalar

```bash
npm install @supabase/supabase-js
```

---

## Archivos a crear

| Archivo | Descripción |
|---|---|
| `src/lib/supabase.ts` | Cliente Supabase singleton |
| `src/context/AuthContext.tsx` | Context con estado de sesión global |
| `src/pages/LoginPage.tsx` | Pantalla de login completa |
| `src/components/ProtectedRoute.tsx` | Wrapper que redirige si no hay sesión |

## Archivos a modificar

| Archivo | Cambio |
|---|---|
| `src/App.tsx` | Envolver con AuthProvider, agregar ruta `/login`, proteger rutas existentes |
| `src/main.tsx` | Sin cambios de lógica — solo verificar que no necesita nada |
| `src/components/BottomNav.tsx` | Agregar tab de perfil/logout |
| `.gitignore` | Verificar que `.env.local` está ignorado |

## Archivos que NO se tocan

- Todo `src/db/` — Dexie intacto
- Todo `src/pages/` excepto agregar ruta nueva en App.tsx
- `src/types/index.ts`
- `vite.config.ts`

---

## Tarea 1 — `src/lib/supabase.ts`

Cliente singleton. Leer las variables de entorno de Vite:

```ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan variables de entorno de Supabase');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

---

## Tarea 2 — `src/context/AuthContext.tsx`

Context que expone el estado de sesión a toda la app. Usa `supabase.auth.onAuthStateChange`
para mantenerse sincronizado con Supabase.

```ts
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Obtener sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Suscribirse a cambios de sesión (login, logout, refresh de token)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{
      session,
      user: session?.user ?? null,
      loading,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
```

---

## Tarea 3 — `src/components/ProtectedRoute.tsx`

Wrapper para rutas que requieren sesión activa. Mientras carga muestra nada (evita
flash de contenido). Sin sesión redirige a `/login`.

```tsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();

  if (loading) return null;
  if (!session) return <Navigate to="/login" replace />;

  return <>{children}</>;
}
```

---

## Tarea 4 — `src/pages/LoginPage.tsx`

Página completa de autenticación. Tiene dos pasos:

**Paso 1 — Código de invitación**
El usuario ve un campo para ingresar el código. Si el código no coincide con
`import.meta.env.VITE_INVITE_CODE`, mostrar error. Si coincide, avanzar al paso 2.
Guardar en `sessionStorage` que el código ya fue validado para no pedirlo de nuevo
si el usuario recarga (clave: `'invite-validated'`).

**Paso 2 — Login / Registro**
Dos opciones: Google OAuth y email/password.

Estados internos del componente:
```ts
const [step, setStep] = useState<'invite' | 'auth'>(() =>
  sessionStorage.getItem('invite-validated') === '1' ? 'auth' : 'invite'
);
const [inviteInput, setInviteInput] = useState('');
const [inviteError, setInviteError] = useState('');
const [email, setEmail] = useState('');
const [password, setPassword] = useState('');
const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
const [authError, setAuthError] = useState('');
const [authLoading, setAuthLoading] = useState(false);
```

**Validación del código:**
```ts
function handleInviteSubmit() {
  const valid = import.meta.env.VITE_INVITE_CODE as string;
  if (inviteInput.trim().toUpperCase() === valid.toUpperCase()) {
    sessionStorage.setItem('invite-validated', '1');
    setStep('auth');
  } else {
    setInviteError('Código incorrecto');
  }
}
```

**Login con Google:**
```ts
async function handleGoogleLogin() {
  setAuthLoading(true);
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
    },
  });
  if (error) {
    setAuthError(error.message);
    setAuthLoading(false);
  }
  // Si no hay error, Supabase redirige a Google — no hace falta hacer nada más
}
```

**Login con email/password:**
```ts
async function handleEmailAuth() {
  setAuthLoading(true);
  setAuthError('');
  try {
    if (authMode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setAuthError(error.message);
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setAuthError(error.message);
      else setAuthError(''); // Supabase envía email de confirmación
    }
  } finally {
    setAuthLoading(false);
  }
}
```

Si ya hay sesión activa al montar LoginPage, redirigir a `/`:
```ts
const { session } = useAuth();
if (session) return <Navigate to="/" replace />;
```

**UI — Paso 1 (código de invitación):**
- Fondo oscuro `bg-slate-950`, centrado verticalmente
- Logo/título "GymTracker" arriba
- Card `bg-slate-800` con input para el código y botón "Continuar"
- Mensaje de error en rojo si el código es incorrecto
- Input con `autoCapitalize="characters"` para que el teclado móvil sugiera mayúsculas

**UI — Paso 2 (auth):**
- Misma estructura de card
- Botón "Continuar con Google" con ícono de Google (SVG inline, no librería)
- Separador "o" entre Google y email/password
- Inputs de email y password
- Toggle entre "Iniciar sesión" y "Registrarse"
- Botón submit con loading state
- Mensaje de error en rojo

El ícono de Google en SVG inline:
```tsx
<svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
</svg>
```

Nota sobre registro con email: Supabase por defecto envía un email de confirmación.
Cuando el usuario se registra mostrar un mensaje: "Revisá tu email para confirmar tu cuenta".
No redirigir automáticamente hasta que el usuario confirme.

---

## Tarea 5 — Modificar `src/App.tsx`

Tres cambios:

1. Importar `AuthProvider`, `ProtectedRoute` y `LoginPage`
2. Envolver todo con `<AuthProvider>`
3. Agregar ruta `/login` y proteger las rutas existentes con `<ProtectedRoute>`

```tsx
import { Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import BottomNav from '@/components/BottomNav';
import LoginPage from '@/pages/LoginPage';
import HomePage from '@/pages/HomePage';
import ExercisesPage from '@/pages/ExercisesPage';
import RoutineDetailPage from '@/pages/RoutineDetailPage';
import ActiveWorkoutPage from '@/pages/ActiveWorkoutPage';
import HistoryPage from '@/pages/HistoryPage';
import SessionDetailPage from '@/pages/SessionDetailPage';
import ProgressPage from '@/pages/ProgressPage';
// Agregar también SettingsPage si ya existe en el proyecto

export default function App() {
  const location = useLocation();
  const fullscreen =
    location.pathname.startsWith('/routine/') ||
    location.pathname.startsWith('/workout/');

  return (
    <AuthProvider>
      <div className="flex flex-col min-h-full max-w-lg mx-auto">
        <main className={`flex-1 overflow-y-auto ${fullscreen ? '' : 'pb-16'}`}>
          <Routes>
            {/* Ruta pública */}
            <Route path="/login" element={<LoginPage />} />

            {/* Rutas protegidas */}
            <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
            <Route path="/exercises" element={<ProtectedRoute><ExercisesPage /></ProtectedRoute>} />
            <Route path="/routine/:id" element={<ProtectedRoute><RoutineDetailPage /></ProtectedRoute>} />
            <Route path="/workout/:sessionId" element={<ProtectedRoute><ActiveWorkoutPage /></ProtectedRoute>} />
            <Route path="/history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
            <Route path="/history/:sessionId" element={<ProtectedRoute><SessionDetailPage /></ProtectedRoute>} />
            <Route path="/progress" element={<ProtectedRoute><ProgressPage /></ProtectedRoute>} />
            {/* Si existe SettingsPage agregar también protegida */}
          </Routes>
        </main>
        <BottomNav />
      </div>
    </AuthProvider>
  );
}
```

---

## Tarea 6 — Modificar `src/components/BottomNav.tsx`

Agregar un tab de usuario al final de la lista. Al tocarlo navega a `/settings` si
la página existe, o ejecuta logout directamente si no existe.

Verificar si existe `src/pages/SettingsPage.tsx`:
- **Si existe:** agregar tab con ícono `User` de lucide-react que navega a `/settings`
- **Si no existe:** agregar tab con ícono `LogOut` que llama a `signOut()` del AuthContext

En cualquier caso, agregar el import de `useAuth`:
```ts
import { useAuth } from '@/context/AuthContext';
```

Y dentro del componente:
```ts
const { signOut } = useAuth();
```

El tab de logout/perfil solo se muestra cuando hay sesión (no en `/login`).
La condición de ocultar el nav en `/login` ya está manejada por `ProtectedRoute`
(si no hay sesión no llega a ver el nav), pero por seguridad también agregar
`/login` a la lista de rutas donde el nav se oculta.

---

## Tarea 7 — Variables de entorno en Vercel

El archivo `.env.local` no se sube a Git. Para que el deploy en Vercel funcione,
las variables tienen que cargarse manualmente en Vercel.

Claude Code no puede hacer esto — documentar en un archivo `DEPLOY_ENV.md` en la
raíz del proyecto (gitignored) las variables que hay que agregar en Vercel:

```
En Vercel → proyecto gymtracker → Settings → Environment Variables, agregar:

VITE_SUPABASE_URL        = https://rttsihkcfhuxffdsixuc.supabase.co
VITE_SUPABASE_ANON_KEY   = <la anon key>
VITE_INVITE_CODE         = GYMTRACKER2025
```

Aclarar en el archivo que después de agregar las variables hay que hacer un
redeploy manual desde el dashboard de Vercel (o hacer un nuevo push).

---

## Tarea 8 — Verificación TypeScript

```bash
npx tsc --noEmit
```

Posibles problemas a anticipar:
- `import.meta.env` — Vite lo tipea automáticamente, no hace falta agregar nada
- `Session` y `User` de `@supabase/supabase-js` — importar de ahí, no definir custom
- El `AuthContext` devuelve `null` como default — el hook `useAuth` ya valida esto
  con el throw, no usar el context directamente con `useContext` en ningún otro lado

```bash
npm run build
```

El build debe terminar sin errores y sin warnings de TypeScript.

---

## Checklist de archivos

| Archivo | Estado |
|---|---|
| `.env.local` | creado — no commitear |
| `.gitignore` | verificado — `.env.local` ignorado |
| `src/lib/supabase.ts` | creado |
| `src/context/AuthContext.tsx` | creado |
| `src/pages/LoginPage.tsx` | creado |
| `src/components/ProtectedRoute.tsx` | creado |
| `src/App.tsx` | modificado |
| `src/components/BottomNav.tsx` | modificado |
| `DEPLOY_ENV.md` | creado — no commitear |

## Archivos que NO se modifican

- Todo `src/db/`
- Todo `src/pages/` excepto el nuevo `LoginPage.tsx`
- `src/types/index.ts`
- `vite.config.ts`
- `src/main.tsx`

---

## Notas para Claude Code

- El código de invitación en `sessionStorage` persiste mientras la pestaña está
  abierta pero se limpia al cerrar el browser. Es el comportamiento correcto —
  no queremos que un dispositivo compartido quede desbloqueado para siempre.

- Google OAuth en mobile funciona con redirect (no popup). El `signInWithOAuth`
  de Supabase maneja esto automáticamente — no hace falta detectar mobile.

- Si el usuario se registra con email y no confirma, `supabase.auth.getSession()`
  devuelve `null`. El flujo correcto es mostrar el mensaje de "revisá tu email"
  y no intentar redirigir.

- No agregar `@supabase/auth-helpers-react` ni ningún otro helper — solo
  `@supabase/supabase-js` es suficiente para esta implementación.
