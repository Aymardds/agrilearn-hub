import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Award, Star, Send } from "lucide-react";
import { cn } from "@/lib/utils";

export interface JuryFormData {
  score_pitch: number;
  score_financials: number;
  score_market: number;
  score_team: number;
  score_innovation: number;
  comments: string;
  recommendation: "certifier" | "prolonger" | "refuser";
}

interface JuryScorecardProps {
  startupName: string;
  onSubmit: (data: JuryFormData) => void;
  isLoading?: boolean;
  existingEval?: Partial<JuryFormData>;
  readonly?: boolean;
}

const CRITERIA = [
  { key: "score_pitch", label: "Qualité du pitch", description: "Clarté, impact, storytelling", icon: "🎤" },
  { key: "score_financials", label: "Solidité financière", description: "KPI, prévisions, business model", icon: "💰" },
  { key: "score_market", label: "Potentiel marché", description: "Taille, timing, positionnement", icon: "📈" },
  { key: "score_team", label: "Équipe fondatrice", description: "Complémentarité, expertise, vision", icon: "👥" },
  { key: "score_innovation", label: "Innovation & différenciation", description: "Originalité, barrières à l'entrée", icon: "💡" },
];

const SCORES = [0, 4, 8, 12, 16, 20];

function StarRating({ value, onChange, max = 20, readonly }: { value: number; onChange?: (v: number) => void; max?: number; readonly?: boolean }) {
  const steps = SCORES;
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {steps.map(score => (
        <button
          key={score}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(score)}
          className={cn(
            "w-10 h-10 rounded-lg text-sm font-bold border-2 transition-all",
            value === score
              ? "border-amber-500 bg-amber-50 text-amber-700 scale-110"
              : "border-border bg-background text-muted-foreground hover:border-amber-300",
            readonly && "cursor-default"
          )}
        >
          {score}
        </button>
      ))}
      <span className="text-sm text-muted-foreground ml-1">/{max}</span>
    </div>
  );
}

export default function JuryScorecard({ startupName, onSubmit, isLoading, existingEval, readonly }: JuryScorecardProps) {
  const [scores, setScores] = useState<Record<string, number>>({
    score_pitch: existingEval?.score_pitch ?? 0,
    score_financials: existingEval?.score_financials ?? 0,
    score_market: existingEval?.score_market ?? 0,
    score_team: existingEval?.score_team ?? 0,
    score_innovation: existingEval?.score_innovation ?? 0,
  });
  const [comments, setComments] = useState(existingEval?.comments ?? "");
  const [recommendation, setRecommendation] = useState<JuryFormData["recommendation"]>(existingEval?.recommendation ?? "certifier");

  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  const maxTotal = 100;
  const pct = Math.round((total / maxTotal) * 100);

  const handleSubmit = () => {
    onSubmit({
      score_pitch: scores.score_pitch,
      score_financials: scores.score_financials,
      score_market: scores.score_market,
      score_team: scores.score_team,
      score_innovation: scores.score_innovation,
      comments,
      recommendation,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />
            Grille d'évaluation jury
          </h3>
          <p className="text-sm text-muted-foreground">{startupName}</p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-black text-foreground">{total}<span className="text-base text-muted-foreground">/100</span></div>
          <Badge className={cn(
            "mt-1",
            pct >= 70 ? "bg-emerald-100 text-emerald-700" : pct >= 50 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
          )}>
            {pct >= 70 ? "🏆 Excellent" : pct >= 50 ? "✅ Satisfaisant" : "⚠️ Insuffisant"}
          </Badge>
        </div>
      </div>

      {/* Critères */}
      <div className="space-y-4">
        {CRITERIA.map(criterion => (
          <Card key={criterion.key}>
            <CardContent className="pt-4 pb-4 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-sm">{criterion.icon} {criterion.label}</p>
                  <p className="text-xs text-muted-foreground">{criterion.description}</p>
                </div>
                <span className="text-xl font-black text-amber-600 shrink-0">{scores[criterion.key]}</span>
              </div>
              <StarRating
                value={scores[criterion.key]}
                onChange={v => !readonly && setScores(prev => ({ ...prev, [criterion.key]: v }))}
                readonly={readonly}
              />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Commentaires */}
      <div className="space-y-2">
        <Label>Commentaires & observations</Label>
        <Textarea
          placeholder="Points forts observés, points d'amélioration, recommandations..."
          value={comments}
          onChange={e => setComments(e.target.value)}
          className="min-h-24 resize-none"
          disabled={readonly}
        />
      </div>

      {/* Recommandation */}
      <div className="space-y-3">
        <Label>Recommandation finale</Label>
        <RadioGroup
          value={recommendation}
          onValueChange={v => !readonly && setRecommendation(v as JuryFormData["recommendation"])}
          className="flex gap-3 flex-wrap"
        >
          {([
            { value: "certifier", label: "🏆 Certifier", color: "border-emerald-500 bg-emerald-50 text-emerald-700" },
            { value: "prolonger", label: "⏳ Prolonger", color: "border-amber-500 bg-amber-50 text-amber-700" },
            { value: "refuser", label: "❌ Refuser", color: "border-red-500 bg-red-50 text-red-700" },
          ] as const).map(opt => (
            <div key={opt.value} className={cn(
              "flex items-center gap-2 border-2 rounded-lg px-4 py-3 cursor-pointer transition-all",
              recommendation === opt.value ? opt.color : "border-border hover:border-muted-foreground/50",
              readonly && "cursor-default"
            )}>
              <RadioGroupItem value={opt.value} id={opt.value} disabled={readonly} />
              <Label htmlFor={opt.value} className={cn("cursor-pointer font-semibold", readonly && "cursor-default")}>
                {opt.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      {!readonly && (
        <Button
          onClick={handleSubmit}
          disabled={isLoading}
          className="w-full gap-2 bg-amber-600 hover:bg-amber-700 h-12"
        >
          <Send className="w-4 h-4" />
          {isLoading ? "Envoi..." : "Soumettre mon évaluation"}
        </Button>
      )}
    </div>
  );
}
