import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Target, Award } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DiagnosticScore {
  score_team: number;
  score_market: number;
  score_feasibility: number;
  score_innovation: number;
  score_total: number;
  strengths: string[];
  improvements: string[];
  recommendation: string;
}

interface ScoreReportProps {
  score: DiagnosticScore;
  startupName: string;
}

const CRITERIA = [
  { key: "score_team", label: "Maturité de l'équipe", color: "from-blue-500 to-blue-400", icon: "👥" },
  { key: "score_market", label: "Taille du marché", color: "from-purple-500 to-purple-400", icon: "📈" },
  { key: "score_feasibility", label: "Faisabilité Fablab", color: "from-orange-500 to-orange-400", icon: "⚙️" },
  { key: "score_innovation", label: "Innovation", color: "from-pink-500 to-pink-400", icon: "💡" },
];

function getScoreLevel(score: number) {
  if (score >= 75) return { label: "Excellent", color: "text-emerald-700 bg-emerald-50 border-emerald-200" };
  if (score >= 55) return { label: "Bon", color: "text-blue-700 bg-blue-50 border-blue-200" };
  if (score >= 35) return { label: "Moyen", color: "text-amber-700 bg-amber-50 border-amber-200" };
  return { label: "À renforcer", color: "text-red-700 bg-red-50 border-red-200" };
}

export default function ScoreReport({ score, startupName }: ScoreReportProps) {
  const level = getScoreLevel(score.score_total);

  return (
    <div className="space-y-6">
      {/* Score global */}
      <Card className="border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-50 to-white overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Award className="w-5 h-5 text-emerald-600" />
              Bilan Flash — {startupName}
            </CardTitle>
            <Badge className={cn("border font-semibold text-sm px-3 py-1", level.color)}>
              {level.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="relative w-24 h-24 flex-shrink-0">
              <svg className="w-24 h-24 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="2.5" />
                <circle
                  cx="18" cy="18" r="15.9" fill="none"
                  stroke={score.score_total >= 75 ? "#10b981" : score.score_total >= 55 ? "#3b82f6" : score.score_total >= 35 ? "#f59e0b" : "#ef4444"}
                  strokeWidth="2.5"
                  strokeDasharray={`${score.score_total} ${100 - score.score_total}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center flex-col">
                <span className="text-2xl font-black text-foreground">{score.score_total}</span>
                <span className="text-xs text-muted-foreground">/100</span>
              </div>
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground leading-relaxed">{score.recommendation}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Critères détaillés */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Target className="w-4 h-4" /> Scores par critère</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {CRITERIA.map(criterion => {
            const val = score[criterion.key as keyof DiagnosticScore] as number;
            return (
              <div key={criterion.key} className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{criterion.icon} {criterion.label}</span>
                  <span className="font-bold text-foreground">{val}/100</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-700", criterion.color)}
                    style={{ width: `${val}%` }}
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Points forts & axes d'amélioration */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-emerald-700">
              <TrendingUp className="w-4 h-4" /> Points forts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {score.strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-emerald-600 mt-0.5 flex-shrink-0">✓</span>
                  <span className="text-emerald-800">{s}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-amber-700">
              <TrendingDown className="w-4 h-4" /> Axes d'amélioration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {score.improvements.map((imp, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-amber-600 mt-0.5 flex-shrink-0">→</span>
                  <span className="text-amber-800">{imp}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
