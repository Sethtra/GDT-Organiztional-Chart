import { useState, useEffect } from 'react';
import { X, Link as LinkIcon, Copy, Check, Eye, Edit3, Loader2, AlertCircle, Users } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../hooks/useAuth';

export default function ShareModal({ chartId, chartName, isPublic: initialIsPublic, onClose }) {
  const { user } = useAuth();
  const [tab, setTab] = useState('link'); // 'link' | 'email'

  // Link sharing
  const [isPublic, setIsPublic] = useState(initialIsPublic || false);
  const [accessLevel, setAccessLevel] = useState('view'); // 'view' | 'edit'
  const [linkCopied, setLinkCopied] = useState(false);
  const [linkLoading, setLinkLoading] = useState(false);

  // Email sharing
  const [email, setEmail] = useState('');
  const [emailAccess, setEmailAccess] = useState('view');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [emailSuccess, setEmailSuccess] = useState('');
  const [sharedList, setSharedList] = useState([]);
  const [listLoading, setListLoading] = useState(true);

  const shareUrl = `${window.location.origin}/chart/${chartId}`;

  // Load existing shares
  useEffect(() => {
    async function loadShares() {
      setListLoading(true);
      const { data } = await supabase
        .from('chart_shares')
        .select('*')
        .eq('chart_id', chartId)
        .order('created_at', { ascending: true });
      setSharedList(data || []);
      setListLoading(false);
    }
    loadShares();

    // Load current public settings
    supabase.from('charts').select('is_public, public_access_level').eq('id', chartId).single()
      .then(({ data }) => {
        if (data) {
          setIsPublic(data.is_public);
          setAccessLevel(data.public_access_level || 'view');
        }
      });
  }, [chartId]);

  const togglePublic = async (val) => {
    setLinkLoading(true);
    await supabase.from('charts')
      .update({ is_public: val, public_access_level: accessLevel })
      .eq('id', chartId);
    setIsPublic(val);
    setLinkLoading(false);
  };

  const updateAccessLevel = async (level) => {
    setAccessLevel(level);
    if (isPublic) {
      await supabase.from('charts')
        .update({ public_access_level: level })
        .eq('id', chartId);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const inviteByEmail = async (e) => {
    e.preventDefault();
    setEmailError('');
    setEmailSuccess('');
    if (!email.trim()) { setEmailError('Please enter an email address.'); return; }
    if (email.trim() === user?.email) { setEmailError("You can't share with yourself."); return; }

    setEmailLoading(true);
    const { error } = await supabase.from('chart_shares').upsert([{
      chart_id: chartId,
      shared_email: email.trim().toLowerCase(),
      access_level: emailAccess,
    }], { onConflict: 'chart_id,shared_email' });
    setEmailLoading(false);

    if (error) {
      console.error("Invite error:", error);
      setEmailError(error.message);
    } else {
      setEmailSuccess(`Invite sent to ${email.trim()}`);
      setEmail('');
      // Refresh list
      const { data } = await supabase.from('chart_shares').select('*').eq('chart_id', chartId).order('created_at', { ascending: true });
      setSharedList(data || []);
    }
  };

  const removeShare = async (id) => {
    const { error } = await supabase.from('chart_shares').delete().eq('id', id);
    if (error) {
      console.error("Failed to delete share:", error);
      alert("Failed to remove user access. Check console for details.");
      return;
    }
    setSharedList(prev => prev.filter(s => s.id !== id));
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="share-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="share-modal__header">
          <div>
            <h2 className="share-modal__title">Share Chart</h2>
            <p className="share-modal__sub">"{chartName}"</p>
          </div>
          <button className="modal-close-btn" onClick={onClose}><X size={18} /></button>
        </div>

        {/* Tabs */}
        <div className="share-modal__tabs">
          <button
            className={`share-modal__tab ${tab === 'link' ? 'share-modal__tab--active' : ''}`}
            onClick={() => setTab('link')}
          >
            <LinkIcon size={14} /> Link Sharing
          </button>
          <button
            className={`share-modal__tab ${tab === 'email' ? 'share-modal__tab--active' : ''}`}
            onClick={() => setTab('email')}
          >
            <Users size={14} /> Invite People
          </button>
        </div>

        <div className="share-modal__body">
          {/* ── LINK TAB ─────────────────────────────── */}
          {tab === 'link' && (
            <div className="share-link-section">
              {/* Toggle */}
              <div className="share-toggle-row">
                <div>
                  <div className="share-toggle-label">Public Link</div>
                  <div className="share-toggle-sub">Anyone with the link can access this chart</div>
                </div>
                <button
                  className={`share-toggle ${isPublic ? 'share-toggle--on' : ''}`}
                  onClick={() => togglePublic(!isPublic)}
                  disabled={linkLoading}
                >
                  {linkLoading ? <Loader2 size={12} className="spin" /> : (
                    <span className="share-toggle__knob" />
                  )}
                </button>
              </div>

              {/* Access level selector */}
              <div className="share-access-row">
                <span className="share-access-label">Permission:</span>
                <div className="share-access-pills">
                  <button
                    className={`share-access-pill ${accessLevel === 'view' ? 'share-access-pill--active' : ''}`}
                    onClick={() => updateAccessLevel('view')}
                  >
                    <Eye size={13} /> View Only
                  </button>
                  <button
                    className={`share-access-pill ${accessLevel === 'edit' ? 'share-access-pill--active' : ''}`}
                    onClick={() => updateAccessLevel('edit')}
                  >
                    <Edit3 size={13} /> Can Edit
                  </button>
                </div>
              </div>

              {/* Copy URL */}
              <div className="share-url-row">
                <div className="share-url-box">
                  <LinkIcon size={13} style={{ color: 'var(--gray-500)', flexShrink: 0 }} />
                  <span className="share-url-text">{shareUrl}</span>
                </div>
                <button
                  className={`share-copy-btn ${linkCopied ? 'share-copy-btn--copied' : ''}`}
                  onClick={copyLink}
                >
                  {linkCopied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy Link</>}
                </button>
              </div>

              {!isPublic && (
                <div className="share-note">
                  <AlertCircle size={13} />
                  Turn on Public Link for anyone to access via URL
                </div>
              )}
            </div>
          )}

          {/* ── EMAIL TAB ────────────────────────────── */}
          {tab === 'email' && (
            <div className="share-email-section">
              <form onSubmit={inviteByEmail} className="share-invite-form">
                <input
                  type="email"
                  className="auth-input"
                  placeholder="Enter email address..."
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={emailLoading}
                />
                <div className="share-access-pills" style={{ marginTop: 10 }}>
                  <button
                    type="button"
                    className={`share-access-pill ${emailAccess === 'view' ? 'share-access-pill--active' : ''}`}
                    onClick={() => setEmailAccess('view')}
                  >
                    <Eye size={13} /> View Only
                  </button>
                  <button
                    type="button"
                    className={`share-access-pill ${emailAccess === 'edit' ? 'share-access-pill--active' : ''}`}
                    onClick={() => setEmailAccess('edit')}
                  >
                    <Edit3 size={13} /> Can Edit
                  </button>
                </div>
                {emailError && <div className="auth-error" style={{ marginTop: 10 }}><AlertCircle size={13} /><span>{emailError}</span></div>}
                {emailSuccess && <div className="auth-success" style={{ marginTop: 10 }}><Check size={13} /><span>{emailSuccess}</span></div>}
                <button type="submit" className="auth-submit-btn" disabled={emailLoading} style={{ marginTop: 12 }}>
                  {emailLoading ? <><Loader2 size={15} className="spin" /> Inviting...</> : 'Send Invite'}
                </button>
              </form>

              {/* People list */}
              <div className="share-people-list">
                <div className="share-people-title">People with access</div>
                {listLoading ? (
                  <div style={{ color: 'var(--gray-500)', fontSize: 13, padding: '12px 0' }}>Loading...</div>
                ) : sharedList.length === 0 ? (
                  <div style={{ color: 'var(--gray-500)', fontSize: 13, padding: '12px 0' }}>No one invited yet</div>
                ) : (
                  sharedList.map((s) => (
                    <div key={s.id} className="share-person-row">
                      <div className="share-person-avatar">{s.shared_email.charAt(0).toUpperCase()}</div>
                      <div className="share-person-info">
                        <div className="share-person-email">{s.shared_email}</div>
                        <div className="share-person-access">{s.access_level === 'edit' ? 'Can edit' : 'View only'}</div>
                      </div>
                      <button className="share-remove-btn" onClick={() => removeShare(s.id)} title="Remove access">
                        <X size={13} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
