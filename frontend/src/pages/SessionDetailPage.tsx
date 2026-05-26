import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Trash2, MapPin, Clock, Star, CheckCircle, Circle, Flag } from "lucide-react";
import { useSession, useDeleteSession, useUpdateSessionExercise, useFinishSession } from "../hooks/useSessions";
import { PageHeader } from "../components/PageHeader";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { Badge } from "../components/Badge";
import { formatDate, formatDuration, CATEGORY_LABELS } from "../lib/utils";
import type { SessionExercise } from "../types";

export function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const sessionId = Number(id);
  const { data: session, isLoading } = useSession(sessionId);
  const { mutateAsync: deleteSession } = useDeleteSession();
  const { mutateAsync: updateExercise } = useUpdateSessionExercise(sessionId);
  const { mutateAsync: finishSession, isPending: finishing } = useFinishSession();

  const [activeExercise, setActiveExercise] = useState<number | null>(null);
  const [scoreInputs, setScoreInputs] = useState<Record<number, string>>({});
  const [scoringInputs, setScoringInputs] = useState<Record<number, Record<string, string>>>({});
  const [showFinish, setShowFinish] = useState(false);
  const [finalScore, setFinalScore] = useState("");
  const [finalDuration, setFinalDuration] = useState("");
  const [finalMood, setFinalMood] = useState<number | null>(null);
  const [finalNotes, setFinalNotes] = useState("");

  const handleDelete = async () => {
    if (!confirm("Delete this session?")) return;
    await deleteSession(sessionId);
    navigate("/sessions", { replace: true });
  };

  const handleToggle = async (se: SessionExercise) => {
    const newCompleted = !se.completed;
    await updateExercise({
      exerciseId: se.id,
      data: { completed: newCompleted },
    });
    if (newCompleted) setActiveExercise(se.id);
    else setActiveExercise(null);
  };

  const handleSaveScore = async (se: SessionExercise) => {
    const score = scoreInputs[se.id];
    const rawScoringData = scoringInputs[se.id] ?? {};
    const scoringData: Record<string, number> = {};
    for (const [k, v] of Object.entries(rawScoringData)) {
      if (v !== "") scoringData[k] = parseFloat(v);
    }
    await updateExercise({
      exerciseId: se.id,
      data: {
        score: score ? parseFloat(score) : undefined,
        scoring_data: Object.keys(scoringData).length ? scoringData : undefined,
      },
    });
    setActiveExercise(null);
  };

  const handleFinish = async () => {
    await finishSession({
      id: sessionId,
      data: {
        overall_score: finalScore ? parseFloat(finalScore) : undefined,
        duration_minutes: finalDuration ? parseInt(finalDuration) : undefined,
        mood: finalMood ?? undefined,
        notes: finalNotes || undefined,
      },
    });
    setShowFinish(false);
  };

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full" />
    </div>
  );
  if (!session) return <div className="p-4 text-center text-gray-500">Session not found</div>;

  const isPlanned = session.status === "planned";
  const completedCount = session.exercises.filter((e) => e.completed).length;
  const allDone = session.exercises.length > 0 && completedCount === session.exercises.length;

  return (
    <div>
      <PageHeader
        title={session.title}
        back
        action={
          <button onClick={handleDelete} className="p-2 text-red-400">
            <Trash2 className="w-5 h-5" />
          </button>
        }
      />
      <div className="px-4 pt-4 pb-8 space-y-4">

        {/* Status banner for planned sessions */}
        {isPlanned && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-green-800">Practice plan</p>
              <p className="text-xs text-green-600 mt-0.5">
                {completedCount}/{session.exercises.length} done
                {session.notes ? ` · ${session.notes}` : ""}
              </p>
            </div>
            {allDone && (
              <Button size="sm" onClick={() => setShowFinish(true)}>
                <Flag className="w-3.5 h-3.5" /> Finish
              </Button>
            )}
          </div>
        )}

        {/* Meta */}
        <div className="flex flex-wrap gap-3 text-sm text-gray-500">
          <span>{formatDate(session.created_at)}</span>
          {session.duration_minutes > 0 && (
            <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{formatDuration(session.duration_minutes)}</span>
          )}
          {session.location && (
            <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{session.location}</span>
          )}
          {session.mood && <span>{["😞", "😕", "😐", "🙂", "😄"][session.mood - 1]}</span>}
        </div>

        {/* Overall score (completed sessions) */}
        {!isPlanned && session.overall_score != null && (
          <Card className="p-4 flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center">
              <Star className="w-7 h-7 text-green-600" />
            </div>
            <div>
              <p className="text-3xl font-bold text-green-700">{session.overall_score}</p>
              <p className="text-sm text-gray-500">Overall score</p>
            </div>
          </Card>
        )}

        {/* Notes (completed) */}
        {!isPlanned && session.notes && (
          <Card className="p-4">
            <h2 className="font-semibold text-gray-900 mb-2">Notes</h2>
            <p className="text-sm text-gray-600 leading-relaxed">{session.notes}</p>
          </Card>
        )}

        {/* Drills / exercises */}
        {session.exercises.length > 0 && (
          <div>
            <h2 className="font-semibold text-gray-900 mb-2">
              {isPlanned ? "Drills" : "Exercises"}
              <span className="text-sm font-normal text-gray-400 ml-2">
                {completedCount}/{session.exercises.length} completed
              </span>
            </h2>
            <div className="space-y-2">
              {session.exercises.map((se) => (
                <div key={se.id}>
                  <Card className={`p-4 ${isPlanned && !se.completed ? "cursor-pointer" : ""}`}>
                    <div className="flex items-start gap-3">
                      {isPlanned ? (
                        <button
                          onClick={() => handleToggle(se)}
                          className="flex-shrink-0 mt-0.5"
                        >
                          {se.completed
                            ? <CheckCircle className="w-5 h-5 text-green-600" />
                            : <Circle className="w-5 h-5 text-gray-300" />
                          }
                        </button>
                      ) : (
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${se.completed ? "bg-green-500" : "bg-gray-300"}`} />
                      )}

                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${!isPlanned && se.completed ? "text-gray-400 line-through" : "text-gray-900"}`}>
                          {se.exercise.title}
                        </p>
                        <div className="flex gap-2 mt-1 flex-wrap">
                          <Badge variant="green">{CATEGORY_LABELS[se.exercise.category] ?? se.exercise.category}</Badge>
                          {se.sets && <span className="text-xs text-gray-400">{se.sets} sets</span>}
                          {se.reps && <span className="text-xs text-gray-400">{se.reps} reps</span>}
                        </div>

                        {/* Show saved scoring data */}
                        {se.scoring_data && Object.keys(se.scoring_data).length > 0 && (
                          <div className="mt-2 flex gap-3 flex-wrap">
                            {Object.entries(se.scoring_data).map(([k, v]) => (
                              <span key={k} className="text-xs text-gray-600">
                                <span className="text-gray-400">{k}:</span> <strong>{v}</strong>
                              </span>
                            ))}
                          </div>
                        )}
                        {se.notes && <p className="text-xs text-gray-400 mt-1">{se.notes}</p>}
                      </div>

                      {se.score != null && (
                        <span className="text-lg font-bold text-green-600 flex-shrink-0">{se.score}</span>
                      )}
                    </div>

                    {/* Inline score entry for planned sessions */}
                    {isPlanned && se.completed && activeExercise === se.id && (
                      <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                        {(se.exercise.scoring_fields ?? []).map((field) => (
                          <div key={field} className="flex items-center gap-2">
                            <label className="text-xs text-gray-500 w-24 flex-shrink-0">{field}</label>
                            <input
                              type="number"
                              step="any"
                              placeholder="pts"
                              value={scoringInputs[se.id]?.[field] ?? ""}
                              onChange={(e) =>
                                setScoringInputs((prev) => ({
                                  ...prev,
                                  [se.id]: { ...(prev[se.id] ?? {}), [field]: e.target.value },
                                }))
                              }
                              className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                            />
                          </div>
                        ))}
                        {(se.exercise.scoring_fields ?? []).length === 0 && (
                          <div className="flex items-center gap-2">
                            <label className="text-xs text-gray-500 w-24 flex-shrink-0">Score</label>
                            <input
                              type="number"
                              step="any"
                              min={0}
                              placeholder="0–10"
                              value={scoreInputs[se.id] ?? ""}
                              onChange={(e) => setScoreInputs((prev) => ({ ...prev, [se.id]: e.target.value }))}
                              className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                            />
                          </div>
                        )}
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={() => setActiveExercise(null)}
                            className="flex-1 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-500"
                          >
                            Skip
                          </button>
                          <button
                            onClick={() => handleSaveScore(se)}
                            className="flex-1 py-1.5 rounded-lg bg-green-700 text-white text-xs font-medium"
                          >
                            Save score
                          </button>
                        </div>
                      </div>
                    )}
                  </Card>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Finish button (planned, not all done yet) */}
        {isPlanned && !allDone && completedCount > 0 && (
          <button
            onClick={() => setShowFinish(true)}
            className="w-full py-3 border-2 border-dashed border-gray-200 rounded-2xl text-sm text-gray-400 hover:border-green-400 hover:text-green-700 transition-colors"
          >
            Finish session early
          </button>
        )}
      </div>

      {/* Finish session sheet */}
      {showFinish && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-end" onClick={() => setShowFinish(false)}>
          <div className="w-full bg-white rounded-t-3xl flex flex-col max-h-[85svh]" onClick={(e) => e.stopPropagation()}>
            <div className="overflow-y-auto flex-1 p-6 space-y-4">
              <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto" />
              <h3 className="font-semibold text-gray-900">Finish Session</h3>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-1">Duration (min)</label>
                  <input
                    type="number" min={0} value={finalDuration}
                    onChange={(e) => setFinalDuration(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-1">Overall score</label>
                  <input
                    type="number" min={0} max={10} step={0.1} value={finalScore}
                    onChange={(e) => setFinalScore(e.target.value)}
                    placeholder="0–10"
                    className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-700 block mb-2">Mood</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      onClick={() => setFinalMood(finalMood === n ? null : n)}
                      className={`flex-1 py-2 rounded-xl border text-lg transition-colors ${finalMood === n ? "border-green-500 bg-green-50" : "border-gray-200"}`}
                    >
                      {["😞", "😕", "😐", "🙂", "😄"][n - 1]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={finalNotes}
                  onChange={(e) => setFinalNotes(e.target.value)}
                  placeholder="How did it go?"
                  className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 p-4 pt-3 pb-nav border-t border-gray-100">
              <Button variant="secondary" className="flex-1" onClick={() => setShowFinish(false)}>Cancel</Button>
              <Button className="flex-1" loading={finishing} onClick={handleFinish}>
                Complete session
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
