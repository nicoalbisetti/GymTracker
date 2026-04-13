import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const { session } = useAuth();

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
  const [registerSuccess, setRegisterSuccess] = useState(false);

  if (session) return <Navigate to="/" replace />;

  function handleInviteSubmit() {
    const valid = import.meta.env.VITE_INVITE_CODE as string;
    if (inviteInput.trim().toUpperCase() === valid.toUpperCase()) {
      sessionStorage.setItem('invite-validated', '1');
      setStep('auth');
    } else {
      setInviteError('Código incorrecto');
    }
  }

  async function handleGoogleLogin() {
    setAuthLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) {
      setAuthError(error.message);
      setAuthLoading(false);
    }
  }

  async function handleEmailAuth() {
    setAuthLoading(true);
    setAuthError('');
    setRegisterSuccess(false);
    try {
      if (authMode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) setAuthError(error.message);
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) setAuthError(error.message);
        else setRegisterSuccess(true);
      }
    } finally {
      setAuthLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      {/* Logo / título */}
      <div className="mb-8 text-center">
        <div className="w-16 h-16 bg-primary-500/20 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-primary-500/30">
          <span className="text-3xl">🏋️</span>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">GymTracker</h1>
        <p className="text-sm text-slate-500 mt-1">Tu entrenamiento, sin excusas</p>
      </div>

      <div className="w-full max-w-sm bg-slate-800 rounded-2xl border border-slate-700/50 p-6">
        {step === 'invite' ? (
          /* ── Paso 1: código de invitación ── */
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Código de invitación</h2>
              <p className="text-sm text-slate-400 mt-1">
                Ingresá el código para acceder a la app
              </p>
            </div>
            <input
              type="text"
              value={inviteInput}
              onChange={(e) => { setInviteInput(e.target.value); setInviteError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleInviteSubmit()}
              placeholder="CÓDIGO"
              autoCapitalize="characters"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-primary-500 uppercase tracking-widest"
            />
            {inviteError && (
              <p className="text-sm text-red-400">{inviteError}</p>
            )}
            <button
              onClick={handleInviteSubmit}
              className="w-full bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white font-semibold rounded-xl py-3 text-sm transition-colors"
            >
              Continuar
            </button>
          </div>
        ) : (
          /* ── Paso 2: auth ── */
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-lg font-semibold text-white">
                {authMode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
              </h2>
            </div>

            {/* Google */}
            <button
              onClick={handleGoogleLogin}
              disabled={authLoading}
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-800 font-semibold rounded-xl py-3 text-sm transition-colors disabled:opacity-50"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continuar con Google
            </button>

            {/* Separador */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-700" />
              <span className="text-xs text-slate-500">o</span>
              <div className="flex-1 h-px bg-slate-700" />
            </div>

            {/* Email / password */}
            <div className="flex flex-col gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-primary-500"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleEmailAuth()}
                placeholder="Contraseña"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-primary-500"
              />
            </div>

            {authError && <p className="text-sm text-red-400">{authError}</p>}
            {registerSuccess && (
              <p className="text-sm text-green-400">
                Revisá tu email para confirmar tu cuenta
              </p>
            )}

            <button
              onClick={handleEmailAuth}
              disabled={authLoading}
              className="w-full bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white font-semibold rounded-xl py-3 text-sm transition-colors disabled:opacity-50"
            >
              {authLoading
                ? 'Cargando...'
                : authMode === 'login'
                ? 'Iniciar sesión'
                : 'Registrarse'}
            </button>

            {/* Toggle login / register */}
            <button
              onClick={() => { setAuthMode(m => m === 'login' ? 'register' : 'login'); setAuthError(''); setRegisterSuccess(false); }}
              className="text-sm text-slate-400 hover:text-slate-300 text-center"
            >
              {authMode === 'login'
                ? '¿No tenés cuenta? Registrate'
                : '¿Ya tenés cuenta? Iniciá sesión'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
