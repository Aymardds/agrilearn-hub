import { User } from "@supabase/supabase-js";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Award, TrendingUp, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface ApprenantDashboardProps {
  user: User;
}

const ApprenantDashboard = ({ user }: ApprenantDashboardProps) => {
  const navigate = useNavigate();

  const { data: profile } = useQuery({
    queryKey: ["profile", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const { data: enrollments } = useQuery({
    queryKey: ["enrollments", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollments")
        .select("*, courses(*)")
        .eq("user_id", user.id);

      if (error) throw error;
      return data;
    },
  });

  const { data: certificates } = useQuery({
    queryKey: ["certificates", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("certificates")
        .select("*, courses(title)")
        .eq("user_id", user.id);

      if (error) throw error;
      return data;
    },
  });

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Déconnexion réussie");
    navigate("/auth");
  };

  const inProgressCount = enrollments?.filter((e) => !e.completed_at).length || 0;
  const completedCount = enrollments?.filter((e) => e.completed_at).length || 0;
  const certificatesCount = certificates?.length || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-foreground">E-GrainoLab</h1>
            <p className="text-sm text-muted-foreground">
              Bienvenue, {profile?.full_name || "Apprenant"}
            </p>
          </div>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Déconnexion
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <Card className="bg-gradient-card border-none shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cours en cours</CardTitle>
              <BookOpen className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{inProgressCount}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Modules actifs
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-none shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cours terminés</CardTitle>
              <TrendingUp className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-success">{completedCount}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Modules complétés
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-none shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Certificats</CardTitle>
              <Award className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-accent">{certificatesCount}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Obtenus
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Mes cours en cours</CardTitle>
              <CardDescription>
                Continuez votre apprentissage
              </CardDescription>
            </CardHeader>
            <CardContent>
              {enrollments && enrollments.length > 0 ? (
                <div className="space-y-4">
                  {enrollments
                    .filter((e) => !e.completed_at)
                    .map((enrollment) => (
                      <div
                        key={enrollment.id}
                        className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow"
                      >
                        <h3 className="font-semibold mb-2">
                          {enrollment.courses?.title}
                        </h3>
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-muted-foreground">
                            Progression: {enrollment.progress_percentage}%
                          </div>
                          <Button size="sm" variant="outline">
                            Continuer
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  Aucun cours en cours. Explorez notre catalogue!
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Mes certificats</CardTitle>
              <CardDescription>
                Vos accomplissements
              </CardDescription>
            </CardHeader>
            <CardContent>
              {certificates && certificates.length > 0 ? (
                <div className="space-y-4">
                  {certificates.map((cert) => (
                    <div
                      key={cert.id}
                      className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold mb-1">
                            {cert.courses?.title}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Délivré le{" "}
                            {new Date(cert.issued_at).toLocaleDateString("fr-FR")}
                          </p>
                        </div>
                        <Button size="sm" variant="outline">
                          Télécharger
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  Aucun certificat pour le moment
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default ApprenantDashboard;
