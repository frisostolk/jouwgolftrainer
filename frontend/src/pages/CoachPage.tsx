import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import { coachApi } from "../api/coach";
import {
  useConnections, useInvitePlayer, useRespondConnection,
  usePlayerSessions, usePlayerStats,
} from "../hooks/useConnections";
import { PageHeader } from "../components/PageHeader";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { Badge } from "../components/Badge";
import { EmptyState } from "../components/EmptyState";
import { Users, Plus, ChevronDown, ChevronUp, UserPlus, Check, X, BarChart2 } from "lucide-react";
import { formatRelativeDate } from "../lib/utils";
import type { Connection, User } from "../types";

type TabId = "players" | "notes";

export function CoachPage() {
  const { user, isCoach } = useAuth();
  const qc = useQueryClient();

  const { data: connections } = useConnections();
  const { data: myNotes } = useQuery({
    queryKey: ["my-notes"],
    queryFn: coachApi.getMyNotes,
    enabled: !isCoach,
  });

  const [tab, setTab] = useState<TabId>("players");
  const [selectedPlayer, setSelectedPlayer] = useState<User | null>(null);
  const [playerView, setPlayerView] = useState<"stats" | "sessions">("stats");
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteContent, setNoteContent] = useState("");
  const [noteCategory, setNoteCategory] = useState("general");
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteMsg, setInviteMsg] = useState("");
  const [inviteError, setInviteError] = useState("");

  const { data: notes } = useQuery({
    queryKey: ["coach-notes", selectedPlayer?.id],
    queryFn: () => coachApi.getNotes(selectedPlayer?.id),
    enabled: isCoach,
  });

  const { data: playerSessions } = usePlayerSessions(selectedPlayer?.id ?? null);
  const { data: playerStats } = usePlayerStats(selectedPlayer?.id ?? null);

  const { mutateAsync: invitePlayer, isPending: inviting } = useInvitePlayer();
  const { mutateAsync: respondConn } = useRespondConnection();

  const { mutateAsync: createNote, isPending: savingNote } = useMutation({
    mutationFn: coachApi.createNote,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["coach-notes"] });
      setNoteContent("");
      setShowNoteForm(false);
    },
  });

  // Coach's accepted players
  const acceptedConns = (connections ?? []).filter(
    (c: Connection) => c.status === "accepted" && c.coach_id === user?.id
  );
  // Pending invites where current user is the player
  const pendingReceived = (connections ?? []).filter(
    (c: Connection) => c.status === "pending" && c.player_id === user?.id
  );

  // ── Player view ──────────────────────────────────────────────────────────────
  if (!isCoach) {
    return (
      <div>
        <PageHeader title="Coach" />
        <div className="px-4 pt-4 space-y-4 pb-8">
          {pendingReceived.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-gray-700 mb-2">Pending invites</h2>
              {pendingReceived.map((c) => (
                <Card key={c.id} className="p-4 mb-2">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium text-sm text-gray-900">{c.coach.name}</p>
                      <p className="text-xs text-gray-500">{c.coach.email}</p>
                    </div>
                    <span className="text-xs text-gray-400">{formatRelativeDate(c.created_at)}</span>
                  </div>
                  {c.message && <p className="text-sm text-gray-600 mb-3 italic">"{c.message}"</p>}
                  <div className="flex gap-2">
                    <button
                      onClick={() => respondConn({ id: c.id, status: "declined" })}
                      className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl border border-gray-300 text-sm text-gray-600"
                    >
                      <X className="w-4 h-4" /> Decline
                    </button>
                    <button
                      onClick={() => respondConn({ id: c.id, status: "accepted" })}
                      className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl bg-green-700 text-white text-sm font-medium"
                    >
                      <Check className="w-4 h-4" /> Accept
                    </button>
                  </div>
                </Card>
              ))}
            </section>
          )}

          <section>
            <h2 className="text-sm font-semibold text-gray-700 mb-2">Coach feedback</h2>
            {!myNotes?.length ? (
              <EmptyState icon={Users} title="No feedback yet" description="Your coach hasn't left any notes yet." />
            ) : (
              myNotes.map((note) => (
                <Card key={note.id} className="p-4 mb-2">
                  <div className="flex items-start justify-between mb-2">
                    <span className="font-medium text-sm text-gray-900">{note.coach.name}</span>
                    <span className="text-xs text-gray-400">{formatRelativeDate(note.created_at)}</span>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">{note.content}</p>
                  <Badge className="mt-2">{note.category}</Badge>
                </Card>
              ))
            )}
          </section>
        </div>
      </div>
    );
  }

  // ── Coach view ───────────────────────────────────────────────────────────────
  const handleInvite = async () => {
    setInviteError("");
    try {
      await invitePlayer({ email: inviteEmail, message: inviteMsg });
      setShowInvite(false);
      setInviteEmail("");
      setInviteMsg("");
    } catch (err: any) {
      setInviteError(err?.response?.data?.detail || "Failed to send invite");
    }
  };

  return (
    <div>
      <PageHeader
        title="Coach Panel"
        action={
          <button
            onClick={() => setShowInvite(true)}
            className="w-8 h-8 rounded-full bg-green-700 flex items-center justify-center"
          >
            <UserPlus className="w-4 h-4 text-white" />
          </button>
        }
      />

      {/* Tabs */}
      <div className="flex border-b border-gray-200 px-4">
        {(["players", "notes"] as TabId[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === t ? "border-green-700 text-green-700" : "border-transparent text-gray-500"
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div className="px-4 pt-4 space-y-3 pb-8">
        {tab === "players" && (
          <>
            {acceptedConns.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No connected players"
                description="Tap + to invite a player by email"
              />
            ) : (
              acceptedConns.map((conn: Connection) => (
                <div key={conn.id}>
                  <Card
                    className={`p-3 flex items-center gap-3 ${selectedPlayer?.id === conn.player_id ? "border-2 border-green-500" : ""}`}
                    onClick={() =>
                      setSelectedPlayer(selectedPlayer?.id === conn.player_id ? null : conn.player)
                    }
                  >
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-sm flex-shrink-0">
                      {conn.player.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{conn.player.name}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {conn.player.email}
                        {conn.player.handicap != null ? ` · HCP ${conn.player.handicap}` : ""}
                      </p>
                    </div>
                    {selectedPlayer?.id === conn.player_id
                      ? <ChevronUp className="w-4 h-4 text-green-600 flex-shrink-0" />
                      : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    }
                  </Card>

                  {selectedPlayer?.id === conn.player_id && (
                    <div className="mt-2 space-y-3 pl-2">
                      <div className="flex gap-2">
                        {(["stats", "sessions"] as const).map((v) => (
                          <button
                            key={v}
                            onClick={() => setPlayerView(v)}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                              playerView === v ? "bg-green-700 text-white" : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {v.charAt(0).toUpperCase() + v.slice(1)}
                          </button>
                        ))}
                        <Button size="sm" onClick={() => setShowNoteForm(true)}>
                          <Plus className="w-3 h-3" /> Note
                        </Button>
                      </div>

                      {playerView === "stats" && playerStats && (
                        <div className="grid grid-cols-2 gap-2">
                          <StatCard label="Sessions" value={playerStats.total_sessions} />
                          <StatCard label="Total mins" value={playerStats.total_minutes} />
                          <StatCard
                            label="Avg score"
                            value={playerStats.avg_session_score != null
                              ? Number(playerStats.avg_session_score).toFixed(1)
                              : "—"}
                          />
                          <StatCard label="Streak" value={`${playerStats.streak_days}d`} />
                        </div>
                      )}

                      {playerView === "sessions" && (
                        <div className="space-y-2">
                          {!playerSessions?.length ? (
                            <p className="text-xs text-gray-400 text-center py-3">No sessions yet</p>
                          ) : (
                            playerSessions.map((s: any) => (
                              <Card key={s.id} className="p-3">
                                <div className="flex items-start justify-between">
                                  <p className="text-sm font-medium text-gray-900">
                                    {s.title || "Untitled session"}
                                  </p>
                                  <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                                    {formatRelativeDate(s.created_at)}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {s.duration_minutes}m · {s.exercises?.length ?? 0} exercises
                                  {s.overall_score != null ? ` · Score ${s.overall_score}` : ""}
                                </p>
                              </Card>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </>
        )}

        {tab === "notes" && (
          <>
            {!notes?.length ? (
              <EmptyState
                icon={BarChart2}
                title="No notes yet"
                description="Select a player in Players tab and tap + to add a note"
              />
            ) : (
              notes.map((note: any) => (
                <Card key={note.id} className="p-4">
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Badge>{note.category}</Badge>
                    </div>
                    <span className="text-xs text-gray-400">{formatRelativeDate(note.created_at)}</span>
                  </div>
                  <p className="text-sm text-gray-700 mt-2">{note.content}</p>
                </Card>
              ))
            )}
          </>
        )}
      </div>

      {/* Invite bottom sheet */}
      {showInvite && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-end" onClick={() => setShowInvite(false)}>
          <div className="w-full bg-white rounded-t-3xl p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto" />
            <h3 className="font-semibold text-gray-900">Invite Player</h3>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Player email</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="player@example.com"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Message (optional)</label>
              <textarea
                value={inviteMsg}
                onChange={(e) => setInviteMsg(e.target.value)}
                rows={2}
                placeholder="Hi! I'd like to coach you on Golf Trainer."
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 resize-none"
              />
            </div>
            {inviteError && <p className="text-sm text-red-600">{inviteError}</p>}
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setShowInvite(false)}>Cancel</Button>
              <Button
                className="flex-1"
                loading={inviting}
                disabled={!inviteEmail.trim()}
                onClick={handleInvite}
              >
                Send invite
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Note form */}
      {showNoteForm && selectedPlayer && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-end" onClick={() => setShowNoteForm(false)}>
          <div className="w-full bg-white rounded-t-3xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
            <h3 className="font-semibold text-gray-900 mb-4">Note for {selectedPlayer.name}</h3>
            <div className="mb-3">
              <label className="text-sm font-medium text-gray-700 block mb-1">Category</label>
              <select
                value={noteCategory}
                onChange={(e) => setNoteCategory(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
              >
                {["general", "grip", "stance", "swing", "putting", "mental", "fitness"].map((c) => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
            </div>
            <textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              rows={4}
              placeholder="Write coaching feedback..."
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 resize-none mb-4"
            />
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setShowNoteForm(false)}>Cancel</Button>
              <Button
                className="flex-1"
                loading={savingNote}
                disabled={!noteContent.trim()}
                onClick={() =>
                  createNote({ player_id: selectedPlayer.id, content: noteContent, category: noteCategory })
                }
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-gray-50 rounded-2xl p-3 text-center">
      <p className="text-xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}
