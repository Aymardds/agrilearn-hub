import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import EarlyWarningBadge from "@/components/incubation/EarlyWarningBadge";
import { Loader2, Users, TrendingUp, AlertTriangle, Award, Search, ArrowRight, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface StartupOverview {
  id: string;
  name: string;
  sector: string;
  stage: string;
  team_size: number;
  equity_signed: boolean;
  coach_name?: string;
  consecutive_misses: number;
  last_kpi_month?: string;
  has_label: boolean;
}

const STAGE_LABELS: Record<string, { label: string; color: string }> = {
  diagnostic: { label: "Diagnostic", color: "bg-gray-100 text-gray-700" },
  onboarding: { label: "Onboarding", color: "bg-blue-100 text-blue-700" },
  acceleration: { label: "Accélération", color: "bg-purple-100 text-purple-700" },
  pilotage: { label: "Pilotage KPI", color: "bg-orange-100 text-orange-700" },
  labellisation: { label: "Labellisation", color: "bg-amber-100 text-amber-700" },
  certifie: { label: "Certifié ✓", color: "bg-emerald-100 text-emerald-700" },
};

export default function IncubationAdmin() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [startups, setStartups] = useState<StartupOverview[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      const { data: profiles } = await supabase
        .from("startup_profiles" as any)
        .select("id, name, sector, stage, team_size, equity_signed, coach_id")
        .order("created_at", { ascending: false });

      if (!profiles) { setLoading(false); return; }

      const overviews: StartupOverview[] = await Promise.all(
        (profiles as any[]).map(async (sp) => {
          // Derniers KPIs
          const { data: kpis } = await supabase
            .from("kpi_reports" as any)
            .select("early_warning_triggered, report_month")
            .eq("startup_id", sp.id)
            .order("report_month", { ascending: false })
            .limit(3);

          const misses = kpis ? (kpis as any[]).filter(k => k.early_warning_triggered).length : 0;
          const lastKpi = kpis?.[0] ? (kpis[0] as any).report_month : undefined;

          // Coach
          let coachName: string | undefined;
          if (sp.coach_id) {
            const { data: coachProfile } = await supabase
              .from("profiles" as any)
              .select("full_name")
              .eq("id", sp.coach_id)
              .single();
            coachName = (coachProfile as any)?.full_name;
          }

          // Label
          const { count: labelCount } = await supabase
            .from("incubation_labels" as any)
            .select("*", { count: "exact", head: true })
            .eq("startup_id", sp.id);

          return {
            id: sp.id,
            name: sp.name,
            sector: sp.sector,
            stage: sp.stage,
            team_size: sp.team_size,
            equity_signed: sp.equity_signed,
            coach_name: coachName,
            consecutive_misses: misses,
            last_kpi_month: lastKpi,
            has_label: (labelCount || 0) > 0,
          };
        })
      );

      setStartups(overviews);
      setLoading(false);
    };
    fetchData();
  }, []);

  const filtered = startups.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.sector.toLowerCase().includes(search.toLowerCase())
  );

  const alertCount = startups.filter(s => s.consecutive_misses >= 2).length;
  const certifiedCount = startups.filter(s => s.stage === "certifie").length;

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /></div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-6 px-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black">Incubation — Vue d'ensemble</h1>
          <p className="text-muted-foreground text-sm">{startups.length} start-up(s) en cours d'incubation</p>
        </div>
      </div>

      {/* Stats globales */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-500" />
            <div><p className="text-2xl font-black">{startups.length}</p><p className="text-xs text-muted-foreground">Start-ups actives</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-red-500" />
            <div><p className="text-2xl font-black text-red-600">{alertCount}</p><p className="text-xs text-muted-foreground">Alertes dérive</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Award className="w-8 h-8 text-amber-500" />
            <div><p className="text-2xl font-black text-emerald-600">{certifiedCount}</p><p className="text-xs text-muted-foreground">Certifiées</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            <div><p className="text-2xl font-black">{startups.filter(s => s.equity_signed).length}</p><p className="text-xs text-muted-foreground">Accords signés</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Alertes Early Warning */}
      {alertCount > 0 && (
        <Card className="border-2 border-red-200 bg-red-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-4 h-4" /> Alertes Early Warning ({alertCount})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {startups.filter(s => s.consecutive_misses >= 2).map(s => (
                <div key={s.id} className="flex items-center justify-between p-3 bg-white border border-red-200 rounded-lg">
                  <div>
                    <p className="font-semibold text-sm">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.consecutive_misses} mois consécutifs sous objectif</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-red-300 text-red-700 hover:bg-red-50"
                    onClick={() => navigate(`/admin/incubation/${s.id}`)}
                  >
                    Voir le dossier
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Liste des start-ups */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher une start-up..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="space-y-3">
          {filtered.map(startup => {
            const stageConfig = STAGE_LABELS[startup.stage] || { label: startup.stage, color: "bg-gray-100 text-gray-700" };
            return (
              <Card key={startup.id} className="hover:shadow-md transition-all cursor-pointer" onClick={() => navigate(`/admin/incubation/${startup.id}`)}>
                <CardContent className="p-4 flex items-center gap-4">
                  {/* Icône */}
                  <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-green-600 rounded-full flex items-center justify-center text-white font-black flex-shrink-0">
                    {startup.name[0]}
                  </div>

                  {/* Infos */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold">{startup.name}</p>
                      <Badge variant="outline" className="text-xs">{startup.sector}</Badge>
                      <Badge className={`text-xs ${stageConfig.color}`}>{stageConfig.label}</Badge>
                      {startup.consecutive_misses >= 2 && <Badge className="text-xs bg-red-100 text-red-700">🚨 Alerte</Badge>}
                      {startup.consecutive_misses === 1 && <Badge className="text-xs bg-amber-100 text-amber-700">⚠️ Suivi</Badge>}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>{startup.team_size} fondateur(s)</span>
                      {startup.equity_signed && <span className="text-emerald-600">✓ Accord signé</span>}
                      {startup.coach_name && <span>Coach: {startup.coach_name}</span>}
                      {startup.last_kpi_month && <span>Dernier KPI: {format(new Date(startup.last_kpi_month), "MMM yyyy", { locale: fr })}</span>}
                    </div>
                  </div>

                  <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                </CardContent>
              </Card>
            );
          })}

          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              {search ? "Aucune start-up ne correspond à votre recherche." : "Aucune start-up en incubation pour le moment."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
