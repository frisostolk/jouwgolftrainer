import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Settings, Plus, Trash2, ChevronRight, Map } from "lucide-react";
import { useCourses, useCreateCourse, useDeleteCourse } from "../hooks/useCourses";
import { useAuth } from "../context/AuthContext";

export function AdminSettingsPage() {
  const navigate = useNavigate();
  const { isSuperuser } = useAuth();
  const { data: courses, isLoading } = useCourses();
  const createCourse = useCreateCourse();
  const deleteCourse = useDeleteCourse();

  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newHoles, setNewHoles] = useState<9 | 18>(18);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  if (!isSuperuser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Admin access required.</p>
      </div>
    );
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    const course = await createCourse.mutateAsync({ name: newName.trim(), total_holes: newHoles });
    setShowNew(false);
    setNewName("");
    navigate(`/admin/courses/${course.id}`);
  }

  async function handleDelete(id: number) {
    await deleteCourse.mutateAsync(id);
    setConfirmDelete(null);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 pt-safe">
        <div className="flex items-center gap-3 h-14">
          <Settings className="w-5 h-5 text-gray-600" />
          <h1 className="text-lg font-semibold">Admin Settings</h1>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Course Templates section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <Map className="w-4 h-4 text-green-700" /> Course Templates
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Set tee positions per hole — applied automatically when players start a round at that course.
              </p>
            </div>
            <button
              onClick={() => setShowNew(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-green-700 text-white rounded-lg text-sm font-medium"
            >
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>

          {/* New course form */}
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
                      newHoles === n
                        ? "bg-green-700 text-white border-green-700"
                        : "bg-white text-gray-600 border-gray-200"
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

          {/* Course list */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin w-6 h-6 border-2 border-green-600 border-t-transparent rounded-full" />
            </div>
          ) : courses && courses.length > 0 ? (
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
                          onClick={() => handleDelete(course.id)}
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
              <p className="text-xs text-gray-300 mt-1">Add a course to pre-configure tee positions per hole.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
