/* ============================================================================
   DIRECTION CONTRACT — Account Settings (/profile)

   THESIS: Your account is a record on file with GDT, not a settings dashboard.
     Refuses the stack-of-cards settings scaffold the old page shipped.
   OWN-WORLD: The committed --nx-* green/white system. One white sheet under an
     emerald letterhead with the seal impressed on a white disc, gold hairline,
     ruled label/value rows, endorsement strips on recessed paper. Manrope +
     Kantumruy Pro; 8px radii.
   STORY: You see your filed identity, amend the parts you own, secure the
     account, and read plainly why deletion is not yet available.
   FIRST VIEWPORT: Back link, then the sheet — letterhead (seal · ការកំណត់គណនី ·
     account ref) directly over the Identity register: photograph, display name,
     stated email. Save sits in that register's own endorsement strip.
   FORM: Filed personnel record — candidate 7 of 7 on the grounded list.
     Seed key a5845ebe (surface / operate).
   FINISH: unreviewed and undocumented is unfinished; this build ends with the
     finish review, the verdict, and DESIGN.md.
   ========================================================================== */

import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  Clock3,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  LogOut,
  MonitorSmartphone,
  ShieldCheck,
  Trash2,
  UserRound,
} from 'lucide-react';

import Navbar from '../components/Navbar';
import PhotoCropDialog from '../components/staff/PhotoCropDialog';
import { useAuth } from '../hooks/useAuth';
import { uploadStaffPhoto } from '../services/staffService';
import { ImagePrepError, validateOfficerPhotoFile } from '../utils/imagePrep';
import '../styles/account-record.css';

const MIN_PASSWORD_LENGTH = 6;

export default function ProfilePage() {
  const {
    user,
    displayName,
    avatarUrl,
    updateProfile,
    updatePassword,
    signOut,
  } = useAuth();
  const navigate = useNavigate();

  // ── Identity register ───────────────────────────────────────────────────
  const [name, setName] = useState(displayName || '');
  const [photo, setPhoto] = useState(avatarUrl || '');
  const [identitySaving, setIdentitySaving] = useState(false);
  const [identityNote, setIdentityNote] = useState(null); // { kind, text }

  const [pendingCrop, setPendingCrop] = useState(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const photoInputRef = useRef(null);

  const identityDirty =
    name.trim() !== (displayName || '').trim() || photo !== (avatarUrl || '');

  // ── Security register ───────────────────────────────────────────────────
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordNote, setPasswordNote] = useState(null);

  const [confirmingGlobalSignOut, setConfirmingGlobalSignOut] = useState(false);
  const [globalSigningOut, setGlobalSigningOut] = useState(false);
  const [sessionNote, setSessionNote] = useState(null);

  /* Supabase reports every linked provider. An account that only ever signed
     in through Google has no password to change, so the register states that
     instead of offering a form that would silently mint one. */
  const providers = useMemo(() => {
    const list = user?.app_metadata?.providers;
    if (Array.isArray(list) && list.length) return list;
    return user?.app_metadata?.provider ? [user.app_metadata.provider] : [];
  }, [user]);
  const hasPassword = providers.length === 0 || providers.includes('email');

  const emailVerified = Boolean(user?.email_confirmed_at);
  // Short, stable handle for the account — the real user id, not a fabrication.
  const accountRef = (user?.id || '').replace(/-/g, '').slice(0, 10).toUpperCase();

  const initial = (name || displayName || 'U').trim().charAt(0).toUpperCase();

  // ── Handlers ────────────────────────────────────────────────────────────
  const handleIdentitySave = async (event) => {
    event.preventDefault();
    setIdentityNote(null);
    if (!name.trim()) {
      setIdentityNote({ kind: 'bad', text: 'Enter a display name before saving.' });
      return;
    }
    setIdentitySaving(true);
    const { error } = await updateProfile({
      display_name: name.trim(),
      full_name: name.trim(),
      avatar_url: photo || null,
    });
    setIdentitySaving(false);
    setIdentityNote(
      error
        ? { kind: 'bad', text: error.message }
        : { kind: 'ok', text: 'Record updated.' },
    );
  };

  const handleIdentityDiscard = () => {
    setName(displayName || '');
    setPhoto(avatarUrl || '');
    setIdentityNote(null);
  };

  const handlePhotoSelect = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setIdentityNote(null);
    try {
      validateOfficerPhotoFile(file);
      setPendingCrop(file);
    } catch (error) {
      setIdentityNote({
        kind: 'bad',
        text:
          error instanceof ImagePrepError
            ? error.message
            : 'Unable to use this photo.',
      });
    }
  };

  const handleCropConfirm = async (blob) => {
    setPendingCrop(null);
    setPhotoUploading(true);
    setIdentityNote(null);
    try {
      const url = await uploadStaffPhoto(blob);
      setPhoto(url);
    } catch (error) {
      setIdentityNote({
        kind: 'bad',
        text:
          error instanceof Error
            ? error.message
            : 'Unable to upload this photo.',
      });
    } finally {
      setPhotoUploading(false);
    }
  };

  const handlePasswordSave = async (event) => {
    event.preventDefault();
    setPasswordNote(null);
    if (password.length < MIN_PASSWORD_LENGTH) {
      setPasswordNote({
        kind: 'bad',
        text: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      });
      return;
    }
    if (password !== confirmPassword) {
      setPasswordNote({ kind: 'bad', text: 'The two passwords do not match.' });
      return;
    }
    setPasswordSaving(true);
    const { error } = await updatePassword(password);
    setPasswordSaving(false);
    if (error) {
      setPasswordNote({ kind: 'bad', text: error.message });
      return;
    }
    setPassword('');
    setConfirmPassword('');
    setPasswordNote({ kind: 'ok', text: 'Password changed.' });
  };

  const handleGlobalSignOut = async () => {
    setSessionNote(null);
    setGlobalSigningOut(true);
    const { error } = await signOut({ scope: 'global' });
    if (error) {
      setGlobalSigningOut(false);
      setConfirmingGlobalSignOut(false);
      setSessionNote({ kind: 'bad', text: error.message });
      return;
    }
    navigate('/login');
  };

  return (
    <div className="acct-page" data-impeccable-seed="a5845ebe">
      <Navbar />

      <div className="acct-shell">
        <Link to="/dashboard" className="acct-back">
          <ArrowLeft size={15} aria-hidden="true" /> Back to Dashboard
        </Link>

        <article className="acct-record">
          <header className="acct-record__head">
            <span className="acct-seal">
              <img
                src="/gdt-seal-mark.png"
                srcSet="/gdt-seal-mark.png 1x, /gdt-seal-mark@2x.png 2x, /gdt-seal-mark@3x.png 3x"
                alt=""
                aria-hidden="true"
              />
            </span>
            <div className="acct-head__titles">
              <h1 className="acct-head__kh">ការកំណត់គណនី</h1>
              <p className="acct-head__en">Account settings</p>
            </div>
            {accountRef && (
              <dl className="acct-head__ref">
                <dt>Account ref</dt>
                <dd>{accountRef}</dd>
              </dl>
            )}
          </header>

          {/* ── Identity ─────────────────────────────────────────────── */}
          <section className="acct-register" aria-labelledby="acct-identity">
            <div className="acct-register__head">
              <UserRound size={17} className="acct-register__icon" aria-hidden="true" />
              <div>
                <h2 className="acct-register__kh" id="acct-identity">
                  ព័ត៌មានអត្តសញ្ញាណ
                </h2>
                <p className="acct-register__en">Identity</p>
              </div>
            </div>

            <form onSubmit={handleIdentitySave}>
              <div className="acct-row acct-row--plain">
                <span className="acct-row__label" id="acct-photo-label">
                  Photograph
                </span>
                <div className="acct-row__field acct-photo">
                  <span className="acct-photo__mount">
                    {photo ? (
                      <img src={photo} alt="" aria-hidden="true" />
                    ) : (
                      <span className="acct-photo__initials">{initial}</span>
                    )}
                    {photoUploading && (
                      <span className="acct-photo__busy">
                        <Loader2 size={22} className="acct-spin" aria-hidden="true" />
                      </span>
                    )}
                  </span>

                  <div className="acct-photo__controls">
                    <div className="acct-photo__buttons">
                      <button
                        type="button"
                        className="acct-btn acct-btn--quiet"
                        onClick={() => photoInputRef.current?.click()}
                        disabled={photoUploading}
                        aria-describedby="acct-photo-label"
                      >
                        {photo ? 'Replace photo' : 'Upload photo'}
                      </button>
                      {photo && (
                        <button
                          type="button"
                          className="acct-btn acct-btn--quiet"
                          onClick={() => setPhoto('')}
                          disabled={photoUploading}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <p className="acct-hint">
                      JPG, PNG, or WebP up to 10MB. You crop it to a square before
                      it is saved.
                    </p>
                  </div>

                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    hidden
                    onChange={handlePhotoSelect}
                  />
                </div>
              </div>

              <div className="acct-row">
                <label className="acct-row__label" htmlFor="acct-name">
                  Display name
                </label>
                <div className="acct-row__field">
                  <input
                    id="acct-name"
                    type="text"
                    className="acct-input"
                    placeholder="Your full name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                  />
                  <p className="acct-hint">
                    Shown in the top bar, on charts you own, and to everyone you
                    invite to a chart.
                  </p>
                </div>
              </div>

              <div className="acct-row acct-row--stated">
                <span className="acct-row__label">Email address</span>
                <div className="acct-row__field">
                  <p className="acct-stated">
                    <Lock size={14} aria-hidden="true" />
                    <span className="acct-stated__value">{user?.email || '—'}</span>
                    {emailVerified ? (
                      <span className="acct-flag acct-flag--ok">
                        <BadgeCheck size={12} aria-hidden="true" /> Verified
                      </span>
                    ) : (
                      <span className="acct-flag acct-flag--wait">
                        <Clock3 size={12} aria-hidden="true" /> Unverified
                      </span>
                    )}
                  </p>
                  <p className="acct-hint">
                    Your email is the account&rsquo;s identifier and cannot be
                    changed here. Ask a GDT system administrator to move an account
                    to a different address.
                  </p>
                </div>
              </div>

              <footer className="acct-register__foot">
                {identityNote ? (
                  <span className={`acct-note acct-note--${identityNote.kind}`} role="status">
                    {identityNote.kind === 'ok' ? (
                      <CheckCircle2 size={14} aria-hidden="true" />
                    ) : (
                      <AlertCircle size={14} aria-hidden="true" />
                    )}
                    {identityNote.text}
                  </span>
                ) : identityDirty ? (
                  <span className="acct-note acct-note--pending">Unsaved changes</span>
                ) : null}

                <div className="acct-register__actions">
                  <button
                    type="button"
                    className="acct-btn acct-btn--quiet"
                    onClick={handleIdentityDiscard}
                    disabled={!identityDirty || identitySaving}
                  >
                    Discard
                  </button>
                  <button
                    type="submit"
                    className={`acct-btn acct-btn--primary${identitySaving ? ' is-busy' : ''}`}
                    disabled={!identityDirty || identitySaving || photoUploading}
                  >
                    {identitySaving ? (
                      <>
                        <Loader2 size={15} className="acct-spin" aria-hidden="true" />
                        Saving
                      </>
                    ) : (
                      'Save changes'
                    )}
                  </button>
                </div>
              </footer>
            </form>
          </section>

          {/* ── Security ─────────────────────────────────────────────── */}
          <section className="acct-register" aria-labelledby="acct-security">
            <div className="acct-register__head">
              <ShieldCheck size={17} className="acct-register__icon" aria-hidden="true" />
              <div>
                <h2 className="acct-register__kh" id="acct-security">
                  សុវត្ថិភាព
                </h2>
                <p className="acct-register__en">Security</p>
              </div>
            </div>

            {hasPassword ? (
              <form onSubmit={handlePasswordSave}>
                <div className="acct-row">
                  <label className="acct-row__label" htmlFor="acct-password">
                    New password
                  </label>
                  <div className="acct-row__field">
                    <div className="acct-input-wrap">
                      <input
                        id="acct-password"
                        type={passwordVisible ? 'text' : 'password'}
                        className="acct-input"
                        placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
                        autoComplete="new-password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                      />
                      <button
                        type="button"
                        className="acct-reveal"
                        onClick={() => setPasswordVisible((visible) => !visible)}
                        aria-label={passwordVisible ? 'Hide password' : 'Show password'}
                      >
                        {passwordVisible ? (
                          <EyeOff size={16} aria-hidden="true" />
                        ) : (
                          <Eye size={16} aria-hidden="true" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="acct-row">
                  <label className="acct-row__label" htmlFor="acct-password-confirm">
                    Confirm password
                  </label>
                  <div className="acct-row__field">
                    <input
                      id="acct-password-confirm"
                      type={passwordVisible ? 'text' : 'password'}
                      className="acct-input"
                      placeholder="Type the new password again"
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                    />
                    <p className="acct-hint">
                      Changing your password keeps this browser signed in. Other
                      devices stay signed in until you end their sessions below.
                    </p>
                  </div>
                </div>

                <footer className="acct-register__foot">
                  {passwordNote && (
                    <span className={`acct-note acct-note--${passwordNote.kind}`} role="status">
                      {passwordNote.kind === 'ok' ? (
                        <CheckCircle2 size={14} aria-hidden="true" />
                      ) : (
                        <AlertCircle size={14} aria-hidden="true" />
                      )}
                      {passwordNote.text}
                    </span>
                  )}
                  <div className="acct-register__actions">
                    <button
                      type="submit"
                      className={`acct-btn acct-btn--primary${passwordSaving ? ' is-busy' : ''}`}
                      disabled={passwordSaving || !password || !confirmPassword}
                    >
                      {passwordSaving ? (
                        <>
                          <Loader2 size={15} className="acct-spin" aria-hidden="true" />
                          Updating
                        </>
                      ) : (
                        'Update password'
                      )}
                    </button>
                  </div>
                </footer>
              </form>
            ) : (
              <div className="acct-row acct-row--stated">
                <span className="acct-row__label">Password</span>
                <div className="acct-row__field">
                  <p className="acct-stated">
                    <Lock size={14} aria-hidden="true" />
                    <span className="acct-stated__value">
                      Managed by your Google account
                    </span>
                  </p>
                  <p className="acct-hint">
                    You sign in to GDT Org Chart through Google, so there is no
                    password stored here. Change it in your Google account
                    settings.
                  </p>
                </div>
              </div>
            )}

          </section>

          {/* ── Sessions ─────────────────────────────────────────────── */}
          {/* Its own register, not a trailing row under Security: an endorsement
              strip closes the register it belongs to, and a row sitting *below*
              the password strip read as though the strip endorsed it. */}
          <section className="acct-register" aria-labelledby="acct-sessions">
            <div className="acct-register__head">
              <MonitorSmartphone size={17} className="acct-register__icon" aria-hidden="true" />
              <div>
                <h2 className="acct-register__kh" id="acct-sessions">
                  វេនសកម្ម
                </h2>
                <p className="acct-register__en">Active sessions</p>
              </div>
            </div>

            <div className="acct-row acct-row--stated">
              <span className="acct-row__label">Signed-in devices</span>
              <div className="acct-row__field">
                {confirmingGlobalSignOut ? (
                  <p className="acct-stated">
                    <AlertCircle size={14} aria-hidden="true" />
                    <span className="acct-stated__value">
                      Sign out of every device, including this one?
                    </span>
                  </p>
                ) : (
                  <p className="acct-copy" style={{ marginBottom: 0 }}>
                    Signing out everywhere ends every signed-in session on every
                    device and returns you to the sign-in page. Use it if you
                    signed in on a shared or lost computer.
                  </p>
                )}
              </div>
            </div>

            <footer className="acct-register__foot">
              {sessionNote && (
                <span className={`acct-note acct-note--${sessionNote.kind}`} role="status">
                  <AlertCircle size={14} aria-hidden="true" />
                  {sessionNote.text}
                </span>
              )}
              <div className="acct-register__actions">
                {confirmingGlobalSignOut ? (
                  <>
                    <button
                      type="button"
                      className="acct-btn acct-btn--quiet"
                      onClick={() => setConfirmingGlobalSignOut(false)}
                      disabled={globalSigningOut}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="acct-btn acct-btn--danger"
                      onClick={handleGlobalSignOut}
                      disabled={globalSigningOut}
                    >
                      {globalSigningOut ? (
                        <>
                          <Loader2 size={15} className="acct-spin" aria-hidden="true" />
                          Signing out
                        </>
                      ) : (
                        <>
                          <LogOut size={15} aria-hidden="true" /> Yes, sign out
                          everywhere
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="acct-btn acct-btn--quiet"
                    onClick={() => {
                      setSessionNote(null);
                      setConfirmingGlobalSignOut(true);
                    }}
                  >
                    <LogOut size={15} aria-hidden="true" /> Sign out everywhere
                  </button>
                )}
              </div>
            </footer>
          </section>

          {/* ── Danger zone ──────────────────────────────────────────── */}
          <section className="acct-register acct-register--danger" aria-labelledby="acct-danger">
            <div className="acct-register__head">
              <Trash2 size={17} className="acct-register__icon" aria-hidden="true" />
              <div>
                <h2 className="acct-register__kh" id="acct-danger">
                  តំបន់ប្រុងប្រយ័ត្ន
                </h2>
                <p className="acct-register__en">Danger zone</p>
              </div>
            </div>

            <div className="acct-row acct-row--stated">
              <span className="acct-row__label">Account deletion</span>
              <div className="acct-row__field">
                <p className="acct-copy" style={{ marginBottom: 0 }}>
                  Account deletion is temporarily unavailable. It requires a secure
                  server-side deletion function before the authentication account
                  and all associated chart data can be removed safely.
                </p>
              </div>
            </div>

            <footer className="acct-register__foot">
              <div className="acct-register__actions">
                <button
                  type="button"
                  className="acct-btn acct-btn--danger"
                  disabled
                  title="A secure server-side account deletion function has not been configured yet."
                >
                  <Trash2 size={15} aria-hidden="true" /> Account deletion
                  unavailable
                </button>
              </div>
            </footer>
          </section>
        </article>
      </div>

      {pendingCrop && (
        <PhotoCropDialog
          file={pendingCrop}
          onCancel={() => setPendingCrop(null)}
          onConfirm={(blob) => void handleCropConfirm(blob)}
        />
      )}
    </div>
  );
}
