import { useParams, useNavigate } from "react-router-dom";
import { Trash2, MessageSquare } from "lucide-react";
import { useVideo, useDeleteVideo } from "../hooks/useVideos";
import { useQuery } from "@tanstack/react-query";
import { coachApi } from "../api/coach";
import { useAuth } from "../context/AuthContext";
import { PageHeader } from "../components/PageHeader";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { formatDate } from "../lib/utils";

export function VideoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: video, isLoading } = useVideo(Number(id));
  const { mutateAsync: deleteVideo } = useDeleteVideo();
  const { data: notes } = useQuery({
    queryKey: ["coach-notes-video", id],
    queryFn: () => coachApi.getMyNotes(),
    select: (notes) => notes.filter((n) => n.video_id === Number(id)),
  });

  const handleDelete = async () => {
    if (!confirm("Delete this video?")) return;
    await deleteVideo(Number(id));
    navigate("/videos", { replace: true });
  };

  if (isLoading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full" /></div>;
  if (!video) return <div className="p-4 text-center text-gray-500">Video not found</div>;

  return (
    <div>
      <PageHeader
        title={video.title}
        back
        action={
          video.user_id === user?.id && (
            <button onClick={handleDelete} className="p-2 text-red-500">
              <Trash2 className="w-5 h-5" />
            </button>
          )
        }
      />
      <div className="pb-8">
        {/* Video Player */}
        <div className="w-full bg-black aspect-video">
          <video
            src={video.url}
            controls
            playsInline
            className="w-full h-full"
            poster={video.thumbnail_url}
          />
        </div>

        <div className="px-4 pt-4 space-y-4">
          {/* Meta */}
          <div>
            <h1 className="text-lg font-semibold text-gray-900">{video.title}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{formatDate(video.created_at)}</p>
            <div className="flex gap-2 mt-2 flex-wrap">
              {video.swing_type && <Badge variant="green">{video.swing_type}</Badge>}
              {video.club && <Badge variant="blue">{video.club}</Badge>}
              {video.is_public && <Badge variant="yellow">Public</Badge>}
            </div>
          </div>

          {video.description && (
            <Card className="p-4">
              <p className="text-sm text-gray-600">{video.description}</p>
            </Card>
          )}

          {/* Coach Notes */}
          {notes && notes.length > 0 && (
            <div>
              <h2 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-green-600" />
                Coach Feedback ({notes.length})
              </h2>
              <div className="space-y-3">
                {notes.map((note) => (
                  <Card key={note.id} className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-sm font-medium text-gray-900">{note.coach.name}</span>
                      {note.timestamp_seconds != null && (
                        <Badge variant="blue">{formatTimestamp(note.timestamp_seconds)}</Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-700">{note.content}</p>
                    <Badge className="mt-2">{note.category}</Badge>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatTimestamp(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
