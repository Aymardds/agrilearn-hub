import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import StageProgressBar, { IncubationStage } from "@/components/incubation/StageProgressBar";
import EarlyWarningBadge from "@/components/incubation/EarlyWarningBadge";
import {
  ArrowRight, CheckCircle2, AlertTriangle, Calendar, TrendingUp,
  Rocket, Cpu, Map, Award, Microscope, Loader2, Sparkles, Target
} from "lucide-react";

interface IncubeDashboardProps {
  user: User;
}

interface StartupProfile {
  id: string;
  name: string;
  sector: string;
  stage: IncubationStage;
  team_size: number;
  equity_signed: boolean;
  description?: string;
}

const STAGE_ROUTES: Record<IncubationStage, string> = {
  diagnostic: "/incubation/diagnostic",
  onboarding: "/incubation/onboarding",
  acceleration: "/incubation/acceleration",
  pilotage: "/incubation/kpi",
  labellisation: "/incubation/labellisation",
  certifie: "/incubation/labellisation",
};

const STAGE_LABELS: Record<IncubationStage, string> = {
  diagnostic: "Diagnostic",
  onboarding: "Onboarding",
  acceleration: "Accélération",
  pilotage: "Pilotage KPI",
  labellisation: "Labellisation",
  certifie: "Certifié",
};

const STAGE_CTA: Record<IncubationStage, string> = {
  diagnostic: "Démarrer le diagnostic",
  onboarding: "Compléter l'onboarding",
  acceleration: "Accéder aux formations",
  pilotage: "Saisir mes KPI du mois",
  labellisation: "Préparer ma labellisation",
  certifie: "Voir mon label GrainoLab",
};

const STAGE_COLORS: Record<IncubationStage, string> = {
  diagnostic: "from-amber-500 to-orange-500",
  onboarding: "from-blue-500 to-indigo-500",
  acceleration: "from-purple-500 to-violet-500",
  pilotage: "from-cyan-500 to-blue-500",
  labellisation: "from-emerald-500 to-green-500",
  certifie: "from-yellow-400 to-amber-500",
};

const QUICK_ACTIONS = [
  { emoji: "🔬", label: "Diagnostic", sub: "Évaluation de maturité", route: "/incubation/diagnostic" },
  { emoji: "🗺️", label: "Roadmap", sub: "Jalons & objectifs", route: "/incubation/onboarding" },
  { emoji: "🚀", label: "Accélération", sub: "Formations & coaching", route: "/incubation/acceleration" },
  { emoji: "📊", label: "KPI & Pilotage", sub: "Métriques de croissance", route: "/incubation/kpi" },
  { emoji: "🏆", label: "Labellisation", sub: "Comité & certification", route: "/incubation/labellisation" },
  { emoji: "⚙️", label: "Fablab", sub: "Machines & prototypage", route: "/incubation/acceleration" },
];

export default function IncubeDashboard({ user }: IncubeDashboardProps) {
  const navigate = useNavigate();
  const [startup, setStartup] = useState<StartupProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [consecutiveMisses, setConsecutiveMisses] = useState(0);
  const [nextCoaching, setNextCoaching] = useState<string | null>(null);
  const [lastKpiMonth, setLastKpiMonth] = useState<string | null>(null);
  const [milestonesCompleted, setMilestonesCompleted] = useState(0);
  const [milestonesTotal, setMilestonesTotal] = useState(0);
  const [userName, setUserName] = useState<string>("");

  useEffect(() => {
    const fetchData = async () => {
      // Profile name
      const { data: profile } = await supabase
        .from("profiles" as any)
        .select("full_name")
        .eq("id", user.id)
        .single();
      if (profile) setUserName((profile as any).full_name || user.email || "");

      // Startup
      const { data: sp } = await supabase
        .from("startup_profiles" as any)
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (sp) {
        setStartup(sp as StartupProfile);

        // KPI early warning
        const { data: kpis } = await supabase
          .from("kpi_reports" as any)
          .select("early_warning_triggered, report_month")
          .eq("startup_id", (sp as any).id)
          .order("report_month", { ascending: false })
          .limit(3);

        if (kpis && kpis.length > 0) {
          setLastKpiMonth((kpis[0] as any).report_month);
          setConsecutiveMisses((kpis as any[]).filter((k) => k.early_warning_triggered).length);
        }

        // Next coaching
        const { data: booking } = await supabase
          .from("coaching_bookings" as any)
          .select("scheduled_at")
          .eq("startup_id", (sp as any).id)
          .gte("scheduled_at", new Date().toISOString())
          .order("scheduled_at", { ascending: true })
          .limit(1)
          .single();

        if (booking) setNextCoaching((booking as any).scheduled_at);

        // Milestones
        const { data: roadmap } = await supabase
          .from("incubation_roadmaps" as any)
          .select("id")
          .eq("startup_id", (sp as any).id)
          .single();

        if (roadmap) {
          const { data: milestones } = await supabase
            .from("roadmap_milestones" as any)
            .select("status")
            .eq("roadmap_id", (roadmap as any).id);

          if (milestones) {
            setMilestonesTotal((milestones as any[]).length);
            setMilestonesCompleted((milestones as any[]).filter((m) => m.status === "completed").length);
          }
        }
      }
      setLoading(false);
    };
    fetchData();
  }, [user.id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  /* ─── Pas encore de profil startup ─── */
  if (!startup) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center px-4">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-2xl shadow-emerald-200 mb-6">
            <Rocket className="w-12 h-12 text-white" />
          </div>
          <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center shadow-lg">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
        </div>

        <h1 className="text-3xl font-black text-center mb-2">
          Bienvenue{userName ? `, ${userName.split(" ")[0]}` : ""} !
        </h1>
        <p className="text-muted-foreground text-center max-w-md mb-8">
          Vous êtes incubé(e) dans le programme <strong>GrainoLab</strong>. Commencez par créer votre profil start-up et répondre au diagnostic d'entrée pour débloquer votre parcours personnalisé.
        </p>
        <Button
          onClick={() => navigate("/incubation/diagnostic")}
          size="lg"
          className="gap-2 bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200"
        >
          Démarrer mon parcours <ArrowRight className="w-5 h-5" />
        </Button>
      </div>
    );
  }

  const gradientClass = STAGE_COLORS[startup.stage];
  const progressPct = milestonesTotal > 0 ? Math.round((milestonesCompleted / milestonesTotal) * 100) : 0;

  return (
    <div className="max-w-5xl mx-auto space-y-8 py-6 px-4">

      {/* ── Hero header ── */}
      <div className="relative rounded-2xl overflow-hidden">
        <div className={`absolute inset-0 bg-gradient-to-br ${gradientClass} opacity-90`} />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.05\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]" />
        <div className="relative p-7 text-white">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm text-xs">
                  Étape : {STAGE_LABELS[startup.stage]}
                </Badge>
                {startup.equity_signed && (
                  <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm text-xs">
                    ✓ Accord signé
                  </Badge>
                )}
              </div>
              <h1 className="text-2xl md:text-3xl font-black">{startup.name}</h1>
              <p className="text-white/80 mt-1 text-sm">
                {startup.sector} · {startup.team_size} fondateur{startup.team_size > 1 ? "s" : ""}
              </p>
            </div>
            <Button
              onClick={() => navigate(STAGE_ROUTES[startup!.stage])}
              className="bg-white text-gray-900 hover:bg-white/90 gap-2 shadow-lg font-semibold"
            >
              {STAGE_CTA[startup.stage]} <ArrowRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Mini progress bar */}
          {milestonesTotal > 0 && (
            <div className="mt-5">
              <div className="flex justify-between text-xs text-white/70 mb-1.5">
                <span>Jalons de roadmap</span>
                <span>{milestonesCompleted}/{milestonesTotal} complétés</span>
              </div>
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white/80 rounded-full transition-all duration-700"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Early warning ── */}
      {consecutiveMisses >= 1 && (
        <EarlyWarningBadge consecutiveMisses={consecutiveMisses} />
      )}

      {/* ── Barre de progression du parcours ── */}
      <Card className="border-2 border-emerald-500/20 shadow-sm">
        <CardContent className="p-5">
          <p className="text-sm font-semibold text-muted-foreground mb-4 flex items-center gap-1.5">
            <Target className="w-4 h-4" /> Progression du parcours
          </p>
          <StageProgressBar
            currentStage={startup.stage}
            onStageClick={(stage) => navigate(STAGE_ROUTES[stage])}
          />
        </CardContent>
      </Card>

      {/* ── Widgets d'état ── */}
      <div className="grid sm:grid-cols-3 gap-4">
        {/* Accord d'équité */}
        <Card className={`border-2 transition-all ${startup.equity_signed
          ? "border-emerald-200 bg-emerald-50/60 dark:bg-emerald-950/20"
          : "border-amber-200 bg-amber-50/60 dark:bg-amber-950/20"
        }`}>
          <CardContent className="p-4 flex items-center gap-3">
            {startup.equity_signed
              ? <CheckCircle2 className="w-9 h-9 text-emerald-600 shrink-0" />
              : <AlertTriangle className="w-9 h-9 text-amber-500 shrink-0" />
            }
            <div>
              <p className="font-semibold text-sm">Accord d'équité</p>
              <p className="text-xs text-muted-foreground">
                {startup.equity_signed ? "Signé et horodaté ✓" : "En attente de signature"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Prochain coaching */}
        <Card className="border hover:border-blue-200 transition-all hover:shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-950 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-sm">Prochain coaching</p>
              <p className="text-xs text-muted-foreground">
                {nextCoaching
                  ? new Date(nextCoaching).toLocaleDateString("fr-FR", {
                    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                  })
                  : "Aucun planifié"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Dernier KPI */}
        <Card className="border hover:border-purple-200 transition-all hover:shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-purple-100 dark:bg-purple-950 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
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

      {/* ── Actions rapides ── */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4" /> Accès rapide
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.label}
              onClick={() => navigate(action.route)}
              className="group text-left p-4 rounded-xl border-2 border-border bg-card hover:border-emerald-300 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
            >
              <span className="text-2xl mb-2 block">{action.emoji}</span>
              <p className="font-semibold text-sm group-hover:text-emerald-700 transition-colors">{action.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{action.sub}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
