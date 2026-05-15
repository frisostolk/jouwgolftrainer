import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, Video as VideoIcon } from "lucide-react";
import { useVideos } from "../hooks/useVideos";
import { videosApi } from "../api/videos";
import { useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "../components/PageHeader";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { Badge } from "../components/Badge";
import { formatRelativeDate } from "../lib/utils";

export function VideosPage() {
  const navigate = useNavigate();
  const { data: videos, isLoading } = useVideos();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);
    try {
      // Get presigned URL
      const { upload_url, key, fields } = await videosApi.getUploadUrl(file.type);

      // Upload directly to Spaces
      const formData = new FormData();
      Object.entries(fields).forEach(([k, v]) => formData.append(k, v));
      formData.append("file", file);

      const xhr = new XMLHttpRequest();
      xhr.upload.onprogress = (ev) => {
        if (ev.lengthComputable) setUploadProgress(Math.round((ev.loaded / ev.total) * 100));
      };

      await new Promise<void>((resolve, reject) => {
        xhr.onload = () => (xhr.status < 300 ? resolve() : reject(new Error(`Upload failed: ${xhr.status}`)));
        xhr.onerror = () => reject(new Error("Network error"));
        xhr.open("POST", upload_url);
        xhr.send(formData);
      });

      // Register with backend
      await videosApi.registerAfterUpload({
        title: file.name.replace(/\.[^/.]+$/, ""),
        storage_key: key,
        file_size_bytes: file.size,
      });

      qc.invalidateQueries({ queryKey: ["videos"] });
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Upload failed. Please try again.");
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div>
      <PageHeader
        title="My Videos"
        action={
          <Button size="sm" onClick={() => fileRef.current?.click()} loading={uploading}>
            <Upload className="w-4 h-4" />
            {uploading ? `${uploadProgress}%` : "Upload"}
          </Button>
        }
      />
      <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={handleFileSelect} />

      <div className="px-4 pt-4 pb-4">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => <div key={i} className="aspect-video bg-gray-100 rounded-2xl animate-pulse" />)}
          </div>
        ) : !videos?.length ? (
          <EmptyState
            icon={VideoIcon}
            title="No videos yet"
            description="Upload swing videos to track your progress and get coach feedback."
            action={{ label: "Upload video", onClick: () => fileRef.current?.click() }}
          />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {videos.map((video) => (
              <Card key={video.id} className="overflow-hidden" onClick={() => navigate(`/videos/${video.id}`)}>
                {video.thumbnail_url ? (
                  <img src={video.thumbnail_url} alt={video.title} className="w-full aspect-video object-cover" />
                ) : (
                  <div className="w-full aspect-video bg-gray-100 flex items-center justify-center">
                    <VideoIcon className="w-8 h-8 text-gray-400" />
                  </div>
                )}
                <div className="p-2">
                  <p className="text-xs font-medium text-gray-900 truncate">{video.title}</p>
                  <p className="text-[10px] text-gray-500">{formatRelativeDate(video.created_at)}</p>
                  {video.swing_type && <Badge className="mt-1">{video.swing_type}</Badge>}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
