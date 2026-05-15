import { useNavigate } from "react-router-dom";
import { Plus, Calendar, PlayCircle, Clock } from "lucide-react";
import { useSessions } from "../hooks/useSessions";
import { PageHeader } from "../components/PageHeader";
import { Card } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import { formatRelativeDate, formatDuration } from "../lib/utils";
import type { TrainingSession } from "../types";

export function SessionsPage() {
  const navigate = useNavigate();
  const { data: sessions, isLoading } = useSessions();

  const planned = (sessions ?? []).filter((s) => s.status === "planned");
  const history = (sessions ?? []).filter((s) => s.status === "completed");

  return (
    <div>
      <PageHeader
        title="Sessions"
        action={
          <button
            onClick={() => navigate("/sessions/new")}
            className="w-8 h-8 rounded-full bg-green-700 flex items-center justify-center"
          >
            <Plus className="w-4 h-4 text-white" />
          </button>
        }
      />
      <div className="px-4 pt-4 space-y-5 pb-8">
        {isLoading ? (
          [1, 2, 3].map((i) => <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />)
        ) : (
          <>
            {/* Planned sessions */}
            {planned.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Planned
                </h2>
                <div className="space-y-3">
                  {planned.map((session) => (
                    <PlannedCard key={session.id} session={session} onClick={() => navigate(`/sessions/${session.id}`)} />
                  ))}
                </div>
              </section>
            )}

            {/* History */}
            <section>
              {history.length > 0 && (
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  History
                </h2>
              )}
              {history.length === 0 && planned.length === 0 ? (
                <EmptyState
                  icon={Calendar}
                  title="No sessions yet"
                  description="Plan your next practice or log one after you're done."
                  action={{ label: "Plan a session", onClick: () => navigate("/sessions/new") }}
                />
              ) : history.length === 0 ? null : (
                <div className="space-y-2">
                  {history.map((session) => (
                    <HistoryCard key={session.id} session={session} onClick={() => navigate(`/sessions/${session.id}`)} />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function PlannedCard({ session, onClick }: { session: TrainingSession; onClick: () => void }) {
  const totalMins = session.exercises.reduce((s, e) => s + (e.exercise.duration_minutes ?? 0), 0);
  const doneCount = session.exercises.filter((e) => e.completed).length;

  return (
    <Card className="p-4 border-2 border-green-200 bg-green-50/50" onClick={onClick}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900">{session.title}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {session.exercises.length} drill{session.exercises.length !== 1 ? "s" : ""}
            {totalMins > 0 && ` · ~${formatDuration(totalMins)}`}
            {session.location && ` · ${session.location}`}
          </p>
          {session.exercises.length > 0 && (
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {session.exercises.slice(0, 3).map((se) => (
                <span key={se.id} className="text-xs bg-white border border-green-200 text-green-700 px-2 py-0.5 rounded-full">
                  {se.exercise.title}
                </span>
              ))}
              {session.exercises.length > 3 && (
                <span className="text-xs text-gray-400">+{session.exercises.length - 3} more</span>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-col items-center gap-1 flex-shrink-0">
          <PlayCircle className="w-8 h-8 text-green-600" />
          {doneCount > 0 && (
            <span className="text-[10px] text-green-600 font-medium">{doneCount}/{session.exercises.length}</span>
          )}
        </div>
      </div>
    </Card>
  );
}

function HistoryCard({ session, onClick }: { session: TrainingSession; onClick: () => void }) {
  return (
    <Card className="p-4" onClick={onClick}>
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold text-gray-900">{session.title}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {formatRelativeDate(session.created_at)}
            {session.duration_minutes > 0 && ` · ${formatDuration(session.duration_minutes)}`}
            {session.location && ` · ${session.location}`}
          </p>
          {session.exercises.length > 0 && (
            <p className="text-xs text-green-600 mt-1">
              {session.exercises.length} drill{session.exercises.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        {session.overall_score != null && (
          <div className="text-right ml-4 flex-shrink-0">
            <p className="text-2xl font-bold text-green-700">{session.overall_score}</p>
            <p className="text-[10px] text-gray-400">score</p>
          </div>
        )}
      </div>
    </Card>
  );
}
