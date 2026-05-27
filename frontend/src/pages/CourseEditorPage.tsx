import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Polyline, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ChevronLeft, Trash2, Plus, CheckCircle2 } from "lucide-react";
import { useCourse, useUpdateCourseHole, useAddBunker, useDeleteBunker } from "../hooks/useCourses";
import type { CourseHoleTemplate, CourseHoleBunker } from "../types";

// ─── Map icons ────────────────────────────────────────────────────────────────

function createTeeIcon() {
  return L.divIcon({
    html: `<div style="width:18px;height:18px;background:white;border:3px solid #15803d;transform:rotate(45deg);box-shadow:0 2px 8px rgba(0,0,0,0.4)"></div>`,
    className: "",
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

function createGreenIcon() {
  return L.divIcon({
    html: `<div style="width:20px;height:20px;border-radius:50%;background:#16a34a;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center"><span style="color:white;font-size:9px;font-weight:900;line-height:1">⛳</span></div>`,
    className: "",
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

function createBunkerIcon(label: string) {
  return L.divIcon({
    html: `<div style="width:22px;height:22px;border-radius:50%;background:#d97706;border:2px solid white;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:900;color:white;box-shadow:0 2px 6px rgba(0,0,0,0.35)">${label}</div>`,
    className: "",
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

function createTempIcon(label: string) {
  return L.divIcon({
    html: `<div style="width:22px;height:22px;border-radius:50%;background:#f59e0b;border:2px dashed white;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:900;color:white;opacity:0.85">${label}</div>`,
    className: "",
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

// ─── Map helpers ──────────────────────────────────────────────────────────────

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

function MapTapHandler({ onTap, enabled }: { onTap: (lat: number, lng: number) => void; enabled: boolean }) {
  useMapEvents({ click: (e) => { if (enabled) onTap(e.latlng.lat, e.latlng.lng); } });
  return null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function yardsToMeters(y: number | null): string {
  if (y === null) return "";
  return String(Math.round(y * 0.9144));
}

function metersToYards(m: string): number | null {
  const n = parseInt(m);
  return isNaN(n) ? null : Math.round(n / 0.9144);
}

// ─── Types ────────────────────────────────────────────────────────────────────

type EditMode = "tee" | "green" | "bunkers";
type BunkerPhase = null | "front" | "back";

// ─── Main page ────────────────────────────────────────────────────────────────

export function CourseEditorPage() {
  const { id } = useParams<{ id: string }>();
  const courseId = Number(id);
  const navigate = useNavigate();

  const { data: course, isLoading } = useCourse(courseId);
  const updateHole = useUpdateCourseHole(courseId);
  const addBunker = useAddBunker(courseId);
  const deleteBunker = useDeleteBunker(courseId);

  const [currentHole, setCurrentHole] = useState(1);
  const [satellite, setSatellite] = useState(true);
  const [mode, setMode] = useState<EditMode>("tee");
  const [savedFlash, setSavedFlash] = useState<string | null>(null);

  // Bunker add state
  const [bunkerPhase, setBunkerPhase] = useState<BunkerPhase>(null);
  const [bunkerFront, setBunkerFront] = useState<[number, number] | null>(null);

  // Local hole form state
  const [localPar, setLocalPar] = useState(4);
  const [localDist, setLocalDist] = useState("");

  const hole: CourseHoleTemplate | undefined = course?.holes.find((h) => h.hole_number === currentHole);

  useEffect(() => {
    if (!hole) return;
    setLocalPar(hole.par);
    setLocalDist(yardsToMeters(hole.distance_yards));
    // Reset bunker add state when switching holes
    setBunkerPhase(null);
    setBunkerFront(null);
  }, [currentHole, course?.id]);

  const teePos: [number, number] | null =
    hole?.tee_latitude != null ? [hole.tee_latitude, hole.tee_longitude!] : null;
  const greenPos: [number, number] | null =
    hole?.green_latitude != null ? [hole.green_latitude, hole.green_longitude!] : null;
  const mapCenter: [number, number] = teePos ?? greenPos ?? [52.0, 4.3];

  function flash(msg: string) {
    setSavedFlash(msg);
    setTimeout(() => setSavedFlash(null), 2000);
  }

  function handleMapTap(lat: number, lng: number) {
    if (mode === "tee") {
      updateHole.mutate(
        { holeNumber: currentHole, data: { tee_latitude: lat, tee_longitude: lng } },
        { onSuccess: () => flash("Tee saved") }
      );
    } else if (mode === "green") {
      updateHole.mutate(
        { holeNumber: currentHole, data: { green_latitude: lat, green_longitude: lng } },
        { onSuccess: () => flash("Green saved") }
      );
    } else if (mode === "bunkers") {
      if (bunkerPhase === "front") {
        setBunkerFront([lat, lng]);
        setBunkerPhase("back");
      } else if (bunkerPhase === "back" && bunkerFront) {
        addBunker.mutate(
          {
            holeNumber: currentHole,
            data: {
              front_latitude: bunkerFront[0],
              front_longitude: bunkerFront[1],
              back_latitude: lat,
              back_longitude: lng,
            },
          },
          {
            onSuccess: () => {
              setBunkerPhase(null);
              setBunkerFront(null);
              flash("Bunker added");
            },
          }
        );
      }
    }
  }

  function handleParChange(par: 3 | 4 | 5) {
    setLocalPar(par);
    updateHole.mutate({ holeNumber: currentHole, data: { par } });
  }

  function handleDistBlur() {
    updateHole.mutate({ holeNumber: currentHole, data: { distance_yards: metersToYards(localDist) } });
  }

  function startBunkerAdd() {
    setBunkerPhase("front");
    setBunkerFront(null);
  }

  function cancelBunkerAdd() {
    setBunkerPhase(null);
    setBunkerFront(null);
  }

  const tapEnabled = mode === "tee" || mode === "green" || (mode === "bunkers" && bunkerPhase !== null);

  const bannerText =
    mode === "tee" ? `Tap map to set tee — Hole ${currentHole}` :
    mode === "green" ? `Tap map to set green — Hole ${currentHole}` :
    bunkerPhase === "front" ? "Tap the front edge of the bunker (closest to tee)" :
    bunkerPhase === "back" ? "Tap the back edge of the bunker (furthest from tee)" :
    null;

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
          <p className="text-xs text-gray-400 mt-0.5">{course.total_holes} holes</p>
        </div>
        <button
          onClick={() => setSatellite((s) => !s)}
          className={`px-2 py-1 rounded text-[10px] font-bold ${satellite ? "bg-green-600 text-white" : "text-gray-400"}`}
        >
          {satellite ? "MAP" : "SAT"}
        </button>
      </div>

      {/* Hole tabs */}
      <div className="bg-gray-800 overflow-x-auto flex-shrink-0">
        <div className="flex px-3 py-2 gap-1 min-w-max">
          {course.holes.map((h) => {
            const hasTee = h.tee_latitude != null;
            const hasGreen = h.green_latitude != null;
            const hasBunkers = h.bunkers.length > 0;
            const dots = [hasTee && "🟢", hasGreen && "⛳", hasBunkers && "🟡"].filter(Boolean);
            return (
              <button
                key={h.hole_number}
                onClick={() => setCurrentHole(h.hole_number)}
                className={`flex flex-col items-center w-9 py-1 rounded-lg text-xs font-semibold transition-colors flex-shrink-0 ${
                  h.hole_number === currentHole ? "bg-green-600 text-white" : "bg-gray-700 text-gray-400"
                }`}
              >
                <span>{h.hole_number}</span>
                {dots.length > 0 && (
                  <span className="text-[7px] leading-none">{dots.join("")}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Hole settings bar */}
      <div className="bg-gray-800 border-t border-gray-700 px-4 py-2 flex items-center gap-3 flex-shrink-0">
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
        <div className="flex items-center gap-1.5">
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
        {savedFlash && (
          <span className="flex items-center gap-1 text-xs text-green-400 font-medium ml-auto">
            <CheckCircle2 className="w-3.5 h-3.5" /> {savedFlash}
          </span>
        )}
      </div>

      {/* Mode tabs */}
      <div className="bg-gray-800 border-t border-gray-700 flex flex-shrink-0">
        {(["tee", "green", "bunkers"] as EditMode[]).map((m) => {
          const label = m === "tee" ? "Tee" : m === "green" ? "Green" : "Bunkers";
          const count = m === "bunkers" ? hole?.bunkers.length : null;
          return (
            <button
              key={m}
              onClick={() => { setMode(m); cancelBunkerAdd(); }}
              className={`flex-1 py-2 text-xs font-semibold transition-colors border-b-2 ${
                mode === m ? "text-white border-green-500" : "text-gray-400 border-transparent"
              }`}
            >
              {label}
              {count != null && count > 0 && (
                <span className="ml-1 bg-amber-500 text-white text-[9px] rounded-full px-1">{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Map */}
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
          <MapCenterUpdater center={teePos ?? greenPos} />
          <MapTapHandler onTap={handleMapTap} enabled={tapEnabled} />

          {/* Tee-to-green line */}
          {teePos && greenPos && (
            <Polyline
              positions={[teePos, greenPos]}
              pathOptions={{ color: "#ffffff", weight: 2, opacity: 0.4, dashArray: "6 4" }}
            />
          )}

          {/* Tee marker */}
          {teePos && <Marker position={teePos} icon={createTeeIcon()} />}

          {/* Green marker */}
          {greenPos && <Marker position={greenPos} icon={createGreenIcon()} />}

          {/* Bunker markers */}
          {hole?.bunkers.map((b, i) => (
            <BunkerMarkers key={b.id} bunker={b} index={i + 1} />
          ))}

          {/* Temporary bunker-front marker while placing back */}
          {bunkerFront && <Marker position={bunkerFront} icon={createTempIcon("F")} />}
        </MapContainer>

        {/* Banner */}
        {bannerText && (
          <div className="absolute bottom-0 inset-x-0 z-[1000] bg-black/70 text-white text-xs text-center py-2 px-4 flex items-center justify-between">
            <span>{bannerText}</span>
            {bunkerPhase && (
              <button onClick={cancelBunkerAdd} className="text-xs text-gray-300 underline ml-3">Cancel</button>
            )}
          </div>
        )}
        {!bannerText && (
          <div className="absolute bottom-0 inset-x-0 z-[1000] bg-black/50 text-gray-300 text-xs text-center py-1.5 px-4">
            {mode === "bunkers" ? "Use \"Add Bunker\" below, or switch tab to edit tee / green" : `Tap map to set ${mode} for Hole ${currentHole}`}
          </div>
        )}
      </div>

      {/* Bottom panel */}
      <div className="flex-1 overflow-y-auto bg-white">
        {mode === "bunkers" ? (
          <BunkersPanel
            hole={hole}
            courseId={courseId}
            onAdd={startBunkerAdd}
            isAdding={bunkerPhase !== null}
            deleteBunkerMutate={(bunkerId) =>
              deleteBunker.mutate({ holeNumber: currentHole, bunkerId })
            }
          />
        ) : (
          <HoleOverview course={course} currentHole={currentHole} onSelectHole={setCurrentHole} />
        )}
      </div>
    </div>
  );
}

// ─── Bunker markers (front + back + line) ────────────────────────────────────

function BunkerMarkers({ bunker, index }: { bunker: CourseHoleBunker; index: number }) {
  const frontPos: [number, number] | null =
    bunker.front_latitude != null ? [bunker.front_latitude, bunker.front_longitude!] : null;
  const backPos: [number, number] | null =
    bunker.back_latitude != null ? [bunker.back_latitude, bunker.back_longitude!] : null;

  return (
    <>
      {frontPos && <Marker position={frontPos} icon={createBunkerIcon(`${index}F`)} />}
      {backPos && <Marker position={backPos} icon={createBunkerIcon(`${index}B`)} />}
      {frontPos && backPos && (
        <Polyline
          positions={[frontPos, backPos]}
          pathOptions={{ color: "#d97706", weight: 2, opacity: 0.8, dashArray: "4 3" }}
        />
      )}
    </>
  );
}

// ─── Bunkers panel ────────────────────────────────────────────────────────────

function BunkersPanel({
  hole,
  courseId: _courseId,
  onAdd,
  isAdding,
  deleteBunkerMutate,
}: {
  hole: CourseHoleTemplate | undefined;
  courseId: number;
  onAdd: () => void;
  isAdding: boolean;
  deleteBunkerMutate: (bunkerId: number) => void;
}) {
  const bunkers = hole?.bunkers ?? [];

  return (
    <div className="px-4 py-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-gray-700">
          Bunkers — Hole {hole?.hole_number}
          <span className="ml-2 text-xs font-normal text-gray-400">{bunkers.length} saved</span>
        </p>
        {!isAdding && (
          <button
            onClick={onAdd}
            className="flex items-center gap-1 px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-semibold"
          >
            <Plus className="w-3.5 h-3.5" /> Add Bunker
          </button>
        )}
        {isAdding && (
          <span className="text-xs text-amber-600 font-semibold animate-pulse">Tap on map…</span>
        )}
      </div>

      {bunkers.length === 0 ? (
        <div className="text-center py-8 text-sm text-gray-400">
          No bunkers mapped yet. Tap "Add Bunker" then tap the front and back edges on the map.
        </div>
      ) : (
        <div className="space-y-2">
          {bunkers.map((b, i) => (
            <div key={b.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-amber-400 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                  {i + 1}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">{b.label ?? `Bunker ${i + 1}`}</p>
                  <p className="text-xs text-gray-400">
                    {b.front_latitude != null ? `F: ${b.front_latitude.toFixed(5)}, ${b.front_longitude!.toFixed(5)}` : "Front not set"}
                    {" · "}
                    {b.back_latitude != null ? `B: ${b.back_latitude.toFixed(5)}, ${b.back_longitude!.toFixed(5)}` : "Back not set"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => deleteBunkerMutate(b.id)}
                className="p-1.5 text-gray-300 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Hole overview grid (shown when mode = tee or green) ─────────────────────

function HoleOverview({
  course,
  currentHole,
  onSelectHole,
}: {
  course: import("../types").CourseTemplate;
  currentHole: number;
  onSelectHole: (n: number) => void;
}) {
  return (
    <div className="px-4 py-4">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">All Holes</p>
      <div className="grid grid-cols-3 gap-2">
        {course.holes.map((h) => (
          <button
            key={h.hole_number}
            onClick={() => onSelectHole(h.hole_number)}
            className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition-colors ${
              h.hole_number === currentHole ? "border-green-500 bg-green-50" : "border-gray-100 bg-gray-50"
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-xs font-bold text-gray-700">Hole {h.hole_number}</span>
              <div className="flex gap-0.5">
                <span className={`w-2 h-2 rounded-full ${h.tee_latitude != null ? "bg-green-500" : "bg-gray-200"}`} title="Tee" />
                <span className={`w-2 h-2 rounded-full ${h.green_latitude != null ? "bg-green-600" : "bg-gray-200"}`} title="Green" />
                <span className={`w-2 h-2 rounded-full ${h.bunkers.length > 0 ? "bg-amber-400" : "bg-gray-200"}`} title="Bunkers" />
              </div>
            </div>
            <span className="text-[10px] text-gray-400 mt-0.5">
              Par {h.par}{h.distance_yards ? ` · ${Math.round(h.distance_yards * 0.9144)}m` : ""}
            </span>
          </button>
        ))}
      </div>
      <div className="flex items-center gap-4 mt-4 text-[10px] text-gray-400">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Tee</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-600 inline-block" /> Green</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Bunkers</span>
      </div>
    </div>
  );
}
