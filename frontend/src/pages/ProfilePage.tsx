import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { LogOut, User, Trophy, ChevronRight } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { useStats } from "../hooks/useStats";
import { formatDuration } from "../lib/utils";

export function ProfilePage() {
  const { user, logout, isCoach } = useAuth();
  const { data: stats } = useStats();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  if (!user) return null;

  return (
    <div>
      <PageHeader title="Profile" />
      <div className="px-4 pt-6 pb-8 space-y-6">
        {/* Avatar / Name */}
        <div className="flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-3">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt={user.name} className="w-20 h-20 rounded-full object-cover" />
            ) : (
              <User className="w-10 h-10 text-green-700" />
            )}
          </div>
          <h2 className="text-xl font-bold text-gray-900">{user.name}</h2>
          <p className="text-sm text-gray-500">{user.email}</p>
          <div className="flex gap-2 mt-2">
            <Badge variant={isCoach ? "purple" : "green"}>{user.role}</Badge>
            {user.handicap != null && <Badge variant="blue">HCP {user.handicap}</Badge>}
          </div>
        </div>

        {/* Stats Summary */}
        {stats && (
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-500" /> Your Stats
            </h3>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-xl font-bold text-green-700">{stats.total_sessions}</p>
                <p className="text-xs text-gray-500">Sessions</p>
              </div>
              <div>
                <p className="text-xl font-bold text-green-700">{formatDuration(stats.total_minutes)}</p>
                <p className="text-xs text-gray-500">Trained</p>
              </div>
              <div>
                <p className="text-xl font-bold text-green-700">{stats.streak_days}🔥</p>
                <p className="text-xs text-gray-500">Streak</p>
              </div>
            </div>
          </Card>
        )}

        {/* Menu */}
        <div className="space-y-2">
          <MenuItem label="Account Settings" onClick={() => {}} />
          <MenuItem label="Notifications" onClick={() => {}} />
          <MenuItem label="Privacy" onClick={() => {}} />
          <MenuItem label="Help & Support" onClick={() => {}} />
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-red-50 text-red-600 font-medium text-sm"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>

        <p className="text-center text-xs text-gray-400">Golf Trainer v1.0.0</p>
      </div>
    </div>
  );
}

function MenuItem({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Card className="px-4 py-3 flex items-center justify-between" onClick={onClick}>
      <span className="text-sm font-medium text-gray-800">{label}</span>
      <ChevronRight className="w-4 h-4 text-gray-400" />
    </Card>
  );
}
