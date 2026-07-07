import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle, ArrowLeft, Trash2, User, Lock } from 'lucide-react';
import Navbar from '../components/Navbar';
import ConfirmModal from '../components/ConfirmModal';

export default function ProfilePage() {
  const { user, displayName, avatarUrl, updateProfile, updatePassword, deleteAccount } = useAuth();
  const navigate = useNavigate();

  // Profile form
  const [name, setName] = useState(displayName || '');
  const [avatarInput, setAvatarInput] = useState(avatarUrl || '');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState('');

  // Password form
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passLoading, setPassLoading] = useState(false);
  const [passSuccess, setPassSuccess] = useState(false);
  const [passError, setPassError] = useState('');

  // Delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess(false);
    if (!name.trim()) { setProfileError('Display name cannot be empty.'); return; }
    setProfileLoading(true);
    const { error } = await updateProfile({
      display_name: name.trim(),
      full_name: name.trim(),
      avatar_url: avatarInput.trim() || undefined,
    });
    setProfileLoading(false);
    if (error) setProfileError(error.message);
    else setProfileSuccess(true);
  };

  const handlePasswordSave = async (e) => {
    e.preventDefault();
    setPassError('');
    setPassSuccess(false);
    if (newPass.length < 6) { setPassError('Password must be at least 6 characters.'); return; }
    if (newPass !== confirmPass) { setPassError('Passwords do not match.'); return; }
    setPassLoading(true);
    const { error } = await updatePassword(newPass);
    setPassLoading(false);
    if (error) setPassError(error.message);
    else { setPassSuccess(true); setNewPass(''); setConfirmPass(''); }
  };

  const handleDeleteAccount = async () => {
    await deleteAccount();
    navigate('/');
  };

  return (
    <div className="profile-page">
      <Navbar />

      <div className="profile-content">
        <div className="profile-header">
          <Link to="/dashboard" className="profile-back">
            <ArrowLeft size={16} /> Back to Dashboard
          </Link>
          <h1 className="profile-title">Account Settings</h1>
          <p className="profile-sub">Manage your GDT Org Chart profile</p>
        </div>

        <div className="profile-sections">
          {/* Account Info */}
          <section className="profile-section">
            <div className="profile-section__header">
              <User size={18} />
              <h2>Account Information</h2>
            </div>
            <form onSubmit={handleProfileSave} className="profile-form">
              {/* Avatar preview */}
              <div className="profile-avatar-row">
                <div className="profile-avatar-preview">
                  {avatarInput ? (
                    <img src={avatarInput} alt={name} onError={(e) => { e.target.style.display = 'none'; }} />
                  ) : (
                    <div className="profile-avatar-initials">
                      {(name || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="auth-field" style={{ flex: 1 }}>
                  <label className="auth-label">Avatar URL (optional)</label>
                  <input
                    type="url"
                    className="auth-input"
                    placeholder="https://example.com/photo.jpg"
                    value={avatarInput}
                    onChange={(e) => setAvatarInput(e.target.value)}
                  />
                </div>
              </div>

              <div className="auth-field">
                <label className="auth-label">Display Name</label>
                <input
                  type="text"
                  className="auth-input"
                  placeholder="Your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="auth-field">
                <label className="auth-label">Email Address (read-only)</label>
                <input
                  type="email"
                  className="auth-input"
                  value={user?.email || ''}
                  disabled
                  style={{ opacity: 0.5 }}
                />
              </div>

              {profileError && <div className="auth-error"><AlertCircle size={14} /><span>{profileError}</span></div>}
              {profileSuccess && <div className="auth-success"><CheckCircle size={14} /> Profile updated successfully!</div>}

              <button type="submit" className="auth-submit-btn" disabled={profileLoading}>
                {profileLoading ? <><Loader2 size={16} className="spin" /> Saving...</> : 'Save Changes'}
              </button>
            </form>
          </section>
          {/* Danger Zone directly after account info */}
          {/* Danger Zone */}
          <section className="profile-section profile-section--danger">
            <div className="profile-section__header">
              <Trash2 size={18} />
              <h2>Danger Zone</h2>
            </div>
            <p style={{ fontSize: 14, color: '#94a3b8', marginBottom: 16 }}>
              Permanently delete your account and all associated org charts. This action cannot be undone.
            </p>
            <button
              className="tb-btn tb-btn--danger"
              style={{ padding: '10px 20px', fontSize: 14 }}
              onClick={() => setShowDeleteModal(true)}
            >
              <Trash2 size={15} /> Delete My Account
            </button>
          </section>
        </div>
      </div>

      {showDeleteModal && (
        <ConfirmModal
          title="Delete Account"
          message="This will permanently delete your account and ALL your org charts. This cannot be undone."
          danger
          onConfirm={handleDeleteAccount}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}
    </div>
  );
}
