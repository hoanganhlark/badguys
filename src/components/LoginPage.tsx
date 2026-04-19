import { FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface LocationState {
  from?: string;
}

export default function LoginPage() {
  const { login } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const canSubmit =
    username.trim().length > 0 && password.trim().length > 0 && !submitting;

  const redirectTo =
    (
      (location.state as LocationState | null)?.from || "/dashboard/ranking"
    ).trim() || "/dashboard/ranking";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      await login(username.trim(), password);
      navigate(redirectTo, { replace: true });
    } catch (loginError) {
      setError(
        loginError instanceof Error ? loginError.message : t("login.failed"),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-sky-50 to-cyan-100 p-4 flex items-center justify-center">
      <div className="w-full max-w-md rounded-3xl border border-white/80 bg-white/90 p-6 shadow-xl backdrop-blur md:p-8">
        <h1 className="text-2xl font-bold text-slate-900">
          {t("login.titleDashboard")}
        </h1>
        <p className="mt-2 text-sm text-slate-600">{t("login.subtitlePage")}</p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label
              htmlFor="username"
              className="block text-xs font-semibold text-slate-600 uppercase"
            >
              Username
            </label>
            <input
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
              Password
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

        <button
          type="button"
          onClick={() => navigate("/")}
          className="mt-3 w-full rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          {t("login.backHome")}
        </button>
      </div>
    </div>
  );
}
