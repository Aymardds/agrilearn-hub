import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DiagnosticForm from "@/components/incubation/DiagnosticForm";
import ScoreReport, { DiagnosticScore } from "@/components/incubation/ScoreReport";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowRight, Sparkles, Loader2 } from "lucide-react";

function computeScore(answers: Record<string, string>, sector: string): DiagnosticScore {
  // Algorithme de scoring automatique GrainoLab
  let team = 50, market = 50, feasibility = 50, innovation = 50;

  // Maturité équipe
  const teamMap: Record<string, number> = { "1 (solo)": 30, "2": 55, "3": 75, "4 et plus": 90 };
  if (answers.team_size) team = (teamMap[answers.team_size] || 50);
  if (answers.team_experience === "Oui, exit réussi") team = Math.min(100, team + 20);
  else if (answers.team_experience === "Oui, startup précédente") team = Math.min(100, team + 10);

  // Taille marché
  const marketMap: Record<string, number> = {
    "< 1M€ (niche locale)": 20, "1M€ - 10M€ (régional)": 45,
    "10M€ - 100M€ (national)": 70, "> 100M€ (international)": 90
  };
  if (answers.market_size) market = marketMap[answers.market_size] || 50;

  // Financement
  const fundMap: Record<string, number> = {
    "Aucun (bootstrapped)": -5, "< 20k€ (aides/prix)": 0,
    "20k€ - 100k€ (love money/Bpifrance)": 10, "> 100k€ (seed)": 25
  };
  if (answers.funding) market = Math.min(100, market + (fundMap[answers.funding] || 0));

  // Faisabilité Fablab / stade produit
  const stageMap: Record<string, number> = {
    "Idée / Concept": 25, "MVP en cours de dev": 50,
    "MVP testé avec des utilisateurs": 75, "Produit avec revenus": 95
  };
  if (answers.product_stage) feasibility = stageMap[answers.product_stage] || 50;
  if (answers.prototype_status === "POC fonctionnel") feasibility = Math.min(100, feasibility + 10);
  if (answers.prototype_status === "Prototype industrialisable") feasibility = Math.min(100, feasibility + 20);

  // Innovation (basé sur différenciation)
  if (answers.competition && answers.competition.length > 50) innovation = 75;
  else if (answers.competition && answers.competition.length > 20) innovation = 60;

  // Ajustements secteur
  if (sector === "Biotech / Medtech" || sector === "CleanTech") innovation = Math.min(100, innovation + 10);

  team = Math.round(team);
  market = Math.round(market);
  feasibility = Math.round(feasibility);
  innovation = Math.round(innovation);
  const total = Math.round((team + market + feasibility + innovation) / 4);

  const strengths: string[] = [];
  const improvements: string[] = [];

  if (team >= 70) strengths.push("Équipe complémentaire et expérimentée");
  else improvements.push("Renforcer l'équipe (recrutement ou advisors)");

  if (market >= 70) strengths.push("Marché cible à fort potentiel");
  else improvements.push("Préciser l'adressable total market (TAM/SAM/SOM)");

  if (feasibility >= 70) strengths.push("Bonne maturité du produit / prototype");
  else improvements.push("Accélérer le développement du MVP ou prototype");

  if (innovation >= 70) strengths.push("Différenciation claire et avantage concurrentiel");
  else improvements.push("Formaliser la proposition de valeur unique (USP)");

  const recommendation = total >= 70
    ? "Votre start-up présente un profil très prometteur. L'équipe GrainoLab recommande votre intégration dans le programme d'accélération."
    : total >= 50
    ? "Votre projet a un bon potentiel. Quelques axes à renforcer avant l'accélération complète. Nous vous proposons un accompagnement adapté."
    : "Votre projet est encore au stade exploratoire. Nous vous recommandons notre programme de pré-incubation pour consolider les bases.";

  return { score_team: team, score_market: market, score_feasibility: feasibility, score_innovation: innovation, score_total: total, strengths, improvements, recommendation };
}

export default function DiagnosticPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"profile" | "questionnaire" | "result">("profile");
  const [submitting, setSubmitting] = useState(false);
  const [score, setScore] = useState<DiagnosticScore | null>(null);
  const [startupName, setStartupName] = useState("");
  const [sector, setSectorLocal] = useState("");
  const [teamSize, setTeamSize] = useState("2");

  const handleProfileNext = () => {
    if (!startupName.trim() || !sector) {
      toast.error("Remplissez tous les champs obligatoires.");
      return;
    }
    setStep("questionnaire");
  };

  const handleDiagnosticSubmit = async (data: { sector: string; answers: Record<string, string> }) => {
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      // Créer ou récupérer le profil startup
      const { data: existing } = await supabase
        .from("startup_profiles" as any)
        .select("id")
        .eq("user_id", user.id)
        .single();

      let startupId = (existing as any)?.id;

      if (!startupId) {
        const { data: newStartup, error: spError } = await supabase
          .from("startup_profiles" as any)
          .insert({
            user_id: user.id,
            name: startupName,
            sector: data.sector,
            team_size: parseInt(teamSize),
            stage: "diagnostic",
          })
          .select("id")
          .single();
        if (spError) throw spError;
        startupId = (newStartup as any).id;
      }

      // Sauvegarder le formulaire
      const { data: submission, error: subError } = await supabase
        .from("diagnostic_submissions" as any)
        .insert({
          startup_id: startupId,
          answers: data.answers,
          sector: data.sector,
          status: "pending",
        })
        .select("id")
        .single();
      if (subError) throw subError;

      // Calculer le score
      const computed = computeScore(data.answers, data.sector);

      // Sauvegarder le score
      await supabase.from("diagnostic_scores" as any).insert({
        submission_id: (submission as any).id,
        startup_id: startupId,
        score_team: computed.score_team,
        score_market: computed.score_market,
        score_feasibility: computed.score_feasibility,
        score_innovation: computed.score_innovation,
        strengths: computed.strengths,
        improvements: computed.improvements,
        recommendation: computed.recommendation,
      });

      setScore(computed);
      setStep("result");
      toast.success("Diagnostic soumis avec succès !");
    } catch (e: any) {
      toast.error(e.message || "Erreur lors de la soumission");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50/50 via-background to-background py-10 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 space-y-2">
          <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-1.5 rounded-full text-sm font-semibold">
            <Sparkles className="w-4 h-4" /> Étape 1 — Diagnostic
          </div>
          <h1 className="text-3xl font-black">Diagnostic de maturité</h1>
          <p className="text-muted-foreground">Évaluez votre start-up selon les critères GrainoLab pour un parcours personnalisé.</p>
        </div>

        {/* Étape profil */}
        {step === "profile" && (
          <Card className="border-2 border-emerald-200 shadow-lg shadow-emerald-100">
            <CardHeader>
              <CardTitle className="text-lg">Votre start-up</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Nom de la start-up *</Label>
                <Input placeholder="ex: AgriSense AI" value={startupName} onChange={e => setStartupName(e.target.value)} className="h-11" />
              </div>
              <div className="space-y-1.5">
                <Label>Secteur *</Label>
                <Select value={sector} onValueChange={setSectorLocal}>
                  <SelectTrigger className="h-11"><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                  <SelectContent>
                    {["Hardware / IoT","Logiciel / SaaS","Biotech / Medtech","Agritech","Fintech","CleanTech","EdTech","Commerce / E-commerce","Autre"].map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Taille de l'équipe</Label>
                <Select value={teamSize} onValueChange={setTeamSize}>
                  <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["1","2","3","4","5","6+"].map(n => <SelectItem key={n} value={n}>{n} personne{parseInt(n) > 1 ? "s" : ""}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleProfileNext} className="w-full gap-2 h-11 bg-emerald-600 hover:bg-emerald-700">
                Passer au questionnaire <ArrowRight className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Questionnaire adaptatif */}
        {step === "questionnaire" && (
          <DiagnosticForm onSubmit={handleDiagnosticSubmit} isLoading={submitting} />
        )}

        {/* Résultats */}
        {step === "result" && score && (
          <div className="space-y-6">
            <ScoreReport score={score} startupName={startupName} />
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => navigate("/incubation/dashboard")} className="flex-1">
                Retour au tableau de bord
              </Button>
              <Button onClick={() => navigate("/incubation/onboarding")} className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700">
                Étape suivante : Onboarding <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
