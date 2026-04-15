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

  // Agregar esto:
console.log('[Langfuse] secret key present:', !!process.env.LANGFUSE_SECRET_KEY);
console.log('[Langfuse] public key present:', !!process.env.LANGFUSE_PUBLIC_KEY);

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
    console.log('[Langfuse] shutdownAsync completed');
  }

  return res.status(anthropicStatus!).json(anthropicData);
}
