import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Polyline, Circle, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ChevronLeft, Trash2, Plus, CheckCircle2 } from "lucide-react";
import { useCourse, useUpdateCourseHole, useAddBunker, useDeleteBunker, useAddHazard, useDeleteHazard } from "../hooks/useCourses";
import type { CourseHoleTemplate, CourseHoleBunker, HazardType } from "../types";

// ─── Icons ────────────────────────────────────────────────────────────────────

function createTeeIcon() {
  return L.divIcon({
    html: `<div style="width:18px;height:18px;background:white;border:3px solid #15803d;transform:rotate(45deg);box-shadow:0 2px 8px rgba(0,0,0,0.4)"></div>`,
    className: "",
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

function createGreenPointIcon(label: string, active: boolean) {
  const bg = active ? "#15803d" : "#16a34a";
  const size = label === "M" ? 22 : 18;
  return L.divIcon({
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${bg};border:2px solid white;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:900;color:white;box-shadow:0 2px 6px rgba(0,0,0,0.4)">${label}</div>`,
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
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

const HAZARD_COLORS: Record<HazardType, string> = {
  water: "#3b82f6",
  ob: "#ef4444",
  lateral_water: "#f97316",
  other: "#8b5cf6",
};
const HAZARD_LABELS: Record<HazardType, string> = {
  water: "W",
  ob: "OB",
  lateral_water: "LW",
  other: "H",
};

function createHazardIcon(type: HazardType) {
  const bg = HAZARD_COLORS[type] ?? "#8b5cf6";
  const label = HAZARD_LABELS[type] ?? "H";
  return L.divIcon({
    html: `<div style="width:22px;height:22px;border-radius:4px;background:${bg};border:2px solid white;display:flex;align-items:center;justify-content:center;font-size:7px;font-weight:900;color:white;box-shadow:0 2px 6px rgba(0,0,0,0.35)">${label}</div>`,
    className: "",
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

function createSmallDotIcon(color: string) {
  return L.divIcon({
    html: `<div style="width:10px;height:10px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.35)"></div>`,
    className: "",
    iconSize: [10, 10],
    iconAnchor: [5, 5],
  });
}

function computeCircle(points: [number, number][]): { center: [number, number]; radius: number } | null {
  if (points.length < 2) return null;
  const lat = points.reduce((s, p) => s + p[0], 0) / points.length;
  const lng = points.reduce((s, p) => s + p[1], 0) / points.length;
  const center: [number, number] = [lat, lng];
  const radius = Math.max(...points.map((p) => haversineMeters(center[0], center[1], p[0], p[1])));
  return { center, radius };
}

function createTempIcon(label: string) {
  return L.divIcon({
    html: `<div style="width:22px;height:22px;border-radius:50%;background:#f59e0b;border:2px dashed white;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:900;color:white;opacity:0.85">${label}</div>`,
    className: "",
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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

function yardsToMeters(y: number | null): string {
  return y === null ? "" : String(Math.round(y * 0.9144));
}

function metersToYards(m: string): number | null {
  const n = parseInt(m);
  return isNaN(n) ? null : Math.round(n / 0.9144);
}

type EditMode = "tee" | "green" | "bunkers" | "hazards";
type GreenSub = "front" | "middle" | "back";
type BunkerPhase = null | "front" | "back";

// ─── Page ─────────────────────────────────────────────────────────────────────

export function CourseEditorPage() {
  const { id } = useParams<{ id: string }>();
  const courseId = Number(id);
  const navigate = useNavigate();

  const { data: course, isLoading } = useCourse(courseId);
  const updateHole = useUpdateCourseHole(courseId);
  const addBunker = useAddBunker(courseId);
  const deleteBunker = useDeleteBunker(courseId);
  const addHazard = useAddHazard(courseId);
  const deleteHazard = useDeleteHazard(courseId);

  const [currentHole, setCurrentHole] = useState(1);
  const [satellite, setSatellite] = useState(true);
  const [mode, setMode] = useState<EditMode>("tee");
  const [greenSub, setGreenSub] = useState<GreenSub>("front");
  const [savedFlash, setSavedFlash] = useState<string | null>(null);

  const [bunkerPhase, setBunkerPhase] = useState<BunkerPhase>(null);
  const [bunkerFront, setBunkerFront] = useState<[number, number] | null>(null);
  const [selectedHazardType, setSelectedHazardType] = useState<HazardType>("water");
  const [hazardPoints, setHazardPoints] = useState<[number, number][]>([]);

  const [localPar, setLocalPar] = useState(4);
  const [localDist, setLocalDist] = useState("");

  const hole: CourseHoleTemplate | undefined = course?.holes.find((h) => h.hole_number === currentHole);

  useEffect(() => {
    if (!hole) return;
    setLocalPar(hole.par);
    setLocalDist(yardsToMeters(hole.distance_yards));
    setBunkerPhase(null);
    setBunkerFront(null);
    setHazardPoints([]);
  }, [currentHole, course?.id]);

  const teePos: [number, number] | null =
    hole?.tee_latitude != null ? [hole.tee_latitude, hole.tee_longitude!] : null;
  const greenFront: [number, number] | null =
    hole?.green_front_latitude != null ? [hole.green_front_latitude, hole.green_front_longitude!] : null;
  const greenMiddle: [number, number] | null =
    hole?.green_middle_latitude != null ? [hole.green_middle_latitude, hole.green_middle_longitude!] : null;
  const greenBack: [number, number] | null =
    hole?.green_back_latitude != null ? [hole.green_back_latitude, hole.green_back_longitude!] : null;

  // Line from tee → green middle (or front if no middle)
  const greenRef = greenMiddle ?? greenFront;

  const mapCenter: [number, number] = teePos ?? greenFront ?? greenMiddle ?? [52.0, 4.3];

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
      const fieldMap: Record<GreenSub, object> = {
        front:  { green_front_latitude: lat, green_front_longitude: lng },
        middle: { green_middle_latitude: lat, green_middle_longitude: lng },
        back:   { green_back_latitude: lat, green_back_longitude: lng },
      };
      updateHole.mutate(
        { holeNumber: currentHole, data: fieldMap[greenSub] },
        {
          onSuccess: () => {
            flash(`Green ${greenSub} saved`);
            // Auto-advance to next sub after saving
            if (greenSub === "front") setGreenSub("middle");
            else if (greenSub === "middle") setGreenSub("back");
          },
        }
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
    } else if (mode === "hazards") {
      setHazardPoints((prev) => [...prev, [lat, lng]]);
    }
  }

  function handleSaveHazard() {
    const circle = computeCircle(hazardPoints);
    if (!circle) return;
    addHazard.mutate(
      {
        holeNumber: currentHole,
        data: {
          hazard_type: selectedHazardType,
          latitude: circle.center[0],
          longitude: circle.center[1],
          radius_meters: circle.radius,
        },
      },
      {
        onSuccess: () => {
          setHazardPoints([]);
          flash("Hazard saved");
        },
      }
    );
  }

  const tapEnabled =
    mode === "tee" ||
    mode === "green" ||
    mode === "hazards" ||
    (mode === "bunkers" && bunkerPhase !== null);

  const liveCircle = computeCircle(hazardPoints);

  const bannerText =
    mode === "tee" ? `Tap map — tee for Hole ${currentHole}` :
    mode === "green" ? `Tap map — green ${greenSub} for Hole ${currentHole}` :
    mode === "hazards" && hazardPoints.length === 0 ? `Tap boundary of ${selectedHazardType.replace("_", " ")} hazard` :
    mode === "hazards" ? `${hazardPoints.length} points — tap more or save below` :
    bunkerPhase === "front" ? "Tap the front edge of the bunker (closest to tee)" :
    bunkerPhase === "back" ? "Tap the back edge of the bunker (furthest from tee)" :
    "Tap \"Add Bunker\" below, then tap front and back edges on the map";

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
            const hasGreen = h.green_front_latitude != null || h.green_middle_latitude != null;
            return (
              <button
                key={h.hole_number}
                onClick={() => setCurrentHole(h.hole_number)}
                className={`flex flex-col items-center w-9 py-1 rounded-lg text-xs font-semibold transition-colors flex-shrink-0 ${
                  h.hole_number === currentHole ? "bg-green-600 text-white" : "bg-gray-700 text-gray-400"
                }`}
              >
                <span>{h.hole_number}</span>
                <div className="flex gap-0.5 mt-0.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${h.tee_latitude != null ? "bg-green-400" : "bg-gray-600"}`} />
                  <span className={`w-1.5 h-1.5 rounded-full ${hasGreen ? "bg-emerald-300" : "bg-gray-600"}`} />
                  <span className={`w-1.5 h-1.5 rounded-full ${h.bunkers.length > 0 ? "bg-amber-400" : "bg-gray-600"}`} />
                  <span className={`w-1.5 h-1.5 rounded-full ${h.hazards.length > 0 ? "bg-blue-400" : "bg-gray-600"}`} />
                </div>
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
              onClick={() => { setLocalPar(p); updateHole.mutate({ holeNumber: currentHole, data: { par: p } }); }}
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
            onBlur={() => updateHole.mutate({ holeNumber: currentHole, data: { distance_yards: metersToYards(localDist) } })}
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
        {(["tee", "green", "bunkers", "hazards"] as EditMode[]).map((m) => {
          const label = m === "tee" ? "Tee" : m === "green" ? "Green" : m === "bunkers" ? "Bunkers" : "Hazards";
          const badge =
            (m === "bunkers" && (hole?.bunkers.length ?? 0) > 0) ? hole!.bunkers.length :
            (m === "hazards" && (hole?.hazards.length ?? 0) > 0) ? hole!.hazards.length : null;
          return (
            <button
              key={m}
              onClick={() => { setMode(m); setBunkerPhase(null); setBunkerFront(null); setHazardPoints([]); }}
              className={`flex-1 py-2 text-xs font-semibold border-b-2 transition-colors ${
                mode === m ? "text-white border-green-500" : "text-gray-400 border-transparent"
              }`}
            >
              {label}
              {badge != null && (
                <span className="ml-1 bg-amber-500 text-white text-[9px] rounded-full px-1">{badge}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Hazard type selector */}
      {mode === "hazards" && (
        <div className="bg-gray-900 border-t border-gray-700 flex gap-1 px-3 py-2 flex-shrink-0">
          {(["water", "ob", "lateral_water", "other"] as HazardType[]).map((type) => (
            <button
              key={type}
              onClick={() => setSelectedHazardType(type)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                selectedHazardType === type ? "text-white" : "bg-gray-700 text-gray-300"
              }`}
              style={selectedHazardType === type ? { backgroundColor: HAZARD_COLORS[type] } : {}}
            >
              {type === "lateral_water" ? "Lateral" : type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
      )}

      {/* Green sub-mode selector (only in green mode) */}
      {mode === "green" && (
        <div className="bg-gray-900 border-t border-gray-700 flex gap-1 px-3 py-2 flex-shrink-0">
          {(["front", "middle", "back"] as GreenSub[]).map((sub) => {
            const pos = sub === "front" ? greenFront : sub === "middle" ? greenMiddle : greenBack;
            return (
              <button
                key={sub}
                onClick={() => setGreenSub(sub)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors relative ${
                  greenSub === sub
                    ? "bg-green-600 text-white"
                    : "bg-gray-700 text-gray-300"
                }`}
              >
                {sub.charAt(0).toUpperCase() + sub.slice(1)}
                {pos && (
                  <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-green-300" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Map */}
      <div className="relative flex-shrink-0" style={{ height: mode === "green" || mode === "hazards" ? "40vh" : "45vh" }}>
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
          <MapCenterUpdater center={teePos ?? greenFront ?? greenMiddle} />
          <MapTapHandler onTap={handleMapTap} enabled={tapEnabled} />

          {/* Tee → green reference line */}
          {teePos && greenRef && (
            <Polyline
              positions={[teePos, greenRef]}
              pathOptions={{ color: "#ffffff", weight: 2, opacity: 0.35, dashArray: "6 4" }}
            />
          )}

          {/* Green front → middle → back line */}
          {[greenFront, greenMiddle, greenBack].filter(Boolean).length >= 2 && (
            <Polyline
              positions={[greenFront, greenMiddle, greenBack].filter((p): p is [number, number] => p !== null)}
              pathOptions={{ color: "#4ade80", weight: 3, opacity: 0.8 }}
            />
          )}

          {/* Tee */}
          {teePos && <Marker position={teePos} icon={createTeeIcon()} />}

          {/* Green points */}
          {greenFront && <Marker position={greenFront} icon={createGreenPointIcon("F", mode === "green" && greenSub === "front")} />}
          {greenMiddle && <Marker position={greenMiddle} icon={createGreenPointIcon("M", mode === "green" && greenSub === "middle")} />}
          {greenBack && <Marker position={greenBack} icon={createGreenPointIcon("B", mode === "green" && greenSub === "back")} />}

          {/* Bunkers */}
          {hole?.bunkers.map((b, i) => (
            <BunkerMarkers key={b.id} bunker={b} index={i + 1} />
          ))}

          {/* Temp bunker-front while placing back */}
          {bunkerFront && <Marker position={bunkerFront} icon={createTempIcon("F")} />}

          {/* Hazard circles / markers */}
          {hole?.hazards.map((h) => {
            if (h.latitude == null || h.longitude == null) return null;
            const color = HAZARD_COLORS[h.hazard_type as HazardType] ?? "#8b5cf6";
            if (h.radius_meters != null) {
              return (
                <Circle
                  key={h.id}
                  center={[h.latitude, h.longitude]}
                  radius={h.radius_meters}
                  pathOptions={{ color, fillColor: color, fillOpacity: 0.25, weight: 2 }}
                />
              );
            }
            return <Marker key={h.id} position={[h.latitude, h.longitude]} icon={createHazardIcon(h.hazard_type as HazardType)} />;
          })}

          {/* Live circle preview while placing boundary points */}
          {liveCircle && mode === "hazards" && (
            <Circle
              center={liveCircle.center}
              radius={liveCircle.radius}
              pathOptions={{
                color: HAZARD_COLORS[selectedHazardType],
                fillColor: HAZARD_COLORS[selectedHazardType],
                fillOpacity: 0.2,
                weight: 2,
                dashArray: "6 4",
              }}
            />
          )}
          {mode === "hazards" && hazardPoints.map((p, i) => (
            <Marker key={`hp-${i}`} position={p} icon={createSmallDotIcon(HAZARD_COLORS[selectedHazardType])} />
          ))}
        </MapContainer>

        {/* Banner */}
        <div className="absolute bottom-0 inset-x-0 z-[1000] bg-black/60 text-white text-xs text-center py-1.5 px-4 flex items-center justify-between">
          <span>{bannerText}</span>
          {(bunkerPhase || hazardPoints.length > 0) && (
            <button
              onClick={() => { setBunkerPhase(null); setBunkerFront(null); setHazardPoints([]); }}
              className="text-xs text-gray-300 underline ml-3 flex-shrink-0"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Bottom panel */}
      <div className="flex-1 overflow-y-auto bg-white">
        {mode === "bunkers" ? (
          <BunkersPanel
            hole={hole}
            onAdd={() => setBunkerPhase("front")}
            isAdding={bunkerPhase !== null}
            onDelete={(bunkerId) => deleteBunker.mutate({ holeNumber: currentHole, bunkerId })}
          />
        ) : mode === "hazards" ? (
          <HazardsPanel
            hole={hole}
            hazardPoints={hazardPoints}
            liveCircle={liveCircle}
            onSave={handleSaveHazard}
            onClear={() => setHazardPoints([])}
            onDelete={(hazardId) => deleteHazard.mutate({ holeNumber: currentHole, hazardId })}
          />
        ) : (
          <HoleOverview course={course} currentHole={currentHole} onSelectHole={setCurrentHole} />
        )}
      </div>
    </div>
  );
}

// ─── Bunker markers ───────────────────────────────────────────────────────────

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
        <Polyline positions={[frontPos, backPos]} pathOptions={{ color: "#d97706", weight: 2, opacity: 0.8, dashArray: "4 3" }} />
      )}
    </>
  );
}

// ─── Bunkers panel ────────────────────────────────────────────────────────────

function BunkersPanel({
  hole,
  onAdd,
  isAdding,
  onDelete,
}: {
  hole: CourseHoleTemplate | undefined;
  onAdd: () => void;
  isAdding: boolean;
  onDelete: (id: number) => void;
}) {
  const bunkers = hole?.bunkers ?? [];
  return (
    <div className="px-4 py-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-gray-700">
          Bunkers — Hole {hole?.hole_number}
          <span className="ml-2 text-xs font-normal text-gray-400">{bunkers.length} saved</span>
        </p>
        {isAdding ? (
          <span className="text-xs text-amber-600 font-semibold animate-pulse">Tap on map…</span>
        ) : (
          <button
            onClick={onAdd}
            className="flex items-center gap-1 px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-semibold"
          >
            <Plus className="w-3.5 h-3.5" /> Add Bunker
          </button>
        )}
      </div>
      {bunkers.length === 0 ? (
        <p className="text-center py-8 text-sm text-gray-400">
          No bunkers yet. Tap "Add Bunker" then tap front and back edges on the map.
        </p>
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
                    {b.front_latitude != null ? "Front set" : "No front"} · {b.back_latitude != null ? "Back set" : "No back"}
                  </p>
                </div>
              </div>
              <button onClick={() => onDelete(b.id)} className="p-1.5 text-gray-300 hover:text-red-400">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Hazards panel ────────────────────────────────────────────────────────────

const HAZARD_TYPE_LABELS: Record<HazardType, string> = {
  water: "Water Hazard",
  ob: "Out of Bounds",
  lateral_water: "Lateral Water",
  other: "Other Hazard",
};

function HazardsPanel({
  hole,
  hazardPoints,
  liveCircle,
  onSave,
  onClear,
  onDelete,
}: {
  hole: CourseHoleTemplate | undefined;
  hazardPoints: [number, number][];
  liveCircle: { center: [number, number]; radius: number } | null;
  onSave: () => void;
  onClear: () => void;
  onDelete: (id: number) => void;
}) {
  const hazards = hole?.hazards ?? [];
  return (
    <div className="px-4 py-4">

      {/* Live drawing state */}
      {hazardPoints.length > 0 && (
        <div className="mb-4 p-3 bg-blue-50 rounded-xl border border-blue-100">
          <p className="text-sm font-semibold text-blue-800 mb-1">
            Drawing — {hazardPoints.length} point{hazardPoints.length !== 1 ? "s" : ""} placed
          </p>
          {liveCircle && (
            <p className="text-xs text-blue-600 mb-3">
              Circle: r ≈ {Math.round(liveCircle.radius)}m
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={onSave}
              disabled={hazardPoints.length < 2}
              className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold disabled:opacity-40"
            >
              Save Circle
            </button>
            <button
              onClick={onClear}
              className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-gray-700">
          Hazards — Hole {hole?.hole_number}
          <span className="ml-2 text-xs font-normal text-gray-400">{hazards.length} saved</span>
        </p>
        {hazardPoints.length === 0 && <span className="text-xs text-gray-400">Tap boundary on map</span>}
      </div>
      {hazards.length === 0 ? (
        <p className="text-center py-8 text-sm text-gray-400">
          No hazards yet. Select a type above, then tap on the map to place it.
        </p>
      ) : (
        <div className="space-y-2">
          {hazards.map((h) => (
            <div key={h.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-100">
              <div className="flex items-center gap-3">
                <div
                  className="w-7 h-7 rounded flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                  style={{ backgroundColor: HAZARD_COLORS[h.hazard_type as HazardType] ?? "#8b5cf6" }}
                >
                  {HAZARD_LABELS[h.hazard_type as HazardType] ?? "H"}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    {h.label ?? HAZARD_TYPE_LABELS[h.hazard_type as HazardType] ?? "Hazard"}
                  </p>
                  <p className="text-xs text-gray-400">
                    {h.radius_meters != null
                      ? `r = ${Math.round(h.radius_meters)}m`
                      : h.latitude != null ? "Point hazard" : "No position"}
                  </p>
                </div>
              </div>
              <button onClick={() => onDelete(h.id)} className="p-1.5 text-gray-300 hover:text-red-400">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Hole overview grid ───────────────────────────────────────────────────────

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
        {course.holes.map((h) => {
          const greenPoints = [h.green_front_latitude, h.green_middle_latitude, h.green_back_latitude].filter(Boolean).length;
          return (
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
                  <span className={`w-2 h-2 rounded-full ${h.tee_latitude != null ? "bg-green-500" : "bg-gray-200"}`} />
                  <span className={`w-2 h-2 rounded-full ${greenPoints > 0 ? "bg-emerald-400" : "bg-gray-200"}`} />
                  <span className={`w-2 h-2 rounded-full ${h.bunkers.length > 0 ? "bg-amber-400" : "bg-gray-200"}`} />
                  <span className={`w-2 h-2 rounded-full ${h.hazards.length > 0 ? "bg-blue-400" : "bg-gray-200"}`} />
                </div>
              </div>
              <span className="text-[10px] text-gray-400 mt-0.5">
                Par {h.par}{h.distance_yards ? ` · ${Math.round(h.distance_yards * 0.9144)}m` : ""}
              </span>
              {greenPoints > 0 && (
                <span className="text-[9px] text-emerald-500 mt-0.5">{greenPoints}/3 green pts</span>
              )}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-3 mt-4 text-[10px] text-gray-400 flex-wrap">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Tee</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> Green</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Bunkers</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" /> Hazards</span>
      </div>
    </div>
  );
}
