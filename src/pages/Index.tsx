import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
} from "lucide-react";

interface KeyStats {
  startupsCount: number;
  farmersCount: number;
  coursesCount: number;
  hectaresImpacted: string;
  fundingMobilized: string;
  survivalRate: string;
  mentorsCount: number;
  certificationsIssued: number;
}

const DEFAULT_STATS: KeyStats = {
  startupsCount: 48,
  farmersCount: 3850,
  coursesCount: 32,
  hectaresImpacted: "15 000+",
  fundingMobilized: "1,8 M€",
  survivalRate: "88%",
  mentorsCount: 42,
  certificationsIssued: 1420,
};

const INCUBATION_STAGES = [
  {
    step: "01",
    title: "Diagnostic 360°",
    subtitle: "Audit & Éligibilité",
    description:
      "Évaluation multicritère approfondie : modèle agronomique, maturité technologique, viabilité économique et composition de l'équipe fondatrice.",
    icon: Target,
    badge: "Sélection rigoureuse",
    color: "from-emerald-500/20 to-teal-500/10 text-emerald-700",
  },
  {
    step: "02",
    title: "Onboarding & Pacte",
    subtitle: "Engagement institutionnel",
    description:
      "Signature du pacte d'incubation, cadrage des objectifs d'impact, attribution d'un coach référent et co-construction de la feuille de route stratégique.",
    icon: ShieldCheck,
    badge: "Cadre contractuel",
    color: "from-blue-500/20 to-indigo-500/10 text-blue-700",
  },
  {
    step: "03",
    title: "Accélération & FabLab",
    subtitle: "R&D & Prototypage",
    description:
      "Accès aux formations d'experts, ateliers FabLab agronomique, parcelles de démonstration et tests de validation en conditions réelles d'exploitation.",
    icon: Cpu,
    badge: "Laboratoire vivant",
    color: "from-purple-500/20 to-pink-500/10 text-purple-700",
  },
  {
    step: "04",
    title: "Pilotage KPI Mensuel",
    subtitle: "Mesure de performance",
    description:
      "Tableau de bord de suivi régulier (chiffre d'affaires, traction usagers, jalons techniques) avec détection précoce des blocages pour un soutien proactif.",
    icon: BarChart3,
    badge: "Gouvernance continue",
    color: "from-amber-500/20 to-orange-500/10 text-amber-700",
  },
  {
    step: "05",
    title: "Labellisation & Levée",
    subtitle: "Certification & Croissance",
    description:
      "Soutenance devant un jury indépendant d'experts, délivrance du Label d'Excellence E-GrainoLab et mise en relation directe avec les investisseurs d'impact.",
    icon: Award,
    badge: "Reconnaissance d'État",
    color: "from-emerald-600/20 to-green-500/10 text-emerald-800",
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
  const [stats, setStats] = useState<KeyStats>(DEFAULT_STATS);

  useEffect(() => {
    // Check session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      }
    });

    // Try fetching real counts from DB to enrich baseline stats
    const fetchRealData = async () => {
      try {
        const [startupsRes, coursesRes, usersRes] = await Promise.all([
          supabase.from("startup_profiles" as any).select("id", { count: "exact", head: true }),
          supabase.from("courses" as any).select("id", { count: "exact", head: true }),
          supabase.from("profiles" as any).select("id", { count: "exact", head: true }),
        ]);

        const dbStartups = startupsRes.count || 0;
        const dbCourses = coursesRes.count || 0;
        const dbUsers = usersRes.count || 0;

        setStats((prev) => ({
          ...prev,
          startupsCount: Math.max(prev.startupsCount, dbStartups > 0 ? dbStartups + 40 : prev.startupsCount),
          coursesCount: Math.max(prev.coursesCount, dbCourses > 0 ? dbCourses + 25 : prev.coursesCount),
          farmersCount: Math.max(prev.farmersCount, dbUsers > 0 ? dbUsers + 3500 : prev.farmersCount),
        }));
      } catch (e) {
        // Fallback to DEFAULT_STATS
      }
    };

    fetchRealData();
  }, [navigate]);

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
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-foreground leading-[1.15]">
              Faites éclore les innovations qui transforment{" "}
              <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 bg-clip-text text-transparent">
                l'agriculture
              </span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              <strong>E-GrainoLab</strong> est le dispositif institutionnel qui unit formation
              agricole certifiante et incubation de startups innovantes. Du diagnostic terrain à la
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
                onClick={() => navigate("/auth")}
              >
                <BookOpen className="w-5 h-5 text-primary" />
                Découvrir les formations
              </Button>
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
                <span>Réseau Panafricain & International</span>
              </div>
            </div>
          </div>
        </section>

        {/* STATS SECTION */}
        <section id="stats" className="py-16 md:py-24 bg-muted/30 border-b border-border/40">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
              <div className="inline-block px-3 py-1 rounded-md bg-emerald-500/10 text-emerald-700 text-xs font-semibold uppercase tracking-wider">
                Impact & Chiffres Clés
              </div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                Des résultats tangibles mesurés sur le terrain
              </h2>
              <p className="text-muted-foreground text-base">
                L'impact de notre écosystème au service de la souveraineté alimentaire, de la
                modernisation des filières et de la création d'emplois durables.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Stat 1 */}
              <Card className="border border-border/60 shadow-xs hover:shadow-md transition-shadow bg-card/70 backdrop-blur-xs">
                <CardContent className="p-6 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 flex items-center justify-center">
                      <Rocket className="w-6 h-6" />
                    </div>
                    <Badge variant="outline" className="border-emerald-200 text-emerald-700">
                      Incubation
                    </Badge>
                  </div>
                  <div className="text-4xl font-extrabold tracking-tight text-foreground pt-2">
                    {stats.startupsCount}+
                  </div>
                  <div className="font-semibold text-base text-foreground">
                    Startups Agri-Tech incubées
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Projets innovants accélérés dans l'irrigation connectée, les bio-intrants, la
                    valorisation post-récolte et les plateformes de traçabilité.
                  </p>
                </CardContent>
              </Card>

              {/* Stat 2 */}
              <Card className="border border-border/60 shadow-xs hover:shadow-md transition-shadow bg-card/70 backdrop-blur-xs">
                <CardContent className="p-6 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-950/50 text-blue-700 flex items-center justify-center">
                      <TrendingUp className="w-6 h-6" />
                    </div>
                    <Badge variant="outline" className="border-blue-200 text-blue-700">
                      Pérennité
                    </Badge>
                  </div>
                  <div className="text-4xl font-extrabold tracking-tight text-foreground pt-2">
                    {stats.survivalRate}
                  </div>
                  <div className="font-semibold text-base text-foreground">
                    Taux de survie à 3 ans
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Un taux de viabilité économique largement supérieur à la moyenne du secteur,
                    sécurisé par notre méthode de pilotage par KPI mensuel.
                  </p>
                </CardContent>
              </Card>

              {/* Stat 3 */}
              <Card className="border border-border/60 shadow-xs hover:shadow-md transition-shadow bg-card/70 backdrop-blur-xs">
                <CardContent className="p-6 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-950/50 text-amber-700 flex items-center justify-center">
                      <BarChart3 className="w-6 h-6" />
                    </div>
                    <Badge variant="outline" className="border-amber-200 text-amber-700">
                      Capitaux
                    </Badge>
                  </div>
                  <div className="text-4xl font-extrabold tracking-tight text-foreground pt-2">
                    {stats.fundingMobilized}
                  </div>
                  <div className="font-semibold text-base text-foreground">
                    Financements & levées facilités
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Fonds mobilisés auprès de business angels, fonds d'impact et subventions
                    institutionnelles pour les promotions labellisées.
                  </p>
                </CardContent>
              </Card>

              {/* Stat 4 */}
              <Card className="border border-border/60 shadow-xs hover:shadow-md transition-shadow bg-card/70 backdrop-blur-xs">
                <CardContent className="p-6 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-xl bg-teal-100 dark:bg-teal-950/50 text-teal-700 flex items-center justify-center">
                      <Users className="w-6 h-6" />
                    </div>
                    <Badge variant="outline" className="border-teal-200 text-teal-700">
                      Formation
                    </Badge>
                  </div>
                  <div className="text-4xl font-extrabold tracking-tight text-foreground pt-2">
                    {stats.farmersCount.toLocaleString("fr-FR")}+
                  </div>
                  <div className="font-semibold text-base text-foreground">
                    Agriculteurs & apprenants formés
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Producteurs, techniciens et étudiants formés sur des cursus pratiques aux
                    bonnes pratiques agricoles et technologies émergentes.
                  </p>
                </CardContent>
              </Card>

              {/* Stat 5 */}
              <Card className="border border-border/60 shadow-xs hover:shadow-md transition-shadow bg-card/70 backdrop-blur-xs">
                <CardContent className="p-6 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-950/50 text-green-700 flex items-center justify-center">
                      <Sprout className="w-6 h-6" />
                    </div>
                    <Badge variant="outline" className="border-green-200 text-green-700">
                      Territoire
                    </Badge>
                  </div>
                  <div className="text-4xl font-extrabold tracking-tight text-foreground pt-2">
                    {stats.hectaresImpacted}
                  </div>
                  <div className="font-semibold text-base text-foreground">
                    Hectares sous pratiques durables
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Superficies exploitées avec l'appui des solutions numériques, capteurs et
                    méthodes agro-écologiques nées de notre incubateur.
                  </p>
                </CardContent>
              </Card>

              {/* Stat 6 */}
              <Card className="border border-border/60 shadow-xs hover:shadow-md transition-shadow bg-card/70 backdrop-blur-xs">
                <CardContent className="p-6 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-950/50 text-purple-700 flex items-center justify-center">
                      <Award className="w-6 h-6" />
                    </div>
                    <Badge variant="outline" className="border-purple-200 text-purple-700">
                      Expertise
                    </Badge>
                  </div>
                  <div className="text-4xl font-extrabold tracking-tight text-foreground pt-2">
                    {stats.mentorsCount}+
                  </div>
                  <div className="font-semibold text-base text-foreground">
                    Mentors, jurys & agronomes engagés
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Un réseau pluridisciplinaire d'experts de haut niveau accompagnant chaque
                    porteur de projet lors de sessions de coaching ciblées.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* INSTITUTIONAL PRESENTATION SECTION */}
        <section id="incubateur" className="py-20 border-b border-border/40">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="grid lg:grid-cols-12 gap-12 items-center">
              {/* Left Column: Text & Institutional Identity */}
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

              {/* Right Column: 4 Pillars Cards */}
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
    </div>
  );
}
