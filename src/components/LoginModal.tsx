import { FormEvent, useState } from "react";
import { X } from "react-feather";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";

type LoginModalProps = {
  open: boolean;
  redirectTo: string;
  onClose: () => void;
  onSuccess: (target: string) => void;
};

export default function LoginModal({
  open,
  redirectTo,
  onClose,
  onSuccess,
}: LoginModalProps) {
  const { login } = useAuth();
  const { t } = useTranslation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const canSubmit =
    username.trim().length > 0 && password.trim().length > 0 && !submitting;

  if (!open) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      await login(username.trim(), password);
      onSuccess(redirectTo);
    } catch (loginError) {
      setError(
        loginError instanceof Error ? loginError.message : t("login.failed"),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[90] bg-black/45 p-4 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl border border-white/80 bg-white/95 p-6 shadow-2xl backdrop-blur md:p-8"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-2xl font-bold text-slate-900">
              {t("login.title")}
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              {t("login.subtitleModal")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:text-slate-700"
            aria-label={t("login.close")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label
              htmlFor="username"
              className="block text-xs font-semibold text-slate-600 uppercase"
            >
              {t("login.username")}
            </label>
            <input
              autoFocus
              id="username"
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-sky-500"
              autoComplete="username"
              required
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-xs font-semibold text-slate-600 uppercase"
            >
              {t("login.password")}
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-sky-500"
              autoComplete="current-password"
              required
            />
          </div>

          {error ? (
            <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-60"
          >
            {submitting ? t("login.submitting") : t("common.login")}
          </button>
        </form>
      </div>
    </div>
  );
}
