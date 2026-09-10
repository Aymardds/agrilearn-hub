import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowRight, AlertTriangle, CheckCircle2, Calendar, TrendingUp, Cpu } from "lucide-react";
import StageProgressBar, { IncubationStage } from "@/components/incubation/StageProgressBar";
import EarlyWarningBadge from "@/components/incubation/EarlyWarningBadge";

interface StartupProfile {
  id: string;
  name: string;
  sector: string;
  stage: IncubationStage;
  team_size: number;
  equity_signed: boolean;
}

const STAGE_ROUTES: Record<IncubationStage, string> = {
  diagnostic: "/incubation/diagnostic",
  onboarding: "/incubation/onboarding",
  acceleration: "/incubation/acceleration",
  pilotage: "/incubation/kpi",
  labellisation: "/incubation/labellisation",
  certifie: "/incubation/labellisation",
};

const STAGE_CTA: Record<IncubationStage, string> = {
  diagnostic: "Commencer le diagnostic",
  onboarding: "Compléter l'onboarding",
  acceleration: "Accéder à ma formation",
  pilotage: "Saisir mes KPI du mois",
  labellisation: "Préparer ma labellisation",
  certifie: "Voir mon label",
};

export default function IncubationDashboard() {
  const navigate = useNavigate();
  const [startup, setStartup] = useState<StartupProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [consecutiveMisses, setConsecutiveMisses] = useState(0);
  const [lastCoaching, setLastCoaching] = useState<string | null>(null);
  const [lastKpiMonth, setLastKpiMonth] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: sp } = await supabase
        .from("startup_profiles" as any)
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (sp) {
        setStartup(sp as StartupProfile);

        // Fetch KPI reports for early warning
        const { data: kpis } = await supabase
          .from("kpi_reports" as any)
          .select("early_warning_triggered, report_month")
          .eq("startup_id", (sp as any).id)
          .order("report_month", { ascending: false })
          .limit(3);

        if (kpis && kpis.length > 0) {
          setLastKpiMonth((kpis[0] as any).report_month);
          const misses = (kpis as any[]).filter(k => k.early_warning_triggered).length;
          setConsecutiveMisses(misses);
        }

        // Fetch next coaching session
        const { data: booking } = await supabase
          .from("coaching_bookings" as any)
          .select("scheduled_at")
          .eq("startup_id", (sp as any).id)
          .gte("scheduled_at", new Date().toISOString())
          .order("scheduled_at", { ascending: true })
          .limit(1)
          .single();

        if (booking) setLastCoaching((booking as any).scheduled_at);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!startup) {
    return (
      <div className="max-w-xl mx-auto mt-20 text-center space-y-4">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
          <Cpu className="w-8 h-8 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-bold">Bienvenue dans GrainoLab !</h2>
        <p className="text-muted-foreground">Commencez par créer votre profil start-up et répondre au diagnostic d'entrée.</p>
        <Button onClick={() => navigate("/incubation/diagnostic")} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
          Démarrer mon parcours <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-6 px-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black">{startup.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline">{startup.sector}</Badge>
            <Badge variant="outline" className="text-emerald-700 border-emerald-300">{startup.team_size} fondateur{startup.team_size > 1 ? "s" : ""}</Badge>
          </div>
        </div>
        <Button
          onClick={() => navigate(STAGE_ROUTES[startup.stage])}
          className="gap-2 bg-emerald-600 hover:bg-emerald-700"
        >
          {STAGE_CTA[startup.stage]} <ArrowRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Progression */}
      <Card className="border-2 border-emerald-500/20">
        <CardHeader>
          <CardTitle className="text-base">Progression du parcours</CardTitle>
        </CardHeader>
        <CardContent>
          <StageProgressBar
            currentStage={startup.stage}
            onStageClick={stage => navigate(STAGE_ROUTES[stage])}
          />
        </CardContent>
      </Card>

      {/* Alertes */}
      {consecutiveMisses >= 1 && (
        <EarlyWarningBadge consecutiveMisses={consecutiveMisses} />
      )}

      {/* Widgets d'état rapide */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Card className={startup.equity_signed ? "border-emerald-200 bg-emerald-50/50" : "border-amber-200 bg-amber-50/50"}>
          <CardContent className="p-4 flex items-center gap-3">
            {startup.equity_signed
              ? <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              : <AlertTriangle className="w-8 h-8 text-amber-600" />}
            <div>
              <p className="font-semibold text-sm">Accord d'équité</p>
              <p className="text-xs text-muted-foreground">
                {startup.equity_signed ? "Signé ✓" : "En attente de signature"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Calendar className="w-8 h-8 text-blue-500" />
            <div>
              <p className="font-semibold text-sm">Prochain coaching</p>
              <p className="text-xs text-muted-foreground">
                {lastCoaching
                  ? new Date(lastCoaching).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
                  : "Aucun planifié"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-purple-500" />
            <div>
              <p className="font-semibold text-sm">Dernier rapport KPI</p>
              <p className="text-xs text-muted-foreground">
                {lastKpiMonth
                  ? new Date(lastKpiMonth).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })
                  : "Aucun rapport"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions rapides */}
      <div className="grid sm:grid-cols-2 gap-3">
        <Button variant="outline" onClick={() => navigate("/incubation/acceleration")} className="justify-start gap-2 h-14">
          🚀 <div className="text-left"><p className="font-semibold text-sm">Accélération & Formation</p><p className="text-xs text-muted-foreground">Modules LMS + Coaching</p></div>
        </Button>
        <Button variant="outline" onClick={() => navigate("/incubation/kpi")} className="justify-start gap-2 h-14">
          📊 <div className="text-left"><p className="font-semibold text-sm">Tableau de bord KPI</p><p className="text-xs text-muted-foreground">Métriques et progression</p></div>
        </Button>
        <Button variant="outline" onClick={() => navigate("/incubation/onboarding")} className="justify-start gap-2 h-14">
          🗺️ <div className="text-left"><p className="font-semibold text-sm">Ma Roadmap</p><p className="text-xs text-muted-foreground">Jalons et objectifs</p></div>
        </Button>
        <Button variant="outline" onClick={() => navigate("/incubation/labellisation")} className="justify-start gap-2 h-14">
          🏆 <div className="text-left"><p className="font-semibold text-sm">Labellisation</p><p className="text-xs text-muted-foreground">Comité & certification</p></div>
        </Button>
      </div>
    </div>
  );
}
