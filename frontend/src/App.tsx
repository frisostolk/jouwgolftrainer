import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Layout } from "./components/Layout";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ExercisesPage } from "./pages/ExercisesPage";
import { ExerciseDetailPage } from "./pages/ExerciseDetailPage";
import { SessionsPage } from "./pages/SessionsPage";
import { NewSessionPage } from "./pages/NewSessionPage";
import { SessionDetailPage } from "./pages/SessionDetailPage";
import { VideosPage } from "./pages/VideosPage";
import { VideoDetailPage } from "./pages/VideoDetailPage";
import { StatsPage } from "./pages/StatsPage";
import { CoachPage } from "./pages/CoachPage";
import { ProfilePage } from "./pages/ProfilePage";
import { RoundsPage } from "./pages/RoundsPage";
import { NewRoundPage } from "./pages/NewRoundPage";
import { ActiveRoundPage } from "./pages/ActiveRoundPage";
import { AdminSettingsPage } from "./pages/AdminSettingsPage";
import { CourseEditorPage } from "./pages/CourseEditorPage";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function GuestOnly({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<GuestOnly><LoginPage /></GuestOnly>} />
          <Route path="/register" element={<GuestOnly><RegisterPage /></GuestOnly>} />
          <Route element={<RequireAuth><Layout /></RequireAuth>}>
            <Route index element={<DashboardPage />} />
            <Route path="exercises" element={<ExercisesPage />} />
            <Route path="exercises/:id" element={<ExerciseDetailPage />} />
            <Route path="sessions" element={<SessionsPage />} />
            <Route path="sessions/new" element={<NewSessionPage />} />
            <Route path="sessions/:id" element={<SessionDetailPage />} />
            <Route path="videos" element={<VideosPage />} />
            <Route path="videos/:id" element={<VideoDetailPage />} />
            <Route path="stats" element={<StatsPage />} />
            <Route path="coach" element={<CoachPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="rounds" element={<RoundsPage />} />
            <Route path="rounds/new" element={<NewRoundPage />} />
            <Route path="rounds/:id" element={<ActiveRoundPage />} />
            <Route path="admin" element={<AdminSettingsPage />} />
            <Route path="admin/courses/:id" element={<CourseEditorPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
