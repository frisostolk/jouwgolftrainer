import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Flag, Sparkles } from "lucide-react";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { useCreateRound } from "../hooks/useRounds";
import { coursesApi } from "../api/courses";
import type { HoleSetup } from "../api/rounds";

const TEE_COLORS = ["White", "Yellow", "Red", "Blue", "Black", "Gold"];
const PAR_OPTIONS = [3, 4, 5] as const;

function defaultHoles(total: number): HoleSetup[] {
  return Array.from({ length: total }, (_, i) => ({
    hole_number: i + 1,
    par: 4,
    distance_yards: undefined,
  }));
}

export function NewRoundPage() {
  const navigate = useNavigate();
  const createRound = useCreateRound();

  const [courseName, setCourseName] = useState("");
  const [teeColor, setTeeColor] = useState<string | undefined>();
  const [totalHoles, setTotalHoles] = useState<9 | 18>(18);
  const [holes, setHoles] = useState<HoleSetup[]>(defaultHoles(18));
  const [step, setStep] = useState<"info" | "holes">("info");
  const [templateLoaded, setTemplateLoaded] = useState(false);

  function handleTotalHolesChange(n: 9 | 18) {
    setTotalHoles(n);
    setHoles(defaultHoles(n));
  }

  function setAllPar(par: 3 | 4 | 5) {
    setHoles((prev) => prev.map((h) => ({ ...h, par })));
  }

  function setHolePar(holeNumber: number, par: 3 | 4 | 5) {
    setHoles((prev) =>
      prev.map((h) => (h.hole_number === holeNumber ? { ...h, par } : h))
    );
  }

  function setHoleDist(holeNumber: number, dist: string) {
    const meters = parseInt(dist);
    // Store internally as yards (backend unit) by converting from meters
    const yards = isNaN(meters) ? undefined : Math.round(meters / 0.9144);
    setHoles((prev) =>
      prev.map((h) =>
        h.hole_number === holeNumber ? { ...h, distance_yards: yards } : h
      )
    );
  }

  // Display value for hole distance input (stored as yards, shown as meters)
  function displayDist(yards: number | undefined) {
    if (yards === undefined) return "";
    return String(Math.round(yards * 0.9144));
  }

  async function handleStart() {
    if (!courseName.trim()) return;
    const r = await createRound.mutateAsync({
      course_name: courseName.trim(),
      tee_color: teeColor,
      total_holes: totalHoles,
      holes,
    });
    navigate(`/rounds/${r.id}`, { replace: true });
  }

  const totalPar = holes.reduce((s, h) => s + h.par, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 pt-safe">
        <div className="flex items-center gap-3 h-14">
          <button onClick={() => (step === "holes" ? setStep("info") : navigate(-1))} className="p-1 -ml-1">
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex items-center gap-2">
            <Flag className="w-5 h-5 text-green-700" />
            <h1 className="text-lg font-semibold">
              {step === "info" ? "New Round" : "Hole Setup"}
            </h1>
          </div>
        </div>
      </div>

      {step === "info" ? (
        <div className="px-4 py-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Course Name</label>
            <Input
              value={courseName}
              onChange={(e) => setCourseName(e.target.value)}
              placeholder="e.g. Augusta National"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tee Color (optional)</label>
            <div className="flex flex-wrap gap-2">
              {TEE_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setTeeColor(teeColor === c ? undefined : c)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    teeColor === c
                      ? "bg-green-700 text-white border-green-700"
                      : "bg-white text-gray-700 border-gray-300"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Number of Holes</label>
            <div className="flex gap-2">
              {([9, 18] as const).map((n) => (
                <button
                  key={n}
                  onClick={() => handleTotalHolesChange(n)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                    totalHoles === n
                      ? "bg-green-700 text-white border-green-700"
                      : "bg-white text-gray-700 border-gray-300"
                  }`}
                >
                  {n} Holes
                </button>
              ))}
            </div>
          </div>

          <Button
            className="w-full"
            disabled={!courseName.trim()}
            onClick={async () => {
              try {
                const template = await coursesApi.lookup(courseName.trim());
                // Pre-fill holes from template
                const templateHoles = Object.fromEntries(template.holes.map((h) => [h.hole_number, h]));
                const newTotal = template.total_holes as 9 | 18;
                setTotalHoles(newTotal);
                setHoles(
                  Array.from({ length: newTotal }, (_, i) => {
                    const th = templateHoles[i + 1];
                    return {
                      hole_number: i + 1,
                      par: th?.par ?? 4,
                      distance_yards: th?.distance_yards ?? undefined,
                    };
                  })
                );
                setTemplateLoaded(true);
              } catch {
                // No template found — proceed with defaults
                setTemplateLoaded(false);
              }
              setStep("holes");
            }}
          >
            Set Up Holes
          </Button>
        </div>
      ) : (
        <div className="px-4 py-4">
          {/* Template pre-fill notice */}
          {templateLoaded && (
            <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
              <Sparkles className="w-4 h-4 flex-shrink-0" />
              Par &amp; distances pre-filled from course template
            </div>
          )}

          {/* Quick presets */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">
              Par total: <span className="font-semibold text-gray-800">{totalPar}</span>
            </p>
            <div className="flex gap-1">
              <span className="text-xs text-gray-500 mr-1">All:</span>
              {PAR_OPTIONS.map((p) => (
                <button
                  key={p}
                  onClick={() => setAllPar(p)}
                  className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
                >
                  Par {p}
                </button>
              ))}
            </div>
          </div>

          {/* Hole grid */}
          <div className="space-y-2 mb-6">
            {holes.map((hole) => (
              <div key={hole.hole_number} className="flex items-center gap-3 bg-white rounded-xl px-3 py-2 border border-gray-100">
                <span className="w-8 text-sm font-semibold text-gray-600">#{hole.hole_number}</span>

                {/* Par selector */}
                <div className="flex gap-1">
                  {PAR_OPTIONS.map((p) => (
                    <button
                      key={p}
                      onClick={() => setHolePar(hole.hole_number, p)}
                      className={`w-8 h-7 rounded text-xs font-semibold transition-colors ${
                        hole.par === p
                          ? "bg-green-700 text-white"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>

                {/* Distance input */}
                <div className="flex-1 flex items-center gap-1">
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder="Dist"
                    value={displayDist(hole.distance_yards)}
                    onChange={(e) => setHoleDist(hole.hole_number, e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-500"
                  />
                  <span className="text-xs text-gray-400 flex-shrink-0">m</span>
                </div>
              </div>
            ))}
          </div>

          <Button
            className="w-full"
            onClick={handleStart}
            disabled={createRound.isPending}
          >
            {createRound.isPending ? "Starting…" : "Start Round"}
          </Button>
        </div>
      )}
    </div>
  );
}
