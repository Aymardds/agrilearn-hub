import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import KpiInputForm, { KpiFormData } from "@/components/incubation/KpiInputForm";
import KpiCharts from "@/components/incubation/KpiCharts";
import EarlyWarningBadge from "@/components/incubation/EarlyWarningBadge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { TrendingUp, BarChart2, ArrowRight, Loader2, Sparkles } from "lucide-react";
import { startOfMonth, format } from "date-fns";
import { fr } from "date-fns/locale";

export default function KpiPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [startupId, setStartupId] = useState<string | null>(null);
  const [kpiHistory, setKpiHistory] = useState<any[]>([]);
  const [currentMonthSubmitted, setCurrentMonthSubmitted] = useState(false);
  const [consecutiveMisses, setConsecutiveMisses] = useState(0);

  const currentMonth = startOfMonth(new Date());

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: sp } = await supabase.from("startup_profiles" as any).select("id").eq("user_id", user.id).single();
      if (!sp) { setLoading(false); return; }
      setStartupId((sp as any).id);

      const { data: kpis } = await supabase
        .from("kpi_reports" as any)
        .select("*")
        .eq("startup_id", (sp as any).id)
        .order("report_month", { ascending: true });

      if (kpis) {
        setKpiHistory(kpis as any[]);
        const currentMonthStr = format(currentMonth, "yyyy-MM-01");
        setCurrentMonthSubmitted(kpis.some((k: any) => k.report_month === currentMonthStr));

        // Calcul early warning
        const last2 = (kpis as any[]).slice(-2);
        const misses = last2.filter(k => k.early_warning_triggered).length;
        setConsecutiveMisses(misses);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleSubmitKpi = async (data: KpiFormData) => {
    if (!startupId) return;
    setSubmitting(true);
    try {
      // Détecter early warning: si revenue < revenue_target (si objectif défini)
      const earlyWarning = !!(
        data.revenue_target && data.revenue < data.revenue_target * 0.8 ||
        data.active_users_target && data.active_users < data.active_users_target * 0.8
      );

      await supabase.from("kpi_reports" as any).upsert({
        startup_id: startupId,
        report_month: data.report_month,
        revenue: data.revenue,
        revenue_target: data.revenue_target,
        active_users: data.active_users,
        active_users_target: data.active_users_target,
        retention_rate: data.retention_rate,
        retention_rate_target: data.retention_rate_target,
        prototype_progress: data.prototype_progress,
        notes: data.notes,
        early_warning_triggered: earlyWarning,
        submitted_at: new Date().toISOString(),
      }, { onConflict: "startup_id,report_month" });

      // Avancer le stage si en accélération
      await supabase.from("startup_profiles" as any).update({ stage: "pilotage" }).eq("id", startupId);

      toast.success("Rapport KPI soumis avec succès !");
      if (earlyWarning) toast.warning("⚠️ Alerte : certains KPI sont sous l'objectif. Votre coach a été notifié.");

      // Refresh
      const { data: kpis } = await supabase
        .from("kpi_reports" as any)
        .select("*")
        .eq("startup_id", startupId)
        .order("report_month", { ascending: true });
      if (kpis) {
        setKpiHistory(kpis as any[]);
        setCurrentMonthSubmitted(true);
        const last2 = (kpis as any[]).slice(-2);
        setConsecutiveMisses(last2.filter((k: any) => k.early_warning_triggered).length);
      }
    } catch (e: any) {
      toast.error(e.message || "Erreur lors de la soumission");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /></div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/30 via-background to-background py-10 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-1.5 rounded-full text-sm font-semibold">
            <Sparkles className="w-4 h-4" /> Étape 4 — Pilotage & KPI
          </div>
          <h1 className="text-3xl font-black">Suivi de croissance</h1>
          <p className="text-muted-foreground">Mesurez l'évolution de vos performances de manière transparente.</p>
        </div>

        {/* Early warning */}
        {consecutiveMisses > 0 && <EarlyWarningBadge consecutiveMisses={consecutiveMisses} />}

        {/* Statut du mois en cours */}
        {currentMonthSubmitted ? (
          <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
            <div className="flex items-center gap-2 text-emerald-700">
              <TrendingUp className="w-5 h-5" />
              <span className="font-semibold">Rapport de {format(currentMonth, "MMMM yyyy", { locale: fr })} soumis ✓</span>
            </div>
            <Badge className="bg-emerald-100 text-emerald-700">À jour</Badge>
          </div>
        ) : (
          <div className="flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <div className="flex items-center gap-2 text-amber-700">
              <TrendingUp className="w-5 h-5" />
              <span className="font-semibold">Rapport de {format(currentMonth, "MMMM yyyy", { locale: fr })} non soumis</span>
            </div>
            <Badge className="bg-amber-100 text-amber-700">En attente</Badge>
          </div>
        )}

        <Tabs defaultValue={currentMonthSubmitted ? "historique" : "saisie"} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 h-11">
            <TabsTrigger value="saisie" className="gap-2"><TrendingUp className="w-4 h-4" /> Saisie mensuelle</TabsTrigger>
            <TabsTrigger value="historique" className="gap-2"><BarChart2 className="w-4 h-4" /> Historique & Graphiques</TabsTrigger>
          </TabsList>

          <TabsContent value="saisie">
            <Card>
              <CardContent className="pt-6">
                <KpiInputForm
                  onSubmit={handleSubmitKpi}
                  isLoading={submitting}
                  defaultMonth={currentMonth}
                  previousKpi={kpiHistory.length ? kpiHistory[kpiHistory.length - 1] : undefined}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="historique">
            <KpiCharts data={kpiHistory} />
          </TabsContent>
        </Tabs>

        <div className="flex justify-end">
          <Button onClick={() => navigate("/incubation/labellisation")} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
            Étape 5 : Labellisation <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
