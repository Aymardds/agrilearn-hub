import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import JuryScorecard from "@/components/incubation/JuryScorecard";
import IncubationBadge, { LabelData } from "@/components/incubation/IncubationBadge";
import { toast } from "sonner";
import { Award, FileText, Users, Shield, Loader2, Sparkles, TrendingUp, BookOpen, BarChart2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import jsPDF from "jspdf";

interface PitchDeckData {
  startup_name: string;
  sector: string;
  team_size: number;
  kpi_summary: { revenue: number; active_users: number; retention_rate: number; prototype_progress: number };
  training_progress: number;
  milestones_completed: number;
  milestones_total: number;
  coaching_sessions: number;
}

export default function LabellisationPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [startupId, setStartupId] = useState<string | null>(null);
  const [pitchData, setPitchData] = useState<PitchDeckData | null>(null);
  const [label, setLabel] = useState<LabelData | null>(null);
  const [userRole, setUserRole] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [submittingEval, setSubmittingEval] = useState(false);
  const [existingEval, setExistingEval] = useState<any>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data: roleData } = await supabase.from("user_roles" as any).select("role").eq("user_id", user.id).single();
      if (roleData) setUserRole((roleData as any).role);

      const { data: sp } = await supabase.from("startup_profiles" as any).select("*").eq("user_id", user.id).single();
      if (!sp) { setLoading(false); return; }
      setStartupId((sp as any).id);

      // KPI summary (dernier rapport)
      const { data: lastKpi } = await supabase
        .from("kpi_reports" as any).select("*").eq("startup_id", (sp as any).id)
        .order("report_month", { ascending: false }).limit(1).single();

      // Milestones
      const { data: roadmap } = await supabase.from("incubation_roadmaps" as any).select("id").eq("startup_id", (sp as any).id).single();
      let msCompleted = 0, msTotal = 0;
      if (roadmap) {
        const { data: ms } = await supabase.from("roadmap_milestones" as any).select("status").eq("roadmap_id", (roadmap as any).id);
        if (ms) { msTotal = ms.length; msCompleted = (ms as any[]).filter(m => m.status === "completed").length; }
      }

      // Coaching sessions
      const { count: sessionsCount } = await supabase
        .from("coaching_bookings" as any).select("*", { count: "exact", head: true })
        .eq("startup_id", (sp as any).id).eq("status", "completed");

      setPitchData({
        startup_name: (sp as any).name,
        sector: (sp as any).sector,
        team_size: (sp as any).team_size,
        kpi_summary: lastKpi ? {
          revenue: (lastKpi as any).revenue || 0,
          active_users: (lastKpi as any).active_users || 0,
          retention_rate: (lastKpi as any).retention_rate || 0,
          prototype_progress: (lastKpi as any).prototype_progress || 0,
        } : { revenue: 0, active_users: 0, retention_rate: 0, prototype_progress: 0 },
        training_progress: 45,
        milestones_completed: msCompleted,
        milestones_total: msTotal,
        coaching_sessions: sessionsCount || 0,
      });

      // Label existant
      const { data: existLabel } = await supabase
        .from("incubation_labels" as any).select("*").eq("startup_id", (sp as any).id).single();
      if (existLabel) setLabel(existLabel as LabelData);

      // Évaluation jury existante
      if ((roleData as any)?.role === "formateur" || (roleData as any)?.role === "superadmin") {
        const { data: ev } = await supabase
          .from("jury_evaluations" as any).select("*")
          .eq("startup_id", (sp as any).id).eq("juror_id", user.id).single();
        if (ev) setExistingEval(ev);
      }

      setLoading(false);
    };
    fetchData();
  }, []);

  const handleSubmitEval = async (data: any) => {
    if (!startupId) return;
    setSubmittingEval(true);
    try {
      await supabase.from("jury_evaluations" as any).upsert({
        startup_id: startupId,
        juror_id: userId,
        ...data,
      }, { onConflict: "startup_id,juror_id" });

      if (data.recommendation === "certifier") {
        // Émettre le label
        const labelNumber = `GL-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
        const { data: newLabel } = await supabase.from("incubation_labels" as any).insert({
          startup_id: startupId,
          label_number: labelNumber,
          issued_by: userId,
          average_jury_score: data.score_pitch + data.score_financials + data.score_market + data.score_team + data.score_innovation,
        }).select("*").single();

        if (newLabel) {
          setLabel(newLabel as LabelData);
          await supabase.from("startup_profiles" as any).update({ stage: "certifie" }).eq("id", startupId);
          toast.success("🏆 Label GrainoLab Certifié émis avec succès !");
        }
      } else {
        toast.success("Évaluation soumise avec succès !");
      }
      setExistingEval(data);
    } catch (e: any) {
      toast.error(e.message || "Erreur lors de la soumission");
    } finally {
      setSubmittingEval(false);
    }
  };

  const generatePitchDeckPdf = async () => {
    if (!pitchData) return;
    setGeneratingPdf(true);
    try {
      const doc = new jsPDF();
      doc.setFontSize(24); doc.setFont("helvetica", "bold");
      doc.text("DOSSIER D'AUDIT — GRAINO LAB", 20, 30);
      doc.setFontSize(18); doc.setFont("helvetica", "normal");
      doc.text(pitchData.startup_name, 20, 45);
      doc.setFontSize(12);
      doc.text(`Secteur : ${pitchData.sector}`, 20, 60);
      doc.text(`Équipe : ${pitchData.team_size} fondateur(s)`, 20, 70);
      doc.text(`Généré le : ${format(new Date(), "dd MMMM yyyy", { locale: fr })}`, 20, 80);

      doc.setFontSize(16); doc.setFont("helvetica", "bold");
      doc.text("INDICATEURS CLÉS DE PERFORMANCE", 20, 100);
      doc.setFontSize(12); doc.setFont("helvetica", "normal");
      doc.text(`Chiffre d'affaires : ${pitchData.kpi_summary.revenue.toLocaleString("fr-FR")} €`, 20, 115);
      doc.text(`Utilisateurs actifs : ${pitchData.kpi_summary.active_users}`, 20, 125);
      doc.text(`Taux de rétention : ${pitchData.kpi_summary.retention_rate}%`, 20, 135);
      doc.text(`Avancement prototype : ${pitchData.kpi_summary.prototype_progress}%`, 20, 145);

      doc.setFontSize(16); doc.setFont("helvetica", "bold");
      doc.text("PROGRESSION PARCOURS", 20, 165);
      doc.setFontSize(12); doc.setFont("helvetica", "normal");
      doc.text(`Jalons complétés : ${pitchData.milestones_completed}/${pitchData.milestones_total}`, 20, 180);
      doc.text(`Sessions de coaching : ${pitchData.coaching_sessions}`, 20, 190);
      doc.text(`Progression formations : ${pitchData.training_progress}%`, 20, 200);

      doc.save(`pitch-deck-${pitchData.startup_name.replace(/\s/g, "_")}.pdf`);
      toast.success("Pitch Deck PDF généré !");
    } catch (e) {
      toast.error("Erreur lors de la génération PDF");
    } finally {
      setGeneratingPdf(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /></div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50/30 via-background to-background py-10 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-700 px-4 py-1.5 rounded-full text-sm font-semibold">
            <Sparkles className="w-4 h-4" /> Étape 5 — Comité de Labellisation
          </div>
          <h1 className="text-3xl font-black">Labellisation GrainoLab</h1>
          <p className="text-muted-foreground">Validation finale, audit et certification de votre parcours d'incubation.</p>
        </div>

        {/* Badge si certifié */}
        {label && (
          <div className="py-4">
            <IncubationBadge
              label={{ ...label, startup_name: pitchData?.startup_name || "Start-up" }}
              onDownload={() => toast.info("Téléchargement du PDF certifié...")}
            />
          </div>
        )}

        <Tabs defaultValue="pitchdeck" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 h-11">
            <TabsTrigger value="pitchdeck" className="gap-2 text-xs sm:text-sm"><FileText className="w-4 h-4" />Pitch Deck</TabsTrigger>
            <TabsTrigger value="jury" className="gap-2 text-xs sm:text-sm"><Users className="w-4 h-4" />Jury</TabsTrigger>
            <TabsTrigger value="label" className="gap-2 text-xs sm:text-sm"><Shield className="w-4 h-4" />Label</TabsTrigger>
          </TabsList>

          {/* Pitch Deck */}
          <TabsContent value="pitchdeck">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-600" /> Dossier d'audit automatique
                </CardTitle>
                <CardDescription>Compilation de toutes vos données du parcours en un dossier standardisé.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {pitchData && (
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Card className="bg-emerald-50/50 border-emerald-200">
                      <CardContent className="p-4 space-y-2">
                        <p className="font-bold flex items-center gap-2"><TrendingUp className="w-4 h-4 text-emerald-600" /> KPI Financiers</p>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between"><span className="text-muted-foreground">Chiffre d'affaires</span><span className="font-bold">{pitchData.kpi_summary.revenue.toLocaleString("fr-FR")} €</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">Utilisateurs actifs</span><span className="font-bold">{pitchData.kpi_summary.active_users}</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">Taux de rétention</span><span className="font-bold">{pitchData.kpi_summary.retention_rate}%</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">Prototype</span><span className="font-bold">{pitchData.kpi_summary.prototype_progress}%</span></div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-blue-50/50 border-blue-200">
                      <CardContent className="p-4 space-y-2">
                        <p className="font-bold flex items-center gap-2"><BookOpen className="w-4 h-4 text-blue-600" /> Progression Parcours</p>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between"><span className="text-muted-foreground">Jalons complétés</span><span className="font-bold">{pitchData.milestones_completed}/{pitchData.milestones_total}</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">Sessions coaching</span><span className="font-bold">{pitchData.coaching_sessions}</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">Formations</span><span className="font-bold">{pitchData.training_progress}%</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">Secteur</span><span className="font-bold">{pitchData.sector}</span></div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                <Button
                  onClick={generatePitchDeckPdf}
                  disabled={generatingPdf}
                  className="w-full gap-2 bg-amber-600 hover:bg-amber-700 h-12"
                >
                  {generatingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                  {generatingPdf ? "Génération en cours..." : "Générer le Pitch Deck PDF"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Jury */}
          <TabsContent value="jury">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" /> Salle de jury virtuelle
                </CardTitle>
                <CardDescription>Interface sécurisée pour l'évaluation par le comité d'experts.</CardDescription>
              </CardHeader>
              <CardContent>
                {(userRole === "formateur" || userRole === "superadmin") ? (
                  <JuryScorecard
                    startupName={pitchData?.startup_name || "Start-up"}
                    onSubmit={handleSubmitEval}
                    isLoading={submittingEval}
                    existingEval={existingEval}
                    readonly={!!existingEval}
                  />
                ) : (
                  <div className="text-center py-8 space-y-3">
                    <Users className="w-10 h-10 mx-auto text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">L'évaluation du jury est réservée aux formateurs et administrateurs.</p>
                    <Badge variant="outline">En attente d'évaluation</Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Label */}
          <TabsContent value="label">
            {label ? (
              <IncubationBadge
                label={{ ...label, startup_name: pitchData?.startup_name || "Start-up" }}
                onDownload={() => toast.info("Téléchargement PDF disponible après génération admin")}
              />
            ) : (
              <Card>
                <CardContent className="py-12 text-center space-y-4">
                  <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
                    <Award className="w-8 h-8 text-amber-500" />
                  </div>
                  <h3 className="text-lg font-bold">Label en attente</h3>
                  <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                    Le label "GrainoLab Certifié" sera émis après validation du comité de jury.
                  </p>
                  <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50">
                    ⏳ En attente du jury
                  </Badge>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
