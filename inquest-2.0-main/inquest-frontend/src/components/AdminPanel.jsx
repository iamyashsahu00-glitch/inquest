import { useState, useEffect, useRef } from 'react';
import ComplaintsView from './admin/ComplaintsView';
import {
  createAdminSession,
  adminCheck,
  getAdminComplaints,
  getAdminOverview,
  uploadReferenceIdCard,
  getReferenceStatus,
  getOrCreateAdminProfile,
  updateAdminProfilePhoto,
} from '../api/client';
import {
  saveAdminSession,
  getAdminSession,
  clearAdminSession,
  isAdminSessionVerified,
} from '../auth/adminSession';
import { goTo } from '../auth/nav';
import {
  Search,
  LogOut,
  ShieldCheck,
  Command,
  ChevronDown,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Lock,
  Upload,
  Camera,
  UserCheck,
  Trash2,
} from 'lucide-react';
import IDScanner from './IDScanner';
import LeftNav from './admin/LeftNav';
import StatCards from './admin/StatCards';
import DataTable from './admin/DataTable';
import AnalyticsView from './admin/AnalyticsView';
import AuditLogView from './admin/AuditLogView';
import EditAdminProfileModal from './admin/EditAdminProfileModal';
import InvestigationBackground from './InvestigationBackground';

function getInitials(str) {
  if (!str) return 'AD';
  const parts = str.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function AdminPanel({ onClose }) {
  // Pre-unlock verification & configuration state
  const [refConfigured, setRefConfigured] = useState(null); // null = checking
  const [setupPassword, setSetupPassword] = useState('');
  const [setupFile, setSetupFile] = useState(null);
  const [setupError, setSetupError] = useState(null);
  const [setupLoading, setSetupLoading] = useState(false);

  // Login form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [scanning, setScanning] = useState(false);

  // Authenticated state
  const [unlocked, setUnlocked] = useState(false);
  const [data, setData] = useState(null);
  const [adminProfile, setAdminProfile] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [, setVerifyResult] = useState(null);
  const [activeTable, setActiveTable] = useState(
    () => new URLSearchParams(window.location.search).get('view') || 'complaints'
  );

  // Top header search bar state (filters active table client-side across all columns)
  const [globalSearch, setGlobalSearch] = useState('');
  const [attention, setAttention] = useState(0);

  // Profile avatar dropdown state
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [profileNotice, setProfileNotice] = useState(null);
  const adminMenuRef = useRef(null);

  // ── Session Restoration & Validation ──
  useEffect(() => {
    const s = getAdminSession();
    if (!s || !s.token || !s.idVerified) {
      if (s && !s.idVerified) clearAdminSession();
      setUnlocked(false);
      return undefined;
    }
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        await adminCheck();
        const [overviewRes, profileRes] = await Promise.all([
          getAdminOverview(''),
          getOrCreateAdminProfile({ email: s.email, name: s.name, adminPassword: '' }).catch(() => null),
        ]);
        if (!alive) return;
        setName(s.name || '');
        setEmail(s.email || '');
        setData(overviewRes.data);
        if (profileRes && profileRes.profile) setAdminProfile(profileRes.profile);
        setUnlocked(true);
        const after = sessionStorage.getItem('inquest.afterAdminLogin');
        if (after) {
          sessionStorage.removeItem('inquest.afterAdminLogin');
          goTo(after);
        }
      } catch (e) {
        if (e.status === 401) {
          clearAdminSession();
          setUnlocked(false);
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // ── Prevent unauthorized access after logout on browser back navigation ──
  useEffect(() => {
    const checkAuthOnPop = () => {
      if (!isAdminSessionVerified()) {
        setUnlocked(false);
      }
    };
    window.addEventListener('popstate', checkAuthOnPop);
    return () => window.removeEventListener('popstate', checkAuthOnPop);
  }, []);

  // ── Expired Token Listener ──
  useEffect(() => {
    const onExpired = () => {
      clearAdminSession();
      setUnlocked(false);
      setData(null);
      setScanning(false);
    };
    window.addEventListener('inquest:admin-expired', onExpired);
    return () => window.removeEventListener('inquest:admin-expired', onExpired);
  }, []);

  // ── Close profile menu on outside click ──
  useEffect(() => {
    function onDocClick(e) {
      if (adminMenuRef.current && !adminMenuRef.current.contains(e.target)) {
        setAdminMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  // ── Nav badge: complaints that need a human ──
  useEffect(() => {
    if (!unlocked) return undefined;
    let alive = true;
    const tick = async () => {
      try {
        const r = await getAdminComplaints({});
        if (alive) setAttention(r.data.summary.pendingHumanReview);
      } catch {
        /* ignore */
      }
    };
    tick();
    const t = setInterval(tick, 10000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [unlocked]);

  // ── Reference ID status check for pre-unlock ──
  useEffect(() => {
    getReferenceStatus()
      .then((res) => setRefConfigured(res.data.configured))
      .catch(() => setRefConfigured(false));
  }, []);

  // ── Login Step 1: Validate credentials with backend before ID scan ──
  async function handleStartScan(e) {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Name, email, and admin password are all required.');
      return;
    }
    const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      // Validate credentials against backend before opening scanner
      await getAdminOverview(password);
      setScanning(true);
    } catch (err) {
      setError(err.message || 'Invalid admin credentials');
    } finally {
      setLoading(false);
    }
  }

  // ── Login Step 2: Handle successful ID Verification scan ──
  async function handleVerified(verifyData) {
    setVerifyResult(verifyData);
    setLoading(true);
    try {
      const [overviewRes, profileRes] = await Promise.all([
        getAdminOverview(password),
        getOrCreateAdminProfile({ email: email.trim(), name: name.trim(), adminPassword: password }),
      ]);
      setData(overviewRes.data);
      if (profileRes && profileRes.profile) {
        setAdminProfile(profileRes.profile);
      }
      try {
        const s = await createAdminSession({
          adminPassword: password,
          employeeName: name.trim(),
          employeeEmail: email.trim(),
        });
        saveAdminSession({ ...s.data, idVerified: true });
      } catch (e) {
        console.error('Could not create admin session:', e.message);
      }
      setScanning(false);
      setUnlocked(true);
      const after = sessionStorage.getItem('inquest.afterAdminLogin');
      if (after) {
        sessionStorage.removeItem('inquest.afterAdminLogin');
        goTo(after);
      }
    } catch (err) {
      setError(err.message || 'Could not load admin data');
      setScanning(false);
    } finally {
      setLoading(false);
    }
  }

  // ── Sign Out Handler: Invalidate session & redirect to login ──
  function handleSignOut() {
    clearAdminSession();
    setUnlocked(false);
    setData(null);
    setScanning(false);
    setPassword('');
    setName('');
    setEmail('');
    setAdminProfile(null);
    setVerifyResult(null);
    setAdminMenuOpen(false);
    window.history.replaceState({}, '', '/admin');
  }

  async function handleAdminPhotoUpload(e) {
    const file = (e.target.files || [])[0];
    e.target.value = '';
    if (!file) return;

    setProfileNotice(null);
    if (!file.type.startsWith('image/')) {
      setProfileNotice({ ok: false, text: 'Choose an image file (JPG, PNG, WebP).' });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setProfileNotice({ ok: false, text: 'Photo must be under 2 MB.' });
      return;
    }

    setPhotoUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = reader.result;
        const res = await updateAdminProfilePhoto({
          email: adminProfile?.email || email,
          photo: base64,
          adminPassword: password,
        });
        if (res && res.profile) {
          setAdminProfile(res.profile);
          setProfileNotice({ ok: true, text: 'Profile photo updated.' });
          setTimeout(() => setProfileNotice(null), 3000);
        }
      } catch (err) {
        setProfileNotice({ ok: false, text: err.message || 'Could not upload photo.' });
      } finally {
        setPhotoUploading(false);
      }
    };
    reader.onerror = () => {
      setProfileNotice({ ok: false, text: 'Failed to read image.' });
      setPhotoUploading(false);
    };
    reader.readAsDataURL(file);
  }

  async function handleAdminPhotoRemove() {
    setPhotoUploading(true);
    setProfileNotice(null);
    try {
      const res = await updateAdminProfilePhoto({
        email: adminProfile?.email || email,
        photo: null,
        adminPassword: password,
      });
      if (res && res.profile) {
        setAdminProfile(res.profile);
        setProfileNotice({ ok: true, text: 'Photo removed.' });
        setTimeout(() => setProfileNotice(null), 3000);
      }
    } catch (err) {
      setProfileNotice({ ok: false, text: err.message || 'Could not remove photo.' });
    } finally {
      setPhotoUploading(false);
    }
  }

  function handleProfileUpdated(updatedProfile) {
    if (!updatedProfile) return;
    setAdminProfile(updatedProfile);
    if (updatedProfile.name) setName(updatedProfile.name);
    setProfileNotice({ ok: true, text: 'Profile details updated.' });
    setTimeout(() => setProfileNotice(null), 3000);
  }

  async function refreshOverview() {
    try {
      const r = await getAdminOverview(password);
      setData(r.data);
    } catch {
      /* keep stale data if refresh fails */
    }
  }

  async function handleSetupReference(e) {
    e.preventDefault();
    setSetupError(null);
    if (!setupPassword.trim()) {
      setSetupError('Admin password is required.');
      return;
    }
    if (!setupFile) {
      setSetupError('Please upload the reference NIET ID card image.');
      return;
    }
    setSetupLoading(true);
    try {
      await uploadReferenceIdCard({ file: setupFile, adminPassword: setupPassword });
      setRefConfigured(true);
    } catch (err) {
      setSetupError(err.message || 'Could not save reference ID card');
    } finally {
      setSetupLoading(false);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 1. POST-UNLOCK FULL-SCREEN ADMIN DASHBOARD
  // ═══════════════════════════════════════════════════════════
  if (unlocked) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-ink text-paper overflow-hidden font-sans select-none">
        {/* Full-width Top Enterprise Header */}
        <header className="h-16 px-4 sm:px-6 border-b border-border bg-ink-light flex items-center justify-between gap-4 shrink-0 shadow-xs z-20 transition-colors">
          {/* Left Brand Area */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/30 shadow-xs overflow-hidden p-1.5">
              <img src="/favicon.png" alt="INQUEST Admin" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-extrabold text-paper leading-none tracking-tight">
                  INQUEST Admin
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-bold bg-primary/15 text-primary border border-primary/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Console
                </span>
              </div>
              <p className="text-xs font-semibold text-muted hidden sm:block leading-tight mt-1">
                Biometric ID Verified Session
              </p>
            </div>
          </div>

          {/* Center Global Search Bar (Client-side filtering across active table) */}
          <div className="flex-1 max-w-lg mx-2 sm:mx-6">
            <div className="relative w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
              <input
                type="text"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                placeholder="Search across all columns in active table…"
                className="w-full bg-ink-inset border border-border-strong rounded-xl pl-10 pr-12 py-2 text-sm font-semibold text-paper placeholder:text-muted/70 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5 text-xs font-mono font-bold text-muted bg-ink-light px-1.5 py-0.5 rounded border border-border pointer-events-none">
                <Command className="w-3 h-3" />
                <span>K</span>
              </div>
            </div>
          </div>

          {/* Right: Compact Admin Profile Button & Dropdown */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <div className="relative" ref={adminMenuRef}>
              <button
                type="button"
                id="btn-admin-profile"
                onClick={() => setAdminMenuOpen(!adminMenuOpen)}
                className="flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 rounded-xl border border-border-strong bg-ink-inset hover:bg-ink-lighter transition-all cursor-pointer shadow-2xs focus-visible:outline-2 focus-visible:outline-primary select-none active:scale-[0.98]"
                aria-label="Admin profile menu"
                aria-expanded={adminMenuOpen}
              >
                <div className="w-7 h-7 rounded-full bg-[#253B3D] text-white flex items-center justify-center font-bold text-xs overflow-hidden shrink-0 border border-primary/30">
                  {adminProfile?.profile_photo ? (
                    <img
                      src={adminProfile.profile_photo}
                      alt={adminProfile.name || name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{getInitials(adminProfile?.name || name || 'Admin')}</span>
                  )}
                </div>
                <span className="text-xs font-bold text-paper hidden sm:inline max-w-[120px] truncate">
                  {(adminProfile?.name || name || 'Admin').split(' ')[0]}
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-muted transition-transform duration-150 ${
                    adminMenuOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Profile Dropdown Popover */}
              {adminMenuOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-border-strong bg-white dark:bg-ink-light shadow-2xl z-50 overflow-hidden animate-in fade-in duration-150">
                  <div className="p-4 border-b border-border bg-ink-inset/40">
                    <div className="flex items-start gap-3.5">
                      {/* Avatar with Camera badge for instant photo upload */}
                      <div className="relative shrink-0">
                        <div className="w-12 h-12 rounded-full bg-[#253B3D] text-white flex items-center justify-center font-bold text-sm shrink-0 border-2 border-primary/30 overflow-hidden shadow-xs">
                          {adminProfile?.profile_photo ? (
                            <img
                              src={adminProfile.profile_photo}
                              alt={adminProfile.name || name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span>{getInitials(adminProfile?.name || name || 'Admin')}</span>
                          )}
                        </div>
                        <label
                          title="Change profile photo"
                          className="absolute -bottom-1 -right-1 w-5.5 h-5.5 rounded-full bg-[#2F6F68] hover:bg-[#265B55] text-white flex items-center justify-center cursor-pointer shadow-md transition-all border border-white dark:border-ink-light"
                        >
                          <Camera className="w-3 h-3" />
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleAdminPhotoUpload}
                            disabled={photoUploading}
                          />
                        </label>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="font-extrabold text-sm text-paper truncate">
                          {adminProfile?.name || name || 'Administrator'}
                        </div>
                        <div className="text-xs text-muted truncate mt-0.5">
                          {adminProfile?.email || email}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <span className="text-[11px] font-mono font-bold text-paper bg-ink-inset px-2 py-0.5 rounded-md border border-border flex items-center gap-1" title="Unique Admin ID (Permanent)">
                            <Lock className="w-2.5 h-2.5 text-amber" />
                            <span>ID: {adminProfile?.employee_code || adminProfile?.employee_id || 'ADM-001'}</span>
                          </span>
                          <span className="text-[9px] font-bold text-amber bg-amber-dim px-1.5 py-0.5 rounded border border-amber/30">
                            Permanent
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Quick photo remove if photo exists */}
                    {adminProfile?.profile_photo && (
                      <div className="mt-2 text-right">
                        <button
                          type="button"
                          onClick={handleAdminPhotoRemove}
                          disabled={photoUploading}
                          className="text-[11px] font-bold text-muted hover:text-alert cursor-pointer transition-colors"
                        >
                          Remove photo
                        </button>
                      </div>
                    )}

                    <div className="mt-3 pt-2.5 border-t border-border/60 flex items-center justify-between text-xs">
                      <span className="text-muted font-medium">Status</span>
                      <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[11px]">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Biometric ID Verified</span>
                      </span>
                    </div>

                    {profileNotice && (
                      <p
                        className={`mt-2 text-xs font-bold text-center px-2 py-1 rounded-lg border ${
                          profileNotice.ok
                            ? 'text-verified border-verified/40 bg-verified-dim'
                            : 'text-alert border-alert/40 bg-alert-dim'
                        }`}
                      >
                        {profileNotice.text}
                      </p>
                    )}
                  </div>

                  <div className="p-1.5 space-y-1">
                    <button
                      type="button"
                      id="btn-admin-edit-profile"
                      onClick={() => {
                        setAdminMenuOpen(false);
                        setShowEditProfileModal(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-paper hover:bg-ink-inset rounded-xl transition-colors cursor-pointer"
                    >
                      <UserCheck className="w-4 h-4 text-primary shrink-0" />
                      <span>Edit Profile Details</span>
                    </button>

                    <button
                      type="button"
                      id="btn-admin-signout"
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-alert hover:bg-alert-dim rounded-xl transition-colors cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 shrink-0" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* 2-Column Dashboard Body: Reclaims full width (Right profile sidebar removed) */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Left Navigation */}
          <LeftNav
            activeTable={activeTable}
            setActiveTable={setActiveTable}
            data={data}
            badges={{ complaints: attention }}
          />

          {/* Center Main Content Area: Naturally takes 100% of available width */}
          <main className="flex-1 flex flex-col p-3.5 sm:p-5 overflow-y-auto min-w-0 bg-ink transition-colors">
            {activeTable === 'complaints' ? (
              <ComplaintsView />
            ) : activeTable === 'analytics' ? (
              <AnalyticsView adminPassword={password} />
            ) : activeTable === 'auditlog' ? (
              <AuditLogView
                adminPassword={password}
                adminName={adminProfile?.name || name}
                adminEmail={email}
                onChanged={refreshOverview}
              />
            ) : (
              <>
                {/* Real KPI Statistics */}
                <StatCards data={data} />

                {/* Dense Data Table */}
                <DataTable
                  activeTable={activeTable}
                  data={data}
                  searchQuery={globalSearch}
                  setSearchQuery={setGlobalSearch}
                />
              </>
            )}
          </main>
        </div>

        {/* ── Edit Admin Profile Modal ── */}
        <EditAdminProfileModal
          open={showEditProfileModal}
          onClose={() => setShowEditProfileModal(false)}
          adminProfile={adminProfile}
          adminPassword={password}
          onSuccess={handleProfileUpdated}
        />
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // 2. PRE-UNLOCK DEDICATED ADMIN LOGIN SCREEN
  // ═══════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#142123] flex flex-col relative overflow-x-hidden">
      {/* Subtle AI-Investigation-Themed Background */}
      <InvestigationBackground />

      {/* Top Header */}
      <header
        className="border-b border-[#E2E8E4] backdrop-blur-md sticky top-0 z-40 transition-colors"
        style={{ background: 'rgba(250, 248, 245, 0.92)' }}
      >
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FAF0E4] border border-[#C58B4B]/40 flex items-center justify-center p-1.5 overflow-hidden shadow-xs">
              <img src="/favicon.png" alt="INQUEST" className="w-full h-full object-contain" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-display text-2xl font-bold tracking-tight text-[#142123]">INQUEST</span>
              <span className="text-[#C2C9C3] text-base select-none">/</span>
              <span className="text-xs sm:text-sm text-[#475C59] font-bold">Admin Portal</span>
            </div>
          </div>

          <button
            type="button"
            id="btn-admin-back-home"
            onClick={onClose || (() => goTo('/'))}
            className="flex items-center gap-2 text-xs sm:text-sm font-bold text-[#142123] hover:text-[#8B5824] cursor-pointer px-3.5 py-2 rounded-xl bg-white hover:bg-[#F2F5F3] border border-[#D0D9D4] transition-all shadow-2xs active:scale-[0.98]"
          >
            <ArrowLeft className="w-4 h-4 text-[#2F6F68]" />
            <span>Back to Home</span>
          </button>
        </div>
      </header>

      {/* Main Login Screen Body */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
        <div className="w-full max-w-lg rounded-2xl border border-[#D9E1DC] bg-white p-6 sm:p-8 shadow-[0_4px_24px_-4px_rgba(32,42,46,0.08),0_1px_4px_-1px_rgba(32,42,46,0.04)] space-y-6 relative z-10">
          {/* Header info */}
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-[#E8F2EE] border border-[#2F6F68]/30 flex items-center justify-center mx-auto text-[#2F6F68] shadow-xs">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h2 className="font-display text-xl sm:text-2xl font-extrabold text-[#142123] tracking-tight">
              Admin Console Authentication
            </h2>
            <p className="text-xs sm:text-sm text-[#475C59] leading-relaxed max-w-sm mx-auto">
              Enter your credentials and complete institutional ID verification to access the admin dashboard.
            </p>
          </div>

          {refConfigured === null ? (
            <div className="p-8 text-center text-xs font-semibold text-muted flex flex-col items-center justify-center gap-3">
              <span className="w-6 h-6 border-2 border-[#2F6F68]/40 border-t-[#2F6F68] rounded-full animate-spin" />
              <span>Checking security configuration…</span>
            </div>
          ) : !refConfigured ? (
            <form onSubmit={handleSetupReference} className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-[#142123] mb-1">
                <Lock className="w-4 h-4 text-[#2F6F68]" /> One-time setup: upload the reference NIET ID card
              </div>
              <p className="text-xs text-[#475C59] leading-relaxed font-medium">
                No reference ID card is configured yet. Upload one photo of a valid NIET ID card template once — all future verification scans will be compared against it.
              </p>
              <input
                value={setupPassword}
                onChange={(e) => setSetupPassword(e.target.value)}
                type="password"
                placeholder="Admin password"
                className="w-full bg-[#F5F7F5] border border-[#D0D9D4] rounded-xl px-3.5 py-2.5 text-xs font-semibold text-[#142123] placeholder:text-[#64716D]/60 focus:outline-none focus:ring-2 focus:ring-[#2F6F68]/30 focus:border-[#2F6F68]"
              />
              <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-[#D0D9D4] rounded-xl p-5 text-center cursor-pointer hover:border-[#2F6F68]/50 transition-colors bg-[#F5F7F5]">
                <Upload className="w-5 h-5 text-[#2F6F68]" />
                <span className="text-xs font-bold text-[#142123]">
                  {setupFile ? setupFile.name : 'Upload reference NIET ID card photo'}
                </span>
                <span className="text-[10px] text-[#556865] font-semibold">JPG, PNG, or WebP</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setSetupFile(e.target.files?.[0] || null)}
                />
              </label>
              {setupError && <p className="text-xs text-alert font-bold">{setupError}</p>}
              <button
                type="submit"
                disabled={setupLoading}
                className="w-full bg-[#203436] hover:bg-[#162527] text-white font-bold px-4 py-2.5 rounded-xl text-xs disabled:opacity-50 cursor-pointer transition-all shadow-xs"
              >
                {setupLoading ? 'Saving…' : 'Save Reference & Continue'}
              </button>
            </form>
          ) : loading ? (
            <div className="p-10 flex flex-col items-center justify-center gap-3 text-center">
              <span className="w-8 h-8 border-2 border-[#2F6F68]/40 border-t-[#2F6F68] rounded-full animate-spin" />
              <p className="text-sm font-bold text-[#142123]">Verifying and unlocking admin console…</p>
            </div>
          ) : scanning ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#E2E8E4]">
                <span className="text-xs font-bold uppercase tracking-wider text-[#556865] flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#2F6F68]" /> Step 2: Institutional ID Verification
                </span>
                <button
                  type="button"
                  onClick={() => setScanning(false)}
                  className="text-xs font-bold text-[#2F6F68] hover:underline cursor-pointer"
                >
                  ← Back to credentials
                </button>
              </div>
              <IDScanner
                name={name.trim()}
                email={email.trim()}
                adminPassword={password}
                onVerified={handleVerified}
                onCancel={() => setScanning(false)}
              />
            </div>
          ) : (
            <form onSubmit={handleStartScan} className="space-y-4">
              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#142123] mb-1.5">
                    Full Name
                  </label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Yash Gautam"
                    required
                    className="w-full bg-[#F5F7F5] border border-[#D0D9D4] rounded-xl px-3.5 py-2.5 text-sm font-semibold text-[#142123] placeholder:text-[#64716D]/70 focus:outline-none focus:ring-2 focus:ring-[#2F6F68]/30 focus:border-[#2F6F68] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#142123] mb-1.5">
                    Email Address
                  </label>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    placeholder="e.g. luckygautam2009@gmail.com"
                    required
                    className="w-full bg-[#F5F7F5] border border-[#D0D9D4] rounded-xl px-3.5 py-2.5 text-sm font-semibold text-[#142123] placeholder:text-[#64716D]/70 focus:outline-none focus:ring-2 focus:ring-[#2F6F68]/30 focus:border-[#2F6F68] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#142123] mb-1.5">
                    Admin Password
                  </label>
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type="password"
                    placeholder="••••••••••••"
                    required
                    className="w-full bg-[#F5F7F5] border border-[#D0D9D4] rounded-xl px-3.5 py-2.5 text-sm font-semibold text-[#142123] placeholder:text-[#64716D]/70 focus:outline-none focus:ring-2 focus:ring-[#2F6F68]/30 focus:border-[#2F6F68] transition-all"
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-xl border border-alert/30 bg-alert-dim text-xs font-bold text-alert flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                id="btn-admin-proceed-scan"
                className="w-full bg-[#203436] hover:bg-[#162527] text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-all cursor-pointer shadow-xs active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <span>Proceed to ID Verification Scan</span>
              </button>

              <div className="pt-2 text-center">
                <span className="text-[11px] text-[#556865] flex items-center justify-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#2E7D5B]" />
                  Protected by INQUEST Institutional ID Verification
                </span>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
