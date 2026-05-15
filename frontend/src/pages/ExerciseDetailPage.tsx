import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Play, Clock, Tag, CheckCircle, UserPlus } from "lucide-react";
import { useExercise, useLogExercise } from "../hooks/useExercises";
import { useConnections, useAssignExercise } from "../hooks/useConnections";
import { useAuth } from "../context/AuthContext";
import { PageHeader } from "../components/PageHeader";
import { Badge } from "../components/Badge";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { CATEGORY_LABELS, DIFFICULTY_COLORS } from "../lib/utils";
import type { Connection } from "../types";

export function ExerciseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isCoach } = useAuth();
  const { data: exercise, isLoading } = useExercise(Number(id));
  const { mutateAsync: logExercise, isPending } = useLogExercise();
  const { data: connections } = useConnections();
  const { mutateAsync: assignExercise, isPending: assigning } = useAssignExercise();

  const [showLogForm, setShowLogForm] = useState(false);
  const [notes, setNotes] = useState("");
  const [score, setScore] = useState("");
  const [scoringData, setScoringData] = useState<Record<string, string>>({});
  const [logged, setLogged] = useState(false);

  const [showAssign, setShowAssign] = useState(false);
  const [assignPlayer, setAssignPlayer] = useState<number | null>(null);
  const [assignMsg, setAssignMsg] = useState("");
  const [assigned, setAssigned] = useState(false);

  const connectedPlayers = (connections ?? []).filter(
    (c: Connection) => c.status === "accepted" && c.player_id !== undefined
  );

  const handleLog = async () => {
    const parsedScoringData: Record<string, number> = {};
    for (const [k, v] of Object.entries(scoringData)) {
      if (v !== "") parsedScoringData[k] = parseFloat(v);
    }
    const session = await logExercise({
      id: Number(id),
      data: {
        notes: notes || undefined,
        score: score ? parseFloat(score) : undefined,
        scoring_data: Object.keys(parsedScoringData).length ? parsedScoringData : undefined,
      },
    });
    setLogged(true);
    setShowLogForm(false);
    setTimeout(() => navigate(`/sessions/${session.id}`), 800);
  };

  const handleAssign = async () => {
    if (!assignPlayer) return;
    await assignExercise({ exercise_id: Number(id), player_id: assignPlayer, message: assignMsg });
    setAssigned(true);
    setShowAssign(false);
    setAssignMsg("");
  };

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full" />
    </div>
  );
  if (!exercise) return <div className="p-4 text-center text-gray-500">Exercise not found</div>;

  return (
    <div>
      <PageHeader title={exercise.title} back />
      <div className="px-4 pt-4 pb-8 space-y-5">
        {/* Hero */}
        {exercise.thumbnail_url ? (
          <img src={exercise.thumbnail_url} alt={exercise.title} className="w-full h-48 object-cover rounded-2xl" />
        ) : (
          <div className="w-full h-48 bg-green-50 rounded-2xl flex items-center justify-center">
            <span className="text-6xl">⛳</span>
          </div>
        )}

        {/* Meta */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="green">{CATEGORY_LABELS[exercise.category] ?? exercise.category}</Badge>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${DIFFICULTY_COLORS[exercise.difficulty]}`}>
            {exercise.difficulty}
          </span>
          <span className="flex items-center gap-1 text-xs text-gray-500">
            <Clock className="w-3.5 h-3.5" /> {exercise.duration_minutes} min
          </span>
          {exercise.library_type === "personal" && (
            <span className="text-xs text-purple-600 font-medium px-2 py-0.5 bg-purple-50 rounded-full">My library</span>
          )}
        </div>

        {/* Quick-log button */}
        {logged ? (
          <div className="flex items-center justify-center gap-2 py-3 bg-green-50 rounded-2xl text-green-700 font-medium">
            <CheckCircle className="w-5 h-5" /> Logged! Opening session…
          </div>
        ) : (
          <Button size="lg" className="w-full" onClick={() => setShowLogForm(true)}>
            Log this exercise
          </Button>
        )}

        {/* Assign to player (coaches only) */}
        {isCoach && connectedPlayers.length > 0 && (
          assigned ? (
            <div className="flex items-center justify-center gap-2 py-3 bg-blue-50 rounded-2xl text-blue-700 font-medium text-sm">
              <CheckCircle className="w-5 h-5" /> Assigned to player
            </div>
          ) : (
            <button
              onClick={() => setShowAssign(true)}
              className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-300 rounded-2xl text-sm text-gray-500 hover:border-green-500 hover:text-green-700 transition-colors"
            >
              <UserPlus className="w-4 h-4" /> Assign to a player
            </button>
          )
        )}

        {/* Instructions */}
        {exercise.instructions.length > 0 && (
          <Card className="p-4">
            <h2 className="font-semibold text-gray-900 mb-3">How to do it</h2>
            <ol className="space-y-3">
              {exercise.instructions.map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-700 text-white text-xs flex items-center justify-center font-bold">
                    {i + 1}
                  </span>
                  <p className="text-sm text-gray-700 leading-relaxed">{step}</p>
                </li>
              ))}
            </ol>
          </Card>
        )}

        {/* Tags */}
        {exercise.tags.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <Tag className="w-4 h-4 text-gray-400" />
            {exercise.tags.map((tag) => (
              <Badge key={tag}>{tag}</Badge>
            ))}
          </div>
        )}

        {/* Demo Video */}
        {exercise.demo_video_url && (
          <a
            href={exercise.demo_video_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 bg-green-700 rounded-2xl text-white"
          >
            <Play className="w-5 h-5" />
            <span className="font-medium">Watch demo video</span>
          </a>
        )}
      </div>

      {/* Log form bottom sheet */}
      {showLogForm && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-end" onClick={() => setShowLogForm(false)}>
          <div className="w-full bg-white rounded-t-3xl flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <div className="overflow-y-auto flex-1 p-6 pb-2 space-y-4">
              <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto" />
              <h3 className="font-semibold text-gray-900">Log "{exercise.title}"</h3>

              {/* Dynamic scoring fields */}
              {(exercise.scoring_fields ?? []).length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-gray-700">Scores</p>
                  {(exercise.scoring_fields ?? []).map((field) => (
                    <div key={field}>
                      <label className="text-xs font-medium text-gray-600 block mb-1">{field}</label>
                      <input
                        type="number"
                        step="any"
                        value={scoringData[field] ?? ""}
                        onChange={(e) => setScoringData((prev) => ({ ...prev, [field]: e.target.value }))}
                        placeholder="points"
                        className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                      />
                    </div>
                  ))}
                </div>
              )}

              {(exercise.scoring_fields ?? []).length === 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Score (optional)</label>
                  <input
                    type="number" min={0} step="any" value={score}
                    onChange={(e) => setScore(e.target.value)}
                    placeholder="0–10"
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                  />
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Notes (optional)</label>
                <textarea
                  value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
                  placeholder="How did it go?"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 p-4 pt-3 border-t border-gray-100">
              <Button variant="secondary" className="flex-1" onClick={() => setShowLogForm(false)}>Cancel</Button>
              <Button className="flex-1" loading={isPending} onClick={handleLog}>Log it</Button>
            </div>
          </div>
        </div>
      )}

      {/* Assign form bottom sheet */}
      {showAssign && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-end" onClick={() => setShowAssign(false)}>
          <div className="w-full bg-white rounded-t-3xl flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <div className="overflow-y-auto flex-1 p-6 pb-2 space-y-4">
              <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto" />
              <h3 className="font-semibold text-gray-900">Assign to Player</h3>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Select player</label>
                <div className="space-y-2">
                  {connectedPlayers.map((c: Connection) => (
                    <button
                      key={c.player_id}
                      onClick={() => setAssignPlayer(c.player_id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-colors ${
                        assignPlayer === c.player_id ? "border-green-500 bg-green-50" : "border-gray-200"
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-sm">
                        {c.player.name[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{c.player.name}</p>
                        <p className="text-xs text-gray-500">{c.player.email}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Message (optional)</label>
                <textarea
                  value={assignMsg} onChange={(e) => setAssignMsg(e.target.value)} rows={2}
                  placeholder="Focus on your follow-through…"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 p-4 pt-3 border-t border-gray-100">
              <Button variant="secondary" className="flex-1" onClick={() => setShowAssign(false)}>Cancel</Button>
              <Button className="flex-1" loading={assigning} disabled={!assignPlayer} onClick={handleAssign}>
                Assign
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
