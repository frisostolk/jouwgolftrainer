import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Flag, Plus, ChevronRight, Clock, Trash2 } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { useRounds, useDeleteRound } from "../hooks/useRounds";
import { formatDate } from "../lib/utils";
import type { RoundSummary } from "../types";

function RoundCard({
  round,
  onDelete,
}: {
  round: RoundSummary;
  onDelete: (id: number) => void;
}) {
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <Card className="flex items-center justify-between p-4">
        <p className="text-sm text-gray-700">
          Delete <strong>{round.course_name}</strong>?
        </p>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={() => setConfirming(false)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600"
          >
            Cancel
          </button>
          <button
            onClick={() => onDelete(round.id)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500 text-white"
          >
            Delete
          </button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="flex items-center justify-between p-4">
      <button
        className="flex items-center gap-3 flex-1 text-left min-w-0"
        onClick={() => navigate(`/rounds/${round.id}`)}
      >
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
            round.status === "active" ? "bg-green-100" : "bg-gray-100"
          }`}
        >
          <Flag className={`w-5 h-5 ${round.status === "active" ? "text-green-700" : "text-gray-500"}`} />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 truncate">{round.course_name}</p>
          <div className="flex items-center gap-2 text-sm text-gray-500 mt-0.5">
            <span>{round.total_holes} holes</span>
            {round.tee_color && <><span>·</span><span>{round.tee_color} tees</span></>}
            <span>·</span>
            <span>{formatDate(round.created_at)}</span>
          </div>
        </div>
      </button>

      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            round.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
          }`}
        >
          {round.status === "active" ? "Active" : "Done"}
        </span>
        <ChevronRight
          className="w-4 h-4 text-gray-300 cursor-pointer"
          onClick={() => navigate(`/rounds/${round.id}`)}
        />
        <button
          onClick={() => setConfirming(true)}
          className="p-1 text-gray-300 hover:text-red-400 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </Card>
  );
}

export function RoundsPage() {
  const navigate = useNavigate();
  const { data: rounds, isLoading } = useRounds();
  const deleteRound = useDeleteRound();

  const active = rounds?.filter((r) => r.status === "active") ?? [];
  const completed = rounds?.filter((r) => r.status === "completed") ?? [];

  return (
    <div className="pb-6">
      <PageHeader
        title="Rounds"
        action={
          <Button size="sm" onClick={() => navigate("/rounds/new")}>
            <Plus className="w-4 h-4 mr-1" />
            New Round
          </Button>
        }
      />

      <div className="px-4 space-y-6">
        {isLoading && (
          <div className="flex justify-center py-8">
            <div className="animate-spin w-6 h-6 border-2 border-green-600 border-t-transparent rounded-full" />
          </div>
        )}

        {!isLoading && (!rounds || rounds.length === 0) && (
          <EmptyState
            icon={Flag}
            title="No rounds yet"
            description="Start a new round to track your shots and calculate stroke gained."
            action={{ label: "Start a Round", onClick: () => navigate("/rounds/new") }}
          />
        )}

        {active.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Active
            </h2>
            <div className="space-y-2">
              {active.map((r) => (
                <RoundCard key={r.id} round={r} onDelete={(id) => deleteRound.mutate(id)} />
              ))}
            </div>
          </div>
        )}

        {completed.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Past Rounds
            </h2>
            <div className="space-y-2">
              {completed.map((r) => (
                <RoundCard key={r.id} round={r} onDelete={(id) => deleteRound.mutate(id)} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
