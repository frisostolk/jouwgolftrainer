import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ChevronLeft, MapPin, CheckCircle2 } from "lucide-react";
import { useCourse, useUpdateCourseHole } from "../hooks/useCourses";
import type { CourseHoleTemplate } from "../types";

// ─── Leaflet helpers ──────────────────────────────────────────────────────────

function createTeeIcon() {
  return L.divIcon({
    html: `<div style="width:18px;height:18px;background:white;border:3px solid #15803d;transform:rotate(45deg);box-shadow:0 2px 8px rgba(0,0,0,0.4)"></div>`,
    className: "",
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

function MapCenterUpdater({ center }: { center: [number, number] | null }) {
  const map = useMap();
  const prev = useRef<string | null>(null);
  useEffect(() => {
    if (!center) return;
    const key = center.join(",");
    if (key !== prev.current) {
      prev.current = key;
      map.setView(center, Math.max(map.getZoom(), 17));
    }
  }, [center, map]);
  return null;
}

function MapTapHandler({ onTap }: { onTap: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onTap(e.latlng.lat, e.latlng.lng) });
  return null;
}

// ─── Meters / yards helpers ───────────────────────────────────────────────────

function yardsToMeters(y: number | null): string {
  if (y === null) return "";
  return String(Math.round(y * 0.9144));
}

function metersToYards(m: string): number | null {
  const n = parseInt(m);
  return isNaN(n) ? null : Math.round(n / 0.9144);
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function CourseEditorPage() {
  const { id } = useParams<{ id: string }>();
  const courseId = Number(id);
  const navigate = useNavigate();

  const { data: course, isLoading } = useCourse(courseId);
  const updateHole = useUpdateCourseHole(courseId);

  const [currentHole, setCurrentHole] = useState(1);
  const [satellite, setSatellite] = useState(true);
  const [savedHole, setSavedHole] = useState<number | null>(null);

  // Local editable state for current hole
  const [localPar, setLocalPar] = useState(4);
  const [localDist, setLocalDist] = useState("");

  const hole: CourseHoleTemplate | undefined = course?.holes.find((h) => h.hole_number === currentHole);

  // Sync local state when hole changes
  useEffect(() => {
    if (!hole) return;
    setLocalPar(hole.par);
    setLocalDist(yardsToMeters(hole.distance_yards));
  }, [currentHole, course?.id]);

  const teeCenter: [number, number] | null =
    hole?.tee_latitude != null && hole?.tee_longitude != null
      ? [hole.tee_latitude, hole.tee_longitude]
      : null;

  const mapCenter: [number, number] = teeCenter ?? [52.0, 4.3];

  function handleMapTap(lat: number, lng: number) {
    updateHole.mutate(
      { holeNumber: currentHole, data: { tee_latitude: lat, tee_longitude: lng } },
      {
        onSuccess: () => {
          setSavedHole(currentHole);
          setTimeout(() => setSavedHole(null), 2000);
        },
      }
    );
  }

  function handleParChange(par: 3 | 4 | 5) {
    setLocalPar(par);
    updateHole.mutate({ holeNumber: currentHole, data: { par } });
  }

  function handleDistBlur() {
    const yards = metersToYards(localDist);
    updateHole.mutate({ holeNumber: currentHole, data: { distance_yards: yards } });
  }

  if (isLoading || !course) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-dvh bg-gray-900">
      {/* Top bar */}
      <div className="bg-gray-900 text-white px-4 pt-safe flex items-center justify-between h-14 flex-shrink-0">
        <button onClick={() => navigate("/admin")} className="p-1 -ml-1">
          <ChevronLeft className="w-5 h-5 text-gray-300" />
        </button>
        <div className="text-center">
          <p className="text-sm font-semibold leading-none">{course.name}</p>
          <p className="text-xs text-gray-400 mt-0.5">{course.total_holes} holes · Course Editor</p>
        </div>
        <button
          onClick={() => setSatellite((s) => !s)}
          className={`px-2 py-1 rounded text-[10px] font-bold ${satellite ? "bg-green-600 text-white" : "text-gray-400"}`}
        >
          {satellite ? "MAP" : "SAT"}
        </button>
      </div>

      {/* Hole selector */}
      <div className="bg-gray-800 overflow-x-auto flex-shrink-0">
        <div className="flex px-3 py-2 gap-1 min-w-max">
          {course.holes.map((h) => {
            const hasPos = h.tee_latitude != null;
            return (
              <button
                key={h.hole_number}
                onClick={() => setCurrentHole(h.hole_number)}
                className={`flex flex-col items-center w-9 py-1 rounded-lg text-xs font-semibold transition-colors flex-shrink-0 ${
                  h.hole_number === currentHole
                    ? "bg-green-600 text-white"
                    : hasPos
                    ? "bg-gray-600 text-gray-200"
                    : "bg-gray-700 text-gray-500"
                }`}
              >
                <span>{h.hole_number}</span>
                {hasPos && (
                  <span className="text-[7px] leading-none text-green-400">●</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Hole settings bar */}
      <div className="bg-gray-800 border-t border-gray-700 px-4 py-2.5 flex items-center gap-4 flex-shrink-0">
        {/* Par */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-400 font-medium">Par</span>
          {([3, 4, 5] as const).map((p) => (
            <button
              key={p}
              onClick={() => handleParChange(p)}
              className={`w-8 h-7 rounded text-xs font-semibold transition-colors ${
                localPar === p ? "bg-green-600 text-white" : "bg-gray-700 text-gray-300"
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Distance */}
        <div className="flex items-center gap-1.5 flex-1">
          <span className="text-xs text-gray-400 font-medium">Dist</span>
          <input
            type="number"
            inputMode="numeric"
            placeholder="—"
            value={localDist}
            onChange={(e) => setLocalDist(e.target.value)}
            onBlur={handleDistBlur}
            className="w-16 px-2 py-1 text-xs text-white bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-green-500"
          />
          <span className="text-xs text-gray-500">m</span>
        </div>

        {/* Tee status */}
        <div className="flex items-center gap-1">
          {savedHole === currentHole ? (
            <span className="flex items-center gap-1 text-xs text-green-400 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" /> Saved
            </span>
          ) : teeCenter ? (
            <span className="flex items-center gap-1 text-xs text-green-500">
              <MapPin className="w-3 h-3" /> Tee set
            </span>
          ) : (
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <MapPin className="w-3 h-3" /> No tee
            </span>
          )}
        </div>
      </div>

      {/* Map */}
      <div className="relative flex-shrink-0" style={{ height: "55vh" }}>
        <MapContainer
          center={mapCenter}
          zoom={16}
          style={{ width: "100%", height: "100%" }}
          zoomControl={false}
          attributionControl={false}
        >
          {satellite ? (
            <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
          ) : (
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          )}
          <MapCenterUpdater center={teeCenter} />
          <MapTapHandler onTap={handleMapTap} />

          {teeCenter && (
            <Marker position={teeCenter} icon={createTeeIcon()} />
          )}
        </MapContainer>

        {/* Instruction banner */}
        <div className="absolute bottom-0 inset-x-0 z-[1000] bg-black/60 text-white text-xs text-center py-2 px-4">
          Tap anywhere on the map to set the tee position for Hole {currentHole}
          {updateHole.isPending && <span className="ml-2 opacity-70">Saving…</span>}
        </div>
      </div>

      {/* Bottom info */}
      <div className="flex-1 overflow-y-auto bg-white">
        <div className="px-4 py-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">All Holes</p>
          <div className="grid grid-cols-3 gap-2">
            {course.holes.map((h) => (
              <button
                key={h.hole_number}
                onClick={() => setCurrentHole(h.hole_number)}
                className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition-colors ${
                  h.hole_number === currentHole
                    ? "border-green-500 bg-green-50"
                    : "border-gray-100 bg-gray-50"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-bold text-gray-700">Hole {h.hole_number}</span>
                  {h.tee_latitude != null ? (
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-gray-200" />
                  )}
                </div>
                <span className="text-[10px] text-gray-400 mt-0.5">
                  Par {h.par}{h.distance_yards ? ` · ${Math.round(h.distance_yards * 0.9144)}m` : ""}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
