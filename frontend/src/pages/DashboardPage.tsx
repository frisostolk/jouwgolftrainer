import { useNavigate } from "react-router-dom";
import { Calendar, Dumbbell, Video, Flame, Clock, TrendingUp, Plus } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useStats } from "../hooks/useStats";
import { useSessions } from "../hooks/useSessions";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { formatDuration, formatRelativeDate } from "../lib/utils";

export function DashboardPage() {
  const { user } = useAuth();
  const { data: stats } = useStats();
  const { data: sessions } = useSessions();
  const navigate = useNavigate();
  const recentSessions = sessions?.slice(0, 3) ?? [];

  return (
    <div className="px-4 pt-12 pb-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">Good {getGreeting()}</p>
          <h1 className="text-2xl font-bold text-gray-900">{user?.name?.split(" ")[0]} 👋</h1>
        </div>
        <Button size="sm" onClick={() => navigate("/sessions/new")}>
          <Plus className="w-4 h-4" />
          New Session
        </Button>
      </div>

      {/* Stats Strip */}
      {stats && (
        <div className="grid grid-cols-3 gap-3">
          <StatCard icon={Flame} value={stats.streak_days} label="Day Streak" color="text-orange-500" />
          <StatCard icon={Calendar} value={stats.total_sessions} label="Sessions" color="text-green-600" />
          <StatCard icon={Clock} value={formatDuration(stats.total_minutes)} label="Total Time" color="text-blue-600" />
        </div>
      )}

      {/* Recent Sessions */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900">Recent Sessions</h2>
          <button onClick={() => navigate("/sessions")} className="text-sm text-green-700">See all</button>
        </div>
        {recentSessions.length === 0 ? (
          <Card className="p-6 text-center">
            <p className="text-sm text-gray-500 mb-3">No sessions yet</p>
            <Button size="sm" onClick={() => navigate("/sessions/new")}>Start training</Button>
          </Card>
        ) : (
          <div className="space-y-2">
            {recentSessions.map((s) => (
              <Card key={s.id} className="p-4" onClick={() => navigate(`/sessions/${s.id}`)}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{s.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{formatRelativeDate(s.created_at)} · {formatDuration(s.duration_minutes)}</p>
                  </div>
                  {s.overall_score && (
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-700">{s.overall_score}</p>
                      <p className="text-[10px] text-gray-400">score</p>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Quick Actions */}
      <section>
        <h2 className="font-semibold text-gray-900 mb-3">Quick Access</h2>
        <div className="grid grid-cols-2 gap-3">
          <QuickAction icon={Dumbbell} label="Exercises" to="/exercises" navigate={navigate} />
          <QuickAction icon={Video} label="My Videos" to="/videos" navigate={navigate} />
          <QuickAction icon={TrendingUp} label="Progress" to="/stats" navigate={navigate} />
          <QuickAction icon={Calendar} label="History" to="/sessions" navigate={navigate} />
        </div>
      </section>
    </div>
  );
}

function StatCard({ icon: Icon, value, label, color }: { icon: any; value: number | string; label: string; color: string }) {
  return (
    <Card className="p-3 text-center">
      <Icon className={`w-5 h-5 mx-auto mb-1 ${color}`} />
      <p className="text-xl font-bold text-gray-900">{value}</p>
      <p className="text-[11px] text-gray-500">{label}</p>
    </Card>
  );
}

function QuickAction({ icon: Icon, label, to, navigate }: { icon: any; label: string; to: string; navigate: (to: string) => void }) {
  return (
    <Card className="p-4 flex items-center gap-3" onClick={() => navigate(to)}>
      <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
        <Icon className="w-5 h-5 text-green-700" />
      </div>
      <span className="font-medium text-sm text-gray-900">{label}</span>
    </Card>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}
