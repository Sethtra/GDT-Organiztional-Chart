import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Loader2, AlertCircle, CheckCircle, ArrowLeft, Trash2, User } from 'lucide-react';
import Navbar from '../components/Navbar';

export default function ProfilePage() {
  const { user, displayName, avatarUrl, updateProfile } = useAuth();

  // Profile form
  const [name, setName] = useState(displayName || '');
  const [avatarInput, setAvatarInput] = useState(avatarUrl || '');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState('');

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
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16 }}>
              Account deletion is temporarily unavailable. It requires a secure
              server-side deletion function before the authentication account
              and all associated chart data can be removed safely.
            </p>
            <button
              className="tb-btn tb-btn--danger"
              style={{ padding: '10px 20px', fontSize: 14, opacity: 0.55, cursor: 'not-allowed' }}
              disabled
              title="A secure server-side account deletion function has not been configured yet."
            >
              <Trash2 size={15} /> Account Deletion Unavailable
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
