import { User } from "@supabase/supabase-js";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Users, GraduationCap, CheckCircle, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface SuperAdminDashboardProps {
  user: User;
}

const SuperAdminDashboard = ({ user }: SuperAdminDashboardProps) => {
  const navigate = useNavigate();

  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [coursesData, lessonsData, usersData, enrollmentsData] = await Promise.all([
        supabase.from("courses").select("id", { count: "exact" }),
        supabase.from("lessons").select("id", { count: "exact" }),
        supabase.from("profiles").select("id", { count: "exact" }),
        supabase.from("enrollments").select("id", { count: "exact" }),
      ]);

      return {
        coursesCount: coursesData.count || 0,
        lessonsCount: lessonsData.count || 0,
        usersCount: usersData.count || 0,
        enrollmentsCount: enrollmentsData.count || 0,
      };
    },
  });

  const { data: pendingLessons } = useQuery({
    queryKey: ["pending-lessons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("id, title")
        .limit(5);

      if (error) throw error;
      return data || [];
    },
  });

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Déconnexion réussie");
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-foreground">E-GrainoLab</h1>
            <p className="text-sm text-muted-foreground">
              Administration Globale
            </p>
          </div>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Déconnexion
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6 md:grid-cols-4 mb-8">
          <Card className="bg-gradient-card border-none shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Leçons</CardTitle>
              <BookOpen className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">
                {stats?.lessonsCount}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Dans la plateforme
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-none shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Apprenants</CardTitle>
              <GraduationCap className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-accent">
                {stats?.usersCount}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Utilisateurs actifs
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-none shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Modules</CardTitle>
              <BookOpen className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-success">
                {stats?.coursesCount}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Modules actifs
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-none shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inscriptions</CardTitle>
              <Users className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-warning">
                {stats?.enrollmentsCount}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Total inscriptions
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-warning" />
              Leçons en attente de validation
            </CardTitle>
            <CardDescription>
              Leçons soumises par les formateurs nécessitant votre approbation
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pendingLessons && pendingLessons.length > 0 ? (
              <div className="space-y-4">
                {pendingLessons.map((lesson) => (
                  <div
                    key={lesson.id}
                    className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold mb-1">{lesson.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          Leçon #{lesson.id.substring(0, 8)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          Voir
                        </Button>
                        <Button size="sm">Valider</Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                Toutes les leçons sont traitées
              </p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default SuperAdminDashboard;
