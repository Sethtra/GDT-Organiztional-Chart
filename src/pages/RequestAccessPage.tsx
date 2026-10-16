import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, CheckCircle, Loader2, Send } from "lucide-react";

import {
  AccessRequestInputSchema,
  type AccessRequestField,
  type AccessRequestInput,
} from "../contracts/accessRequest";
import { submitAccessRequest } from "../services/accessRequestService";

type FieldErrors = Partial<Record<AccessRequestField, string>>;

const EMPTY_FORM: AccessRequestInput = { fullName: "", email: "", employeeId: "" };

export default function RequestAccessPage() {
  const [form, setForm] = useState<AccessRequestInput>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<AccessRequestInput | null>(null);
  const confirmationHeading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (submitted) confirmationHeading.current?.focus();
  }, [submitted]);

  const updateField = (field: AccessRequestField, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((current) => ({ ...current, [field]: undefined }));
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError("");

    const parsed = AccessRequestInputSchema.safeParse(form);
    if (!parsed.success) {
      const errors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as AccessRequestField;
        errors[field] ??= issue.message;
      }
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);
    try {
      await submitAccessRequest(parsed.data);
      setSubmitted(parsed.data);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Your request could not be sent. Try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const fieldProps = (field: AccessRequestField) => ({
    "aria-invalid": fieldErrors[field] ? true : undefined,
    "aria-describedby": fieldErrors[field] ? `${field}-error` : undefined,
    className: `gov-auth-input${fieldErrors[field] ? " gov-auth-input--error" : ""}`,
    disabled: submitting,
    value: form[field],
    onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
      updateField(field, event.target.value),
  });

  const fieldError = (field: AccessRequestField) =>
    fieldErrors[field] ? (
      <span id={`${field}-error`} className="gov-auth-field-hint gov-auth-field-hint--error">
        {fieldErrors[field]}
      </span>
    ) : null;

  return (
    <div className="gov-auth-page">
      <Link to="/" className="gov-auth-back-link">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
        Back to Home
      </Link>

      <div className="gov-auth-card">
        <Link to="/" className="gov-auth-header">
          <img
            src="/GDT-Logo (Soft).png"
            alt="GDT — General Department of Taxation"
            className="gov-auth-logo-img"
          />
        </Link>

        <div className="gov-auth-body">
          {submitted ? (
            <div className="gov-auth-success-block" role="status">
              <CheckCircle size={48} aria-hidden="true" />
              <h1 ref={confirmationHeading} tabIndex={-1}>
                Request submitted
              </h1>
              <p>
                Thank you, {submitted.fullName}. HR will review your request and
                confirm your details against the staff directory.
              </p>
              <p>
                Once your request is accepted, you will receive an email at{" "}
                <strong>{submitted.email}</strong> with a link to set your
                password and sign in.
              </p>
              <p className="gov-auth-switch">
                <Link to="/" className="gov-auth-switch-link">Return to home</Link>
              </p>
            </div>
          ) : (
            <>
              <div className="gov-auth-intro">
                <h1 className="gov-auth-title">Request access</h1>
                <p className="gov-auth-subtitle">
                  Accounts are created by HR for GDT staff. Send your details and
                  HR will review your request.
                </p>
              </div>

              {submitError && (
                <div className="gov-auth-error" role="alert">
                  <AlertCircle size={15} aria-hidden="true" />
                  <span>{submitError}</span>
                </div>
              )}

              <form className="gov-auth-form" onSubmit={handleSubmit} noValidate>
                <div className="gov-auth-field">
                  <label className="gov-auth-label" htmlFor="fullName">Full name</label>
                  <input
                    id="fullName"
                    type="text"
                    placeholder="e.g. Sok Dara"
                    autoComplete="name"
                    {...fieldProps("fullName")}
                  />
                  {fieldError("fullName")}
                </div>

                <div className="gov-auth-field">
                  <label className="gov-auth-label" htmlFor="email">Work email</label>
                  <input
                    id="email"
                    type="email"
                    placeholder="name@tax.gov.kh"
                    autoComplete="email"
                    {...fieldProps("email")}
                  />
                  {fieldError("email")}
                </div>

                <div className="gov-auth-field">
                  <label className="gov-auth-label" htmlFor="employeeId">Employee ID</label>
                  <input
                    id="employeeId"
                    type="text"
                    placeholder="As shown on your staff record"
                    autoComplete="off"
                    {...fieldProps("employeeId")}
                  />
                  {fieldError("employeeId")}
                </div>

                <button type="submit" className="gov-auth-submit-btn" disabled={submitting}>
                  {submitting ? (
                    <><Loader2 size={17} className="spin" aria-hidden="true" /> Sending request...</>
                  ) : (
                    <><Send size={17} aria-hidden="true" /> Send request</>
                  )}
                </button>
              </form>

              <p className="gov-auth-switch">
                Already have an account?{" "}
                <Link to="/login" className="gov-auth-switch-link">Sign In</Link>
              </p>
            </>
          )}
        </div>

        <div className="gov-auth-footer">
          <div className="gov-auth-footer-text">Ministry of Economy and Finance, Kingdom of Cambodia</div>
        </div>
      </div>
    </div>
  );
}
