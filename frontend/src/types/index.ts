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

export interface ExerciseProgressEntry {
  exercise_id: number;
  title: string;
  category: string;
  times_logged: number;
  scores: (number | null)[];
  dates: string[];
  trend: "up" | "down" | "stable" | "none";
}

export interface UploadUrlResponse {
  upload_url: string;
  key: string;
  fields: Record<string, string>;
}

export type LieType = "tee" | "fairway" | "rough" | "bunker" | "green" | "penalty";

export interface Shot {
  id: number;
  shot_number: number;
  lie_type: LieType;
  latitude: number | null;
  longitude: number | null;
  club: string | null;
  result: string | null;
  distance_to_pin_yards: number | null;
  stroke_gained: number | null;
  created_at: string;
}

export interface RoundHole {
  id: number;
  hole_number: number;
  par: number;
  distance_yards: number | null;
  stroke_index: number | null;
  gross_score: number | null;
  is_complete: boolean;
  pin_latitude: number | null;
  pin_longitude: number | null;
  tee_latitude: number | null;
  tee_longitude: number | null;
  shots: Shot[];
}

export interface Round {
  id: number;
  course_name: string;
  tee_color: string | null;
  status: "active" | "completed";
  total_holes: number;
  handicap: number | null;
  notes: string;
  created_at: string;
  holes: RoundHole[];
}

export interface RoundSummary {
  id: number;
  course_name: string;
  tee_color: string | null;
  status: "active" | "completed";
  total_holes: number;
  handicap: number | null;
  notes: string;
  created_at: string;
}

export interface StrokeGainedHole {
  hole_number: number;
  par: number;
  gross_score: number | null;
  vs_par: number | null;
  sg_total: number;
  sg_off_tee: number;
  sg_approach: number;
  sg_around_green: number;
  sg_putting: number;
}

export interface CourseHoleTemplate {
  id: number;
  hole_number: number;
  par: number;
  distance_yards: number | null;
  stroke_index: number | null;
  tee_latitude: number | null;
  tee_longitude: number | null;
}

export interface CourseTemplate {
  id: number;
  name: string;
  total_holes: number;
  created_at: string;
  holes: CourseHoleTemplate[];
}

export interface CourseTemplateSummary {
  id: number;
  name: string;
  total_holes: number;
  created_at: string;
}

export interface StrokeGained {
  round_id: number;
  holes_completed: number;
  total_score: number | null;
  total_par: number;
  vs_par: number | null;
  sg_total: number;
  sg_off_tee: number;
  sg_approach: number;
  sg_around_green: number;
  sg_putting: number;
  by_hole: StrokeGainedHole[];
}
