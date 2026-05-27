import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Polyline, Marker, Circle, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  ChevronLeft,
  ChevronRight,
  Flag,
  Trash2,
  BarChart2,
  CheckCircle2,
  Loader2,
  MapPin,
} from "lucide-react";
import { useRound, useAddShot, useDeleteShot, useUpdateRound, useStrokeGained, useUpdateHole } from "../hooks/useRounds";
import { useCourseLookup } from "../hooks/useCourses";
import { useAuth } from "../context/AuthContext";
import type { LieType, Shot, HazardType } from "../types";

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

const HAZARD_COLORS: Record<HazardType, string> = {
  water: "#3b82f6",
  ob: "#ef4444",
  lateral_water: "#f97316",
  other: "#8b5cf6",
};

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

function createTeeIcon() {
  return L.divIcon({
    html: `<div style="width:16px;height:16px;background:white;border:3px solid #15803d;transform:rotate(45deg);box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>`,
    className: "",
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

function createFakeGpsIcon() {
  return L.divIcon({
    html: `<div style="width:18px;height:18px;border-radius:50%;background:#f97316;border:3px solid white;box-shadow:0 0 0 4px rgba(249,115,22,0.3)"></div>`,
    className: "",
    iconSize: [18, 18],
    iconAnchor: [9, 9],
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

function createGreenPointIcon(label: string) {
  return L.divIcon({
    html: `<div style="width:18px;height:18px;border-radius:50%;background:#22c55e;border:2px solid white;display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;color:white;box-shadow:0 2px 4px rgba(0,0,0,0.4)">${label}</div>`,
    className: "",
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function MapUpdater({
  holeCenter,
  holeBoundsPoints,
  teePos,
  greenRefPos,
}: {
  holeCenter: [number, number] | null;
  holeBoundsPoints: [number, number][];
  teePos: [number, number] | null;
  greenRefPos: [number, number] | null;
}) {
  const map = useMap();
  const prevKeyRef = useRef<string | null>(null);
  const holeCenterRef = useRef(holeCenter);
  const holeBoundsRef = useRef(holeBoundsPoints);
  const teePosRef = useRef(teePos);
  const greenPosRef = useRef(greenRefPos);
  holeCenterRef.current = holeCenter;
  holeBoundsRef.current = holeBoundsPoints;
  teePosRef.current = teePos;
  greenPosRef.current = greenRefPos;

  const key =
    holeBoundsPoints.length >= 2
      ? holeBoundsPoints.map((p) => `${p[0].toFixed(5)},${p[1].toFixed(5)}`).join("|")
      : holeCenter
      ? `${holeCenter[0].toFixed(5)},${holeCenter[1].toFixed(5)}`
      : null;

  useEffect(() => {
    if (!key || key === prevKeyRef.current) return;
    prevKeyRef.current = key;

    const bp = holeBoundsRef.current;
    const hc = holeCenterRef.current;
    const tee = teePosRef.current;
    const green = greenPosRef.current;

    if (bp.length >= 2) {
      const bounds = L.latLngBounds(bp.map((p) => L.latLng(p[0], p[1])));

      let padTop = 40, padBottom = 40;
      if (tee && green) {
        const dlat = green[0] - tee[0];
        const dlng = (green[1] - tee[1]) * Math.cos((tee[0] * Math.PI) / 180);
        const nsFraction = Math.abs(dlat) / (Math.abs(dlat) + Math.abs(dlng) + 1e-9);
        if (dlat > 0) {
          padTop = Math.round(40 + 50 * nsFraction);
          padBottom = Math.round(40 - 25 * nsFraction);
        } else if (dlat < 0) {
          padTop = Math.round(40 - 25 * nsFraction);
          padBottom = Math.round(40 + 50 * nsFraction);
        }
        console.log("[MapUpdater] tee:", tee, "green:", green);
        console.log("[MapUpdater] dlat:", dlat.toFixed(6), "dlng:", dlng.toFixed(6));
        console.log("[MapUpdater] nsFraction:", nsFraction.toFixed(3), "→ padTop:", padTop, "padBottom:", padBottom);
        console.log("[MapUpdater] map size:", map.getSize(), "bounds:", bounds.toBBoxString());
      } else {
        console.log("[MapUpdater] tee or green missing — tee:", tee, "green:", green, "using symmetric padding");
      }

      map.fitBounds(bounds, {
        paddingTopLeft: [40, padTop],
        paddingBottomRight: [40, padBottom],
      });
    } else if (hc) {
      map.setView(hc, Math.max(map.getZoom(), 18));
    }
  }, [key, map]);

  return null;
}

function MapTapHandler({
  onTap,
  enabled,
}: {
  onTap: (lat: number, lng: number) => void;
  enabled: boolean;
}) {
  useMapEvents({
    click: (e) => {
      if (enabled) onTap(e.latlng.lat, e.latlng.lng);
    },
  });
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
  const updateHole = useUpdateHole(roundId);
  const { data: sg } = useStrokeGained(roundId, round?.status === "completed");
  const { data: courseTemplate } = useCourseLookup(round?.course_name);
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "superuser";

  const [currentHole, setCurrentHole] = useState(1);
  const [selectedLie, setSelectedLie] = useState<LieType>("tee");
  const [selectedClub, setSelectedClub] = useState<string>("");
  const [gpsPos, setGpsPos] = useState<[number, number] | null>(null);
  const [gpsStatus, setGpsStatus] = useState<"acquiring" | "ok" | "denied" | "unavailable">("acquiring");
  const [satellite, setSatellite] = useState(true);
  // tapMode: null = normal, "fakeGps" = tap to set fake GPS, "setTee" = admin tap to set tee
  const [tapMode, setTapMode] = useState<null | "fakeGps" | "setTee">(null);
  const [fakeGpsPos, setFakeGpsPos] = useState<[number, number] | null>(null);
  const [selectedBunkerId, setSelectedBunkerId] = useState<number | null>(null);
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

  // tee position of current hole (if admin has set it)
  const holeTeaCenter: [number, number] | null =
    hole?.tee_latitude != null && hole?.tee_longitude != null
      ? [hole.tee_latitude, hole.tee_longitude]
      : null;

  const greenFrontPos: [number, number] | null =
    hole?.green_front_latitude != null && hole?.green_front_longitude != null
      ? [hole.green_front_latitude, hole.green_front_longitude]
      : null;
  const greenMiddlePos: [number, number] | null =
    hole?.green_middle_latitude != null && hole?.green_middle_longitude != null
      ? [hole.green_middle_latitude, hole.green_middle_longitude]
      : null;
  const greenBackPos: [number, number] | null =
    hole?.green_back_latitude != null && hole?.green_back_longitude != null
      ? [hole.green_back_latitude, hole.green_back_longitude]
      : null;

  // Hazards from the course template for the current hole
  const holeHazards = courseTemplate?.holes.find((h) => h.hole_number === currentHole)?.hazards ?? [];
  const holeBunkers = courseTemplate?.holes.find((h) => h.hole_number === currentHole)?.bunkers ?? [];

  // All hole points for fitBounds (tee + all green positions)
  const holeBoundsPoints: [number, number][] = [
    holeTeaCenter, greenFrontPos, greenMiddlePos, greenBackPos,
  ].filter((p): p is [number, number] => p !== null);

  // effective GPS: fake (test mode) > real
  const effectiveGps = fakeGpsPos ?? gpsPos;
  const mapCenter: [number, number] = holeTeaCenter ?? effectiveGps ?? [52.0, 4.3];
  const selectedBunker = holeBunkers.find((b) => b.id === selectedBunkerId) ?? null;
  const carryRefPos: [number, number] | null = effectiveGps ?? holeTeaCenter ?? null;

  function handleMapTap(lat: number, lng: number) {
    if (tapMode === "fakeGps") {
      setFakeGpsPos([lat, lng]);
    } else if (tapMode === "setTee" && isAdmin) {
      updateHole.mutate({ holeNumber: currentHole, data: { tee_latitude: lat, tee_longitude: lng } });
      setTapMode(null);
    } else {
      setSelectedBunkerId(null);
    }
  }

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

    // Fake GPS (test mode) or real GPS from watch — use immediately
    if (effectiveGps) {
      setIsGettingGps(true);
      await saveShot(isHoleOut, effectiveGps[0], effectiveGps[1]);
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
        <div className="flex items-center gap-1">
          {/* Test mode toggle */}
          <button
            onClick={() => {
              if (tapMode === "fakeGps") { setTapMode(null); setFakeGpsPos(null); }
              else setTapMode("fakeGps");
            }}
            className={`px-2 py-1 rounded text-[10px] font-bold ${tapMode === "fakeGps" || fakeGpsPos ? "bg-orange-500 text-white" : "text-gray-400"}`}
            title="Test mode: tap map to set fake GPS"
          >
            TEST
          </button>
          {/* Admin: set tee positions */}
          {isAdmin && (
            <button
              onClick={() => setTapMode(tapMode === "setTee" ? null : "setTee")}
              className={`px-2 py-1 rounded text-[10px] font-bold ${tapMode === "setTee" ? "bg-green-500 text-white" : "text-gray-400"}`}
              title="Admin: tap map to set tee position"
            >
              TEE
            </button>
          )}
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

      {/* Distance to green row — shown when GPS available and green positions exist */}
      {effectiveGps && (greenFrontPos || greenMiddlePos || greenBackPos) && (
        <div className="bg-gray-800 border-t border-gray-700 px-4 py-1.5 flex items-center gap-4 flex-shrink-0">
          <span className="text-gray-500 text-[11px] font-medium uppercase tracking-wide">To pin:</span>
          {greenFrontPos && (
            <span className="text-[12px] text-green-400 font-semibold">
              F {Math.round(haversineMeters(effectiveGps[0], effectiveGps[1], greenFrontPos[0], greenFrontPos[1]))}m
            </span>
          )}
          {greenMiddlePos && (
            <span className="text-[12px] text-green-300 font-semibold">
              M {Math.round(haversineMeters(effectiveGps[0], effectiveGps[1], greenMiddlePos[0], greenMiddlePos[1]))}m
            </span>
          )}
          {greenBackPos && (
            <span className="text-[12px] text-green-200 font-semibold">
              B {Math.round(haversineMeters(effectiveGps[0], effectiveGps[1], greenBackPos[0], greenBackPos[1]))}m
            </span>
          )}
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
          <MapUpdater
            holeCenter={holeTeaCenter}
            holeBoundsPoints={holeBoundsPoints}
            teePos={holeTeaCenter}
            greenRefPos={greenMiddlePos ?? greenFrontPos ?? greenBackPos}
          />
          {/* DEBUG — remove after orientation is confirmed */}
          {typeof window !== "undefined" && (() => {
            console.log("[ActiveRound] holeTeaCenter:", holeTeaCenter, "greenMiddlePos:", greenMiddlePos, "greenFrontPos:", greenFrontPos, "holeBoundsPoints:", holeBoundsPoints);
            return null;
          })()}
          <MapTapHandler enabled onTap={handleMapTap} />

          {/* Tee to green line */}
          {holeTeaCenter && (greenMiddlePos ?? greenFrontPos ?? greenBackPos) && (
            <Polyline
              positions={[holeTeaCenter, (greenMiddlePos ?? greenFrontPos ?? greenBackPos)!]}
              pathOptions={{ color: "#ffffff", weight: 1.5, opacity: 0.35, dashArray: "5 5" }}
            />
          )}

          {/* Hazard circles */}
          {holeHazards.map((h) => {
            if (h.latitude == null || h.longitude == null || h.radius_meters == null) return null;
            const color = HAZARD_COLORS[h.hazard_type as HazardType] ?? "#8b5cf6";
            return (
              <Circle
                key={h.id}
                center={[h.latitude, h.longitude]}
                radius={h.radius_meters}
                pathOptions={{ color, fillColor: color, fillOpacity: 0.2, weight: 1.5 }}
              />
            );
          })}

          {/* Bunker carry lines */}
          {holeBunkers.map((b) => {
            if (b.front_latitude == null || b.front_longitude == null || b.back_latitude == null || b.back_longitude == null) return null;
            const isSelected = b.id === selectedBunkerId;
            return (
              <Polyline
                key={b.id}
                positions={[[b.front_latitude, b.front_longitude], [b.back_latitude, b.back_longitude]]}
                pathOptions={{ color: "#f59e0b", weight: isSelected ? 8 : 5, opacity: isSelected ? 1 : 0.75 }}
                eventHandlers={{ click: (e) => { e.originalEvent.stopPropagation(); setSelectedBunkerId(isSelected ? null : b.id); } }}
              />
            );
          })}

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

          {/* Tee position marker */}
          {holeTeaCenter && (
            <Marker position={holeTeaCenter} icon={createTeeIcon()} />
          )}

          {/* Green markers */}
          {greenFrontPos && <Marker position={greenFrontPos} icon={createGreenPointIcon("F")} />}
          {greenMiddlePos && <Marker position={greenMiddlePos} icon={createGreenPointIcon("M")} />}
          {greenBackPos && <Marker position={greenBackPos} icon={createGreenPointIcon("B")} />}

          {/* Real GPS position (only when not overridden by fake) */}
          {gpsPos && !fakeGpsPos && (
            <Marker position={gpsPos} icon={createGpsIcon()} />
          )}

          {/* Fake GPS position (test mode) */}
          {fakeGpsPos && (
            <Marker position={fakeGpsPos} icon={createFakeGpsIcon()} />
          )}
        </MapContainer>

        {/* Bunker carry popup */}
        {selectedBunker && carryRefPos && selectedBunker.front_latitude != null && selectedBunker.back_latitude != null && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[1000] bg-gray-900/90 text-white rounded-xl px-4 py-2.5 flex flex-col items-center gap-1 shadow-xl pointer-events-none">
            <div className="text-xs text-amber-400 font-semibold uppercase tracking-wide">{selectedBunker.label ?? "Bunker"}</div>
            <div className="flex gap-4 text-sm font-bold">
              <span className="text-amber-300">
                Front &nbsp;{Math.round(haversineMeters(carryRefPos[0], carryRefPos[1], selectedBunker.front_latitude!, selectedBunker.front_longitude!))}m
              </span>
              <span className="text-white">
                Back &nbsp;{Math.round(haversineMeters(carryRefPos[0], carryRefPos[1], selectedBunker.back_latitude!, selectedBunker.back_longitude!))}m
              </span>
            </div>
          </div>
        )}

        {/* Map controls */}
        <div className="absolute bottom-3 right-3 z-[1000] flex flex-col gap-2">
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

        {/* Tap mode banner */}
        {tapMode && (
          <div className="absolute top-0 inset-x-0 z-[1001] flex items-center justify-between bg-orange-500 text-white text-xs font-semibold px-3 py-2">
            <span>
              {tapMode === "fakeGps" ? "Tap map to place fake GPS position" : "Tap map to set tee position for Hole " + currentHole}
            </span>
            <button onClick={() => setTapMode(null)} className="ml-2 underline text-xs">Cancel</button>
          </div>
        )}

        {/* GPS / mode status badge (only when no tap mode active) */}
        {!tapMode && (
          <div className="absolute top-3 left-3 z-[1000]">
            {fakeGpsPos && (
              <div className="flex items-center gap-1.5 bg-orange-500/90 text-white text-xs px-2.5 py-1 rounded-full">
                <MapPin className="w-3 h-3" /> Test position active
              </div>
            )}
            {!fakeGpsPos && gpsStatus === "acquiring" && (
              <div className="flex items-center gap-1.5 bg-black/60 text-white text-xs px-2.5 py-1 rounded-full">
                <Loader2 className="w-3 h-3 animate-spin" /> Acquiring GPS…
              </div>
            )}
            {!fakeGpsPos && gpsStatus === "denied" && (
              <div className="flex items-center gap-1.5 bg-red-600/90 text-white text-xs px-2.5 py-1 rounded-full">
                <MapPin className="w-3 h-3" /> Location denied
              </div>
            )}
          </div>
        )}
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
