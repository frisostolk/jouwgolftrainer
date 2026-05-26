import { useNavigate } from "react-router-dom";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useStats, useExerciseProgress } from "../hooks/useStats";
import { PageHeader } from "../components/PageHeader";
import { Card } from "../components/Card";
import { formatDuration, CATEGORY_COLORS, CATEGORY_LABELS } from "../lib/utils";
import type { ExerciseProgressEntry } from "../types";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line,
} from "recharts";

export function StatsPage() {
  const { data: stats, isLoading } = useStats();
  const { data: exerciseProgress = [] } = useExerciseProgress();
  const navigate = useNavigate();

  if (isLoading) return (
    <div>
      <PageHeader title="My Progress" />
      <div className="px-4 pt-4 space-y-3">
        {[1, 2, 3].map((i) => <div key={i} className="h-48 bg-gray-100 rounded-2xl animate-pulse" />)}
      </div>
    </div>
  );

  if (!stats) return null;

  return (
    <div>
      <PageHeader title="My Progress" />
      <div className="px-4 pt-4 pb-8 space-y-5">
        {/* Overview Cards */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Total Sessions" value={stats.total_sessions} />
          <StatCard label="Training Time" value={formatDuration(stats.total_minutes)} />
          <StatCard label="Videos Uploaded" value={stats.total_videos} />
          <StatCard label="Day Streak" value={`${stats.streak_days} 🔥`} />
          {stats.avg_session_score != null && (
            <StatCard label="Avg Session Score" value={stats.avg_session_score.toFixed(1)} className="col-span-2" />
          )}
        </div>

        {/* Weekly bar chart */}
        {stats.weekly.length > 0 && (
          <Card className="p-4">
            <h2 className="font-semibold text-gray-900 mb-4">Sessions per Week</h2>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={stats.weekly} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  formatter={(v: number, name: string) => [v, name === "sessions" ? "Sessions" : "Minutes"]}
                />
                <Bar dataKey="sessions" fill="#16a34a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* Exercise progress */}
        {exerciseProgress.length > 0 && (
          <div>
            <h2 className="font-semibold text-gray-900 mb-3">Progress per Exercise</h2>
            <div className="space-y-3">
              {exerciseProgress.map((entry) => (
                <ExerciseProgressCard
                  key={entry.exercise_id}
                  entry={entry}
                  onClick={() => navigate(`/exercises/${entry.exercise_id}`)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Category breakdown pie */}
        {stats.by_category.length > 0 && (
          <Card className="p-4">
            <h2 className="font-semibold text-gray-900 mb-4">Training Breakdown</h2>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={stats.by_category}
                  dataKey="count"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  label={({ category, percent }) =>
                    `${CATEGORY_LABELS[category] ?? category} ${(percent * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                >
                  {stats.by_category.map((entry) => (
                    <Cell key={entry.category} fill={CATEGORY_COLORS[entry.category] ?? "#94a3b8"} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => [v, "exercises"]} />
              </PieChart>
            </ResponsiveContainer>

            {/* Category table */}
            <div className="mt-4 space-y-2">
              {stats.by_category.map((c) => (
                <div key={c.category} className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: CATEGORY_COLORS[c.category] ?? "#94a3b8" }}
                  />
                  <span className="text-sm text-gray-700 flex-1">{CATEGORY_LABELS[c.category] ?? c.category}</span>
                  <span className="text-sm font-medium text-gray-900">{c.count}x</span>
                  {c.avg_score && <span className="text-sm text-gray-500">avg {c.avg_score}</span>}
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, className }: { label: string; value: string | number; className?: string }) {
  return (
    <Card className={`p-4 ${className ?? ""}`}>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </Card>
  );
}

function ExerciseProgressCard({ entry, onClick }: { entry: ExerciseProgressEntry; onClick: () => void }) {
  const hasScores = entry.scores.some((s) => s !== null);
  const chartData = entry.dates.map((date, i) => ({ date, score: entry.scores[i] }));

  const TrendIcon =
    entry.trend === "up" ? TrendingUp :
    entry.trend === "down" ? TrendingDown : Minus;
  const trendColor =
    entry.trend === "up" ? "text-green-600" :
    entry.trend === "down" ? "text-red-500" : "text-gray-400";

  return (
    <Card className="p-4 active:bg-gray-50 cursor-pointer" onClick={onClick}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 text-sm truncate">{entry.title}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {CATEGORY_LABELS[entry.category] ?? entry.category} · {entry.times_logged}x logged
          </p>
        </div>
        {hasScores && (
          <div className={`flex items-center gap-1 ml-3 flex-shrink-0 ${trendColor}`}>
            <TrendIcon className="w-4 h-4" />
          </div>
        )}
      </div>

      {hasScores ? (
        <ResponsiveContainer width="100%" height={80}>
          <LineChart data={chartData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
            <XAxis dataKey="date" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 9 }} />
            <Tooltip
              contentStyle={{ fontSize: 11, borderRadius: 8 }}
              formatter={(v: number) => [v, "Score"]}
            />
            <Line
              type="monotone"
              dataKey="score"
              stroke={entry.trend === "down" ? "#ef4444" : "#16a34a"}
              strokeWidth={2}
              dot={{ r: 3, fill: entry.trend === "down" ? "#ef4444" : "#16a34a" }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-xs text-gray-400 text-center py-3">No scores recorded yet</p>
      )}
    </Card>
  );
}
