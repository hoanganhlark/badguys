import { FormEvent, useEffect, useMemo, useState } from "react";
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

  const isAdmin = currentUser?.role === "admin";

  const sortedUsers = useMemo(
    () => [...users].sort((a, b) => a.username.localeCompare(b.username, "vi")),
    [users],
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
    <div className="min-h-screen bg-slate-100 px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-sky-700">
                Admin Area
              </p>
              <h1 className="text-2xl font-bold text-slate-900">
                User Management
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Quản lý tài khoản đăng nhập cho dashboard.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/dashboard/ranking")}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Quay lại Dashboard
            </button>
          </div>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
          <h2 className="text-sm font-semibold uppercase text-slate-700">
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
                setForm((prev) => ({ ...prev, username: event.target.value }))
              }
              className="rounded-xl border border-slate-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-sky-500"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, password: event.target.value }))
              }
              className="rounded-xl border border-slate-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-sky-500"
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
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-sky-500"
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

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
          <h2 className="text-sm font-semibold uppercase text-slate-700">
            Danh sách users
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
                          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs"
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
                          disabled={!isAdmin || user.id === currentUser?.userId}
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
    </div>
  );
}
