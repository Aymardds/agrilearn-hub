import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Clock, AlertTriangle, Circle, ChevronDown, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

export interface Milestone {
  id: string;
  title: string;
  description?: string;
  due_date?: string;
  status: "pending" | "in_progress" | "completed" | "delayed";
  category?: string;
  completed_at?: string;
}

interface RoadmapTimelineProps {
  milestones: Milestone[];
  onUpdateStatus?: (id: string, status: Milestone["status"]) => void;
  editable?: boolean;
}

const STATUS_CONFIG = {
  pending: { icon: Circle, color: "text-muted-foreground", bg: "bg-muted", label: "En attente" },
  in_progress: { icon: Clock, color: "text-blue-600", bg: "bg-blue-50 border-blue-200", label: "En cours" },
  completed: { icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200", label: "Complété" },
  delayed: { icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50 border-red-200", label: "En retard" },
};

const CATEGORY_COLORS: Record<string, string> = {
  finance: "bg-blue-100 text-blue-700",
  juridique: "bg-purple-100 text-purple-700",
  prototype: "bg-orange-100 text-orange-700",
  marketing: "bg-pink-100 text-pink-700",
  autre: "bg-gray-100 text-gray-700",
};

export default function RoadmapTimeline({ milestones, onUpdateStatus, editable }: RoadmapTimelineProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const completedCount = milestones.filter(m => m.status === "completed").length;

  return (
    <div className="space-y-4">
      {/* Header progress */}
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-foreground">
          {completedCount}/{milestones.length} jalons complétés
        </span>
        <span className="text-muted-foreground">
          {Math.round((completedCount / milestones.length) * 100)}%
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-emerald-500 to-green-400 rounded-full transition-all duration-700"
          style={{ width: `${(completedCount / milestones.length) * 100}%` }}
        />
      </div>

      {/* Timeline */}
      <div className="relative">
        <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />
        <div className="space-y-3">
          {milestones.map((milestone, index) => {
            const config = STATUS_CONFIG[milestone.status];
            const Icon = config.icon;
            const isExpanded = expanded === milestone.id;

            return (
              <div key={milestone.id} className="relative pl-12">
                {/* Dot sur la timeline */}
                <div className={cn(
                  "absolute left-2.5 -translate-x-1/2 w-5 h-5 rounded-full flex items-center justify-center border-2 bg-background",
                  milestone.status === "completed" && "border-emerald-500",
                  milestone.status === "in_progress" && "border-blue-500",
                  milestone.status === "delayed" && "border-red-500",
                  milestone.status === "pending" && "border-border",
                )}>
                  <Icon className={cn("w-3 h-3", config.color)} />
                </div>

                <Card className={cn("border transition-all cursor-pointer hover:shadow-md", config.bg, isExpanded && "shadow-md")}>
                  <CardContent className="p-3">
                    <div
                      className="flex items-center justify-between gap-2"
                      onClick={() => setExpanded(isExpanded ? null : milestone.id)}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="font-semibold text-sm truncate">{milestone.title}</span>
                        {milestone.category && (
                          <Badge className={cn("text-xs shrink-0", CATEGORY_COLORS[milestone.category] || CATEGORY_COLORS.autre)}>
                            {milestone.category}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {milestone.due_date && (
                          <span className="text-xs text-muted-foreground hidden sm:block">
                            {format(new Date(milestone.due_date), "dd MMM yyyy", { locale: fr })}
                          </span>
                        )}
                        <Badge variant="outline" className={cn("text-xs", config.color)}>{config.label}</Badge>
                        {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                      </div>
                    </div>

                    {isExpanded && milestone.description && (
                      <div className="mt-3 pt-3 border-t text-sm text-muted-foreground space-y-3">
                        <p>{milestone.description}</p>
                        {editable && (
                          <div className="flex gap-2 flex-wrap">
                            {(["pending", "in_progress", "completed", "delayed"] as Milestone["status"][]).map(s => (
                              <Button
                                key={s}
                                size="sm"
                                variant={milestone.status === s ? "default" : "outline"}
                                className="text-xs h-7"
                                onClick={() => onUpdateStatus?.(milestone.id, s)}
                              >
                                {STATUS_CONFIG[s].label}
                              </Button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
