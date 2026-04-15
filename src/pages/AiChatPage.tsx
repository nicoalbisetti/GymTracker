import { useState, useEffect, useRef } from 'react';
import { Lock, Send, Sparkles } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useAiAccess } from '@/hooks/useAiAccess';
import { buildUserContext } from '@/services/aiContextService';
import { sendChatMessage } from '@/services/claudeService';
import { incrementAiQueries } from '@/services/profileService';
import type { ChatMessage, UserContext } from '@/types/ai';

export default function AiChatPage() {
  const { user, profile, refreshProfile } = useAuth();
  const { canUseAi, queriesLeft, isPro } = useAiAccess();

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = sessionStorage.getItem('ai-chat-messages');
      return saved ? (JSON.parse(saved) as ChatMessage[]) : [];
    } catch {
      return [];
    }
  });
  const [userCtx, setUserCtx] = useState<UserContext | null>(null);
  const [ctxLoading, setCtxLoading] = useState(true);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!canUseAi || !user || !profile) {
      setCtxLoading(false);
      return;
    }
    buildUserContext(user.id, profile)
      .then((ctx) => {
        setUserCtx(ctx);
        setMessages((prev) =>
          prev.length > 0
            ? prev
            : [
                {
                  id: 'welcome',
                  role: 'assistant',
                  content: '¡Hola! Puedo analizar tu entrenamiento de los últimos 30 días. ¿Qué querés saber?',
                  createdAt: new Date().toISOString(),
                },
              ]
        );
      })
      .catch(() => setError('No se pudo cargar el contexto de entrenamiento.'))
      .finally(() => setCtxLoading(false));
  }, [canUseAi, user, profile]);

  useEffect(() => {
    try {
      sessionStorage.setItem('ai-chat-messages', JSON.stringify(messages));
    } catch { /* quota exceeded — ignorar */ }
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend() {
    if (!input.trim() || sending || !userCtx || !user) return;

    const userMsg: ChatMessage = {
      id: self.crypto.randomUUID(),
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
      setMessages((prev) => [
        ...prev,
        {
          id: self.crypto.randomUUID(),
          role: 'assistant',
          content: reply,
          createdAt: new Date().toISOString(),
        },
      ]);
      await incrementAiQueries(user.id);
      await refreshProfile();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      console.error('[AiChat] error:', msg);
      setError(`Error: ${msg}`);
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  // Pantalla de bloqueo para plan free
  if (!canUseAi && !ctxLoading) {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-4 px-8 text-center">
        <div className="p-4 bg-slate-800 rounded-full">
          <Lock size={32} className="text-slate-400" />
        </div>
        <h2 className="text-xl font-bold text-white">Feature Pro</h2>
        <p className="text-slate-400 text-sm leading-relaxed">
          El análisis con IA está disponible para usuarios Pro.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header fijo */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={20} className="text-primary-400" />
          <h1 className="text-lg font-bold text-white">Asistente IA</h1>
        </div>
        {isPro && (
          <span className="text-xs text-slate-400">{queriesLeft} consultas restantes</span>
        )}
      </div>

      {/* Lista de mensajes — scrolleable */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {ctxLoading && (
          <div className="flex items-center justify-center py-8">
            <span className="text-slate-400 text-sm">Cargando contexto de entrenamiento…</span>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={
                msg.role === 'user'
                  ? 'bg-primary-500 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[80%] text-sm leading-relaxed whitespace-pre-wrap'
                  : 'bg-slate-800 text-slate-100 rounded-2xl rounded-tl-sm px-4 py-2.5 max-w-[85%] text-sm leading-relaxed whitespace-pre-wrap'
              }
            >
              {msg.content}
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex justify-start">
            <div className="bg-slate-800 text-slate-400 rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm">
              Escribiendo…
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input fijo al fondo */}
      <div className="border-t border-slate-800 px-4 py-3 bg-slate-900">
        {error && (
          <p className="text-red-400 text-xs mb-2">{error}</p>
        )}
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Preguntá sobre tu entrenamiento…"
            rows={1}
            disabled={sending || ctxLoading}
            className="flex-1 bg-slate-800 text-white placeholder-slate-500 rounded-xl px-4 py-2.5 text-sm resize-none outline-none focus:ring-1 focus:ring-primary-500 disabled:opacity-50"
            style={{ maxHeight: '4.5rem', overflowY: 'auto' }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = 'auto';
              el.style.height = `${Math.min(el.scrollHeight, 72)}px`;
            }}
          />
          <button
            onClick={() => void handleSend()}
            disabled={sending || !input.trim() || ctxLoading}
            className="flex-shrink-0 bg-primary-500 hover:bg-primary-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl p-2.5 transition-colors"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
