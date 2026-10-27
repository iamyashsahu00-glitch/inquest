import { useState } from 'react';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { goTo } from '../auth/nav';
import InvestigationBackground from '../components/InvestigationBackground';

export default function AuthPage() {
  const { customer, signup, login, logout } = useAuth();
  const rawNext = new URLSearchParams(window.location.search).get('next') || '/store';
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/';

  const [mode, setMode] = useState(new URLSearchParams(window.location.search).get('mode') === 'signup' ? 'signup' : 'login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setError(null);
    if (mode === 'signup' && name.trim().length < 2) { setError('Please enter your full name.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setBusy(true);
    try {
      if (mode === 'signup') await signup({ name: name.trim(), email: email.trim(), password });
      else await login({ email: email.trim(), password });
      goTo(next);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  const input =
    'w-full bg-[#F5F7F5] border border-[#D0D9D4] rounded-xl px-3.5 py-2.5 text-sm text-[#142123] placeholder:text-[#64716D]/70 focus:outline-none focus:ring-2 focus:ring-[#2F6F68]/30 focus:border-[#2F6F68] transition-all';

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#142123] flex flex-col relative overflow-x-hidden">
      {/* Subtle AI-Investigation-Themed Background */}
      <InvestigationBackground />

      <header
        className="border-b border-[#E2E8E4] backdrop-blur-md sticky top-0 z-40 transition-colors"
        style={{ background: 'rgba(250, 248, 245, 0.92)' }}
      >
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <button
            type="button"
            onClick={() => goTo('/')}
            className="flex items-center gap-2 text-sm font-semibold text-[#142123] hover:text-[#8B5824] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-[#2F6F68]" /> <span>Back to INQUEST</span>
          </button>
        </div>
      </header>

      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-2xl border border-[#D9E1DC] bg-white p-7 sm:p-8 shadow-[0_4px_24px_-4px_rgba(32,42,46,0.08),0_1px_4px_-1px_rgba(32,42,46,0.04)] relative z-10">
          <div className="mb-6">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 rounded-xl bg-[#FAF0E4] border border-[#C58B4B]/40 flex items-center justify-center p-1.5 overflow-hidden shadow-2xs">
                <img src="/favicon.png" alt="INQUEST" className="w-full h-full object-contain" />
              </div>
              <span className="font-display text-2xl font-bold tracking-tight text-[#142123]">INQUEST</span>
            </div>
            <p className="text-sm text-[#475C59]">Your orders, payments, and complaints in one account.</p>
          </div>

          {customer ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-[#2F6F68]/30 bg-[#E8F2EE] p-4">
                <div className="text-xs font-bold uppercase tracking-wider text-[#2F6F68] mb-1">Signed in</div>
                <div className="font-bold text-sm sm:text-base text-[#142123]">
                  {customer.name} <span className="font-mono text-xs text-[#556865]">· {customer.id}</span>
                </div>
                <div className="text-xs text-[#475C59] mt-0.5">{customer.email}</div>
              </div>
              <button
                type="button"
                onClick={() => goTo(next)}
                className="w-full bg-[#203436] text-white font-semibold py-2.5 rounded-xl text-sm hover:bg-[#162527] transition-all cursor-pointer shadow-xs active:scale-[0.98]"
              >
                Continue
              </button>
              <button
                type="button"
                onClick={logout}
                className="w-full text-xs sm:text-sm font-semibold text-[#556865] hover:text-[#142123] py-2 cursor-pointer transition-colors"
              >
                Sign out
              </button>
            </div>
          ) : (
            <>
              <div className="flex p-1 rounded-xl bg-[#F2F5F3] border border-[#D0D9D4] mb-6 text-sm font-semibold">
                {[['login', 'Sign in'], ['signup', 'Create account']].map(([m, label]) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => { setMode(m); setError(null); }}
                    className={`flex-1 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer select-none ${
                      mode === m
                        ? 'bg-white text-[#142123] shadow-xs border border-[#D0D9D4]'
                        : 'text-[#475C59] hover:text-[#142123]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <form onSubmit={submit} className="space-y-4">
                {mode === 'signup' && (
                  <div>
                    <label className="block text-xs font-semibold text-[#142123] mb-1.5">Full name</label>
                    <input className={input} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={80} placeholder="e.g. Yash Gautam" />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold text-[#142123] mb-1.5">Email address</label>
                  <input className={input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" maxLength={120} placeholder="you@example.com" required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#142123] mb-1.5">Password</label>
                  <div className="relative">
                    <input className={input + ' pr-11'} type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                      autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} maxLength={128} placeholder="••••••••••••" required />
                    <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#556865] hover:text-[#142123] cursor-pointer p-1">
                      {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {mode === 'signup' && <p className="text-xs text-[#556865] mt-1.5">Must be at least 8 characters.</p>}
                </div>
                {error && <p className="text-xs text-alert font-medium bg-alert-dim border border-alert/30 rounded-xl px-3.5 py-2">{error}</p>}
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full bg-[#203436] text-white font-semibold py-2.5 rounded-xl text-sm hover:bg-[#162527] transition-all cursor-pointer disabled:opacity-55 shadow-xs active:scale-[0.98]"
                >
                  {busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}
                </button>
              </form>
              {mode === 'signup' && (
                <p className="text-xs text-[#556865] mt-4 leading-relaxed">A unique customer ID is created for you automatically, and every order and payment you make is saved to it.</p>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
