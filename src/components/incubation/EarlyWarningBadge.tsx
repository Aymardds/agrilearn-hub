import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface EarlyWarningBadgeProps {
  consecutiveMisses: number; // nombre de mois consécutifs sans atteindre les objectifs
  compact?: boolean;
}

export default function EarlyWarningBadge({ consecutiveMisses, compact }: EarlyWarningBadgeProps) {
  const level = consecutiveMisses === 0 ? "ok" : consecutiveMisses === 1 ? "warning" : "danger";

  if (compact) {
    return (
      <Badge className={cn(
        "gap-1 font-semibold",
        level === "ok" && "bg-emerald-100 text-emerald-700 border-emerald-200",
        level === "warning" && "bg-amber-100 text-amber-700 border-amber-200",
        level === "danger" && "bg-red-100 text-red-700 border-red-200",
      )}>
        {level === "ok" && <><CheckCircle2 className="w-3 h-3" /> Sur la trajectoire</>}
        {level === "warning" && <><AlertTriangle className="w-3 h-3" /> Attention (1 mois)</>}
        {level === "danger" && <><AlertTriangle className="w-3 h-3" /> Alerte dérive ! ({consecutiveMisses} mois)</>}
      </Badge>
    );
  }

  return (
    <Card className={cn(
      "border-2",
      level === "ok" && "border-emerald-200 bg-emerald-50",
      level === "warning" && "border-amber-200 bg-amber-50",
      level === "danger" && "border-red-200 bg-red-50",
    )}>
      <CardContent className="p-4 flex items-start gap-3">
        <div className={cn(
          "p-2 rounded-full",
          level === "ok" && "bg-emerald-100",
          level === "warning" && "bg-amber-100",
          level === "danger" && "bg-red-100",
        )}>
          {level === "ok" ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertTriangle className="w-5 h-5 text-red-600" />}
        </div>
        <div>
          <p className={cn(
            "font-semibold",
            level === "ok" && "text-emerald-800",
            level === "warning" && "text-amber-800",
            level === "danger" && "text-red-800",
          )}>
            {level === "ok" && "✅ Trajectoire nominale"}
            {level === "warning" && "⚠️ Suivi requis — 1 mois sous objectif"}
            {level === "danger" && `🚨 Alerte dérive — ${consecutiveMisses} mois consécutifs sous objectif`}
          </p>
          <p className={cn(
            "text-sm mt-0.5",
            level === "ok" && "text-emerald-700",
            level === "warning" && "text-amber-700",
            level === "danger" && "text-red-700",
          )}>
            {level === "ok" && "Tous les KPI sont dans les objectifs."}
            {level === "warning" && "Le coach a été notifié. Une session de suivi est recommandée."}
            {level === "danger" && "Le coach a reçu une alerte automatique. Un plan de redressement est nécessaire."}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
