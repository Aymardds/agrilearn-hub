import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ChevronRight, ChevronLeft, Sparkles } from "lucide-react";

const SECTORS = ["Hardware / IoT", "Logiciel / SaaS", "Biotech / Medtech", "Agritech", "Fintech", "CleanTech", "EdTech", "Commerce / E-commerce", "Autre"];

interface Question {
  id: string;
  text: string;
  type: "radio" | "textarea" | "number";
  options?: string[];
  sectors?: string[]; // si undefined → question universelle
}

const QUESTIONS: Question[] = [
  // Questions universelles
  { id: "team_size", text: "Combien de co-fondateurs compose votre équipe ?", type: "radio", options: ["1 (solo)", "2", "3", "4 et plus"] },
  { id: "team_experience", text: "L'équipe a-t-elle une expérience entrepreneuriale précédente ?", type: "radio", options: ["Non, première aventure", "Oui, expérience partielle", "Oui, startup précédente", "Oui, exit réussi"] },
  { id: "product_stage", text: "Quel est le stade actuel de votre produit ?", type: "radio", options: ["Idée / Concept", "MVP en cours de dev", "MVP testé avec des utilisateurs", "Produit avec revenus"] },
  { id: "market_size", text: "Comment estimez-vous la taille de votre marché cible ?", type: "radio", options: ["< 1M€ (niche locale)", "1M€ - 10M€ (régional)", "10M€ - 100M€ (national)", "> 100M€ (international)"] },
  { id: "competition", text: "Quelle est la différenciation principale de votre solution ?", type: "textarea" },
  { id: "funding", text: "Quel financement avez-vous déjà levé ?", type: "radio", options: ["Aucun (bootstrapped)", "< 20k€ (aides/prix)", "20k€ - 100k€ (love money/Bpifrance)", "> 100k€ (seed)"] },
  // Questions spécifiques Hardware/IoT
  { id: "prototype_status", text: "Où en est votre prototype physique ?", type: "radio", options: ["Aucun prototype", "Prototype papier/maquette", "POC fonctionnel", "Prototype industrialisable"], sectors: ["Hardware / IoT", "Biotech / Medtech"] },
  { id: "fablab_needs", text: "Quels équipements du Fablab prévoyez-vous d'utiliser ?", type: "radio", options: ["Impression 3D", "Découpe laser", "CNC/Fraiseuse", "Électronique / Arduino", "Plusieurs équipements"], sectors: ["Hardware / IoT", "Agritech", "CleanTech"] },
  // Questions spécifiques Logiciel
  { id: "tech_stack", text: "Avez-vous déjà un développeur technique dans l'équipe ?", type: "radio", options: ["Non, besoin d'un CTO", "Oui, profil junior", "Oui, profil senior", "Équipe tech complète"], sectors: ["Logiciel / SaaS", "Fintech", "EdTech"] },
  { id: "users_count", text: "Combien d'utilisateurs actifs avez-vous actuellement ?", type: "number", sectors: ["Logiciel / SaaS", "Fintech", "EdTech", "Commerce / E-commerce"] },
];

interface DiagnosticFormProps {
  onSubmit: (data: { sector: string; answers: Record<string, string> }) => void;
  isLoading?: boolean;
}

export default function DiagnosticForm({ onSubmit, isLoading }: DiagnosticFormProps) {
  const [step, setStep] = useState(0); // 0 = choix secteur, 1+ = questions
  const [sector, setSector] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const applicableQuestions = QUESTIONS.filter(q => !q.sectors || q.sectors.includes(sector));
  const totalSteps = applicableQuestions.length + 1;
  const progress = Math.round((step / totalSteps) * 100);

  const currentQuestion = step > 0 ? applicableQuestions[step - 1] : null;
  const canProceed = step === 0 ? !!sector : !!answers[currentQuestion?.id || ""];

  const handleNext = () => {
    if (step < totalSteps - 1) {
      setStep(s => s + 1);
    } else {
      onSubmit({ sector, answers });
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Étape {step + 1} sur {totalSteps}</span>
          <span>{progress}% complété</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <Card className="border-2 border-emerald-500/20 shadow-lg shadow-emerald-500/5">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-500" />
            <Badge variant="outline" className="border-emerald-500/40 text-emerald-700 bg-emerald-50">
              Diagnostic adaptatif
            </Badge>
          </div>
          <CardTitle className="text-xl mt-2">
            {step === 0 ? "Quel est votre secteur d'activité ?" : currentQuestion?.text}
          </CardTitle>
          {step === 0 && (
            <CardDescription>
              Le formulaire s'adapte selon votre domaine pour un diagnostic plus précis.
            </CardDescription>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Étape 0: choix secteur */}
          {step === 0 && (
            <Select value={sector} onValueChange={setSector}>
              <SelectTrigger className="h-12 text-base">
                <SelectValue placeholder="Sélectionnez votre secteur..." />
              </SelectTrigger>
              <SelectContent>
                {SECTORS.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Questions radio */}
          {currentQuestion?.type === "radio" && (
            <RadioGroup
              value={answers[currentQuestion.id] || ""}
              onValueChange={v => setAnswers(prev => ({ ...prev, [currentQuestion.id]: v }))}
              className="space-y-3"
            >
              {currentQuestion.options?.map(option => (
                <div key={option} className={`flex items-center space-x-3 rounded-lg border-2 p-3 cursor-pointer transition-all ${answers[currentQuestion.id] === option ? "border-emerald-500 bg-emerald-50" : "border-border hover:border-emerald-300"}`}>
                  <RadioGroupItem value={option} id={option} />
                  <Label htmlFor={option} className="cursor-pointer flex-1 text-sm font-medium">{option}</Label>
                </div>
              ))}
            </RadioGroup>
          )}

          {/* Questions textarea */}
          {currentQuestion?.type === "textarea" && (
            <Textarea
              placeholder="Décrivez votre avantage concurrentiel..."
              value={answers[currentQuestion.id] || ""}
              onChange={e => setAnswers(prev => ({ ...prev, [currentQuestion.id]: e.target.value }))}
              className="min-h-28 text-base resize-none"
            />
          )}

          {/* Questions number */}
          {currentQuestion?.type === "number" && (
            <Input
              type="number"
              min={0}
              placeholder="ex: 150"
              value={answers[currentQuestion.id] || ""}
              onChange={e => setAnswers(prev => ({ ...prev, [currentQuestion.id]: e.target.value }))}
              className="h-12 text-base"
            />
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setStep(s => Math.max(0, s - 1))}
          disabled={step === 0}
          className="gap-2"
        >
          <ChevronLeft className="w-4 h-4" /> Précédent
        </Button>
        <Button
          onClick={handleNext}
          disabled={!canProceed || isLoading}
          className="gap-2 bg-emerald-600 hover:bg-emerald-700"
        >
          {step === totalSteps - 1 ? (
            isLoading ? "Analyse en cours..." : "Soumettre le diagnostic"
          ) : (
            <>Suivant <ChevronRight className="w-4 h-4" /></>
          )}
        </Button>
      </div>
    </div>
  );
}
