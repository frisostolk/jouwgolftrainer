import { Outlet, NavLink } from "react-router-dom";
import { Home, Dumbbell, Calendar, Video, BarChart2, Users, User } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { cn } from "../lib/utils";

const navItems = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/exercises", icon: Dumbbell, label: "Exercises" },
  { to: "/sessions", icon: Calendar, label: "Sessions" },
  { to: "/videos", icon: Video, label: "Videos" },
  { to: "/stats", icon: BarChart2, label: "Stats" },
];

export function Layout() {
  const { isCoach } = useAuth();

  return (
    <div className="flex flex-col min-h-screen min-h-dvh bg-gray-50">
      <main className="flex-1 overflow-y-auto pb-nav">
        <Outlet />
      </main>

      {/* iOS-style bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-gray-200 pb-safe z-50">
        <div className="flex items-center justify-around h-14">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-0.5 px-3 py-1 min-w-[44px]",
                  isActive ? "text-green-700" : "text-gray-500"
                )
              }
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </NavLink>
          ))}
          {isCoach && (
            <NavLink
              to="/coach"
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-0.5 px-3 py-1 min-w-[44px]",
                  isActive ? "text-green-700" : "text-gray-500"
                )
              }
            >
              <Users className="w-5 h-5" />
              <span className="text-[10px] font-medium">Coach</span>
            </NavLink>
          )}
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center gap-0.5 px-3 py-1 min-w-[44px]",
                isActive ? "text-green-700" : "text-gray-500"
              )
            }
          >
            <User className="w-5 h-5" />
            <span className="text-[10px] font-medium">Profile</span>
          </NavLink>
        </div>
      </nav>
    </div>
  );
}
