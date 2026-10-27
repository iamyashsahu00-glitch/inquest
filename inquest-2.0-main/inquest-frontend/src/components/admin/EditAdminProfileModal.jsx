import { useState, useEffect } from 'react';
import {
  X,
  User,
  Phone,
  Briefcase,
  Lock,
  Mail,
  Camera,
  Trash2,
  Check,
  AlertCircle,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { updateAdminProfileDetails, updateAdminProfilePhoto } from '../../api/client';

export default function EditAdminProfileModal({
  open,
  onClose,
  adminProfile,
  adminPassword,
  onSuccess,
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('');
  const [photo, setPhoto] = useState(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (adminProfile) {
      setName(adminProfile.name || '');
      setPhone(adminProfile.phone || '');
      setDepartment(adminProfile.department || '');
      setPhoto(adminProfile.profile_photo || null);
      setError(null);
      setSuccess(false);
    }
  }, [adminProfile, open]);

  if (!open) return null;

  const adminId =
    adminProfile?.employee_code || adminProfile?.employee_id || adminProfile?.login_id || 'ADM-001';
  const email = adminProfile?.email || '';

  // Avatar upload via FileReader (Base64)
  async function handlePhotoUpload(e) {
    const file = (e.target.files || [])[0];
    e.target.value = '';
    if (!file) return;

    setError(null);
    if (!file.type.startsWith('image/')) {
      setError('Please choose a valid image file (JPG, PNG, WebP).');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('The photo must be under 2 MB.');
      return;
    }

    setPhotoBusy(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = reader.result;
        const res = await updateAdminProfilePhoto({
          email,
          photo: base64,
          adminPassword,
        });
        if (res && res.profile) {
          setPhoto(res.profile.profile_photo);
          if (onSuccess) onSuccess(res.profile);
        }
      } catch (err) {
        setError(err.message || 'Could not update profile photo.');
      } finally {
        setPhotoBusy(false);
      }
    };
    reader.onerror = () => {
      setError('Failed to read image file.');
      setPhotoBusy(false);
    };
    reader.readAsDataURL(file);
  }

  // Remove photo
  async function handlePhotoRemove() {
    setPhotoBusy(true);
    setError(null);
    try {
      const res = await updateAdminProfilePhoto({
        email,
        photo: null,
        adminPassword,
      });
      if (res && res.profile) {
        setPhoto(null);
        if (onSuccess) onSuccess(res.profile);
      }
    } catch (err) {
      setError(err.message || 'Could not remove photo.');
    } finally {
      setPhotoBusy(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (name.trim().length < 2) {
      setError('Full Name must be at least 2 characters.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await updateAdminProfileDetails({
        email,
        name: name.trim(),
        phone: phone.trim(),
        department: department.trim(),
        adminPassword,
      });
      if (res && res.profile) {
        if (onSuccess) onSuccess(res.profile);
      }
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 700);
    } catch (err) {
      setError(err.message || 'Could not update admin profile.');
    } finally {
      setBusy(false);
    }
  }

  const getInitials = (str) =>
    (str || 'Admin')
      .split(' ')
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-lg my-auto rounded-2xl border p-5 sm:p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto"
        style={{
          background: '#1B2B2D',
          borderColor: 'rgba(216, 222, 217, 0.22)',
          color: '#F4F7F6',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-3" style={{ borderBottom: '1px solid rgba(216, 222, 217, 0.12)' }}>
          <div>
            <h3 className="font-display text-lg font-extrabold flex items-center gap-2" style={{ color: '#F4F7F6' }}>
              <ShieldCheck className="w-5 h-5" style={{ color: '#2F6F68' }} />
              <span>Edit Admin Profile</span>
            </h3>
            <p className="text-xs mt-0.5" style={{ color: '#8B9C98' }}>
              Update administrative account credentials, photo, and department role.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg cursor-pointer transition-colors"
            style={{ color: '#8B9C98' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#F4F7F6'; e.currentTarget.style.background = '#111C1D'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#8B9C98'; e.currentTarget.style.background = 'transparent'; }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl text-xs font-bold flex items-center gap-2" style={{ border: '1px solid rgba(196, 67, 58, 0.3)', background: 'rgba(196, 67, 58, 0.14)', color: '#C4433A' }}>
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3 rounded-xl text-xs font-bold flex items-center gap-2" style={{ border: '1px solid rgba(46, 125, 91, 0.3)', background: 'rgba(46, 125, 91, 0.14)', color: '#2E7D5B' }}>
            <Check className="w-4 h-4 shrink-0" />
            <span>Admin profile updated successfully!</span>
          </div>
        )}

        {/* Avatar Photo Section */}
        <div className="flex items-center gap-4 p-3.5 rounded-xl" style={{ background: 'rgba(17, 28, 29, 0.6)', border: '1px solid rgba(216, 222, 217, 0.12)' }}>
          <div className="relative w-16 h-16 rounded-full bg-[#253B3D] text-white flex items-center justify-center font-bold text-lg border-2 border-[#2F6F68]/40 overflow-hidden shadow-xs shrink-0">
            {photo ? (
              <img src={photo} alt={name || 'Admin'} className="w-full h-full object-cover" />
            ) : (
              <span>{getInitials(name || 'Admin')}</span>
            )}
            {photoBusy && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-white" />
              </div>
            )}
          </div>

          <div className="flex-1 space-y-1.5">
            <p className="text-xs font-bold" style={{ color: '#F4F7F6' }}>Profile Photo</p>
            <p className="text-[11px]" style={{ color: '#8B9C98' }}>Supports JPG, PNG, or WebP up to 2 MB.</p>
            <div className="flex items-center gap-2 pt-1">
              <label className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#2F6F68] hover:bg-[#265B55] text-white text-xs font-bold cursor-pointer transition-all shadow-2xs">
                <Camera className="w-3.5 h-3.5" />
                <span>Change Photo</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoUpload}
                  disabled={photoBusy}
                />
              </label>

              {photo && (
                <button
                  type="button"
                  onClick={handlePhotoRemove}
                  disabled={photoBusy}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all"
                  style={{ background: '#1B2B2D', border: '1px solid rgba(216, 222, 217, 0.12)', color: '#C4433A' }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>
              )}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Admin ID (Unique & Unchangeable) */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5 flex items-center justify-between" style={{ color: '#8B9C98' }}>
              <span className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" style={{ color: '#2F6F68' }} />
                <span>Admin ID (Unique Identifier)</span>
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded" style={{ color: '#2F6F68', background: 'rgba(47, 111, 104, 0.14)', border: '1px solid rgba(47, 111, 104, 0.3)' }}>
                Unchangeable
              </span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={adminId}
                disabled
                className="w-full rounded-xl px-3.5 py-2 font-mono text-sm font-bold cursor-not-allowed select-all"
                style={{ background: 'rgba(17, 28, 29, 0.6)', border: '1px solid rgba(216, 222, 217, 0.12)', color: '#F4F7F6' }}
              />
              <Lock className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2" style={{ color: '#8B9C98' }} />
            </div>
            <p className="text-[11px] mt-1 leading-tight" style={{ color: '#8B9C98' }}>
              Permanent institutional administrative identifier assigned to your session.
            </p>
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1.5" style={{ color: '#8B9C98' }}>
              <User className="w-3.5 h-3.5" style={{ color: '#2F6F68' }} /> Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Shobhit Gautam"
              required
              maxLength={80}
              className="w-full rounded-xl px-3.5 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#2F6F68]/40 transition-all"
              style={{ background: '#111C1D', border: '1px solid rgba(216, 222, 217, 0.22)', color: '#F4F7F6' }}
            />
          </div>

          {/* Email (Read-only) & Contact Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1.5" style={{ color: '#8B9C98' }}>
                <Mail className="w-3.5 h-3.5" style={{ color: '#8B9C98' }} /> Email Address
              </label>
              <input
                type="email"
                value={email}
                disabled
                className="w-full rounded-xl px-3.5 py-2 text-sm font-semibold cursor-not-allowed"
                style={{ background: 'rgba(17, 28, 29, 0.6)', border: '1px solid rgba(216, 222, 217, 0.12)', color: '#8B9C98' }}
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1.5" style={{ color: '#8B9C98' }}>
                <Phone className="w-3.5 h-3.5" style={{ color: '#2F6F68' }} /> Mobile / Phone No.
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +91 98765 43210"
                maxLength={20}
                className="w-full rounded-xl px-3.5 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#2F6F68]/40 transition-all"
                style={{ background: '#111C1D', border: '1px solid rgba(216, 222, 217, 0.22)', color: '#F4F7F6' }}
              />
            </div>
          </div>

          {/* Department / Operational Role */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1.5" style={{ color: '#8B9C98' }}>
              <Briefcase className="w-3.5 h-3.5" style={{ color: '#2F6F68' }} /> Department / Operational Role
            </label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="e.g. Fraud Operations / Lead Investigator"
              maxLength={80}
              className="w-full rounded-xl px-3.5 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#2F6F68]/40 transition-all"
              style={{ background: '#111C1D', border: '1px solid rgba(216, 222, 217, 0.22)', color: '#F4F7F6' }}
            />
          </div>

          {/* Modal Footer Actions */}
          <div className="pt-3 flex items-center justify-end gap-2.5" style={{ borderTop: '1px solid rgba(216, 222, 217, 0.12)' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors"
              style={{ border: '1px solid rgba(216, 222, 217, 0.22)', color: '#F4F7F6', background: 'transparent' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#111C1D'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-white text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-[0.98] disabled:opacity-50"
              style={{ background: '#2F6F68' }}
              onMouseEnter={(e) => { if (!busy) e.currentTarget.style.background = '#265B55'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#2F6F68'; }}
            >
              {busy ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Profile Changes</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
