import { useNavigate } from "react-router-dom";
import { Flag, Plus, ChevronRight, Clock } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { useRounds } from "../hooks/useRounds";
import { formatDate } from "../lib/utils";
import type { RoundSummary } from "../types";

function RoundCard({ round }: { round: RoundSummary }) {
  const navigate = useNavigate();
  return (
    <Card
      className="flex items-center justify-between p-4 cursor-pointer active:bg-gray-50"
      onClick={() => navigate(`/rounds/${round.id}`)}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
            round.status === "active" ? "bg-green-100" : "bg-gray-100"
          }`}
        >
          <Flag
            className={`w-5 h-5 ${round.status === "active" ? "text-green-700" : "text-gray-500"}`}
          />
        </div>
        <div>
          <p className="font-semibold text-gray-900">{round.course_name}</p>
          <div className="flex items-center gap-2 text-sm text-gray-500 mt-0.5">
            <span>{round.total_holes} holes</span>
            {round.tee_color && (
              <>
                <span>·</span>
                <span>{round.tee_color} tees</span>
              </>
            )}
            <span>·</span>
            <span>{formatDate(round.created_at)}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            round.status === "active"
              ? "bg-green-100 text-green-700"
              : "bg-gray-100 text-gray-600"
          }`}
        >
          {round.status === "active" ? "In Progress" : "Completed"}
        </span>
        <ChevronRight className="w-4 h-4 text-gray-400" />
      </div>
    </Card>
  );
}

export function RoundsPage() {
  const navigate = useNavigate();
  const { data: rounds, isLoading } = useRounds();

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
                <RoundCard key={r.id} round={r} />
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
                <RoundCard key={r.id} round={r} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
