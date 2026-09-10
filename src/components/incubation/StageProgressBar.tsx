import { CheckCircle2, Circle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export type IncubationStage = "diagnostic" | "onboarding" | "acceleration" | "pilotage" | "labellisation" | "certifie";

const STAGES: { id: IncubationStage; label: string; emoji: string }[] = [
  { id: "diagnostic", label: "Diagnostic", emoji: "🔍" },
  { id: "onboarding", label: "Onboarding", emoji: "🤝" },
  { id: "acceleration", label: "Accélération", emoji: "🚀" },
  { id: "pilotage", label: "Pilotage KPI", emoji: "📊" },
  { id: "labellisation", label: "Labellisation", emoji: "🏆" },
];

const STAGE_ORDER: IncubationStage[] = ["diagnostic", "onboarding", "acceleration", "pilotage", "labellisation", "certifie"];

interface StageProgressBarProps {
  currentStage: IncubationStage;
  onStageClick?: (stage: IncubationStage) => void;
  className?: string;
}

export default function StageProgressBar({ currentStage, onStageClick, className }: StageProgressBarProps) {
  const currentIndex = STAGE_ORDER.indexOf(currentStage);

  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center justify-between relative">
        {/* Ligne de progression en arrière-plan */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-border z-0" />
        <div
          className="absolute top-5 left-0 h-0.5 bg-gradient-to-r from-emerald-500 to-green-400 z-0 transition-all duration-700"
          style={{ width: `${Math.min((currentIndex / (STAGES.length - 1)) * 100, 100)}%` }}
        />

        {STAGES.map((stage, index) => {
          const stageIndex = STAGE_ORDER.indexOf(stage.id);
          const isDone = stageIndex < currentIndex || currentStage === "certifie";
          const isActive = stageIndex === currentIndex && currentStage !== "certifie";
          const isPending = stageIndex > currentIndex;

          return (
            <div
              key={stage.id}
              className="flex flex-col items-center gap-2 z-10 cursor-pointer group"
              onClick={() => onStageClick?.(stage.id)}
            >
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-300",
                  isDone && "bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/30",
                  isActive && "bg-white border-emerald-500 text-emerald-600 shadow-lg shadow-emerald-500/40 scale-110 ring-4 ring-emerald-500/20",
                  isPending && "bg-background border-border text-muted-foreground"
                )}
              >
                {isDone ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : isActive ? (
                  <Clock className="w-5 h-5" />
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>
              <div className="text-center hidden sm:block">
                <p className={cn(
                  "text-xs font-semibold transition-colors",
                  isDone && "text-emerald-600",
                  isActive && "text-emerald-700",
                  isPending && "text-muted-foreground"
                )}>
                  {stage.emoji} {stage.label}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile: étape active */}
      <div className="mt-4 sm:hidden text-center">
        <span className="text-sm font-semibold text-emerald-700">
          Étape {currentIndex + 1}/{STAGES.length} : {STAGES.find(s => s.id === currentStage)?.label}
        </span>
      </div>
    </div>
  );
}
