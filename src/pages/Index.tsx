import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowRight, BookOpen, Award, Users, Leaf } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      }
    });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background">
      <header className="container mx-auto px-4 py-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
            <Leaf className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">E-GrainoLab</h1>
        </div>
        <Button variant="outline" onClick={() => navigate("/auth")}>
          Connexion
        </Button>
      </header>

      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-block px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            Plateforme d'apprentissage agricole
          </div>
          <h2 className="text-5xl md:text-6xl font-bold text-foreground leading-tight">
            Cultivez vos compétences en{" "}
            <span className="text-primary">agriculture</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            E-GrainoLab vous offre une formation complète et structurée pour
            développer vos compétences agricoles, avec des cours multimédias,
            des quiz interactifs et des certificats reconnus.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="text-lg"
              onClick={() => navigate("/auth")}
            >
              Commencer maintenant
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button size="lg" variant="outline" className="text-lg">
              Découvrir les cours
            </Button>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-20">
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="bg-gradient-card p-8 rounded-2xl shadow-lg border">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <BookOpen className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Cours structurés</h3>
            <p className="text-muted-foreground">
              Des modules complets avec leçons vidéo, documents PDF et contenus
              interactifs adaptés au secteur agricole.
            </p>
          </div>

          <div className="bg-gradient-card p-8 rounded-2xl shadow-lg border">
            <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-accent" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Formateurs experts</h3>
            <p className="text-muted-foreground">
              Apprenez auprès de professionnels expérimentés du secteur agricole
              avec des années d'expertise terrain.
            </p>
          </div>

          <div className="bg-gradient-card p-8 rounded-2xl shadow-lg border">
            <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mb-4">
              <Award className="w-6 h-6 text-success" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Certificats reconnus</h3>
            <p className="text-muted-foreground">
              Obtenez des certificats PDF officiels à la fin de chaque module,
              validant vos nouvelles compétences.
            </p>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-20">
        <div className="bg-gradient-primary rounded-3xl p-12 text-center max-w-4xl mx-auto shadow-xl">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Prêt à démarrer votre formation ?
          </h2>
          <p className="text-white/90 text-lg mb-8 max-w-2xl mx-auto">
            Rejoignez des centaines d'agriculteurs qui développent leurs
            compétences grâce à E-GrainoLab.
          </p>
          <Button
            size="lg"
            variant="secondary"
            className="text-lg"
            onClick={() => navigate("/auth")}
          >
            S'inscrire gratuitement
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </section>

      <footer className="border-t mt-20">
        <div className="container mx-auto px-4 py-8 text-center text-muted-foreground">
          <p>© 2025 E-GrainoLab. Plateforme d'apprentissage agricole.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
