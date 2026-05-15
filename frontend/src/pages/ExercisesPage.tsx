import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Plus } from "lucide-react";
import { useExercises, useCreateExercise } from "../hooks/useExercises";
import { useAuth } from "../context/AuthContext";
import { PageHeader } from "../components/PageHeader";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { Dumbbell } from "lucide-react";
import { CATEGORY_LABELS, DIFFICULTY_COLORS } from "../lib/utils";
import type { Exercise } from "../types";

const CATEGORIES = ["all", "driving", "putting", "chipping", "iron", "mental"];
const DIFFICULTIES = ["all", "beginner", "intermediate", "advanced"];

const BLANK_EXERCISE = {
  title: "", category: "driving", difficulty: "beginner",
  duration_minutes: 15, instructions: [], tags: [],
};

export function ExercisesPage() {
  const navigate = useNavigate();
  const { isCoach, isSuperuser } = useAuth();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [difficulty, setDifficulty] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ ...BLANK_EXERCISE, category: "driving" as Exercise["category"], difficulty: "beginner" as Exercise["difficulty"] });
  const [instructionsText, setInstructionsText] = useState("");
  const [scoringFieldsText, setScoringFieldsText] = useState("");
  const [makePublic, setMakePublic] = useState(false);

  const { data: publicExercises, isLoading: loadingPublic } = useExercises({
    category: category !== "all" ? category : undefined,
    difficulty: difficulty !== "all" ? difficulty : undefined,
    library: "public",
  });
  const { data: myExercises } = useExercises({ library: "personal" });
  const { data: assignedExercises } = useExercises({ library: "assigned" });

  const { mutateAsync: createExercise, isPending: creating } = useCreateExercise();

  const filterList = (list: Exercise[] = []) =>
    list.filter((e) =>
      e.title.toLowerCase().includes(search.toLowerCase())
    );

  const filtered = filterList(publicExercises);
  const filteredMine = filterList(myExercises);
  const filteredAssigned = filterList(assignedExercises);

  const canCreate = isCoach || isSuperuser;

  const handleCreate = async () => {
    const scoringFields = scoringFieldsText.split("\n").map((s) => s.trim()).filter(Boolean);
    await createExercise({
      ...form,
      instructions: instructionsText.split("\n").map((s) => s.trim()).filter(Boolean),
      scoring_fields: scoringFields.length ? scoringFields : undefined,
      library_type: (isSuperuser && makePublic) ? "public" : "personal",
    });
    setShowCreate(false);
    setForm({ ...BLANK_EXERCISE, category: "driving", difficulty: "beginner" });
    setInstructionsText("");
    setScoringFieldsText("");
    setMakePublic(false);
  };

  return (
    <div>
      <PageHeader
        title="Exercises"
        action={
          canCreate ? (
            <button
              onClick={() => setShowCreate(true)}
              className="w-8 h-8 rounded-full bg-green-700 flex items-center justify-center"
            >
              <Plus className="w-4 h-4 text-white" />
            </button>
          ) : undefined
        }
      />
      <div className="px-4 pt-4 space-y-4 pb-8">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="search"
            placeholder="Search exercises..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
          />
        </div>

        {/* Category filter */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                category === c ? "bg-green-700 text-white" : "bg-gray-100 text-gray-600"
              }`}
            >
              {c === "all" ? "All" : CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>

        {/* Difficulty filter */}
        <div className="flex gap-2">
          {DIFFICULTIES.map((d) => (
            <button
              key={d}
              onClick={() => setDifficulty(d)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                difficulty === d ? "bg-green-700 text-white" : "bg-gray-100 text-gray-600"
              }`}
            >
              {d === "all" ? "All levels" : d.charAt(0).toUpperCase() + d.slice(1)}
            </button>
          ))}
        </div>

        {/* Assigned exercises (players see these first) */}
        {filteredAssigned.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-700 mb-2">Assigned to me</h2>
            <div className="space-y-3">
              {filteredAssigned.map((e) => (
                <ExerciseCard key={e.id} exercise={e} label="assigned" onClick={() => navigate(`/exercises/${e.id}`)} />
              ))}
            </div>
          </section>
        )}

        {/* My personal library (coaches) */}
        {isCoach && (
          <section>
            <h2 className="text-sm font-semibold text-gray-700 mb-2">My library</h2>
            {filteredMine.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-3">No personal exercises yet — create one with +</p>
            ) : (
              <div className="space-y-3">
                {filteredMine.map((e) => (
                  <ExerciseCard key={e.id} exercise={e} label="personal" onClick={() => navigate(`/exercises/${e.id}`)} />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Public library */}
        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Public library</h2>
          {loadingPublic ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState icon={Dumbbell} title="No exercises found" description="Try adjusting your filters" />
          ) : (
            <div className="space-y-3">
              {filtered.map((e) => (
                <ExerciseCard key={e.id} exercise={e} onClick={() => navigate(`/exercises/${e.id}`)} />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Create exercise bottom sheet */}
      {showCreate && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-end" onClick={() => setShowCreate(false)}>
          <div className="w-full bg-white rounded-t-3xl flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
          <div className="overflow-y-auto flex-1 p-6 pb-2">
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">New Exercise</h3>
              {isSuperuser && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-xs text-gray-600">Public library</span>
                  <button
                    type="button"
                    onClick={() => setMakePublic((v) => !v)}
                    className={`w-10 h-6 rounded-full transition-colors relative ${makePublic ? "bg-green-600" : "bg-gray-200"}`}
                  >
                    <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${makePublic ? "translate-x-5" : "translate-x-1"}`} />
                  </button>
                </label>
              )}
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">Title *</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                  placeholder="e.g. Chipping ladder drill"
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs font-medium text-gray-700 block mb-1">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value as Exercise["category"] })}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                  >
                    {["driving", "putting", "chipping", "iron", "mental"].map((c) => (
                      <option key={c} value={c}>{CATEGORY_LABELS[c] ?? c}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-xs font-medium text-gray-700 block mb-1">Difficulty</label>
                  <select
                    value={form.difficulty}
                    onChange={(e) => setForm({ ...form, difficulty: e.target.value as Exercise["difficulty"] })}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                  >
                    {["beginner", "intermediate", "advanced"].map((d) => (
                      <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">Duration (minutes)</label>
                <input
                  type="number"
                  min={1}
                  value={form.duration_minutes}
                  onChange={(e) => setForm({ ...form, duration_minutes: parseInt(e.target.value) || 15 })}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">
                  Instructions (one per line)
                </label>
                <textarea
                  rows={3}
                  value={instructionsText}
                  onChange={(e) => setInstructionsText(e.target.value)}
                  placeholder={"Set up 5 balls...\nChip to target...\nRepeat..."}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 resize-none font-mono"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">
                  Scoring fields (one per line, optional)
                </label>
                <textarea
                  rows={3}
                  value={scoringFieldsText}
                  onChange={(e) => setScoringFieldsText(e.target.value)}
                  placeholder={"Total points\n4 meter\n6 meter\n8 meter"}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 resize-none font-mono"
                />
                <p className="text-xs text-gray-400 mt-1">These appear as score fields when logging</p>
              </div>
            </div>
          </div>{/* end scrollable area */}
          <div className="flex gap-3 p-4 pt-3 border-t border-gray-100">
            <Button variant="secondary" className="flex-1" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button
              className="flex-1"
              loading={creating}
              disabled={!form.title.trim()}
              onClick={handleCreate}
            >
              Create
            </Button>
          </div>
          </div>{/* end sheet */}
        </div>
      )}
    </div>
  );
}

function ExerciseCard({ exercise, label, onClick }: { exercise: Exercise; label?: string; onClick: () => void }) {
  return (
    <Card className="p-4 flex gap-4" onClick={onClick}>
      {exercise.thumbnail_url ? (
        <img src={exercise.thumbnail_url} alt={exercise.title} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
      ) : (
        <div className="w-16 h-16 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
          <Dumbbell className="w-7 h-7 text-green-600" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-gray-900 text-sm truncate">{exercise.title}</h3>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <Badge variant="green">{CATEGORY_LABELS[exercise.category] ?? exercise.category}</Badge>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${DIFFICULTY_COLORS[exercise.difficulty]}`}>
            {exercise.difficulty}
          </span>
          <span className="text-xs text-gray-400">{exercise.duration_minutes}m</span>
          {label === "assigned" && <Badge>Assigned</Badge>}
          {label === "personal" && <span className="text-xs text-purple-600 font-medium">My library</span>}
        </div>
      </div>
    </Card>
  );
}
