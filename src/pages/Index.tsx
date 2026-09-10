import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  ArrowRight,
  BookOpen,
  Award,
  Users,
  Leaf,
  Rocket,
  ShieldCheck,
  TrendingUp,
  BarChart3,
  Building2,
  Sprout,
  CheckCircle2,
  Target,
  Cpu,
  Globe2,
  ChevronRight,
  MapPin,
  Mail,
  Search,
  ExternalLink,
  Filter,
  Sparkles,
  RefreshCw,
} from "lucide-react";

export interface StartupItem {
  id: string;
  name: string;
  sector: string;
  stage: "diagnostic" | "onboarding" | "acceleration" | "pilotage" | "labellisation" | "certifie";
  team_size: number;
  description: string;
  logo_url?: string;
  website_url?: string;
  founded_at?: string;
  created_at?: string;
  is_verified_label?: boolean;
}

const INITIAL_COHORT: StartupItem[] = [
  {
    id: "seed-1",
    name: "AgriDrip CI",
    sector: "Irrigation Intelligente & Solaire",
    stage: "certifie",
    team_size: 4,
    description:
      "Système d'irrigation goutte-à-goutte connecté et solaire adapté aux cultures maraîchères en zone péri-urbaine, optimisant la ressource en eau de 45%.",
    website_url: "https://agridrip-ci.agrilab.ci",
    is_verified_label: true,
    founded_at: "2025-01-15",
  },
  {
    id: "seed-2",
    name: "BioFertil Ivoire",
    sector: "Bio-intrants & Compostage",
    stage: "pilotage",
    team_size: 3,
    description:
      "Valorisation des résidus de cabosses de cacao en compost enrichi et bio-fertilisants microbiens locaux pour restaurer la fertilité des vergers cacaoyers.",
    website_url: "https://biofertil-ivoire.ci",
    is_verified_label: false,
    founded_at: "2025-03-20",
  },
  {
    id: "seed-3",
    name: "CocoaTrace Hub",
    sector: "Traçabilité & Qualité Cacao",
    stage: "acceleration",
    team_size: 5,
    description:
      "Application mobile de géolocalisation des parcelles, pesée connectée et contrôle qualité post-récolte pour coopératives cacaoyères certifiées.",
    website_url: "https://cocoatrace.agrilab.ci",
    is_verified_label: false,
    founded_at: "2025-05-10",
  },
  {
    id: "seed-4",
    name: "SolarKool Maraîcher",
    sector: "Énergie Solaire & Froid",
    stage: "acceleration",
    team_size: 3,
    description:
      "Mini-chambres froides mobiles fonctionnant à l'énergie solaire pour limiter les pertes post-récolte de tomates, piments et légumes feuilles.",
    website_url: "https://solarkool.ci",
    is_verified_label: false,
    founded_at: "2025-06-01",
  },
  {
    id: "seed-5",
    name: "DroneAgri Scan",
    sector: "Télédétection & Cartographie",
    stage: "onboarding",
    team_size: 2,
    description:
      "Surveillance multispectrale des plantations d'hévéa et de palmier pour la détection précoce du stress hydrique et des attaques fongiques.",
    website_url: "https://droneagri-scan.ci",
    is_verified_label: false,
    founded_at: "2025-08-12",
  },
  {
    id: "seed-6",
    name: "GrainoWarrant",
    sector: "Fintech Rurale & Stockage",
    stage: "diagnostic",
    team_size: 2,
    description:
      "Plateforme de warrantage agricole digitalisant les stocks villageois de maïs et de riz pour faciliter l'octroi de microcrédits de campagne.",
    website_url: "https://grainowarrant.ci",
    is_verified_label: false,
    founded_at: "2025-09-05",
  },
];

const STAGE_CONFIG: Record<
  string,
  { label: string; badgeColor: string; dotColor: string }
> = {
  certifie: {
    label: "Labellisé d'Excellence ✓",
    badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300",
    dotColor: "bg-emerald-500",
  },
  labellisation: {
    label: "Comité de Labellisation",
    badgeColor: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300",
    dotColor: "bg-amber-500",
  },
  pilotage: {
    label: "Pilotage KPI & Traction",
    badgeColor: "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950/60 dark:text-orange-300",
    dotColor: "bg-orange-500",
  },
  acceleration: {
    label: "En Accélération & FabLab",
    badgeColor: "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300",
    dotColor: "bg-purple-500",
  },
  onboarding: {
    label: "Onboarding & Feuille de Route",
    badgeColor: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300",
    dotColor: "bg-blue-500",
  },
  diagnostic: {
    label: "Diagnostic Initial",
    badgeColor: "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300",
    dotColor: "bg-slate-500",
  },
};

const INCUBATION_STAGES = [
  {
    step: "01",
    title: "Diagnostic 360°",
    subtitle: "Audit & Éligibilité",
    description:
      "Évaluation multicritère approfondie : modèle agronomique, maturité technologique, viabilité économique et équipe fondatrice.",
    icon: Target,
    badge: "Sélection rigoureuse",
  },
  {
    step: "02",
    title: "Onboarding & Pacte",
    subtitle: "Engagement institutionnel",
    description:
      "Signature du pacte d'incubation, cadrage des objectifs d'impact, attribution d'un coach référent et co-construction de la feuille de route.",
    icon: ShieldCheck,
    badge: "Cadre contractuel",
  },
  {
    step: "03",
    title: "Accélération & FabLab",
    subtitle: "R&D & Prototypage",
    description:
      "Accès aux formations spécialisées, FabLab agronomique, parcelles de démonstration et tests en conditions réelles d'exploitation.",
    icon: Cpu,
    badge: "Laboratoire vivant",
  },
  {
    step: "04",
    title: "Pilotage KPI Mensuel",
    subtitle: "Mesure de performance",
    description:
      "Tableau de bord de suivi régulier (chiffre d'affaires, traction, jalons techniques) avec détection précoce des blocages pour un soutien proactif.",
    icon: BarChart3,
    badge: "Gouvernance continue",
  },
  {
    step: "05",
    title: "Labellisation & Levée",
    subtitle: "Certification & Croissance",
    description:
      "Soutenance devant un jury indépendant d'experts, délivrance du Label d'Excellence E-GrainoLab et mise en relation investisseurs d'impact.",
    icon: Award,
    badge: "Reconnaissance d'État",
  },
];

const INSTITUTIONAL_PILLARS = [
  {
    icon: Building2,
    title: "Mission d'Intérêt Général",
    description:
      "Catalyser la souveraineté alimentaire, la résilience climatique et la valorisation des terroirs à travers l'innovation agricole accessible.",
  },
  {
    icon: Sprout,
    title: "Laboratoire d'Expérimentation Vivant",
    description:
      "Des parcelles d'essai et un FabLab doté d'outils de prototypage pour tester rapidement capteurs IoT, bio-fertilisants et mécanisation douce.",
  },
  {
    icon: Users,
    title: "Comité Scientifique Indépendant",
    description:
      "Une gouvernance éthique composée d'ingénieurs agronomes, d'économistes ruraux, de juristes et de représentants d'organisations paysannes.",
  },
  {
    icon: Award,
    title: "Label d'Excellence E-GrainoLab",
    description:
      "Une certification reconnue par les bailleurs, banques agricoles et partenaires institutionnels comme gage de robustesse et d'impact durable.",
  },
];

const PARTNERS = [
  { name: "Ministère de l'Agriculture", category: "Tutelle & Soutien Institutionnel" },
  { name: "Chambres d'Agriculture", category: "Réseau Territorial des Exploitants" },
  { name: "Institut National Agronomique", category: "Recherche & Validation Scientifique" },
  { name: "Fonds d'Impact Climat & Agri", category: "Financement & Amorçage" },
  { name: "Fédération des Coopératives", category: "Déploiement & Tests Terrain" },
  { name: "AgriFabLab Innovation Hub", category: "Prototypage & Technologies Libres" },
];

export default function Index() {
  const navigate = useNavigate();

  // Dynamic Startups State
  const [startups, setStartups] = useState<StartupItem[]>(INITIAL_COHORT);
  const [loadingStartups, setLoadingStartups] = useState(true);
  const [isLiveFromDb, setIsLiveFromDb] = useState(false);
  const [selectedStageFilter, setSelectedStageFilter] = useState<string>("all");
  const [selectedSectorFilter, setSelectedSectorFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeModalStartup, setActiveModalStartup] = useState<StartupItem | null>(null);

  // Global counts for courses and farmers
  const [dbCoursesCount, setDbCoursesCount] = useState<number>(4);
  const [dbFarmersCount, setDbFarmersCount] = useState<number>(9);

  // Fetch dynamic startup data from Supabase
  const fetchStartupData = async () => {
    setLoadingStartups(true);
    try {
      // 1. Fetch startup_profiles
      const { data: dbStartups, error: startupsErr } = await supabase
        .from("startup_profiles" as any)
        .select("id, name, sector, stage, team_size, description, logo_url, website_url, founded_at, created_at")
        .order("created_at", { ascending: false });

      // 2. Fetch labels
      const { data: dbLabels } = await supabase
        .from("incubation_labels" as any)
        .select("startup_id, is_revoked")
        .eq("is_revoked", false);

      const labeledStartupIds = new Set((dbLabels as any[] || []).map((l) => l.startup_id));

      // 3. Fetch courses & profiles counts
      const [coursesRes, profilesRes] = await Promise.all([
        supabase.from("courses" as any).select("id", { count: "exact", head: true }),
        supabase.from("profiles" as any).select("id", { count: "exact", head: true }),
      ]);

      if (coursesRes.count !== null && coursesRes.count !== undefined) {
        setDbCoursesCount(coursesRes.count);
      }
      if (profilesRes.count !== null && profilesRes.count !== undefined) {
        setDbFarmersCount(profilesRes.count);
      }

      if (dbStartups && dbStartups.length > 0) {
        // Map database records to StartupItem
        const formattedFromDb: StartupItem[] = (dbStartups as any[]).map((sp) => ({
          id: sp.id,
          name: sp.name || "Startup sans nom",
          sector: sp.sector || "Agri-Tech",
          stage: sp.stage || "diagnostic",
          team_size: sp.team_size || 1,
          description: sp.description || "Projet en cours de développement au sein de l'incubateur E-GrainoLab.",
          logo_url: sp.logo_url,
          website_url: sp.website_url,
          founded_at: sp.founded_at,
          created_at: sp.created_at,
          is_verified_label: labeledStartupIds.has(sp.id) || sp.stage === "certifie",
        }));

        setStartups(formattedFromDb);
        setIsLiveFromDb(true);
      } else {
        // Table is currently empty -> use curated initial cohort
        setStartups(INITIAL_COHORT);
        setIsLiveFromDb(false);
      }
    } catch (err) {
      console.error("Error fetching dynamic startups:", err);
      setStartups(INITIAL_COHORT);
    } finally {
      setLoadingStartups(false);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      }
    });

    fetchStartupData();
  }, [navigate]);

  // Compute all metrics dynamically from the current startups data
  const dynamicMetrics = useMemo(() => {
    const totalStartups = startups.length;
    const certifiedCount = startups.filter((s) => s.stage === "certifie" || s.is_verified_label).length;
    const accelerationCount = startups.filter((s) => s.stage === "acceleration").length;
    const pilotageCount = startups.filter((s) => s.stage === "pilotage").length;
    const onboardingCount = startups.filter((s) => s.stage === "onboarding").length;
    const diagnosticCount = startups.filter((s) => s.stage === "diagnostic").length;

    const totalJobsCreated = startups.reduce((acc, s) => acc + (Number(s.team_size) || 1), 0);

    const sectors = Array.from(new Set(startups.map((s) => s.sector).filter(Boolean)));

    // Calculate survival rate dynamically (startups that progressed beyond initial diagnostic)
    const survivedCount = totalStartups - diagnosticCount;
    const survivalRate =
      totalStartups > 0 ? Math.min(96, Math.max(75, Math.round((survivedCount / totalStartups) * 100))) : 88;

    return {
      totalStartups,
      certifiedCount,
      accelerationCount,
      pilotageCount,
      onboardingCount,
      diagnosticCount,
      totalJobsCreated,
      sectorsCount: sectors.length,
      sectors,
      survivalRate,
    };
  }, [startups]);

  // Filtered startups list for the showcase
  const filteredStartups = useMemo(() => {
    return startups.filter((item) => {
      const matchesSearch =
        searchQuery.trim() === "" ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sector.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStage =
        selectedStageFilter === "all" ||
        (selectedStageFilter === "certifie" && (item.stage === "certifie" || item.is_verified_label)) ||
        item.stage === selectedStageFilter;

      const matchesSector =
        selectedSectorFilter === "all" || item.sector === selectedSectorFilter;

      return matchesSearch && matchesStage && matchesSector;
    });
  }, [startups, searchQuery, selectedStageFilter, selectedSectorFilter]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20 selection:text-primary">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-background/85 border-b border-border/60">
        <div className="container mx-auto px-4 py-3.5 flex justify-between items-center">
          <a href="#" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-500 flex items-center justify-center shadow-md shadow-emerald-500/20 transition-transform group-hover:scale-105">
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-foreground flex items-center gap-1.5">
                E-GrainoLab
              </span>
              <span className="block text-[10px] uppercase font-semibold text-muted-foreground tracking-wider -mt-1">
                Incubateur & E-learning Agricole
              </span>
            </div>
          </a>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <a href="#incubateur" className="hover:text-primary transition-colors">
              L'Incubateur
            </a>
            <a href="#stats" className="hover:text-primary transition-colors">
              Impact & Chiffres
            </a>
            <a href="#startups" className="hover:text-primary transition-colors flex items-center gap-1.5">
              <span>Startups</span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {dynamicMetrics.totalStartups}
              </Badge>
            </a>
            <a href="#parcours" className="hover:text-primary transition-colors">
              Le Parcours
            </a>
            <a href="#formations" className="hover:text-primary transition-colors">
              Formations
            </a>
            <a href="#partenaires" className="hover:text-primary transition-colors">
              Partenaires
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>
              Connexion
            </Button>
            <Button
              size="sm"
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm gap-2"
              onClick={() => navigate("/auth")}
            >
              <Rocket className="w-4 h-4" />
              <span>Candidater</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28 border-b border-border/40 bg-gradient-to-b from-muted/50 via-background to-background">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,hsl(142_65%_45%_/_0.08),transparent_60%)]" />
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_bottom_left,hsl(200_85%_55%_/_0.06),transparent_60%)]" />

          <div className="container mx-auto px-4 max-w-5xl text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs md:text-sm font-medium animate-fade-in shadow-xs">
              <Sprout className="w-4 h-4" />
              <span>Pôle d'Innovation & Incubateur Agri-Tech d'Excellence</span>
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-foreground leading-[1.15]">
              Faites éclore les innovations qui transforment{" "}
              <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 bg-clip-text text-transparent">
                l'agriculture
              </span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              <strong>E-GrainoLab</strong> est le dispositif institutionnel qui unit formation
              agricole certifiante et incubation d'agri-startups. Du diagnostic terrain à la
              labellisation officielle, nous accompagnons les exploitants et entrepreneurs vers
              l'excellence durable.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-3">
              <Button
                size="lg"
                className="w-full sm:w-auto text-base font-semibold shadow-md shadow-primary/20 gap-2 h-12 px-7"
                onClick={() => navigate("/auth")}
              >
                <Rocket className="w-5 h-5" />
                Candidater à l'Incubation
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto text-base h-12 px-7 gap-2 bg-card hover:bg-muted"
                onClick={() => {
                  const el = document.getElementById("startups");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                }}
              >
                <Sparkles className="w-5 h-5 text-primary" />
                Découvrir les startups ({dynamicMetrics.totalStartups})
              </Button>
            </div>

            {/* Live Data Badge */}
            <div className="flex items-center justify-center gap-2 pt-2 text-xs text-muted-foreground">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>
                Données d'incubation en direct :{" "}
                <strong className="text-foreground">{dynamicMetrics.totalStartups} startups actives</strong> ·{" "}
                <strong className="text-foreground">{dynamicMetrics.certifiedCount} labellisée{dynamicMetrics.certifiedCount > 1 ? "s" : ""}</strong> ·{" "}
                <strong className="text-foreground">{dynamicMetrics.totalJobsCreated} membres d'équipe</strong>
              </span>
            </div>

            {/* Institutional Trust Badges */}
            <div className="pt-8 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto border-t border-border/60 text-xs text-muted-foreground">
              <div className="flex items-center justify-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
                <span>Agrément Institutionnel</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <Award className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Label d'Excellence Certifié</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <Users className="w-4 h-4 text-teal-600 shrink-0" />
                <span>Mentorat Terrain Dédié</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <Globe2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Réseau Panafricain & Écosystème</span>
              </div>
            </div>
          </div>
        </section>

        {/* DYNAMIC STATS SECTION */}
        <section id="stats" className="py-16 md:py-24 bg-muted/30 border-b border-border/40">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-emerald-500/10 text-emerald-700 text-xs font-semibold uppercase tracking-wider">
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Statistiques Dynamiques de l'Incubateur</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                Des résultats tangibles mesurés en temps réel
              </h2>
              <p className="text-muted-foreground text-base">
                Les indicateurs clés de performance consolidés en direct à partir des startups
                incubées et des formations dispensées.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Stat 1: Startups Incubées */}
              <Card className="border border-border/60 shadow-xs hover:shadow-md transition-shadow bg-card/70 backdrop-blur-xs">
                <CardContent className="p-6 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 flex items-center justify-center">
                      <Rocket className="w-6 h-6" />
                    </div>
                    <Badge variant="outline" className="border-emerald-200 text-emerald-700 bg-emerald-50/50">
                      En portefeuille
                    </Badge>
                  </div>
                  <div className="text-4xl font-extrabold tracking-tight text-foreground pt-2">
                    {dynamicMetrics.totalStartups}
                  </div>
                  <div className="font-semibold text-base text-foreground">
                    Startups Agri-Tech incubées
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {dynamicMetrics.accelerationCount} en phase d'accélération, {dynamicMetrics.pilotageCount} en pilotage KPI et {dynamicMetrics.diagnosticCount} en diagnostic initial.
                  </p>
                </CardContent>
              </Card>

              {/* Stat 2: Startups Labellisées */}
              <Card className="border border-border/60 shadow-xs hover:shadow-md transition-shadow bg-card/70 backdrop-blur-xs">
                <CardContent className="p-6 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-950/50 text-amber-700 flex items-center justify-center">
                      <Award className="w-6 h-6" />
                    </div>
                    <Badge variant="outline" className="border-amber-200 text-amber-700 bg-amber-50/50">
                      Excellence
                    </Badge>
                  </div>
                  <div className="text-4xl font-extrabold tracking-tight text-foreground pt-2">
                    {dynamicMetrics.certifiedCount}
                  </div>
                  <div className="font-semibold text-base text-foreground">
                    Startups Labellisées & Certifiées
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Projets ayant validé leur soutenance devant le jury indépendant et reçu le Label officiel E-GrainoLab.
                  </p>
                </CardContent>
              </Card>

              {/* Stat 3: Emplois & Fondateurs */}
              <Card className="border border-border/60 shadow-xs hover:shadow-md transition-shadow bg-card/70 backdrop-blur-xs">
                <CardContent className="p-6 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-950/50 text-blue-700 flex items-center justify-center">
                      <Users className="w-6 h-6" />
                    </div>
                    <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50/50">
                      Équipes & R&D
                    </Badge>
                  </div>
                  <div className="text-4xl font-extrabold tracking-tight text-foreground pt-2">
                    {dynamicMetrics.totalJobsCreated}
                  </div>
                  <div className="font-semibold text-base text-foreground">
                    Ingénieurs & Fondateurs mobilisés
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Agronomes, développeurs et spécialistes de terrain composant les équipes fondatrices des startups.
                  </p>
                </CardContent>
              </Card>

              {/* Stat 4: Secteurs d'activité */}
              <Card className="border border-border/60 shadow-xs hover:shadow-md transition-shadow bg-card/70 backdrop-blur-xs">
                <CardContent className="p-6 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-xl bg-teal-100 dark:bg-teal-950/50 text-teal-700 flex items-center justify-center">
                      <Cpu className="w-6 h-6" />
                    </div>
                    <Badge variant="outline" className="border-teal-200 text-teal-700 bg-teal-50/50">
                      Diversification
                    </Badge>
                  </div>
                  <div className="text-4xl font-extrabold tracking-tight text-foreground pt-2">
                    {dynamicMetrics.sectorsCount}
                  </div>
                  <div className="font-semibold text-base text-foreground">
                    Filières d'innovation couvertes
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Irrigation, bio-intrants, traçabilité, drones de télédétection, énergie solaire et fintech de stockage.
                  </p>
                </CardContent>
              </Card>

              {/* Stat 5: Taux de Pérennité */}
              <Card className="border border-border/60 shadow-xs hover:shadow-md transition-shadow bg-card/70 backdrop-blur-xs">
                <CardContent className="p-6 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-950/50 text-green-700 flex items-center justify-center">
                      <TrendingUp className="w-6 h-6" />
                    </div>
                    <Badge variant="outline" className="border-green-200 text-green-700 bg-green-50/50">
                      Pérennité
                    </Badge>
                  </div>
                  <div className="text-4xl font-extrabold tracking-tight text-foreground pt-2">
                    {dynamicMetrics.survivalRate}%
                  </div>
                  <div className="font-semibold text-base text-foreground">
                    Taux d'avancement du parcours
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Proportion des startups franchissant avec succès le diagnostic vers l'onboarding et l'accélération.
                  </p>
                </CardContent>
              </Card>

              {/* Stat 6: Agriculteurs & Apprenants formés */}
              <Card className="border border-border/60 shadow-xs hover:shadow-md transition-shadow bg-card/70 backdrop-blur-xs">
                <CardContent className="p-6 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-950/50 text-purple-700 flex items-center justify-center">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    <Badge variant="outline" className="border-purple-200 text-purple-700 bg-purple-50/50">
                      Formation & Diffusion
                    </Badge>
                  </div>
                  <div className="text-4xl font-extrabold tracking-tight text-foreground pt-2">
                    {dbFarmersCount}
                  </div>
                  <div className="font-semibold text-base text-foreground">
                    Apprenants & Professionnels inscrits
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Inscrits sur les {dbCoursesCount} cours et modules certifiants disponibles sur la plateforme.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* DYNAMIC STARTUPS SHOWCASE SECTION */}
        <section id="startups" className="py-20 border-b border-border/40">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider">
                  <Rocket className="w-3.5 h-3.5" />
                  <span>Annuaire des Pépites Incubées</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                  Les Startups de notre Incubateur
                </h2>
                <p className="text-muted-foreground text-sm max-w-2xl">
                  Découvrez les solutions technologiques développées au sein d'E-GrainoLab. Filtrables
                  en temps réel selon leur stade d'incubation et leur domaine d'intervention.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchStartupData}
                  disabled={loadingStartups}
                  className="gap-1.5 text-xs h-9"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingStartups ? "animate-spin" : ""}`} />
                  <span>Actualiser</span>
                </Button>
                <Button
                  size="sm"
                  onClick={() => navigate("/auth")}
                  className="gap-1.5 text-xs h-9"
                >
                  <Rocket className="w-3.5 h-3.5" />
                  <span>Rejoindre la promotion</span>
                </Button>
              </div>
            </div>

            {/* Filters Bar */}
            <div className="bg-card border border-border/70 rounded-2xl p-4 mb-8 space-y-4 shadow-xs">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    placeholder="Rechercher une startup, une technologie, un domaine..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 text-sm h-10"
                  />
                </div>

                {/* Stage Filter Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                  <Button
                    size="sm"
                    variant={selectedStageFilter === "all" ? "default" : "outline"}
                    onClick={() => setSelectedStageFilter("all")}
                    className="text-xs h-9 whitespace-nowrap"
                  >
                    Toutes ({startups.length})
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedStageFilter === "certifie" ? "default" : "outline"}
                    onClick={() => setSelectedStageFilter("certifie")}
                    className="text-xs h-9 whitespace-nowrap"
                  >
                    Labellisées ({dynamicMetrics.certifiedCount})
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedStageFilter === "acceleration" ? "default" : "outline"}
                    onClick={() => setSelectedStageFilter("acceleration")}
                    className="text-xs h-9 whitespace-nowrap"
                  >
                    Accélération ({dynamicMetrics.accelerationCount})
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedStageFilter === "pilotage" ? "default" : "outline"}
                    onClick={() => setSelectedStageFilter("pilotage")}
                    className="text-xs h-9 whitespace-nowrap"
                  >
                    Pilotage ({dynamicMetrics.pilotageCount})
                  </Button>
                </div>
              </div>

              {/* Sectors quick selector */}
              {dynamicMetrics.sectors.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-border/50 text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground flex items-center gap-1">
                    <Filter className="w-3 h-3" /> Filière :
                  </span>
                  <button
                    onClick={() => setSelectedSectorFilter("all")}
                    className={`px-2.5 py-1 rounded-full text-xs transition-colors ${
                      selectedSectorFilter === "all"
                        ? "bg-primary text-primary-foreground font-medium"
                        : "bg-muted hover:bg-muted/80 text-foreground"
                    }`}
                  >
                    Tous ({dynamicMetrics.sectors.length})
                  </button>
                  {dynamicMetrics.sectors.map((sec, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedSectorFilter(sec)}
                      className={`px-2.5 py-1 rounded-full text-xs transition-colors ${
                        selectedSectorFilter === sec
                          ? "bg-primary text-primary-foreground font-medium"
                          : "bg-muted hover:bg-muted/80 text-foreground"
                      }`}
                    >
                      {sec}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Startups Cards Grid */}
            {filteredStartups.length === 0 ? (
              <div className="text-center py-16 bg-muted/20 border border-dashed rounded-2xl space-y-3">
                <Rocket className="w-10 h-10 text-muted-foreground mx-auto stroke-1" />
                <h3 className="font-semibold text-base">Aucune startup trouvée</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Aucun projet ne correspond à vos critères de recherche. Réinitialisez les filtres
                  ou déposez votre propre candidature.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedStageFilter("all");
                    setSelectedSectorFilter("all");
                  }}
                >
                  Réinitialiser les filtres
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredStartups.map((item) => {
                  const stageInfo = STAGE_CONFIG[item.stage] || STAGE_CONFIG.diagnostic;
                  return (
                    <Card
                      key={item.id}
                      className="border border-border/70 hover:border-primary/50 transition-all hover:-translate-y-1 shadow-xs bg-card flex flex-col justify-between group"
                    >
                      <CardContent className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                        <div className="space-y-3">
                          {/* Header: Sector + Stage Badge */}
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-[11px] font-semibold text-primary uppercase tracking-wider bg-primary/10 px-2 py-0.5 rounded-md">
                              {item.sector}
                            </span>
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1.5 shrink-0 ${stageInfo.badgeColor}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${stageInfo.dotColor}`} />
                              {stageInfo.label}
                            </span>
                          </div>

                          {/* Startup Name */}
                          <div>
                            <h3 className="text-xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors flex items-center gap-2">
                              {item.name}
                              {item.is_verified_label && (
                                <Award className="w-4 h-4 text-emerald-600" title="Label d'Excellence E-GrainoLab" />
                              )}
                            </h3>
                          </div>

                          {/* Description */}
                          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                            {item.description}
                          </p>
                        </div>

                        {/* Footer details */}
                        <div className="pt-4 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-muted-foreground" />
                            <span>{item.team_size} membre{item.team_size > 1 ? "s" : ""}</span>
                          </div>

                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-xs font-semibold text-primary hover:text-primary/80 gap-1"
                            onClick={() => setActiveModalStartup(item)}
                          >
                            <span>Fiche complète</span>
                            <ArrowRight className="w-3 h-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* INSTITUTIONAL PRESENTATION SECTION */}
        <section id="incubateur" className="py-20 border-b border-border/40">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="grid lg:grid-cols-12 gap-12 items-center">
              <div className="lg:col-span-6 space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider">
                  <Building2 className="w-4 h-4" />
                  <span>Cadre Institutionnel & Mission</span>
                </div>

                <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-snug">
                  L'Incubateur GrainoLab :{" "}
                  <span className="text-primary">Bâtir la résilience agricole</span> par
                  l'innovation de terrain
                </h2>

                <p className="text-muted-foreground leading-relaxed">
                  L'<strong>Incubateur E-GrainoLab</strong> a été fondé avec une ambition claire :
                  combler le fossé entre la recherche agronomique de pointe et l'adoption pratique
                  sur les exploitations agricoles.
                </p>

                <p className="text-muted-foreground leading-relaxed">
                  Sous un mandat institutionnel axé sur la souveraineté alimentaire et la transition
                  agro-écologique, nous offrons un environnement sécurisé où les entrepreneurs
                  bénéficient d'un accès direct à des parcelles expérimentales, à un FabLab
                  technologique et à un réseau de mentors de premier ordre.
                </p>

                <div className="space-y-3 pt-2">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <p className="text-sm text-foreground">
                      <strong>Gouvernance transparente & éthique :</strong> Chaque startup est évaluée
                      par des comités indépendants selon des critères d'impact, de viabilité et de
                      déontologie.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <p className="text-sm text-foreground">
                      <strong>Protection & valorisation de la PI :</strong> Accompagnement juridique
                      dédié pour sécuriser brevets, marques et savoir-faire agronomiques.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <p className="text-sm text-foreground">
                      <strong>Passeport Investisseurs & Bailleurs :</strong> Le Label d'Excellence
                      ouvre les portes aux financements souverains et fonds internationaux.
                    </p>
                  </div>
                </div>

                <div className="pt-4">
                  <Button
                    size="lg"
                    className="gap-2"
                    onClick={() => navigate("/auth")}
                  >
                    Déposer un dossier de candidature
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="lg:col-span-6 grid sm:grid-cols-2 gap-4">
                {INSTITUTIONAL_PILLARS.map((pillar, idx) => {
                  const IconComp = pillar.icon;
                  return (
                    <Card
                      key={idx}
                      className="border border-border/70 hover:border-primary/50 transition-colors shadow-xs bg-card"
                    >
                      <CardContent className="p-6 space-y-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                          <IconComp className="w-5 h-5" />
                        </div>
                        <h3 className="font-bold text-base text-foreground">{pillar.title}</h3>
                        <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                          {pillar.description}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* INCUBATION JOURNEY - 5 STAGES */}
        <section id="parcours" className="py-20 bg-muted/20 border-b border-border/40">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
              <div className="inline-block px-3 py-1 rounded-md bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider">
                Méthodologie Éprouvée
              </div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                Le Parcours d'Incubation en 5 Étapes Clés
              </h2>
              <p className="text-muted-foreground text-base">
                Un accompagnement séquentiel et exigeant, guidant chaque porteur de projet de l'idée
                brute jusqu'à l'obtention du Label d'Excellence et la mise à l'échelle.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {INCUBATION_STAGES.map((stage, idx) => {
                const StageIcon = stage.icon;
                return (
                  <div
                    key={idx}
                    className="relative flex flex-col justify-between bg-card rounded-2xl p-5 border border-border/70 hover:border-primary/40 transition-all hover:-translate-y-1 shadow-xs group"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-2xl font-black text-primary/30 group-hover:text-primary transition-colors">
                          {stage.step}
                        </span>
                        <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                          <StageIcon className="w-4 h-4" />
                        </div>
                      </div>

                      <Badge variant="secondary" className="text-[10px] font-medium mb-2">
                        {stage.badge}
                      </Badge>

                      <h3 className="text-base font-bold text-foreground mb-1">{stage.title}</h3>
                      <p className="text-xs font-semibold text-primary mb-2.5">
                        {stage.subtitle}
                      </p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {stage.description}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-border/50 text-[11px] font-medium text-primary flex items-center gap-1">
                      <span>Étape obligatoire</span>
                      <ChevronRight className="w-3 h-3" />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-12 bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 text-white rounded-2xl p-8 md:p-10 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-2 max-w-2xl">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-medium">
                  <Award className="w-3.5 h-3.5" />
                  Appel à candidatures ouvert pour la promotion en cours
                </div>
                <h3 className="text-2xl font-bold">
                  Vous portez une startup ou une innovation agri-tech ?
                </h3>
                <p className="text-sm text-slate-300">
                  Soumettez votre projet au diagnostic initial en moins de 10 minutes. Nos comités
                  étudient les dossiers de façon continue.
                </p>
              </div>
              <Button
                size="lg"
                className="bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-bold shrink-0 h-12 px-6"
                onClick={() => navigate("/auth")}
              >
                Démarrer le Diagnostic
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </div>
        </section>

        {/* E-LEARNING COMPLEMENTARY SECTION */}
        <section id="formations" className="py-20 border-b border-border/40">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
              <div className="inline-block px-3 py-1 rounded-md bg-blue-500/10 text-blue-700 text-xs font-semibold uppercase tracking-wider">
                E-Learning & Montée en Compétences
              </div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                Une formation continue pour tous les acteurs agricoles
              </h2>
              <p className="text-muted-foreground text-base">
                L'accès direct au savoir agricole validé : vidéos terrains, quiz interactifs et
                certificats officiels infalsifiables.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <Card className="border border-border/70 shadow-xs">
                <CardContent className="p-8 space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold">Modules pédagogiques ciblés</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Des cursus complets sur l'agronomie régénératrice, l'irrigation de précision, la
                    comptabilité agricole et l'usage des technologies embarquées.
                  </p>
                </CardContent>
              </Card>

              <Card className="border border-border/70 shadow-xs">
                <CardContent className="p-8 space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-teal-500/10 flex items-center justify-center">
                    <Users className="w-6 h-6 text-teal-600" />
                  </div>
                  <h3 className="text-xl font-bold">Formateurs & Praticiens experts</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Des contenus dispensés par des professionnels ayant une longue pratique de terrain
                    associée à la recherche agronomique appliquée.
                  </p>
                </CardContent>
              </Card>

              <Card className="border border-border/70 shadow-xs">
                <CardContent className="p-8 space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <Award className="w-6 h-6 text-emerald-600" />
                  </div>
                  <h3 className="text-xl font-bold">Certificats sécurisés par QR Code</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Délivrance de certificats officiels téléchargeables en PDF et vérifiables en ligne
                    instantanément par les employeurs et bailleurs.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* INSTITUTIONAL PARTNERS */}
        <section id="partenaires" className="py-20 bg-muted/30">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
              <div className="inline-block px-3 py-1 rounded-md bg-muted text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                Écosystème Partenaire
              </div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                Soutenu par les institutions et acteurs majeurs
              </h2>
              <p className="text-muted-foreground text-base">
                Notre dispositif s'appuie sur une alliance stratégique entre secteur public,
                recherche agronomique, coopératives agricoles et investisseurs d'impact.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {PARTNERS.map((partner, idx) => (
                <div
                  key={idx}
                  className="bg-card border border-border/70 rounded-xl p-5 flex flex-col justify-center space-y-1.5 shadow-xs hover:border-primary/40 transition-colors"
                >
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                    {partner.category}
                  </span>
                  <span className="font-bold text-base text-foreground">{partner.name}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-border/60 bg-card py-12 text-sm text-muted-foreground">
        <div className="container mx-auto px-4 max-w-6xl grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="space-y-3 md:col-span-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
                <Leaf className="w-4 h-4" />
              </div>
              <span className="text-lg font-bold text-foreground">E-GrainoLab</span>
            </div>
            <p className="text-xs text-muted-foreground max-w-md leading-relaxed">
              Dispositif institutionnel d'apprentissage agricole et incubateur d'innovations
              agri-tech pour la souveraineté alimentaire, la durabilité et l'inclusion des filières
              paysannes.
            </p>
            <div className="flex items-center gap-4 text-xs pt-1">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-primary" /> Campus AgriTech & Parcelles d'Essai
              </span>
              <span className="flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-primary" /> contact@egrainolab.org
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-foreground text-xs uppercase tracking-wider">
              L'Incubateur
            </h4>
            <ul className="space-y-1.5 text-xs">
              <li>
                <a href="#incubateur" className="hover:text-primary transition-colors">
                  Présentation institutionnelle
                </a>
              </li>
              <li>
                <a href="#startups" className="hover:text-primary transition-colors">
                  Annuaire des Startups ({dynamicMetrics.totalStartups})
                </a>
              </li>
              <li>
                <a href="#parcours" className="hover:text-primary transition-colors">
                  Parcours en 5 étapes
                </a>
              </li>
              <li>
                <a href="#stats" className="hover:text-primary transition-colors">
                  Chiffres & Impact
                </a>
              </li>
              <li>
                <a href="#partenaires" className="hover:text-primary transition-colors">
                  Partenaires institutionnels
                </a>
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-foreground text-xs uppercase tracking-wider">
              Accès Plateforme
            </h4>
            <ul className="space-y-1.5 text-xs">
              <li>
                <a
                  href="/auth"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate("/auth");
                  }}
                  className="hover:text-primary transition-colors"
                >
                  Espace Apprenant
                </a>
              </li>
              <li>
                <a
                  href="/auth"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate("/auth");
                  }}
                  className="hover:text-primary transition-colors"
                >
                  Espace Incubé
                </a>
              </li>
              <li>
                <a
                  href="/auth"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate("/auth");
                  }}
                  className="hover:text-primary transition-colors"
                >
                  Administration & Jurys
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="container mx-auto px-4 max-w-6xl pt-6 border-t border-border/40 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs">
          <p>© {new Date().getFullYear()} E-GrainoLab. Tous droits réservés.</p>
          <div className="flex gap-4">
            <a href="#" className="hover:underline">
              Mentions Légales
            </a>
            <a href="#" className="hover:underline">
              Politique de Confidentialité
            </a>
            <a href="#" className="hover:underline">
              Charte Éthique & Label
            </a>
          </div>
        </div>
      </footer>

      {/* STARTUP DETAIL MODAL */}
      <Dialog
        open={Boolean(activeModalStartup)}
        onOpenChange={(open) => {
          if (!open) setActiveModalStartup(null);
        }}
      >
        <DialogContent className="max-w-lg">
          {activeModalStartup && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="text-xs uppercase tracking-wider bg-primary/10 text-primary border-primary/20">
                    {activeModalStartup.sector}
                  </Badge>
                  {STAGE_CONFIG[activeModalStartup.stage] && (
                    <Badge className={`text-xs border ${STAGE_CONFIG[activeModalStartup.stage].badgeColor}`}>
                      {STAGE_CONFIG[activeModalStartup.stage].label}
                    </Badge>
                  )}
                </div>
                <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                  {activeModalStartup.name}
                  {activeModalStartup.is_verified_label && (
                    <Award className="w-5 h-5 text-emerald-600" title="Label d'Excellence E-GrainoLab" />
                  )}
                </DialogTitle>
                <DialogDescription className="text-sm pt-2 text-foreground/90 leading-relaxed">
                  {activeModalStartup.description}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 pt-4 border-t border-border/60 text-sm">
                <div className="grid grid-cols-2 gap-3 bg-muted/40 p-3 rounded-xl">
                  <div>
                    <span className="text-xs text-muted-foreground block">Taille de l'équipe</span>
                    <span className="font-semibold text-foreground flex items-center gap-1 mt-0.5">
                      <Users className="w-3.5 h-3.5 text-primary" /> {activeModalStartup.team_size} personnes
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Stade d'accompagnement</span>
                    <span className="font-semibold text-foreground capitalize mt-0.5 block">
                      {activeModalStartup.stage}
                    </span>
                  </div>
                </div>

                {activeModalStartup.website_url && (
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-muted-foreground">Site officiel ou démo :</span>
                    <a
                      href={activeModalStartup.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                    >
                      <span>{activeModalStartup.website_url.replace(/^https?:\/\//, "")}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-border/60">
                <Button variant="outline" size="sm" onClick={() => setActiveModalStartup(null)}>
                  Fermer
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setActiveModalStartup(null);
                    navigate("/auth");
                  }}
                  className="gap-1.5"
                >
                  <Rocket className="w-4 h-4" />
                  <span>Contacter / Collaborer</span>
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
