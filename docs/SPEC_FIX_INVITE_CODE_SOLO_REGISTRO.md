# Spec: Fix código de invitación — solo requerido para registro

## Contexto

`LoginPage` tiene dos steps: `'invite'` y `'auth'`. Actualmente el step inicial
se lee de `sessionStorage`, que se borra al cerrar la pestaña. El resultado es que
el código se pide en cada nueva sesión del browser, incluso a usuarios que ya
tienen cuenta y solo quieren hacer login.

El código de invitación es un requisito de **registro**, no de **login**. Un
usuario que ya tiene cuenta no debería verlo nunca más.

**Solo se modifica `src/pages/LoginPage.tsx`. Ningún otro archivo.**

---

## Lógica nueva

El step inicial siempre es `'auth'` — la pantalla de login es lo primero que ve
el usuario. El paso de código solo aparece cuando el usuario toca
"¿No tenés cuenta? Registrate".

Flujos resultantes:

- **Login con email/password** → directo, sin código
- **Login con Google** → directo, sin código
- **Registro** → primero el código, luego el form de registro
- **Registro exitoso** → en futuros ingresos siempre hace login, nunca vuelve a ver el código

El `sessionStorage` se mantiene para no pedir el código dos veces si el usuario
navega para atrás dentro de la misma sesión del browser (por ejemplo: empieza
a registrarse, va atrás, vuelve a tocar "Registrate").

---

## Cambios en `src/pages/LoginPage.tsx`

### 1. Estado inicial del step

```ts
// ANTES
const [step, setStep] = useState<'invite' | 'auth'>(() =>
  sessionStorage.getItem('invite-validated') === '1' ? 'auth' : 'invite'
);

// DESPUÉS
const [step, setStep] = useState<'invite' | 'auth'>('auth');
```

El step siempre arranca en `'auth'`. El `sessionStorage` ya no controla el step
inicial — lo usamos solo dentro de la misma sesión para no pedir el código dos veces.

### 2. Handler del toggle login/registro

```ts
// ANTES
onClick={() => {
  setAuthMode(m => m === 'login' ? 'register' : 'login');
  setAuthError('');
  setRegisterSuccess(false);
}}

// DESPUÉS
onClick={() => {
  if (authMode === 'login') {
    // Cambia a registro — pedir código si no fue validado en esta sesión
    setAuthMode('register');
    if (sessionStorage.getItem('invite-validated') !== '1') {
      setStep('invite');
    }
  } else {
    // Vuelve a login — nunca pide código
    setAuthMode('login');
  }
  setAuthError('');
  setRegisterSuccess(false);
}}
```

### 3. `handleInviteSubmit` — al validar, volver al form de registro

No cambia la validación, solo el destino. Como `authMode` ya fue seteado a
`'register'` antes de ir al paso `'invite'`, al volver a `'auth'` el form ya
muestra el formulario de registro directamente.

```ts
// Sin cambios en la lógica de validación — solo confirmar que setStep('auth') 
// es lo que ya hace. No hay cambio necesario aquí.
function handleInviteSubmit() {
  const valid = import.meta.env.VITE_INVITE_CODE as string;
  if (inviteInput.trim().toUpperCase() === valid.toUpperCase()) {
    sessionStorage.setItem('invite-validated', '1');
    setStep('auth'); // vuelve al form — authMode ya es 'register'
  } else {
    setInviteError('Código incorrecto');
  }
}
```

### 4. Agregar botón "Volver" en el paso invite

Cuando el usuario está en el paso del código y quiere cancelar, necesita poder
volver. Agregar un botón al final del step `'invite'` que regresa a login:

```tsx
{/* Dentro del JSX del step 'invite', después del botón "Continuar" */}
<button
  onClick={() => {
    setStep('auth');
    setAuthMode('login');
    setInviteInput('');
    setInviteError('');
  }}
  className="text-sm text-slate-500 hover:text-slate-400 text-center"
>
  ← Volver al inicio de sesión
</button>
```

---

## Resumen de todos los cambios

| # | Qué | Dónde |
|---|-----|-------|
| 1 | Step inicial siempre `'auth'` | `useState` inicial |
| 2 | Toggle a registro → ir a `'invite'` si no validado | `onClick` del toggle |
| 3 | `handleInviteSubmit` sin cambios funcionales | (verificar que ya hace `setStep('auth')`) |
| 4 | Botón "Volver" en step `'invite'` | JSX del step invite |

---

## Verificación

```bash
npx tsc --noEmit
npm run build
```

Probar manualmente los tres flujos:
1. Login con cuenta existente → no debe aparecer el paso del código
2. Registro nuevo → debe aparecer el paso del código antes del form
3. Código incorrecto → debe mostrar error y permitir reintentar
4. Botón "Volver" desde el paso del código → debe volver a la pantalla de login

---

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `src/pages/LoginPage.tsx` | 4 cambios puntuales descritos arriba |

## Archivos que NO se tocan

- Cualquier otro archivo del proyecto

---

## Workflow ClickUp obligatorio

1. Crear tarea en ClickUp lista `901711957073` con título:
   `fix: código de invitación solo requerido para registro`
2. Implementar los 4 cambios en orden
3. Commitear con mensaje que incluya `CU-<task_id>` al final
4. Marcar tarea como completada en ClickUp
5. Crear `/tmp/claude_ready_for_testing.txt` con resumen de cambios realizados
