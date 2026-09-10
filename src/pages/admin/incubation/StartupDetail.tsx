import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import RoadmapTimeline, { Milestone } from "@/components/incubation/RoadmapTimeline";
import KpiCharts from "@/components/incubation/KpiCharts";
import EarlyWarningBadge from "@/components/incubation/EarlyWarningBadge";
import JuryScorecard from "@/components/incubation/JuryScorecard";
import IncubationBadge, { LabelData } from "@/components/incubation/IncubationBadge";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Users, TrendingUp, Map, Scale, Award } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const STAGE_OPTIONS = ["diagnostic", "onboarding", "acceleration", "pilotage", "labellisation", "certifie"];

export default function StartupDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [startup, setStartup] = useState<any>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [kpiHistory, setKpiHistory] = useState<any[]>([]);
  const [label, setLabel] = useState<LabelData | null>(null);
  const [consecutiveMisses, setConsecutiveMisses] = useState(0);
  const [userId, setUserId] = useState<string>("");
  const [submittingEval, setSubmittingEval] = useState(false);
  const [existingEval, setExistingEval] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);

      const { data: sp } = await supabase
        .from("startup_profiles" as any)
        .select("*")
        .eq("id", id)
        .single();
      if (sp) setStartup(sp);

      // Roadmap
      const { data: roadmap } = await supabase
        .from("incubation_roadmaps" as any)
        .select("id")
        .eq("startup_id", id)
        .single();
      if (roadmap) {
        const { data: ms } = await supabase
          .from("roadmap_milestones" as any)
          .select("*")
          .eq("roadmap_id", (roadmap as any).id)
          .order("order_index", { ascending: true });
        if (ms) setMilestones(ms as Milestone[]);
      }

      // KPIs
      const { data: kpis } = await supabase
        .from("kpi_reports" as any)
        .select("*")
        .eq("startup_id", id)
        .order("report_month", { ascending: true });
      if (kpis) {
        setKpiHistory(kpis as any[]);
        const last2 = (kpis as any[]).slice(-2);
        setConsecutiveMisses(last2.filter((k: any) => k.early_warning_triggered).length);
      }

      // Label
      const { data: lbl } = await supabase
        .from("incubation_labels" as any)
        .select("*")
        .eq("startup_id", id)
        .single();
      if (lbl) setLabel(lbl as LabelData);

      // Éval jury existante
      if (user) {
        const { data: ev } = await supabase
          .from("jury_evaluations" as any)
          .select("*")
          .eq("startup_id", id)
          .eq("juror_id", user.id)
          .single();
        if (ev) setExistingEval(ev);
      }

      setLoading(false);
    };
    fetchData();
  }, [id]);

  const handleStageChange = async (stage: string) => {
    await supabase.from("startup_profiles" as any).update({ stage }).eq("id", id);
    setStartup((prev: any) => ({ ...prev, stage }));
    toast.success(`Étape mise à jour : ${stage}`);
  };

  const handleUpdateMilestone = async (msId: string, status: Milestone["status"]) => {
    await supabase.from("roadmap_milestones" as any)
      .update({ status, completed_at: status === "completed" ? new Date().toISOString() : null })
      .eq("id", msId);
    setMilestones(prev => prev.map(m => m.id === msId ? { ...m, status } : m));
    toast.success("Jalon mis à jour");
  };

  const handleSubmitEval = async (data: any) => {
    if (!id) return;
    setSubmittingEval(true);
    try {
      await supabase.from("jury_evaluations" as any).upsert({
        startup_id: id,
        juror_id: userId,
        ...data,
      }, { onConflict: "startup_id,juror_id" });

      if (data.recommendation === "certifier" && !label) {
        const labelNumber = `GL-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
        const { data: newLabel } = await supabase.from("incubation_labels" as any).insert({
          startup_id: id,
          label_number: labelNumber,
          issued_by: userId,
          average_jury_score: data.score_pitch + data.score_financials + data.score_market + data.score_team + data.score_innovation,
        }).select("*").single();
        if (newLabel) {
          setLabel(newLabel as LabelData);
          await supabase.from("startup_profiles" as any).update({ stage: "certifie" }).eq("id", id);
          setStartup((prev: any) => ({ ...prev, stage: "certifie" }));
          toast.success("🏆 Label GrainoLab Certifié émis !");
        }
      } else {
        toast.success("Évaluation soumise.");
      }
      setExistingEval(data);
    } catch (e: any) {
      toast.error(e.message || "Erreur");
    } finally {
      setSubmittingEval(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /></div>;
  if (!startup) return <div className="text-center py-20 text-muted-foreground">Start-up introuvable.</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6 py-6 px-4">
      {/* Breadcrumb */}
      <Button variant="ghost" size="sm" onClick={() => navigate("/admin/incubation")} className="gap-2 -ml-2">
        <ArrowLeft className="w-4 h-4" /> Retour à la liste
      </Button>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-emerald-400 to-green-600 rounded-xl flex items-center justify-center text-white text-2xl font-black shadow-lg">
            {startup.name[0]}
          </div>
          <div>
            <h1 className="text-2xl font-black">{startup.name}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant="outline">{startup.sector}</Badge>
              <Badge variant="outline">{startup.team_size} fondateur(s)</Badge>
              {startup.equity_signed && <Badge className="bg-emerald-100 text-emerald-700">✓ Accord signé</Badge>}
            </div>
          </div>
        </div>

        {/* Changer d'étape */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Étape :</span>
          <Select value={startup.stage} onValueChange={handleStageChange}>
            <SelectTrigger className="w-44 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STAGE_OPTIONS.map(s => (
                <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Early Warning */}
      {consecutiveMisses > 0 && <EarlyWarningBadge consecutiveMisses={consecutiveMisses} />}

      {/* Label en tête si certifié */}
      {label && (
        <IncubationBadge
          label={{ ...label, startup_name: startup.name }}
          onDownload={() => toast.info("PDF disponible après génération")}
          compact
        />
      )}

      <Tabs defaultValue="roadmap" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 h-11">
          <TabsTrigger value="roadmap" className="gap-1.5 text-xs sm:text-sm"><Map className="w-4 h-4" />Roadmap</TabsTrigger>
          <TabsTrigger value="kpi" className="gap-1.5 text-xs sm:text-sm"><TrendingUp className="w-4 h-4" />KPI</TabsTrigger>
          <TabsTrigger value="jury" className="gap-1.5 text-xs sm:text-sm"><Award className="w-4 h-4" />Jury</TabsTrigger>
          <TabsTrigger value="infos" className="gap-1.5 text-xs sm:text-sm"><Users className="w-4 h-4" />Infos</TabsTrigger>
        </TabsList>

        <TabsContent value="roadmap">
          <Card>
            <CardHeader><CardTitle className="text-base">Roadmap & Jalons</CardTitle></CardHeader>
            <CardContent>
              {milestones.length > 0 ? (
                <RoadmapTimeline milestones={milestones} onUpdateStatus={handleUpdateMilestone} editable />
              ) : (
                <p className="text-center py-8 text-muted-foreground">Roadmap non encore générée par la start-up.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="kpi">
          {kpiHistory.length > 0 ? (
            <KpiCharts data={kpiHistory} />
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <TrendingUp className="w-10 h-10 mx-auto mb-3 opacity-30" />
                Aucun rapport KPI soumis pour le moment.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="jury">
          <Card>
            <CardHeader><CardTitle className="text-base">Évaluation Jury</CardTitle></CardHeader>
            <CardContent>
              <JuryScorecard
                startupName={startup.name}
                onSubmit={handleSubmitEval}
                isLoading={submittingEval}
                existingEval={existingEval}
                readonly={!!existingEval}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="infos">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { label: "Nom", value: startup.name },
                  { label: "Secteur", value: startup.sector },
                  { label: "Taille équipe", value: `${startup.team_size} personne(s)` },
                  { label: "Étape courante", value: startup.stage },
                  { label: "Accord d'équité", value: startup.equity_signed ? `Signé le ${format(new Date(startup.equity_signed_at || startup.created_at), "dd/MM/yyyy")}` : "Non signé" },
                  { label: "Inscription", value: format(new Date(startup.created_at), "dd MMMM yyyy", { locale: fr }) },
                  { label: "Site web", value: startup.website_url || "—" },
                ].map(item => (
                  <div key={item.label} className="space-y-1">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{item.label}</p>
                    <p className="text-sm font-semibold">{item.value}</p>
                  </div>
                ))}
              </div>
              {startup.description && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Description</p>
                  <p className="text-sm">{startup.description}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
