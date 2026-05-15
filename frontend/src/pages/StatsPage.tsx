import { useStats } from "../hooks/useStats";
import { PageHeader } from "../components/PageHeader";
import { Card } from "../components/Card";
import { formatDuration, CATEGORY_COLORS, CATEGORY_LABELS } from "../lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

export function StatsPage() {
  const { data: stats, isLoading } = useStats();

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
