# Spec: Langfuse — Logging de conversaciones AI

## Contexto

GymTracker tiene un chat de IA (`/ai`) donde los usuarios Pro consultan a Claude sobre su entrenamiento.
El proxy de Vercel (`api/chat.ts`) es el único punto del stack donde confluyen el system prompt,
el historial de mensajes y la respuesta de Anthropic.

Esta iteración agrega observabilidad server-side usando Langfuse: cada llamado a Claude queda
registrado con su contexto completo, mensajes, respuesta y métricas de tokens. El objetivo es
poder auditar por qué el agente responde lo que responde para cualquier usuario.

**No se modifica ninguna lógica de entrenamiento, autenticación ni UI existente.**

---

## Paso 0 — Setup manual en Langfuse (NO es tarea de Claude Code)

1. Crear cuenta en https://cloud.langfuse.com
2. Crear un proyecto llamado `gymtracker`
3. Ir a Settings → API Keys → generar un par de keys (secret + public)
4. Agregar las siguientes variables en **Vercel** (Settings → Environment Variables)
   y también en `.env.local` para desarrollo local:

```
LANGFUSE_SECRET_KEY=sk-lf-...
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_HOST=https://cloud.langfuse.com
```

> **Nota:** `LANGFUSE_HOST` puede omitirse si se usa cloud.langfuse.com (es el default),
> pero conviene declararlo explícitamente para facilitar migraciones futuras a self-hosted.

---

## Paso 1 — Instalar dependencia

```bash
npm install langfuse
```

Usar el paquete `langfuse` (no `langfuse-node`, no `@langfuse/langfuse`).
Funciona correctamente en Vercel serverless (Node.js runtime).

---

## Paso 2 — Modificar `api/chat.ts`

**Archivo a modificar:** `api/chat.ts`

Reemplazar el contenido completo del archivo con la siguiente implementación.
Los cambios respecto al original son:

- Import de `Langfuse`
- Destructuring del body para extraer `userId` además de los campos existentes
- Creación de `trace` + `generation` antes del llamado a Anthropic
- Actualización de la `generation` con output y tokens después del llamado
- `langfuse.shutdownAsync()` en el bloque `finally` — **crítico en serverless**

```ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Langfuse } from 'langfuse';

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY no configurada en el servidor' });
  }

  // Inicializar Langfuse por invocación (no como singleton — Vercel es stateless)
  const langfuse = new Langfuse({
    secretKey: process.env.LANGFUSE_SECRET_KEY,
    publicKey: process.env.LANGFUSE_PUBLIC_KEY,
    baseUrl: process.env.LANGFUSE_HOST ?? 'https://cloud.langfuse.com',
  });

  const { model, max_tokens, system, messages, userId } = req.body as {
    model: string;
    max_tokens: number;
    system: string;
    messages: Array<{ role: string; content: string }>;
    userId?: string;
  };

  // Trace agrupa toda la conversación; se puede filtrar por userId en el dashboard
  const trace = langfuse.trace({
    name: 'gymtracker-chat',
    userId: userId ?? 'unknown',
    input: { system, messages },
  });

  // Generation registra el llamado puntual a Anthropic con su input/output
  const generation = trace.generation({
    name: 'claude-response',
    model,
    input: messages,
    systemPrompt: system,
  });

  let anthropicData: unknown;
  let anthropicStatus: number;

  try {
    const response = await fetch(ANTHROPIC_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({ model, max_tokens, system, messages }),
    });

    anthropicStatus = response.status;
    anthropicData = await response.json();

    const data = anthropicData as {
      content?: Array<{ text: string }>;
      usage?: { input_tokens: number; output_tokens: number };
      error?: { message: string };
    };

    generation.end({
      output: data.content?.[0]?.text ?? '',
      usage: {
        input: data.usage?.input_tokens,
        output: data.usage?.output_tokens,
      },
      level: anthropicStatus === 200 ? 'DEFAULT' : 'ERROR',
    });

    trace.update({ output: data.content?.[0]?.text ?? '' });

  } catch (err) {
    anthropicStatus = 500;
    anthropicData = { error: { message: String(err) } };

    generation.end({
      level: 'ERROR',
      statusMessage: String(err),
    });
  } finally {
    // CRÍTICO: en Vercel serverless el proceso muere al retornar.
    // shutdownAsync() fuerza el flush de los eventos pendientes antes de salir.
    // NO usar langfuse.flush() — es async sin await garantizado en este contexto.
    await langfuse.shutdownAsync();
  }

  return res.status(anthropicStatus!).json(anthropicData);
}
```

---

## Paso 3 — Modificar `src/services/claudeService.ts`

**Archivo a modificar:** `src/services/claudeService.ts`

Agregar el parámetro `userId?: string` a la función `sendChatMessage` e incluirlo
en el body del fetch. **No modificar ninguna otra parte del archivo.**

Cambio puntual en la firma de la función:

```ts
// ANTES
export async function sendChatMessage(
  messages: ChatMessage[],
  ctx: UserContext
): Promise<string>

// DESPUÉS
export async function sendChatMessage(
  messages: ChatMessage[],
  ctx: UserContext,
  userId?: string
): Promise<string>
```

Cambio puntual en el body del fetch (agregar `userId` al objeto):

```ts
// ANTES
body: JSON.stringify({
  model: MODEL,
  max_tokens: MAX_TOKENS,
  system: buildSystemPrompt(ctx),
  messages: apiMessages,
}),

// DESPUÉS
body: JSON.stringify({
  model: MODEL,
  max_tokens: MAX_TOKENS,
  system: buildSystemPrompt(ctx),
  messages: apiMessages,
  userId,
}),
```

---

## Paso 4 — Modificar `src/pages/AiChatPage.tsx`

**Archivo a modificar:** `src/pages/AiChatPage.tsx`

Cambio puntual: pasar `user.id` al llamado de `sendChatMessage` dentro de `handleSend`.

```ts
// ANTES
const reply = await sendChatMessage(nextMessages, userCtx);

// DESPUÉS
const reply = await sendChatMessage(nextMessages, userCtx, user.id);
```

No modificar ninguna otra parte del archivo.

---

## Paso 5 — Verificación

```bash
npx tsc --noEmit
npm run build
```

Sin errores ni warnings de TypeScript strict.

Verificar adicionalmente que `api/chat.ts` compila sin errores (el build de Vercel
lo procesa separado del bundle de Vite):

```bash
npx tsc --noEmit --project tsconfig.json
```

---

## Resumen de cambios

### Dependencia nueva

| Paquete | Versión |
|---------|---------|
| `langfuse` | latest |

### Variables de entorno nuevas (agregar en Vercel + `.env.local`)

| Variable | Descripción |
|----------|-------------|
| `LANGFUSE_SECRET_KEY` | Secret key del proyecto Langfuse |
| `LANGFUSE_PUBLIC_KEY` | Public key del proyecto Langfuse |
| `LANGFUSE_HOST` | Base URL (default: `https://cloud.langfuse.com`) |

### Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `api/chat.ts` | Integración completa de Langfuse (trace + generation + flush) |
| `src/services/claudeService.ts` | Parámetro `userId?: string` + campo en body del fetch |
| `src/pages/AiChatPage.tsx` | Pasar `user.id` al llamado de `sendChatMessage` |

### Archivos que NO se tocan

- `src/types/ai.ts`
- `src/services/aiContextService.ts`
- `src/context/AuthContext.tsx`
- `src/hooks/useAiAccess.ts`
- Todo `src/pages/` excepto `AiChatPage.tsx`
- Todo `src/db/`
- `vite.config.ts`
- `src/App.tsx`

---

## Notas críticas para Claude Code

1. **`shutdownAsync()` en `finally` es obligatorio.** En Vercel serverless el proceso
   termina al retornar la respuesta. Sin este llamado, los eventos de Langfuse nunca
   llegan al servidor y el dashboard queda vacío. No sustituir por `flush()`.

2. **Instanciar Langfuse dentro del handler, no fuera.** Vercel reutiliza instancias
   entre invocaciones en hot-reload, pero no se puede depender de ello. Instanciar
   por request garantiza que el cliente esté limpio.

3. **`userId` es opcional en el proxy** para no romper compatibilidad si en algún
   contexto se llama sin él. El dashboard de Langfuse agrupará esos llamados bajo
   el label `'unknown'`.

4. **No agregar `userId` al tipo `UserContext`** — ese tipo representa el resumen
   de entrenamiento del usuario, no su identidad. El userId se pasa como parámetro
   separado para mantener la separación de responsabilidades.

5. **TypeScript strict:** el casting de `anthropicData` y `anthropicStatus` como
   `unknown` e inicialización posterior es intencional para manejar el caso de
   excepción en el catch.

---

## Workflow ClickUp obligatorio

1. Crear tarea en ClickUp lista `901711957073` con título:
   `feat: observabilidad Langfuse para chat IA`
2. Implementar todos los pasos en orden
3. Commitear con mensaje que incluya `CU-<task_id>` al final
4. Marcar tarea como completada en ClickUp
5. Crear `/tmp/claude_ready_for_testing.txt` con resumen de cambios realizados
