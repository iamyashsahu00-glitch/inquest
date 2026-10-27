import { useEffect, useState } from 'react';
import { X, Camera, Check } from 'lucide-react';
import { registerComplaint } from '../../api/client';

export const ISSUES = [
  { key: 'double', label: 'I was charged twice', text: 'bhai payment 2 baar kat gyi, please jaldi fix karo' },
  { key: 'failed', label: 'Money deducted, order failed', text: 'payment kat gya but my order did not go through, please refund' },
  { key: 'damaged', label: 'Item arrived damaged', text: 'my item arrived with a cracked broken part, please refund' },
  { key: 'delay', label: 'My order is delayed', text: 'mera order abhi tak nahi aaya, delivery date nikal gayi' },
  { key: 'refund', label: 'Where is my refund?', text: 'where is my refund for this order' },
  { key: 'other', label: 'Something else', text: '' },
];

function Bubble({ children }) {
  return (
    <div className="flex">
      <div className="bg-ink-lighter border border-border rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-sm text-paper max-w-[88%] leading-relaxed">
        {children}
      </div>
    </div>
  );
}

export default function ChatWidget({ customer, orders = [], open, setOpen, preset, onRegistered, onOpenComplaints }) {
  const [view, setView] = useState('menu');
  const [orderId, setOrderId] = useState('');
  const [issue, setIssue] = useState('other');
  const [text, setText] = useState('');
  const [photos, setPhotos] = useState([]);
  const [photoError, setPhotoError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(null);
  const [introVisible, setIntroVisible] = useState(true);

  function resetAll() {
    photos.forEach((p) => URL.revokeObjectURL(p.url));
    setView('menu');
    setOrderId('');
    setIssue('other');
    setText('');
    setPhotos([]);
    setPhotoError(null);
    setError(null);
    setDone(null);
    setBusy(false);
  }

  useEffect(() => {
    if (open && preset) {
      const i = ISSUES.find((x) => x.key === preset.issue) || ISSUES[ISSUES.length - 1];
      setView('form');
      setOrderId(preset.orderId || '');
      setIssue(i.key);
      setText(i.text);
      setDone(null);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, preset]);

  function close() {
    setOpen(false);
    resetAll();
  }

  function pickIssue(key) {
    setIssue(key);
    setText(ISSUES.find((i) => i.key === key).text);
  }

  function pickPhotos(e) {
    setPhotoError(null);
    const picked = Array.from(e.target.files || []);
    e.target.value = '';
    const next = [...photos];
    for (const file of picked) {
      if (!file.type.startsWith('image/')) {
        setPhotoError('Only image files are allowed.');
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        setPhotoError('Each photo must be under 5 MB.');
        continue;
      }
      if (next.length >= 3) {
        setPhotoError('You can attach up to 3 photos.');
        break;
      }
      next.push({ file, url: URL.createObjectURL(file) });
    }
    setPhotos(next);
  }

  function removePhoto(i) {
    URL.revokeObjectURL(photos[i].url);
    setPhotos(photos.filter((_, idx) => idx !== i));
  }

  async function submit() {
    setError(null);
    if (text.trim().length < 8) {
      setError('Please describe the problem (at least 8 characters).');
      return;
    }
    setBusy(true);
    try {
      const res = await registerComplaint({
        orderId,
        complaintText: text.trim(),
        issueKey: issue,
        photos: photos.map((p) => p.file),
      });
      setDone(res.data);
      setView('done');
      if (onRegistered) onRegistered();
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  const first = customer?.name?.trim() ? customer.name.trim().split(' ')[0] : 'there';
  const input =
    'w-full bg-ink-lighter border border-border-strong rounded-lg px-3 py-2 text-sm text-paper focus:outline-none focus:ring-2 focus:ring-primary/40 transition-colors';
  const choice =
    'w-full text-left text-sm font-semibold px-3.5 py-2.5 rounded-xl border border-border-strong text-paper bg-ink-lighter hover:border-primary/50 hover:bg-ink transition-all cursor-pointer flex items-center justify-between';

  return (
    <>
      {!open && (
        <div className="fixed bottom-6 right-6 z-50 flex items-end gap-3 select-none">
          {/* Introductory speech bubble: 'Need help with an investigation?' matching reference */}
          {introVisible && (
            <div
              onClick={() => setOpen(true)}
              className="group/bubble relative hidden sm:flex items-center gap-2.5 bg-white dark:bg-[#1C282A] text-slate-800 dark:text-slate-100 py-2.5 px-4 rounded-2xl shadow-lg border border-border-strong/60 hover:border-primary/50 cursor-pointer transition-all duration-200 animate-in fade-in slide-in-from-right-3 max-w-xs"
              role="status"
              aria-live="polite"
            >
              <div className="text-xs sm:text-sm font-semibold leading-snug">
                Need help with an investigation?
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIntroVisible(false);
                }}
                aria-label="Dismiss message"
                className="p-1 rounded-full text-muted hover:text-paper hover:bg-ink-lighter transition-colors cursor-pointer shrink-0 -mr-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              {/* Speech bubble pointer pointing rightward to the robot */}
              <div className="absolute top-1/2 -right-2 -translate-y-1/2 w-0 h-0 border-t-6 border-t-transparent border-b-6 border-b-transparent border-l-8 border-l-white dark:border-l-[#1C282A]" />
            </div>
          )}

          {/* 3D Robot Mascot Launcher matching reference */}
          <div className="relative group/launcher flex flex-col items-center">
            {/* Dark Navy Tooltip: 'Inquest Assistant' matching reference */}
            <div
              role="tooltip"
              className="pointer-events-none absolute -top-11 left-1/2 -translate-x-1/2 opacity-0 group-hover/launcher:opacity-100 group-focus-within/launcher:opacity-100 transition-all duration-200 ease-out whitespace-nowrap px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-[#151D28] text-white shadow-xl border border-white/10 z-20"
            >
              Inquest Assistant
              {/* Tooltip tail pointer pointing down-left toward the robot */}
              <div className="absolute -bottom-1 left-5 w-2 h-2 bg-[#151D28] rotate-45 border-r border-b border-white/10" />
            </div>

            {/* Interactive 3D Robot Button */}
            <button
              type="button"
              id="btn-inquest-assistant-launcher"
              onClick={() => setOpen(true)}
              aria-label="Open Inquest Assistant"
              className="relative cursor-pointer transition-transform duration-200 hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-amber focus-visible:ring-offset-2 rounded-2xl animate-float-subtle"
            >
              <img
                src="/inquest-robot.png"
                alt="Inquest 3D Robot Assistant"
                className="w-16 h-20 sm:w-20 sm:h-24 object-contain filter drop-shadow-[0_8px_16px_rgba(240,140,40,0.22)] hover:drop-shadow-[0_12px_22px_rgba(240,140,40,0.38)] transition-all"
                loading="eager"
              />
            </button>
          </div>
        </div>
      )}

      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-[22rem] max-w-[calc(100vw-2rem)] max-h-[min(34rem,calc(100vh-3rem))] flex flex-col rounded-2xl border border-border-strong bg-ink-light shadow-xl overflow-hidden transition-all duration-200">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-ink-lighter">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-10 shrink-0 flex items-center justify-center overflow-hidden">
                <img
                  src="/inquest-robot.png"
                  alt="Inquest Assistant"
                  className="w-full h-full object-contain filter drop-shadow-xs"
                />
              </div>
              <div>
                <div className="text-sm font-bold text-paper leading-tight">Inquest Assistant</div>
                <div className="text-[11px] text-muted leading-tight">Fintech dispute & investigation support</div>
              </div>
            </div>
            <button
              type="button"
              onClick={close}
              aria-label="Close chat"
              className="p-1 rounded-lg cursor-pointer text-muted hover:text-paper hover:bg-ink transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {view === 'menu' && (
              <>
                <Bubble>Hi {first}! How can I help you today?</Bubble>
                <div className="space-y-2 pl-1">
                  <button
                    type="button"
                    className={choice}
                    onClick={() => {
                      setView('form');
                      setText('');
                      setIssue('other');
                    }}
                  >
                    <span>Register a complaint</span>
                    <span className="text-muted text-xs">→</span>
                  </button>
                  <button
                    type="button"
                    className={choice}
                    onClick={() => {
                      close();
                      onOpenComplaints();
                    }}
                  >
                    <span>Check my complaints</span>
                    <span className="text-muted text-xs">→</span>
                  </button>
                </div>
              </>
            )}

            {view === 'form' && (
              <>
                <Bubble>I am sorry you ran into trouble. Tell me what happened and I will register a complaint for our team.</Bubble>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-muted mb-1.5">Which order?</label>
                  <select value={orderId} onChange={(e) => setOrderId(e.target.value)} className={input}>
                    <option value="">Not about a specific order</option>
                    {orders.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.id} · {o.product}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-muted mb-1.5">What went wrong?</label>
                  <div className="flex flex-wrap gap-1.5">
                    {ISSUES.map((i) => (
                      <button
                        key={i.key}
                        type="button"
                        onClick={() => pickIssue(i.key)}
                        className={`text-[11px] font-semibold px-2.5 py-1.5 rounded-full border cursor-pointer transition-colors ${
                          issue === i.key
                            ? 'bg-primary text-white border-primary shadow-xs'
                            : 'border-border-strong text-muted hover:text-paper hover:border-primary/40'
                        }`}
                      >
                        {i.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-muted mb-1.5">Tell us more</label>
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    rows={3}
                    maxLength={1000}
                    placeholder="Describe the problem (Hindi, English or Hinglish)"
                    className={input}
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted">
                      <Camera className="w-3.5 h-3.5 text-primary" /> Photos <span className="normal-case font-medium">(optional)</span>
                    </span>
                    {photos.length < 3 && (
                      <label className="text-xs font-semibold text-primary cursor-pointer hover:underline">
                        + Add photo
                        <input type="file" accept="image/*" multiple className="hidden" onChange={pickPhotos} />
                      </label>
                    )}
                  </div>
                  <p className="text-[11px] text-muted mb-2">For example, a clear photo of the cracked phone.</p>
                  {photos.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {photos.map((p, i) => (
                        <div key={p.url} className="relative w-16 h-16 rounded-lg overflow-hidden border border-border-strong">
                          <img src={p.url} alt={`evidence ${i + 1}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removePhoto(i)}
                            aria-label="Remove photo"
                            className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/70 text-white flex items-center justify-center cursor-pointer"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {photoError && <p className="text-xs text-alert font-semibold mt-1.5">{photoError}</p>}
                </div>
                {error && <p className="text-sm font-semibold text-alert">{error}</p>}
                <button
                  type="button"
                  disabled={busy}
                  onClick={submit}
                  className="w-full bg-primary hover:bg-[#265B55] text-white font-bold py-2.5 rounded-lg cursor-pointer disabled:opacity-50 transition-colors shadow-xs"
                >
                  {busy ? 'Registering…' : 'Submit complaint'}
                </button>
                <button
                  type="button"
                  onClick={() => setView('menu')}
                  className="w-full text-xs font-semibold text-muted hover:text-paper cursor-pointer py-1 transition-colors"
                >
                  Back
                </button>
              </>
            )}

            {view === 'done' && done && (
              <>
                <div className="rounded-xl border border-verified/40 bg-verified-dim p-4">
                  <div className="flex items-center gap-2 font-bold text-verified mb-1">
                    <Check className="w-4 h-4" /> Complaint registered
                  </div>
                  <p className="text-sm text-paper">Complaint #{done.id} has been registered successfully.</p>
                </div>
                <Bubble>
                  Sorry for the inconvenience. A confirmation has been sent to {customer?.email || 'your email'}. Our team will review your complaint, and you can follow it under <b>My complaints</b>.
                </Bubble>
                <div className="space-y-2 pl-1">
                  <button
                    type="button"
                    className={choice}
                    onClick={() => {
                      close();
                      onOpenComplaints();
                    }}
                  >
                    <span>Check my complaints</span>
                    <span className="text-muted text-xs">→</span>
                  </button>
                  <button
                    type="button"
                    className="w-full text-xs font-semibold text-muted hover:text-paper cursor-pointer py-1 transition-colors"
                    onClick={close}
                  >
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
