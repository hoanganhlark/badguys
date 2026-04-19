import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Menu, Shield, Users } from "react-feather";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  createUser,
  deleteUser,
  subscribeUsers,
  updateUserRole,
} from "../lib/firebase";
import { hashMd5 } from "../lib/hash";
import type { UserRecord, UserRole } from "../types";
import RankingSidebar from "./ranking/RankingSidebar";
import type { RankingView } from "./ranking/types";

export default function UserManagementPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    username: "",
    password: "",
    role: "member" as UserRole,
  });
  const [saving, setSaving] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const mainContentRef = useRef<HTMLElement | null>(null);

  const isAdmin = currentUser?.role === "admin";

  const sortedUsers = useMemo(
    () => [...users].sort((a, b) => a.username.localeCompare(b.username, "vi")),
    [users],
  );
  const adminCount = useMemo(
    () => sortedUsers.filter((user) => user.role === "admin").length,
    [sortedUsers],
  );

  useEffect(() => {
    setLoading(true);
    setError("");

    let unsubscribe: (() => void) | null = null;

    try {
      unsubscribe = subscribeUsers(
        (nextUsers) => {
          setUsers(nextUsers);
          setLoading(false);
        },
        (loadError) => {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Không tải được danh sách users.",
          );
          setLoading(false);
        },
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Không tải được danh sách users.",
      );
      setLoading(false);
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  useEffect(() => {
    const container = mainContentRef.current;
    if (!container) return;

    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (
        !(
          target instanceof HTMLInputElement ||
          target instanceof HTMLSelectElement ||
          target instanceof HTMLTextAreaElement
        )
      ) {
        return;
      }

      window.setTimeout(() => {
        target.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "nearest",
        });
      }, 220);
    };

    container.addEventListener("focusin", handleFocusIn);
    return () => container.removeEventListener("focusin", handleFocusIn);
  }, []);

  const handleSetDashboardView = (view: RankingView) => {
    navigate(`/dashboard/${view}`);
  };

  async function handleCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isAdmin) return;

    const username = form.username.trim();
    const password = form.password;

    if (!username || !password) {
      setError("Vui lòng nhập username và password.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      await createUser({
        username,
        passwordHash: hashMd5(password),
        role: form.role,
      });
      setForm({ username: "", password: "", role: "member" });
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Tạo user thất bại.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteUser(user: UserRecord) {
    if (!isAdmin) return;
    if (user.id === currentUser?.userId) {
      setError("Không thể xóa chính tài khoản đang đăng nhập.");
      return;
    }

    const confirmed = window.confirm("Bạn có chắc chắn muốn xóa không?");
    if (!confirmed) return;

    try {
      await deleteUser(user.id);
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Xóa user thất bại.",
      );
    }
  }

  async function handleUpdateRole(user: UserRecord, nextRole: UserRole) {
    if (!isAdmin) return;

    try {
      await updateUserRole(user.id, nextRole);
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Cập nhật role thất bại.",
      );
    }
  }

  return (
    <div className="min-h-screen dashboard-surface text-slate-900 font-sans">
      <div className="flex min-h-screen flex-col md:flex-row">
        <button
          type="button"
          onClick={() => setMobileSidebarOpen(true)}
          className="md:hidden fixed top-5 left-5 z-[70] h-10 w-10 rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm inline-flex items-center justify-center hover:bg-slate-50"
          aria-label="Mở menu dashboard"
        >
          <Menu className="h-5 w-5" />
        </button>

        <RankingSidebar
          currentView="ranking"
          onSetView={handleSetDashboardView}
          onGoHome={() => navigate("/")}
          isAdmin={isAdmin}
          onGoUsers={() => navigate("/users")}
          showMatchForm={true}
          mobileOpen={mobileSidebarOpen}
          onMobileClose={() => setMobileSidebarOpen(false)}
          usersActive={true}
        />

        <main
          ref={mainContentRef}
          className="dashboard-main-scroll flex-1 px-4 pt-4 md:p-8 overflow-auto"
        >
          <div className="mx-auto max-w-7xl space-y-5 md:space-y-6">
            <header className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm md:px-6 md:py-5">
              <h1 className="text-xl md:text-3xl font-bold text-slate-900 inline-flex items-center gap-3">
                <Shield className="h-6 w-6 md:h-8 md:w-8 text-sky-600" />
                Quản lý user
              </h1>
              <p className="mt-1.5 text-xs md:text-sm text-slate-500">
                Quản lý tài khoản đăng nhập và phân quyền dashboard.
              </p>
            </header>

            <section className="grid grid-cols-3 gap-2 md:max-w-2xl">
              <div className="dashboard-card px-3 py-2.5">
                <p className="text-[11px] text-slate-500">Tổng users</p>
                <p className="text-lg font-bold text-slate-900">
                  {sortedUsers.length}
                </p>
              </div>
              <div className="dashboard-card px-3 py-2.5">
                <p className="text-[11px] text-slate-500">Admin</p>
                <p className="text-lg font-bold text-slate-900">{adminCount}</p>
              </div>
              <div className="dashboard-card px-3 py-2.5">
                <p className="text-[11px] text-slate-500">Member</p>
                <p className="text-lg font-bold text-slate-900">
                  {Math.max(0, sortedUsers.length - adminCount)}
                </p>
              </div>
            </section>

            <section className="dashboard-card p-4 md:p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
                Tạo user mới
              </h2>
              <form
                className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4"
                onSubmit={handleCreateUser}
              >
                <input
                  type="text"
                  placeholder="Username"
                  value={form.username}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      username: event.target.value,
                    }))
                  }
                  className="mobile-focus-target dashboard-input"
                  required
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={form.password}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      password: event.target.value,
                    }))
                  }
                  className="mobile-focus-target dashboard-input"
                  required
                />
                <select
                  value={form.role}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      role: event.target.value === "admin" ? "admin" : "member",
                    }))
                  }
                  className="mobile-focus-target dashboard-input"
                >
                  <option value="member">member</option>
                  <option value="admin">admin</option>
                </select>
                <button
                  type="submit"
                  disabled={saving || !isAdmin}
                  className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {saving ? "Đang tạo..." : "Tạo user"}
                </button>
              </form>
              <p className="mt-2 text-xs text-slate-500">
                Password sẽ được lưu dưới dạng MD5 hash.
              </p>
            </section>

            <section className="dashboard-card p-4 md:p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700 inline-flex items-center gap-2">
                <Users className="h-4 w-4" /> Danh sách users
              </h2>

              {error ? (
                <p className="mt-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              ) : null}

              {loading ? (
                <p className="mt-3 text-sm text-slate-500">Đang tải users...</p>
              ) : (
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[600px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
                        <th className="px-2 py-3">Username</th>
                        <th className="px-2 py-3">Role</th>
                        <th className="px-2 py-3">CreatedAt</th>
                        <th className="px-2 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedUsers.map((user) => (
                        <tr key={user.id} className="border-b border-slate-100">
                          <td className="px-2 py-3 font-semibold text-slate-900">
                            {user.username}
                          </td>
                          <td className="px-2 py-3">
                            <select
                              value={user.role}
                              onChange={(event) =>
                                handleUpdateRole(
                                  user,
                                  event.target.value === "admin"
                                    ? "admin"
                                    : "member",
                                )
                              }
                              disabled={!isAdmin}
                              className="dashboard-input py-1.5 text-xs"
                            >
                              <option value="member">member</option>
                              <option value="admin">admin</option>
                            </select>
                          </td>
                          <td className="px-2 py-3 text-slate-600">
                            {user.createdAt || "-"}
                          </td>
                          <td className="px-2 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(user)}
                              disabled={
                                !isAdmin || user.id === currentUser?.userId
                              }
                              className="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                            >
                              Xóa
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
