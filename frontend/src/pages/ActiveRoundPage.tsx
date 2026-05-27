import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Polyline, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  ChevronLeft,
  ChevronRight,
  Crosshair,
  Flag,
  Trash2,
  BarChart2,
  CheckCircle2,
  Loader2,
  MapPin,
} from "lucide-react";
import { useRound, useAddShot, useDeleteShot, useUpdateRound, useStrokeGained } from "../hooks/useRounds";
import type { LieType, Shot } from "../types";

// ─── Constants ────────────────────────────────────────────────────────────────

const LIE_LABELS: Record<LieType, string> = {
  tee: "Tee",
  fairway: "Fairway",
  rough: "Rough",
  bunker: "Bunker",
  green: "Green",
  penalty: "Drop",
};

const LIE_COLORS: Record<LieType, string> = {
  tee: "#15803d",
  fairway: "#22c55e",
  rough: "#84cc16",
  bunker: "#f59e0b",
  green: "#06b6d4",
  penalty: "#ef4444",
};

const LIE_ORDER: LieType[] = ["tee", "fairway", "rough", "bunker", "green", "penalty"];

const CLUBS = [
  "Driver", "3-Wood", "5-Wood", "Hybrid",
  "4-Iron", "5-Iron", "6-Iron", "7-Iron", "8-Iron", "9-Iron",
  "PW", "GW", "SW", "LW", "Putter",
];

function sgColor(sg: number) {
  if (sg > 0.3) return "text-green-600";
  if (sg < -0.3) return "text-red-500";
  return "text-gray-500";
}

function vsParLabel(n: number) {
  if (n === 0) return "E";
  return n > 0 ? `+${n}` : `${n}`;
}

function vsParColor(n: number) {
  if (n <= -2) return "text-yellow-600 font-bold";
  if (n === -1) return "text-green-600 font-semibold";
  if (n === 0) return "text-gray-700";
  if (n === 1) return "text-orange-500";
  return "text-red-600 font-semibold";
}

// ─── Leaflet helpers ──────────────────────────────────────────────────────────

function createShotIcon(num: number, lieType: LieType) {
  const bg = LIE_COLORS[lieType] ?? "#888";
  return L.divIcon({
    html: `<div style="width:26px;height:26px;border-radius:50%;background:${bg};border:2px solid white;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:white;box-shadow:0 2px 6px rgba(0,0,0,0.35)">${num}</div>`,
    className: "",
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

function createGpsIcon() {
  return L.divIcon({
    html: `<div style="width:16px;height:16px;border-radius:50%;background:#3b82f6;border:3px solid white;box-shadow:0 0 0 4px rgba(59,130,246,0.25)"></div>`,
    className: "",
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

function MapUpdater({ center, follow }: { center: [number, number] | null; follow: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (center && follow) {
      map.setView(center, Math.max(map.getZoom(), 17));
    }
  }, [center, follow, map]);
  return null;
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function ActiveRoundPage() {
  const { id } = useParams<{ id: string }>();
  const roundId = Number(id);
  const navigate = useNavigate();

  const { data: round, isLoading } = useRound(roundId);
  const addShot = useAddShot(roundId);
  const deleteShot = useDeleteShot(roundId);
  const updateRound = useUpdateRound();
  const { data: sg } = useStrokeGained(roundId, round?.status === "completed");

  const [currentHole, setCurrentHole] = useState(1);
  const [selectedLie, setSelectedLie] = useState<LieType>("tee");
  const [selectedClub, setSelectedClub] = useState<string>("");
  const [gpsPos, setGpsPos] = useState<[number, number] | null>(null);
  const [gpsStatus, setGpsStatus] = useState<"acquiring" | "ok" | "denied" | "unavailable">("acquiring");
  const [followGps, setFollowGps] = useState(true);
  const [satellite, setSatellite] = useState(false);
  const [isGettingGps, setIsGettingGps] = useState(false);
  const [shotError, setShotError] = useState<string | null>(null);
  const [showScorecard, setShowScorecard] = useState(false);
  const [showSG, setShowSG] = useState(false);
  const watchRef = useRef<number | null>(null);

  // Start GPS watch on mount
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsStatus("unavailable");
      return;
    }
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setGpsPos([pos.coords.latitude, pos.coords.longitude]);
        setGpsStatus("ok");
      },
      (err) => {
        // Only surface permanent permission denial; transient errors (timeout/unavailable)
        // happen while GPS is still acquiring — don't block the user.
        if (err.code === 1) setGpsStatus("denied");
        // else: keep status as "acquiring" or "ok" so user isn't blocked
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
    return () => {
      if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
    };
  }, []);

  // Advance currentHole to first incomplete when round loads
  useEffect(() => {
    if (!round) return;
    const firstIncomplete = round.holes.find((h) => !h.is_complete);
    if (firstIncomplete) setCurrentHole(firstIncomplete.hole_number);
    else setCurrentHole(1);
  }, [round?.id]);

  // Set default lie based on hole completion state
  useEffect(() => {
    if (!round) return;
    const hole = round.holes.find((h) => h.hole_number === currentHole);
    if (!hole) return;
    if (hole.shots.length === 0) setSelectedLie("tee");
    else if (!hole.is_complete) setSelectedLie("fairway");
  }, [currentHole, round?.id]);

  const hole = round?.holes.find((h) => h.hole_number === currentHole);
  const shots = hole?.shots ?? [];
  const shotPositions: [number, number][] = shots
    .filter((s) => s.latitude !== null && s.longitude !== null)
    .map((s) => [s.latitude!, s.longitude!]);

  const mapCenter: [number, number] = gpsPos ?? [52.0, 4.3];

  async function saveShot(isHoleOut: boolean, lat?: number, lng?: number) {
    setShotError(null);
    setIsGettingGps(false);
    try {
      await addShot.mutateAsync({
        holeNumber: currentHole,
        data: {
          lie_type: selectedLie,
          latitude: lat,
          longitude: lng,
          club: selectedClub || undefined,
          is_hole_out: isHoleOut,
        },
      });
      if (isHoleOut) {
        if (currentHole < (round?.total_holes ?? 18)) {
          setTimeout(() => setCurrentHole((n) => n + 1), 600);
        }
      } else {
        setSelectedLie("fairway");
      }
    } catch {
      setShotError("Failed to save shot");
    }
  }

  async function recordShot(isHoleOut: boolean) {
    setShotError(null);

    // If we already have a GPS position from the watch, use it instantly
    if (gpsPos) {
      setIsGettingGps(true);
      await saveShot(isHoleOut, gpsPos[0], gpsPos[1]);
      return;
    }

    // Permission denied — save without coordinates
    if (gpsStatus === "denied" || gpsStatus === "unavailable") {
      await saveShot(isHoleOut);
      return;
    }

    // Still acquiring — try a one-shot request with generous timeout
    if (!navigator.geolocation) {
      await saveShot(isHoleOut);
      return;
    }

    setIsGettingGps(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setGpsPos([pos.coords.latitude, pos.coords.longitude]);
        setGpsStatus("ok");
        await saveShot(isHoleOut, pos.coords.latitude, pos.coords.longitude);
      },
      async () => {
        // Timed out or unavailable — record shot without coordinates
        setIsGettingGps(false);
        await saveShot(isHoleOut);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 30000 }
    );
  }

  async function handleDeleteShot(shot: Shot) {
    await deleteShot.mutateAsync({ holeNumber: currentHole, shotId: shot.id });
  }

  async function handleFinishRound() {
    await updateRound.mutateAsync({ id: roundId, data: { status: "completed" } });
    setShowSG(true);
  }

  const allHolesComplete = round?.holes.every((h) => h.is_complete) ?? false;

  if (isLoading || !round) {
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
        <button onClick={() => navigate("/rounds")} className="p-1 -ml-1">
          <ChevronLeft className="w-5 h-5 text-gray-300" />
        </button>
        <div className="text-center">
          <p className="text-sm font-semibold leading-none">{round.course_name}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {round.status === "active" ? "In Progress" : "Completed"}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowScorecard(!showScorecard)} className="p-1">
            <Flag className="w-5 h-5 text-gray-300" />
          </button>
          {round.status === "completed" && (
            <button onClick={() => setShowSG(!showSG)} className="p-1">
              <BarChart2 className="w-5 h-5 text-gray-300" />
            </button>
          )}
        </div>
      </div>

      {/* Hole selector */}
      <div className="bg-gray-800 overflow-x-auto flex-shrink-0">
        <div className="flex px-3 py-2 gap-1 min-w-max">
          {round.holes.map((h) => (
            <button
              key={h.hole_number}
              onClick={() => setCurrentHole(h.hole_number)}
              className={`flex flex-col items-center w-9 py-1 rounded-lg text-xs font-semibold transition-colors flex-shrink-0 ${
                h.hole_number === currentHole
                  ? "bg-green-600 text-white"
                  : h.is_complete
                  ? "bg-gray-600 text-gray-200"
                  : "bg-gray-700 text-gray-400"
              }`}
            >
              <span>{h.hole_number}</span>
              {h.is_complete && h.gross_score !== null && (
                <span
                  className={`text-[9px] leading-none ${
                    h.gross_score - h.par < 0
                      ? "text-green-300"
                      : h.gross_score - h.par > 0
                      ? "text-red-300"
                      : "text-gray-300"
                  }`}
                >
                  {vsParLabel(h.gross_score - h.par)}
                </span>
              )}
              {!h.is_complete && h.shots.length > 0 && (
                <span className="text-[9px] text-yellow-300 leading-none">{h.shots.length}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Current hole info bar */}
      {hole && (
        <div className="bg-gray-800 border-t border-gray-700 px-4 py-2 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              disabled={currentHole === 1}
              onClick={() => setCurrentHole((n) => n - 1)}
              className="p-1 disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4 text-gray-400" />
            </button>
            <div className="text-center">
              <p className="text-white font-bold text-lg leading-none">Hole {hole.hole_number}</p>
              <p className="text-gray-400 text-xs">
                Par {hole.par}
                {hole.distance_yards ? ` · ${Math.round(hole.distance_yards * 0.9144)}m` : ""}
              </p>
            </div>
            <button
              disabled={currentHole === round.total_holes}
              onClick={() => setCurrentHole((n) => n + 1)}
              className="p-1 disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </button>
          </div>
          <div className="text-right">
            {hole.is_complete && hole.gross_score !== null ? (
              <div>
                <p className="text-white font-bold text-lg leading-none">{hole.gross_score}</p>
                <p className={`text-xs ${vsParColor(hole.gross_score - hole.par)}`}>
                  {vsParLabel(hole.gross_score - hole.par)}
                </p>
              </div>
            ) : (
              <div>
                <p className="text-white font-bold text-lg leading-none">{shots.length}</p>
                <p className="text-gray-400 text-xs">shots</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Map — fixed vh height so Leaflet always gets a real pixel value */}
      <div className="relative flex-shrink-0" style={{ height: "45vh" }}>
        <MapContainer
          center={mapCenter}
          zoom={17}
          style={{ width: "100%", height: "100%" }}
          zoomControl={false}
          attributionControl={false}
        >
          {satellite ? (
            <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
          ) : (
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          )}
          <MapUpdater center={gpsPos} follow={followGps} />

          {/* Shot path */}
          {shotPositions.length > 1 && (
            <Polyline
              positions={shotPositions}
              pathOptions={{ color: "#ffffff", weight: 2, opacity: 0.6, dashArray: "6 4" }}
            />
          )}

          {/* Shot markers */}
          {shots.map((shot) =>
            shot.latitude !== null && shot.longitude !== null ? (
              <Marker
                key={shot.id}
                position={[shot.latitude, shot.longitude]}
                icon={createShotIcon(shot.shot_number, shot.lie_type as LieType)}
              />
            ) : null
          )}

          {/* GPS position */}
          {gpsPos && (
            <Marker position={gpsPos} icon={createGpsIcon()} />
          )}
        </MapContainer>

        {/* Map controls */}
        <div className="absolute bottom-3 right-3 z-[1000] flex flex-col gap-2">
          <button
            onClick={() => setFollowGps((f) => !f)}
            className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-colors ${
              followGps ? "bg-blue-500 text-white" : "bg-white text-gray-600"
            }`}
          >
            <Crosshair className="w-5 h-5" />
          </button>
          <button
            onClick={() => setSatellite((s) => !s)}
            className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-colors text-xs font-bold ${
              satellite ? "bg-green-600 text-white" : "bg-white text-gray-700"
            }`}
            title={satellite ? "Switch to map" : "Switch to satellite"}
          >
            {satellite ? "MAP" : "SAT"}
          </button>
        </div>

        {/* GPS status badge */}
        <div className="absolute top-3 left-3 z-[1000]">
          {gpsStatus === "acquiring" && (
            <div className="flex items-center gap-1.5 bg-black/60 text-white text-xs px-2.5 py-1 rounded-full">
              <Loader2 className="w-3 h-3 animate-spin" /> Acquiring GPS…
            </div>
          )}
          {gpsStatus === "denied" && (
            <div className="flex items-center gap-1.5 bg-red-600/90 text-white text-xs px-2.5 py-1 rounded-full">
              <MapPin className="w-3 h-3" /> Location denied
            </div>
          )}
        </div>
      </div>

      {/* Bottom area — flex-1 so it fills space below the fixed-height map */}
      <div className="flex-1 overflow-y-auto relative">

      {/* Controls panel */}
      {round.status === "active" && hole && !hole.is_complete && (
        <div className="bg-white border-t border-gray-200 px-4 pt-3 pb-safe">
          {/* Lie selector */}
          <div className="flex gap-1 mb-3">
            {LIE_ORDER.map((lie) => (
              <button
                key={lie}
                onClick={() => setSelectedLie(lie)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  selectedLie === lie
                    ? "text-white"
                    : "bg-gray-100 text-gray-600"
                }`}
                style={selectedLie === lie ? { backgroundColor: LIE_COLORS[lie] } : {}}
              >
                {LIE_LABELS[lie]}
              </button>
            ))}
          </div>

          {/* Club selector */}
          <div className="mb-3">
            <select
              value={selectedClub}
              onChange={(e) => setSelectedClub(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">Club (optional)</option>
              {CLUBS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Status row */}
          <div className="flex items-center justify-between mb-2 min-h-[18px]">
            {shotError && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" /> {shotError}
              </p>
            )}
            {!shotError && gpsStatus === "acquiring" && !gpsPos && (
              <p className="text-xs text-amber-600 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> Getting GPS fix…
              </p>
            )}
            {!shotError && gpsStatus === "ok" && (
              <p className="text-xs text-green-600 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> GPS ready
              </p>
            )}
            {!shotError && gpsStatus === "denied" && (
              <p className="text-xs text-orange-500">Shot recorded without GPS</p>
            )}
            <span />
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => recordShot(false)}
              disabled={isGettingGps || addShot.isPending}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-900 text-white rounded-xl font-semibold text-sm disabled:opacity-50 active:bg-gray-700"
            >
              {isGettingGps || addShot.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <MapPin className="w-4 h-4" />
              )}
              Record Shot
            </button>
            <button
              onClick={() => recordShot(true)}
              disabled={isGettingGps || addShot.isPending || shots.length === 0}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-700 text-white rounded-xl font-semibold text-sm disabled:opacity-50 active:bg-green-800"
            >
              <Flag className="w-4 h-4" />
              Hole Out
            </button>
          </div>
        </div>
      )}

      {/* Hole complete panel */}
      {round.status === "active" && hole?.is_complete && (
        <div className="bg-white border-t border-gray-200 px-4 pt-3 pb-safe">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-semibold">Hole {hole.hole_number} complete</span>
            </div>
            {hole.gross_score !== null && (
              <span className={`font-bold text-lg ${vsParColor(hole.gross_score - hole.par)}`}>
                {vsParLabel(hole.gross_score - hole.par)}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {currentHole < round.total_holes && (
              <button
                onClick={() => setCurrentHole((n) => n + 1)}
                className="flex-1 py-3 bg-green-700 text-white rounded-xl font-semibold text-sm active:bg-green-800"
              >
                Next Hole →
              </button>
            )}
            {allHolesComplete && round.status === "active" && (
              <button
                onClick={handleFinishRound}
                disabled={updateRound.isPending}
                className="flex-1 py-3 bg-gray-900 text-white rounded-xl font-semibold text-sm disabled:opacity-50"
              >
                Finish Round
              </button>
            )}
          </div>
        </div>
      )}

      {/* Round complete bar */}
      {round.status === "completed" && !showScorecard && !showSG && (
        <div className="bg-white border-t border-gray-200 px-4 py-3 pb-safe flex gap-2">
          <button
            onClick={() => setShowScorecard(true)}
            className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-semibold text-sm"
          >
            Scorecard
          </button>
          <button
            onClick={() => setShowSG(true)}
            className="flex-1 py-2.5 bg-green-700 text-white rounded-xl font-semibold text-sm"
          >
            Stroke Gained
          </button>
        </div>
      )}

      {/* Shot list for current hole */}
      {shots.length > 0 && !showScorecard && !showSG && (
        <div className="bg-white border-t border-gray-100 px-4 py-3 pb-safe">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Shots</p>
          <div className="space-y-1.5">
            {shots.map((shot) => (
              <div key={shot.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                    style={{ backgroundColor: LIE_COLORS[shot.lie_type as LieType] ?? "#888" }}
                  >
                    {shot.shot_number}
                  </div>
                  <span className="text-sm text-gray-700">
                    {LIE_LABELS[shot.lie_type as LieType] ?? shot.lie_type}
                    {shot.club ? ` · ${shot.club}` : ""}
                  </span>
                  {shot.distance_to_pin_yards !== null && (
                    <span className="text-xs text-gray-400">
                      {Math.round(shot.distance_to_pin_yards * 0.9144)}m
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {shot.stroke_gained !== null && (
                    <span className={`text-xs font-semibold ${sgColor(shot.stroke_gained)}`}>
                      {shot.stroke_gained > 0 ? "+" : ""}{shot.stroke_gained.toFixed(2)} SG
                    </span>
                  )}
                  {round.status === "active" && !hole?.is_complete && shot.shot_number === shots.length && (
                    <button
                      onClick={() => handleDeleteShot(shot)}
                      className="p-1 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scorecard overlay */}
      {showScorecard && (
        <ScorecardPanel round={round} onClose={() => setShowScorecard(false)} />
      )}

      {/* Stroke Gained overlay */}
      {showSG && (
        <StrokeGainedPanel sg={sg ?? null} onClose={() => setShowSG(false)} />
      )}

      </div>{/* end bottom area */}
    </div>
  );
}

// ─── Scorecard ────────────────────────────────────────────────────────────────

function ScorecardPanel({ round, onClose }: { round: import("../types").Round; onClose: () => void }) {
  const completedHoles = round.holes.filter((h) => h.is_complete);
  const totalScore = completedHoles.reduce((s, h) => s + (h.gross_score ?? 0), 0);
  const totalPar = completedHoles.reduce((s, h) => s + h.par, 0);

  return (
    <div className="absolute inset-0 bg-white z-[2000] overflow-y-auto">
      <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <h2 className="font-bold text-lg flex items-center gap-2">
          <Flag className="w-5 h-5 text-green-700" /> Scorecard
        </h2>
        <button onClick={onClose} className="text-sm text-gray-500 font-medium">Done</button>
      </div>

      <div className="px-4 py-3">
        {/* Score summary */}
        {completedHoles.length > 0 && (
          <div className="flex items-center justify-center gap-6 py-4 mb-4 bg-gray-50 rounded-xl">
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-900">{totalScore}</p>
              <p className="text-xs text-gray-500">Total</p>
            </div>
            <div className="text-center">
              <p className={`text-3xl font-bold ${vsParColor(totalScore - totalPar)}`}>
                {vsParLabel(totalScore - totalPar)}
              </p>
              <p className="text-xs text-gray-500">vs Par {totalPar}</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-900">{completedHoles.length}</p>
              <p className="text-xs text-gray-500">Holes</p>
            </div>
          </div>
        )}

        {/* Hole-by-hole */}
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-400 border-b border-gray-100">
              <th className="text-left py-2 font-medium">Hole</th>
              <th className="text-center py-2 font-medium">Par</th>
              <th className="text-center py-2 font-medium">m</th>
              <th className="text-center py-2 font-medium">Score</th>
              <th className="text-center py-2 font-medium">+/-</th>
            </tr>
          </thead>
          <tbody>
            {round.holes.map((h) => (
              <tr key={h.hole_number} className="border-b border-gray-50">
                <td className="py-2 font-medium">{h.hole_number}</td>
                <td className="py-2 text-center text-gray-500">{h.par}</td>
                <td className="py-2 text-center text-gray-400 text-xs">
                  {h.distance_yards ? `${Math.round(h.distance_yards * 0.9144)}` : "—"}
                </td>
                <td className="py-2 text-center">
                  {h.gross_score !== null ? (
                    <span className="font-bold">{h.gross_score}</span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
                <td className="py-2 text-center">
                  {h.gross_score !== null ? (
                    <span className={`text-xs font-semibold ${vsParColor(h.gross_score - h.par)}`}>
                      {vsParLabel(h.gross_score - h.par)}
                    </span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          {completedHoles.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-gray-200">
                <td className="py-2 font-bold">Total</td>
                <td className="py-2 text-center font-bold">{totalPar}</td>
                <td />
                <td className="py-2 text-center font-bold">{totalScore}</td>
                <td className="py-2 text-center">
                  <span className={`text-sm font-bold ${vsParColor(totalScore - totalPar)}`}>
                    {vsParLabel(totalScore - totalPar)}
                  </span>
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

// ─── Stroke Gained Panel ──────────────────────────────────────────────────────

function SGBar({ value, max = 2 }: { value: number; max?: number }) {
  const pct = Math.min(Math.abs(value) / max, 1) * 50;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden flex">
        <div className="flex-1 relative">
          {value < 0 && (
            <div
              className="absolute right-0 top-0 h-full bg-red-400 rounded-l-full"
              style={{ width: `${pct * 2}%` }}
            />
          )}
        </div>
        <div className="w-px bg-gray-300" />
        <div className="flex-1 relative">
          {value >= 0 && (
            <div
              className="absolute left-0 top-0 h-full bg-green-500 rounded-r-full"
              style={{ width: `${pct * 2}%` }}
            />
          )}
        </div>
      </div>
      <span className={`text-sm font-semibold w-14 text-right ${sgColor(value)}`}>
        {value > 0 ? "+" : ""}{value.toFixed(2)}
      </span>
    </div>
  );
}

function StrokeGainedPanel({
  sg,
  onClose,
}: {
  sg: import("../types").StrokeGained | null;
  onClose: () => void;
}) {
  if (!sg) {
    return (
      <div className="absolute inset-0 bg-white z-[2000] flex items-center justify-center">
        <div className="animate-spin w-6 h-6 border-2 border-green-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  const categories = [
    { label: "Off the Tee", value: sg.sg_off_tee },
    { label: "Approach", value: sg.sg_approach },
    { label: "Around Green", value: sg.sg_around_green },
    { label: "Putting", value: sg.sg_putting },
  ];

  return (
    <div className="absolute inset-0 bg-white z-[2000] overflow-y-auto">
      <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <h2 className="font-bold text-lg flex items-center gap-2">
          <BarChart2 className="w-5 h-5 text-green-700" /> Stroke Gained
        </h2>
        <button onClick={onClose} className="text-sm text-gray-500 font-medium">Done</button>
      </div>

      <div className="px-4 py-4 space-y-6">
        {/* Total */}
        <div className="bg-gray-50 rounded-2xl p-4 text-center">
          <p className={`text-4xl font-bold ${sgColor(sg.sg_total)}`}>
            {sg.sg_total > 0 ? "+" : ""}{sg.sg_total.toFixed(2)}
          </p>
          <p className="text-sm text-gray-500 mt-1">Stroke Gained Total</p>
          <p className="text-xs text-gray-400 mt-1">{sg.holes_completed} holes completed</p>
        </div>

        {/* Category breakdown */}
        <div>
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">By Category</p>
          <div className="space-y-3">
            {categories.map(({ label, value }) => (
              <div key={label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700 font-medium">{label}</span>
                </div>
                <SGBar value={value} />
              </div>
            ))}
          </div>
        </div>

        {/* By hole */}
        {sg.by_hole.length > 0 && (
          <div>
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">By Hole</p>
            <div className="space-y-2">
              {sg.by_hole.map((h) => (
                <div key={h.hole_number} className="flex items-center justify-between py-1.5 border-b border-gray-50">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700 w-16">Hole {h.hole_number}</span>
                    <span className="text-xs text-gray-400">Par {h.par}</span>
                    {h.vs_par !== null && (
                      <span className={`text-xs font-semibold ${vsParColor(h.vs_par)}`}>
                        {vsParLabel(h.vs_par)}
                      </span>
                    )}
                  </div>
                  <span className={`text-sm font-semibold ${sgColor(h.sg_total)}`}>
                    {h.sg_total > 0 ? "+" : ""}{h.sg_total.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
