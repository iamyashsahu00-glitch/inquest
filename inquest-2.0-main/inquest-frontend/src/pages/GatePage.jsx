import { useEffect } from 'react';
import { ShoppingBag, ShieldCheck, Sparkles } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { goTo } from '../auth/nav';
import InvestigationBackground from '../components/InvestigationBackground';

export default function GatePage() {
  const { customer } = useAuth();

  useEffect(() => {
    if (customer) goTo('/store');
  }, [customer]);

  const card =
    'rounded-2xl border border-[#D9E1DC] bg-white p-7 sm:p-8 shadow-[0_4px_24px_-4px_rgba(32,42,46,0.08),0_1px_4px_-1px_rgba(32,42,46,0.04)] hover:shadow-[0_12px_32px_-6px_rgba(32,42,46,0.12),0_2px_8px_-2px_rgba(32,42,46,0.06)] flex flex-col hover:border-[#2F6F68]/40 transition-all duration-200 relative z-10';
  const primary =
    'w-full bg-[#203436] text-white font-semibold py-3 rounded-xl cursor-pointer hover:bg-[#162527] transition-all duration-150 shadow-xs active:scale-[0.98] text-sm sm:text-base';
  const secondary =
    'w-full border border-[#CFD8D3] bg-[#F8FAF9] hover:bg-[#EFF3F1] text-[#1E2E30] font-semibold py-3 rounded-xl cursor-pointer transition-all duration-150 shadow-2xs active:scale-[0.98] text-sm sm:text-base';

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#142123] flex flex-col relative overflow-x-hidden">
      {/* Subtle AI-Investigation-Themed Background */}
      <InvestigationBackground />

      {/* Header */}
      <header
        className="border-b border-[#E2E8E4] backdrop-blur-md sticky top-0 z-40 transition-colors"
        style={{ background: 'rgba(250, 248, 245, 0.92)' }}
      >
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FAF0E4] border border-[#C58B4B]/40 flex items-center justify-center p-1.5 overflow-hidden shadow-xs">
              <img src="/favicon.png" alt="INQUEST" className="w-full h-full object-contain" />
            </div>
            <span className="font-display text-2xl font-bold tracking-tight text-[#142123]">INQUEST</span>
          </div>
          <button
            type="button"
            onClick={() => goTo('/story')}
            className="flex items-center gap-2 text-sm font-semibold text-[#8B5824] hover:text-[#6C4217] cursor-pointer px-3.5 py-2 rounded-xl bg-[#FAF0E4] border border-[#C58B4B]/35 hover:border-[#C58B4B]/50 transition-colors shadow-2xs"
          >
            <Sparkles className="w-4 h-4 text-[#C58B4B]" />
            <span>See how it works</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="text-center my-10 sm:my-16">
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-tight text-[#142123]">
            Complaints resolved with evidence,<br className="hidden sm:block" /> not guesswork.
          </h1>
          <p className="mt-4 sm:mt-5 text-base sm:text-lg text-[#475C59] max-w-2xl mx-auto leading-relaxed">
            Shop, report a problem, and watch it get investigated against real order, payment, and photo evidence.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 sm:gap-8">
          {/* Customer Card */}
          <section className={card}>
            <div className="w-12 h-12 rounded-xl bg-[#E8F2EE] border border-[#2F6F68]/30 flex items-center justify-center mb-5 shadow-xs">
              <ShoppingBag className="w-6 h-6 text-[#2F6F68]" />
            </div>
            <h2 className="font-display text-2xl font-bold text-[#142123] tracking-tight">I'm a customer</h2>
            <p className="text-sm sm:text-[15px] text-[#475C59] mt-2.5 mb-7 flex-1 leading-relaxed">
              Browse products, track your orders and report a problem. Every order and payment is saved to your own account.
            </p>
            <div className="space-y-3">
              <button type="button" onClick={() => goTo('/login?next=/store')} className={primary}>
                Sign in
              </button>
              <button type="button" onClick={() => goTo('/login?mode=signup&next=/store')} className={secondary}>
                Create account
              </button>
            </div>
          </section>

          {/* Admin Card */}
          <section className={card}>
            <div className="w-12 h-12 rounded-xl bg-[#FAF0E4] border border-[#C58B4B]/40 flex items-center justify-center mb-5 shadow-xs">
              <ShieldCheck className="w-6 h-6 text-[#C58B4B]" />
            </div>
            <h2 className="font-display text-2xl font-bold text-[#142123] tracking-tight">I'm an admin</h2>
            <p className="text-sm sm:text-[15px] text-[#475C59] mt-2.5 mb-7 flex-1 leading-relaxed">
              Dashboard, analytics, audit log and overrides. Admin access needs the admin password and ID verification.
            </p>
            <div className="space-y-3">
              <button type="button" onClick={() => goTo('/admin')} className={primary}>
                Admin sign-in
              </button>
              <button type="button" onClick={() => goTo('/console')} className={secondary}>
                Agent console (demo tool)
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
