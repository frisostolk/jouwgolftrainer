export interface User {
  id: number;
  email: string;
  name: string;
  role: "player" | "coach" | "admin" | "superuser";
  is_active: boolean;
  handicap?: number;
  avatar_url?: string;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Exercise {
  id: number;
  title: string;
  category: "driving" | "putting" | "chipping" | "iron" | "mental";
  difficulty: "beginner" | "intermediate" | "advanced";
  duration_minutes: number;
  thumbnail_url?: string;
  demo_video_url?: string;
  instructions: string[];
  tags: string[];
  is_active: boolean;
  library_type: "public" | "personal";
  owner_id?: number;
  scoring_fields?: string[];
  created_at: string;
}

export interface Connection {
  id: number;
  coach_id: number;
  player_id: number;
  status: "pending" | "accepted" | "declined";
  message: string;
  created_at: string;
  coach: User;
  player: User;
}

export interface ExerciseAssignment {
  id: number;
  exercise_id: number;
  coach_id: number;
  player_id: number;
  message: string;
  created_at: string;
  exercise: Exercise;
  coach: User;
}

export interface SessionExercise {
  id: number;
  exercise_id: number;
  sets?: number;
  reps?: number;
  score?: number;
  notes: string;
  completed: boolean;
  scoring_data?: Record<string, number>;
  exercise: Exercise;
}

export interface TrainingSession {
  id: number;
  user_id: number;
  title: string;
  notes: string;
  duration_minutes: number;
  location?: string;
  weather?: string;
  mood?: number;
  overall_score?: number;
  status: "planned" | "completed";
  created_at: string;
  exercises: SessionExercise[];
}

export interface Video {
  id: number;
  user_id: number;
  session_id?: number;
  title: string;
  description: string;
  url: string;
  thumbnail_url?: string;
  duration_seconds?: number;
  file_size_bytes?: number;
  swing_type?: string;
  club?: string;
  is_public: boolean;
  created_at: string;
}

export interface CoachNote {
  id: number;
  coach_id: number;
  player_id: number;
  video_id?: number;
  content: string;
  timestamp_seconds?: number;
  category: string;
  created_at: string;
  coach: User;
}

export interface ExerciseHistoryPoint {
  date: string;
  score?: number;
  scoring_data: Record<string, number>;
}

export interface WeeklyStats {
  week: string;
  sessions: number;
  total_minutes: number;
  avg_score?: number;
}

export interface CategoryStats {
  category: string;
  count: number;
  total_minutes: number;
  avg_score?: number;
}

export interface OverallStats {
  total_sessions: number;
  total_minutes: number;
  total_videos: number;
  avg_session_score?: number;
  streak_days: number;
  weekly: WeeklyStats[];
  by_category: CategoryStats[];
}

export interface UploadUrlResponse {
  upload_url: string;
  key: string;
  fields: Record<string, string>;
}
