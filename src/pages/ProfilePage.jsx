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
  Monitor,
  MonitorSmartphone,
  Pencil,
  ShieldCheck,
  Smartphone,
  Tablet,
  Trash2,
  UserRound,
  X,
} from 'lucide-react';

import Navbar from '../components/Navbar';
import PhotoCropDialog from '../components/staff/PhotoCropDialog';
import { useAuth } from '../hooks/useAuth';
import { deleteCurrentAccount } from '../services/accountService';
import { uploadStaffPhoto } from '../services/staffService';
import { describeDeviceSession } from '../utils/deviceSession';
import { ImagePrepError, validateOfficerPhotoFile } from '../utils/imagePrep';
import '../styles/account-record.css';

const MIN_PASSWORD_LENGTH = 6;

function formatSessionTime(value) {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export default function ProfilePage() {
  const {
    user,
    session,
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

  const [confirmingDeletion, setConfirmingDeletion] = useState(false);
  const [deletionConfirmation, setDeletionConfirmation] = useState('');
  const [accountDeleting, setAccountDeleting] = useState(false);
  const [deletionNote, setDeletionNote] = useState(null);

  const currentDevice = useMemo(
    () =>
      describeDeviceSession(
        typeof navigator === 'undefined' ? '' : navigator.userAgent,
        typeof navigator === 'undefined' ? '' : navigator.platform,
      ),
    [],
  );
  const SessionDeviceIcon =
    currentDevice.kind === 'mobile'
      ? Smartphone
      : currentDevice.kind === 'tablet'
        ? Tablet
        : Monitor;

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

  const cancelAccountDeletion = () => {
    setConfirmingDeletion(false);
    setDeletionConfirmation('');
    setDeletionNote(null);
  };

  const handleAccountDeletion = async () => {
    setDeletionNote(null);
    if (deletionConfirmation !== 'DELETE') {
      setDeletionNote({ kind: 'bad', text: 'Type DELETE exactly to continue.' });
      return;
    }

    setAccountDeleting(true);
    try {
      await deleteCurrentAccount();
      navigate('/login', { replace: true, state: { accountDeleted: true } });
    } catch (error) {
      setDeletionNote({
        kind: 'bad',
        text:
          error instanceof Error
            ? error.message
            : 'The account could not be deleted.',
      });
      setAccountDeleting(false);
    }
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
                src="/gdt-seal-mark@3x.png"
                width="96"
                height="96"
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
                <h2 className="acct-register__en" id="acct-identity">Identity</h2>
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
                    {!photoUploading && (
                      <button
                        type="button"
                        className="acct-photo__edit"
                        onClick={() => photoInputRef.current?.click()}
                        aria-label={photo ? 'Replace photo' : 'Upload photo'}
                      >
                        <Pencil size={18} />
                      </button>
                    )}
                    {photo && !photoUploading && (
                      <button
                        type="button"
                        className="acct-photo__remove"
                        onClick={() => setPhoto('')}
                        aria-label="Remove photo"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </span>

                  <p className="acct-hint">
                    JPG, PNG, or WebP up to 10MB. Hover over the photo and click
                    the pencil to upload or replace. You crop it to a square
                    before it is saved.
                  </p>

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
                <h2 className="acct-register__en" id="acct-security">Security</h2>
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
                <h2 className="acct-register__en" id="acct-sessions">Active sessions</h2>
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
                  <div className="acct-session">
                    <span className="acct-session__device" aria-hidden="true">
                      <SessionDeviceIcon size={20} />
                    </span>
                    <div className="acct-session__identity">
                      <div className="acct-session__title-row">
                        <strong>{currentDevice.label}</strong>
                        <span className="acct-flag acct-flag--ok">Current session</span>
                      </div>
                      <span className="acct-session__meta">
                        {currentDevice.kind === 'desktop'
                          ? 'Computer'
                          : currentDevice.kind === 'tablet'
                            ? 'Tablet'
                            : 'Mobile device'}
                      </span>
                      <dl className="acct-session__facts">
                        <div>
                          <dt>Signed in</dt>
                          <dd>{formatSessionTime(user?.last_sign_in_at)}</dd>
                        </div>
                        <div>
                          <dt>Session expires</dt>
                          <dd>
                            {formatSessionTime(
                              session?.expires_at
                                ? session.expires_at * 1000
                                : null,
                            )}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  </div>
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
                <h2 className="acct-register__en" id="acct-danger">Danger zone</h2>
              </div>
            </div>

            <div className="acct-row acct-row--stated">
              <span className="acct-row__label">Account deletion</span>
              <div className="acct-row__field">
                <p className="acct-copy" style={{ marginBottom: 0 }}>
                  Permanently deletes your sign-in account, owned charts, folders,
                  versions, invitations, and thumbnails. GDT personnel records are
                  preserved and disconnected from the deleted account.
                </p>
                {confirmingDeletion && (
                  <div className="acct-delete-confirmation">
                    <label htmlFor="account-delete-confirmation">
                      Type <strong>DELETE</strong> to confirm
                    </label>
                    <input
                      id="account-delete-confirmation"
                      className="acct-input"
                      type="text"
                      value={deletionConfirmation}
                      onChange={(event) =>
                        setDeletionConfirmation(event.target.value)
                      }
                      autoComplete="off"
                      spellCheck="false"
                      disabled={accountDeleting}
                    />
                    <p className="acct-hint">
                      This cannot be undone. Shared charts owned by other users are
                      not deleted, but your access to them is removed.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <footer className="acct-register__foot">
              {deletionNote && (
                <span
                  className={`acct-note acct-note--${deletionNote.kind}`}
                  role="alert"
                >
                  <AlertCircle size={14} aria-hidden="true" />
                  {deletionNote.text}
                </span>
              )}
              <div className="acct-register__actions">
                {confirmingDeletion ? (
                  <>
                    <button
                      type="button"
                      className="acct-btn acct-btn--quiet"
                      onClick={cancelAccountDeletion}
                      disabled={accountDeleting}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="acct-btn acct-btn--danger"
                      onClick={handleAccountDeletion}
                      disabled={accountDeleting || deletionConfirmation !== 'DELETE'}
                    >
                      {accountDeleting ? (
                        <>
                          <Loader2 size={15} className="acct-spin" aria-hidden="true" />
                          Deleting account
                        </>
                      ) : (
                        <>
                          <Trash2 size={15} aria-hidden="true" /> Delete permanently
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="acct-btn acct-btn--danger"
                    onClick={() => {
                      setDeletionNote(null);
                      setConfirmingDeletion(true);
                    }}
                  >
                    <Trash2 size={15} aria-hidden="true" /> Delete account
                  </button>
                )}
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
