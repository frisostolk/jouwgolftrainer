import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Settings, Plus, Trash2, ChevronRight, Map, Users } from "lucide-react";
import { useCourses, useCreateCourse, useDeleteCourse } from "../hooks/useCourses";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";

// ─── Admin users API + hook ───────────────────────────────────────────────────

interface AdminUser {
  id: number;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
  handicap: number | null;
  created_at: string;
  rounds_count: number;
  sessions_count: number;
}

function useAdminUsers() {
  return useQuery<AdminUser[]>({
    queryKey: ["admin", "users"],
    queryFn: () => api.get<AdminUser[]>("/admin/users").then((r) => r.data),
  });
}

function useUpdateAdminUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { role?: string; is_active?: boolean } }) =>
      api.patch<AdminUser>(`/admin/users/${id}`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "users"] }),
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ROLE_COLORS: Record<string, string> = {
  superuser: "bg-purple-100 text-purple-700",
  admin:     "bg-blue-100 text-blue-700",
  coach:     "bg-amber-100 text-amber-700",
  player:    "bg-gray-100 text-gray-600",
};

const ROLES = ["player", "coach", "admin", "superuser"] as const;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });
}

// ─── Users tab ───────────────────────────────────────────────────────────────

function UsersTab() {
  const { data: users, isLoading } = useAdminUsers();
  const updateUser = useUpdateAdminUser();
  const [editing, setEditing] = useState<number | null>(null);
  const { user: me } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin w-6 h-6 border-2 border-green-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  const active = users?.filter((u) => u.is_active) ?? [];
  const inactive = users?.filter((u) => !u.is_active) ?? [];

  function UserCard({ u }: { u: AdminUser }) {
    const isEditing = editing === u.id;
    const isMe = u.id === me?.id;

    return (
      <div className={`bg-white rounded-xl border overflow-hidden transition-colors ${u.is_active ? "border-gray-100" : "border-gray-100 opacity-60"}`}>
        {/* Main row */}
        <div className="px-4 py-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-gray-900 text-sm">{u.name}</span>
                {isMe && <span className="text-[10px] text-gray-400 font-medium">you</span>}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${ROLE_COLORS[u.role] ?? ROLE_COLORS.player}`}>
                  {u.role}
                </span>
                {!u.is_active && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-50 text-red-400 font-semibold">inactive</span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-0.5 truncate">{u.email}</p>
            </div>
            <button
              onClick={() => setEditing(isEditing ? null : u.id)}
              className={`text-xs px-2 py-1 rounded-lg font-medium flex-shrink-0 transition-colors ${isEditing ? "bg-green-600 text-white" : "bg-gray-100 text-gray-600"}`}
            >
              {isEditing ? "Done" : "Edit"}
            </button>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-4 mt-2">
            <span className="text-xs text-gray-400">{u.rounds_count} round{u.rounds_count !== 1 ? "s" : ""}</span>
            <span className="text-xs text-gray-400">{u.sessions_count} session{u.sessions_count !== 1 ? "s" : ""}</span>
            {u.handicap != null && <span className="text-xs text-gray-400">HCP {u.handicap}</span>}
            <span className="text-xs text-gray-300 ml-auto">{formatDate(u.created_at)}</span>
          </div>
        </div>

        {/* Inline editor */}
        {isEditing && (
          <div className="px-4 pb-3 border-t border-gray-50 pt-2 space-y-2">
            {/* Role picker */}
            <div>
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-1.5">Role</p>
              <div className="flex gap-1.5 flex-wrap">
                {ROLES.map((role) => (
                  <button
                    key={role}
                    disabled={updateUser.isPending || isMe}
                    onClick={() => updateUser.mutate({ id: u.id, data: { role } })}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors disabled:opacity-40 ${
                      u.role === role
                        ? (ROLE_COLORS[role] ?? "bg-gray-100 text-gray-600") + " ring-1 ring-inset ring-current"
                        : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
              {isMe && <p className="text-[10px] text-amber-500 mt-1">Cannot change your own role</p>}
            </div>

            {/* Active toggle */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">Account active</span>
              <button
                disabled={updateUser.isPending || isMe}
                onClick={() => updateUser.mutate({ id: u.id, data: { is_active: !u.is_active } })}
                className={`relative w-10 h-5 rounded-full transition-colors disabled:opacity-40 ${u.is_active ? "bg-green-500" : "bg-gray-300"}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${u.is_active ? "translate-x-5" : ""}`} />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Active users */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-sm font-semibold text-gray-700">Active Users</h2>
          <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-semibold">{active.length}</span>
        </div>
        {active.length > 0 ? (
          <div className="space-y-2">
            {active.map((u) => <UserCard key={u.id} u={u} />)}
          </div>
        ) : (
          <p className="text-sm text-gray-400 py-4 text-center">No active users.</p>
        )}
      </div>

      {/* Inactive users */}
      {inactive.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-400 mb-3">Inactive Users ({inactive.length})</h2>
          <div className="space-y-2">
            {inactive.map((u) => <UserCard key={u.id} u={u} />)}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Courses tab ──────────────────────────────────────────────────────────────

function CoursesTab() {
  const navigate = useNavigate();
  const { data: courses, isLoading } = useCourses();
  const createCourse = useCreateCourse();
  const deleteCourse = useDeleteCourse();

  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newHoles, setNewHoles] = useState<9 | 18>(18);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  async function handleCreate() {
    if (!newName.trim()) return;
    const course = await createCourse.mutateAsync({ name: newName.trim(), total_holes: newHoles });
    setShowNew(false);
    setNewName("");
    navigate(`/admin/courses/${course.id}`);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin w-6 h-6 border-2 border-green-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-gray-500">
          Set tee positions per hole — applied automatically when players start a round.
        </p>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-1 px-3 py-1.5 bg-green-700 text-white rounded-lg text-sm font-medium flex-shrink-0 ml-3"
        >
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>

      {showNew && (
        <div className="mb-3 p-4 bg-white rounded-xl border border-green-200 space-y-3">
          <p className="text-sm font-medium text-gray-700">New Course Template</p>
          <input
            type="text"
            placeholder="Course name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            autoFocus
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <div className="flex gap-2">
            {([9, 18] as const).map((n) => (
              <button
                key={n}
                onClick={() => setNewHoles(n)}
                className={`flex-1 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${
                  newHoles === n ? "bg-green-700 text-white border-green-700" : "bg-white text-gray-600 border-gray-200"
                }`}
              >
                {n} Holes
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setShowNew(false); setNewName(""); }}
              className="flex-1 py-2 rounded-lg text-sm text-gray-600 bg-gray-100"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!newName.trim() || createCourse.isPending}
              className="flex-1 py-2 rounded-lg text-sm font-semibold text-white bg-green-700 disabled:opacity-50"
            >
              {createCourse.isPending ? "Creating…" : "Create & Edit"}
            </button>
          </div>
        </div>
      )}

      {courses && courses.length > 0 ? (
        <div className="space-y-2">
          {courses.map((course) => (
            <div key={course.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              {confirmDelete === course.id ? (
                <div className="flex items-center justify-between px-4 py-3">
                  <p className="text-sm text-gray-700">Delete <strong>{course.name}</strong>?</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setConfirmDelete(null)}
                      className="px-3 py-1 text-xs rounded-lg bg-gray-100 text-gray-600"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={async () => { await deleteCourse.mutateAsync(course.id); setConfirmDelete(null); }}
                      className="px-3 py-1 text-xs rounded-lg bg-red-500 text-white font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center">
                  <button
                    onClick={() => navigate(`/admin/courses/${course.id}`)}
                    className="flex-1 flex items-center justify-between px-4 py-3"
                  >
                    <div className="text-left">
                      <p className="font-medium text-gray-900">{course.name}</p>
                      <p className="text-xs text-gray-400">{course.total_holes} holes</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                  </button>
                  <button
                    onClick={() => setConfirmDelete(course.id)}
                    className="px-4 py-3 text-gray-300 hover:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-10 bg-white rounded-xl border border-gray-100">
          <Map className="w-8 h-8 text-gray-200 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No course templates yet.</p>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Tab = "users" | "courses";

export function AdminSettingsPage() {
  const { isSuperuser } = useAuth();
  const [tab, setTab] = useState<Tab>("users");

  if (!isSuperuser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Admin access required.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 pt-safe">
        <div className="flex items-center gap-3 h-14">
          <Settings className="w-5 h-5 text-gray-600" />
          <h1 className="text-lg font-semibold">Admin</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 -mb-px">
          <button
            onClick={() => setTab("users")}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === "users"
                ? "border-green-600 text-green-700"
                : "border-transparent text-gray-500"
            }`}
          >
            <Users className="w-4 h-4" /> Users
          </button>
          <button
            onClick={() => setTab("courses")}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === "courses"
                ? "border-green-600 text-green-700"
                : "border-transparent text-gray-500"
            }`}
          >
            <Map className="w-4 h-4" /> Courses
          </button>
        </div>
      </div>

      <div className="px-4 py-5">
        {tab === "users" ? <UsersTab /> : <CoursesTab />}
      </div>
    </div>
  );
}
