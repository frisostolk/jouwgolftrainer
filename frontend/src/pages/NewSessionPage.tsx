import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, X, CheckCircle, Circle, Search } from "lucide-react";
import { useCreateSession } from "../hooks/useSessions";
import { useExercises } from "../hooks/useExercises";
import { PageHeader } from "../components/PageHeader";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Card } from "../components/Card";
import { CATEGORY_LABELS } from "../lib/utils";
import type { Exercise } from "../types";

type Mode = "plan" | "log";

export function NewSessionPage() {
  const navigate = useNavigate();
  const { mutateAsync: createSession, isPending } = useCreateSession();
  const { data: exercises } = useExercises();
  const [mode, setMode] = useState<Mode>("plan");
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [durationMin, setDurationMin] = useState("");
  const [overallScore, setOverallScore] = useState("");
  const [mood, setMood] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [selectedExercises, setSelectedExercises] = useState<Exercise[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");

  const toggleExercise = (exercise: Exercise) => {
    setSelectedExercises((prev) => {
      const exists = prev.find((e) => e.id === exercise.id);
      if (exists) return prev.filter((e) => e.id !== exercise.id);
      return [...prev, exercise];
    });
  };

  const defaultTitle = mode === "plan"
    ? `Practice ${new Date().toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}`
    : `Session ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`;

  const handleSave = async () => {
    await createSession({
      title: title.trim() || defaultTitle,
      notes: notes || undefined,
      location: location || undefined,
      duration_minutes: durationMin ? parseInt(durationMin) : undefined,
      overall_score: overallScore ? parseFloat(overallScore) : undefined,
      mood: mood ?? undefined,
      status: mode === "plan" ? "planned" : "completed",
      exercises: selectedExercises.map((e) => ({
        exercise_id: e.id,
        completed: mode === "log",
      })),
    });
    navigate("/sessions", { replace: true });
  };

  const filteredExercises = (exercises ?? []).filter((e) =>
    e.title.toLowerCase().includes(pickerSearch.toLowerCase()) ||
    e.category.toLowerCase().includes(pickerSearch.toLowerCase())
  );

  return (
    <div>
      <PageHeader title={mode === "plan" ? "Plan Session" : "Log Session"} back />

      {/* Mode toggle */}
      <div className="px-4 pt-4">
        <div className="flex rounded-xl overflow-hidden border border-gray-200 mb-5">
          <button
            onClick={() => setMode("plan")}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${mode === "plan" ? "bg-green-700 text-white" : "bg-white text-gray-600"}`}
          >
            Plan ahead
          </button>
          <button
            onClick={() => setMode("log")}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${mode === "log" ? "bg-green-700 text-white" : "bg-white text-gray-600"}`}
          >
            Log now
          </button>
        </div>
      </div>

      <div className="px-4 pb-8 space-y-4">
        <Input
          label="Title"
          placeholder={defaultTitle}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <Input
          label="Location (optional)"
          placeholder="Driving range, course name…"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />

        {mode === "log" && (
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Duration (min)"
              type="number"
              min={0}
              value={durationMin}
              onChange={(e) => setDurationMin(e.target.value)}
            />
            <Input
              label="Score (0–10)"
              type="number"
              min={0}
              max={10}
              step={0.1}
              value={overallScore}
              onChange={(e) => setOverallScore(e.target.value)}
            />
          </div>
        )}

        {mode === "log" && (
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Mood</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setMood(mood === n ? null : n)}
                  className={`flex-1 py-2 rounded-xl border text-lg transition-colors ${mood === n ? "border-green-500 bg-green-50" : "border-gray-200"}`}
                >
                  {["😞", "😕", "😐", "🙂", "😄"][n - 1]}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">
            {mode === "plan" ? "Goals / focus (optional)" : "Notes (optional)"}
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder={mode === "plan" ? "Focus on follow-through today…" : "How did the session go?"}
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 resize-none"
          />
        </div>

        {/* Drills */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">
              {mode === "plan" ? "Drills to do" : "Exercises done"}
            </label>
            <button
              type="button"
              onClick={() => setShowPicker(true)}
              className="text-sm text-green-700 flex items-center gap-1 font-medium"
            >
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>

          {selectedExercises.length === 0 ? (
            <button
              type="button"
              onClick={() => setShowPicker(true)}
              className="w-full py-6 border-2 border-dashed border-gray-200 rounded-2xl text-sm text-gray-400 hover:border-green-400 hover:text-green-700 transition-colors"
            >
              + Add drills from your library
            </button>
          ) : (
            <div className="space-y-2">
              {selectedExercises.map((exercise) => (
                <Card key={exercise.id} className="p-3 flex items-center gap-3">
                  <div className="flex-shrink-0">
                    {mode === "log"
                      ? <CheckCircle className="w-5 h-5 text-green-600" />
                      : <Circle className="w-5 h-5 text-gray-400" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{exercise.title}</p>
                    <p className="text-xs text-gray-400">
                      {CATEGORY_LABELS[exercise.category] ?? exercise.category} · {exercise.duration_minutes}m
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleExercise(exercise)}
                    className="text-gray-300 hover:text-red-400 flex-shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </Card>
              ))}
            </div>
          )}
        </div>

        <Button size="lg" loading={isPending} className="w-full" onClick={handleSave}>
          {mode === "plan" ? "Save plan" : "Log session"}
        </Button>
      </div>

      {/* Exercise picker */}
      {showPicker && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-end" onClick={() => setShowPicker(false)}>
          <div className="w-full bg-white rounded-t-3xl flex flex-col max-h-[80svh]" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-100">
              <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-3" />
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  autoFocus
                  type="search"
                  placeholder="Search drills…"
                  value={pickerSearch}
                  onChange={(e) => setPickerSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                />
              </div>
            </div>
            <div className="overflow-y-auto flex-1 p-4 space-y-2">
              {filteredExercises.map((exercise) => {
                const selected = selectedExercises.some((e) => e.id === exercise.id);
                return (
                  <div
                    key={exercise.id}
                    onClick={() => toggleExercise(exercise)}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-colors cursor-pointer ${selected ? "border-green-500 bg-green-50" : "border-gray-200"}`}
                  >
                    {selected
                      ? <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                      : <Circle className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    }
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{exercise.title}</p>
                      <p className="text-xs text-gray-500">
                        {CATEGORY_LABELS[exercise.category] ?? exercise.category} · {exercise.duration_minutes}m
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="p-4 pb-safe border-t border-gray-100">
              <Button className="w-full" onClick={() => setShowPicker(false)}>
                Done ({selectedExercises.length} selected)
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
