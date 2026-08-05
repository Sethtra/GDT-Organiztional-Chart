import { useEffect, useId, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  Copy,
  Edit3,
  Eye,
  Link as LinkIcon,
  Loader2,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../hooks/useAuth';
import '../styles/share-modal.css';

export default function ShareModal({ chartId, chartName, isPublic: initialIsPublic, onClose }) {
  const { user } = useAuth();
  const [tab, setTab] = useState('link'); // 'link' | 'email'

  // Link sharing
  const [isPublic, setIsPublic] = useState(initialIsPublic || false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkError, setLinkError] = useState('');

  // Email sharing
  const [email, setEmail] = useState('');
  const [emailAccess, setEmailAccess] = useState('view');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [emailSuccess, setEmailSuccess] = useState('');
  const [sharedList, setSharedList] = useState([]);
  const [listLoading, setListLoading] = useState(true);

  const titleId = useId();
  const emailFieldId = useId();
  const closeRef = useRef(null);

  const shareUrl = `${window.location.origin}/chart/${chartId}`;

  useEffect(() => {
    closeRef.current?.focus();
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

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
    supabase.from('charts').select('is_public').eq('id', chartId).maybeSingle()
      .then(({ data }) => {
        if (data) {
          setIsPublic(data.is_public);
        }
      });
  }, [chartId]);

  const togglePublic = async (val) => {
    setLinkLoading(true);
    setLinkError('');
    const { error } = await supabase.from('charts')
      .update({ is_public: val, public_access_level: 'view' })
      .eq('id', chartId);
    setLinkLoading(false);
    if (error) {
      console.error('Failed to update sharing:', error);
      setLinkError('Could not update the sharing setting. Please try again.');
      return;
    }
    setIsPublic(val);
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
      console.error('Invite error:', error);
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
    setEmailError('');
    const { error } = await supabase.from('chart_shares').delete().eq('id', id);
    if (error) {
      console.error('Failed to delete share:', error);
      setEmailError('Could not remove that person. Please try again.');
      return;
    }
    setSharedList((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <div className="gdt-share-backdrop" onClick={onClose}>
      <div
        className="gdt-share-modal pa-theme"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ─────────────────────────────────── */}
        <div className="sm-header">
          <div className="min-w-0">
            <div className="sm-eyebrow">Chart access</div>
            <h2 id={titleId} className="sm-title">Share chart</h2>
            <span className="sm-sub">{chartName}</span>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="sm-close pa-focus-ring"
            onClick={onClose}
            aria-label="Close share dialog"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* ── Tabs ───────────────────────────────────── */}
        <div className="sm-tabs" role="tablist" aria-label="Sharing method">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'link'}
            className={`sm-tab pa-focus-ring ${tab === 'link' ? 'sm-tab-active' : ''}`}
            onClick={() => setTab('link')}
          >
            <LinkIcon size={14} aria-hidden="true" /> Link sharing
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'email'}
            className={`sm-tab pa-focus-ring ${tab === 'email' ? 'sm-tab-active' : ''}`}
            onClick={() => setTab('email')}
          >
            <Users size={14} aria-hidden="true" /> Invite people
          </button>
        </div>

        <div className="sm-body">
          {/* ── LINK TAB ─────────────────────────────── */}
          {tab === 'link' && (
            <div>
              <div className="sm-toggle-row">
                <div className="min-w-0">
                  <div className="sm-toggle-label">Public link</div>
                  <div className="sm-toggle-sub">Anyone with the link can open this chart</div>
                </div>
                <button
                  type="button"
                  className={`sm-switch pa-focus-ring ${isPublic ? 'sm-switch-on' : ''}`}
                  onClick={() => togglePublic(!isPublic)}
                  disabled={linkLoading}
                  role="switch"
                  aria-checked={isPublic}
                  aria-label="Public link"
                >
                  <span className="sm-switch-knob">
                    {linkLoading && (
                      <Loader2
                        size={11}
                        className="sm-spin"
                        style={{ color: 'var(--pa-primary)' }}
                        aria-hidden="true"
                      />
                    )}
                  </span>
                </button>
              </div>

              {linkError && (
                <p className="sm-error" role="alert">
                  <AlertCircle size={13} aria-hidden="true" />
                  <span>{linkError}</span>
                </p>
              )}

              <div className="sm-permission">
                <span className="sm-permission-label">Permission</span>
                <div className="sm-pills">
                  <button type="button" className="sm-pill sm-pill-active" disabled>
                    <Eye size={13} aria-hidden="true" /> View only
                  </button>
                </div>
              </div>

              <div className="sm-url-row">
                <div className="sm-url-box">
                  <LinkIcon size={13} aria-hidden="true" />
                  <span className="sm-url-text">{shareUrl}</span>
                </div>
                <button
                  type="button"
                  className={`sm-copy pa-focus-ring ${linkCopied ? 'sm-copy-done' : ''}`}
                  onClick={copyLink}
                >
                  {linkCopied ? (
                    <><Check size={14} aria-hidden="true" /> Copied</>
                  ) : (
                    <><Copy size={14} aria-hidden="true" /> Copy link</>
                  )}
                </button>
              </div>

              {!isPublic && (
                <p className="sm-note">
                  <AlertCircle size={13} aria-hidden="true" />
                  <span>
                    The public link is off. Turn it on for anyone with the URL to
                    open this chart — they will see chart display data only, never
                    staff profiles.
                  </span>
                </p>
              )}
            </div>
          )}

          {/* ── EMAIL TAB ────────────────────────────── */}
          {tab === 'email' && (
            <div>
              <form onSubmit={inviteByEmail} noValidate>
                <label htmlFor={emailFieldId} className="sm-label">
                  Invite by email
                </label>
                <input
                  id={emailFieldId}
                  type="email"
                  className="sm-input pa-focus-ring"
                  placeholder="name@tax.gov.kh"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={emailLoading}
                  autoComplete="email"
                />

                <div className="sm-permission">
                  <span className="sm-permission-label">Access</span>
                  <div className="sm-pills">
                    <button
                      type="button"
                      className={`sm-pill pa-focus-ring ${emailAccess === 'view' ? 'sm-pill-active' : ''}`}
                      aria-pressed={emailAccess === 'view'}
                      onClick={() => setEmailAccess('view')}
                    >
                      <Eye size={13} aria-hidden="true" /> View only
                    </button>
                    <button
                      type="button"
                      className={`sm-pill pa-focus-ring ${emailAccess === 'edit' ? 'sm-pill-active' : ''}`}
                      aria-pressed={emailAccess === 'edit'}
                      onClick={() => setEmailAccess('edit')}
                    >
                      <Edit3 size={13} aria-hidden="true" /> Can edit
                    </button>
                  </div>
                </div>

                {emailError && (
                  <p className="sm-error" role="alert">
                    <AlertCircle size={13} aria-hidden="true" />
                    <span>{emailError}</span>
                  </p>
                )}
                {emailSuccess && (
                  <p className="sm-success" role="status">
                    <Check size={13} aria-hidden="true" />
                    <span>{emailSuccess}</span>
                  </p>
                )}

                <button type="submit" className="sm-submit pa-focus-ring" disabled={emailLoading}>
                  {emailLoading ? (
                    <><Loader2 size={15} className="sm-spin" aria-hidden="true" /> Inviting…</>
                  ) : (
                    'Send invite'
                  )}
                </button>
              </form>

              <div className="sm-people">
                <div className="sm-people-title">
                  <UserRound size={12} aria-hidden="true" />
                  People with access
                </div>
                {listLoading ? (
                  <p className="sm-empty" aria-live="polite">Loading…</p>
                ) : sharedList.length === 0 ? (
                  <p className="sm-empty">No one has been invited yet.</p>
                ) : (
                  sharedList.map((s) => (
                    <div key={s.id} className="sm-person">
                      <span className="sm-avatar" aria-hidden="true">
                        {s.shared_email.charAt(0).toUpperCase()}
                      </span>
                      <div className="sm-person-info">
                        <div className="sm-person-email">{s.shared_email}</div>
                        <div className="sm-person-access">
                          {s.access_level === 'edit' ? 'Can edit' : 'View only'}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="sm-remove pa-focus-ring"
                        onClick={() => removeShare(s.id)}
                        aria-label={`Remove access for ${s.shared_email}`}
                      >
                        <X size={14} aria-hidden="true" />
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
