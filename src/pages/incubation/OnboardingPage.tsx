import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import RoadmapTimeline, { Milestone } from "@/components/incubation/RoadmapTimeline";
import { toast } from "sonner";
import { ArrowRight, Sparkles, CheckCircle2, FileText, Map, Loader2, Scale } from "lucide-react";

const DEFAULT_MILESTONES: Omit<Milestone, "id">[] = [
  { title: "Valider le Product-Market Fit", description: "Obtenir 10 retours clients qualitatifs et atteindre un score de 40+ sur l'enquête PMF de Sean Ellis.", category: "marketing", status: "pending", due_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10), order_index: 0 },
  { title: "Structurer la proposition de valeur", description: "Rédiger le Value Proposition Canvas et identifier les 3 jobs-to-be-done principaux.", category: "marketing", status: "pending", due_date: new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 10), order_index: 1 },
  { title: "Produire le premier prototype Fablab", description: "Réaliser une première pièce ou maquette fonctionnelle avec les équipements du Fablab.", category: "prototype", status: "pending", due_date: new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10), order_index: 2 },
  { title: "Atteindre 500€ de premier chiffre d'affaires", description: "Générer les premières ventes pour valider la capacité à monétiser.", category: "finance", status: "pending", due_date: new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10), order_index: 3 },
  { title: "Constituer la structure juridique", description: "Immatriculer la société (SAS recommandée) et établir le pacte d'actionnaires.", category: "juridique", status: "pending", due_date: new Date(Date.now() + 75 * 86400000).toISOString().slice(0, 10), order_index: 4 },
  { title: "Préparer le dossier de levée de fonds", description: "Réaliser le financial model, le pitch deck et l'executive summary pour les investisseurs.", category: "finance", status: "pending", due_date: new Date(Date.now() + 150 * 86400000).toISOString().slice(0, 10), order_index: 5 },
];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [startupId, setStartupId] = useState<string | null>(null);
  const [equitySigned, setEquitySigned] = useState(false);
  const [signedConfirm, setSignedConfirm] = useState(false);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [savingSignature, setSavingSignature] = useState(false);
  const [roadmapGenerated, setRoadmapGenerated] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: sp } = await supabase
        .from("startup_profiles" as any)
        .select("id, equity_signed, name")
        .eq("user_id", user.id)
        .single();

      if (sp) {
        setStartupId((sp as any).id);
        setEquitySigned(!!(sp as any).equity_signed);

        // Check roadmap
        const { data: roadmap } = await supabase
          .from("incubation_roadmaps" as any)
          .select("id")
          .eq("startup_id", (sp as any).id)
          .single();

        if (roadmap) {
          setRoadmapGenerated(true);
          const { data: ms } = await supabase
            .from("roadmap_milestones" as any)
            .select("*")
            .eq("roadmap_id", (roadmap as any).id)
            .order("order_index", { ascending: true });
          if (ms) setMilestones(ms as Milestone[]);
        }
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleSignEquity = async () => {
    if (!startupId || !signedConfirm) return;
    setSavingSignature(true);
    try {
      await supabase
        .from("startup_profiles" as any)
        .update({ equity_signed: true, equity_signed_at: new Date().toISOString() })
        .eq("id", startupId);

      setEquitySigned(true);
      toast.success("Accord d'équité signé et horodaté avec succès !");
    } catch (e: any) {
      toast.error("Erreur lors de la signature");
    } finally {
      setSavingSignature(false);
    }
  };

  const handleGenerateRoadmap = async () => {
    if (!startupId) return;
    setLoading(true);
    try {
      const { data: roadmap, error: rmErr } = await supabase
        .from("incubation_roadmaps" as any)
        .insert({
          startup_id: startupId,
          title: "Roadmap Personnalisée GrainoLab",
          description: "Plan d'action généré automatiquement à partir de votre diagnostic d'entrée.",
          start_date: new Date().toISOString().slice(0, 10),
          end_date: new Date(Date.now() + 180 * 86400000).toISOString().slice(0, 10),
        })
        .select("id")
        .single();
      if (rmErr) throw rmErr;

      const milestonesToInsert = DEFAULT_MILESTONES.map(m => ({ ...m, roadmap_id: (roadmap as any).id }));
      const { data: ms } = await supabase
        .from("roadmap_milestones" as any)
        .insert(milestonesToInsert)
        .select("*");

      if (ms) setMilestones(ms as Milestone[]);
      setRoadmapGenerated(true);

      // Avancer le stage
      await supabase
        .from("startup_profiles" as any)
        .update({ stage: "onboarding" })
        .eq("id", startupId);

      toast.success("Roadmap personnalisée générée !");
    } catch (e: any) {
      toast.error(e.message || "Erreur lors de la génération");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateMilestone = async (id: string, status: Milestone["status"]) => {
    await supabase.from("roadmap_milestones" as any).update({ status, completed_at: status === "completed" ? new Date().toISOString() : null }).eq("id", id);
    setMilestones(prev => prev.map(m => m.id === id ? { ...m, status } : m));
    toast.success("Statut mis à jour");
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /></div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/30 via-background to-background py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-1.5 rounded-full text-sm font-semibold">
            <Sparkles className="w-4 h-4" /> Étape 2 — Onboarding & Brainstorming
          </div>
          <h1 className="text-3xl font-black">Intégration & Feuille de route</h1>
          <p className="text-muted-foreground">Signez l'accord et recevez votre plan d'action personnalisé.</p>
        </div>

        {/* Signature électronique */}
        <Card className={`border-2 ${equitySigned ? "border-emerald-300 bg-emerald-50/30" : "border-orange-200"}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-orange-500" />
              Accord d'équité GrainoLab
              {equitySigned && <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">✓ Signé</Badge>}
            </CardTitle>
            <CardDescription>
              En contrepartie de l'accompagnement, de l'accès au Fablab et au réseau GrainoLab, vous cédez <strong>10% du capital</strong> de votre start-up à l'incubateur.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg border text-sm space-y-2">
              <p className="font-semibold">Termes de l'accord :</p>
              <ul className="space-y-1 text-muted-foreground list-disc pl-4">
                <li>Cession de 10% du capital de la start-up à GrainoLab</li>
                <li>Durée de l'accompagnement : 6 mois</li>
                <li>Accès complet au Fablab, LMS et réseau de mentors</li>
                <li>Vesting des parts sur 24 mois (cliff 6 mois)</li>
                <li>Clause de rachat au prix de marché en cas de sortie</li>
              </ul>
            </div>

            {!equitySigned && (
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Checkbox id="confirm" checked={signedConfirm} onCheckedChange={v => setSignedConfirm(!!v)} />
                  <Label htmlFor="confirm" className="text-sm leading-relaxed cursor-pointer">
                    J'ai lu et j'accepte les termes de l'accord d'équité GrainoLab. Je comprends que cette signature électronique est horodatée et enregistrée de manière sécurisée.
                  </Label>
                </div>
                <Button
                  onClick={handleSignEquity}
                  disabled={!signedConfirm || savingSignature}
                  className="w-full gap-2 bg-orange-600 hover:bg-orange-700"
                >
                  {savingSignature ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                  {savingSignature ? "Signature en cours..." : "Signer électroniquement"}
                </Button>
              </div>
            )}

            {equitySigned && (
              <div className="flex items-center gap-2 text-emerald-700 font-semibold">
                <CheckCircle2 className="w-5 h-5" /> Accord signé et horodaté avec succès
              </div>
            )}
          </CardContent>
        </Card>

        {/* Génération de Roadmap */}
        <Card className={`border-2 ${roadmapGenerated ? "border-emerald-300" : "border-border"}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Map className="w-5 h-5 text-emerald-600" />
              Roadmap personnalisée
              {roadmapGenerated && <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">✓ Générée</Badge>}
            </CardTitle>
            <CardDescription>
              Plan d'action à jalons temporels, généré automatiquement à partir de votre diagnostic d'entrée.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!roadmapGenerated ? (
              <div className="text-center py-6 space-y-4">
                <p className="text-sm text-muted-foreground">
                  Cliquez sur le bouton pour générer votre roadmap personnalisée basée sur votre secteur et votre niveau de maturité.
                </p>
                <Button onClick={handleGenerateRoadmap} disabled={loading} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  Générer ma roadmap personnalisée
                </Button>
              </div>
            ) : (
              <RoadmapTimeline milestones={milestones} onUpdateStatus={handleUpdateMilestone} editable />
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        {equitySigned && roadmapGenerated && (
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate("/incubation/dashboard")} className="flex-1">
              Tableau de bord
            </Button>
            <Button onClick={() => navigate("/incubation/acceleration")} className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700">
              Étape 3 : Accélération <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
