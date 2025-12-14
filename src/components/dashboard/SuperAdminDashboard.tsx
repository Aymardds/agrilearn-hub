import { User } from "@supabase/supabase-js";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Users, GraduationCap, CheckCircle, Settings, UserCog, Eye, Shield } from "lucide-react";
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

  const { data: pendingLessons, refetch: refetchPendingLessons } = useQuery({
    queryKey: ["pending-lessons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("id, title, is_approved, is_published")
        .or("is_approved.is.null,is_approved.eq.false")
        .limit(5);

      if (error) throw error;
      return data || [];
    },
  });

  const { data: rolesStats } = useQuery({
    queryKey: ["admin-roles-stats"],
    queryFn: async () => {
      const [formateurs, superviseurs, editeurs] = await Promise.all([
        supabase.from("user_roles").select("id", { count: "exact" }).eq("role", "formateur"),
        supabase.from("user_roles").select("id", { count: "exact" }).eq("role", "superviseur"),
        supabase.from("user_roles").select("id", { count: "exact" }).eq("role", "editeur"),
      ]);
      return {
        formateursCount: formateurs.count || 0,
        superviseursCount: superviseurs.count || 0,
        editeursCount: editeurs.count || 0,
      };
    },
  });

  const approveLessonMutation = useMutation({
    mutationFn: async (lessonId: string) => {
      const { error } = await supabase
        .from("lessons")
        .update({ is_approved: true })
        .eq("id", lessonId);
      if (error) throw error;
    },
    onSuccess: async () => {
      await refetchPendingLessons();
      toast.success("Leçon approuvée avec succès");
    },
    onError: (e: any) => toast.error("Erreur lors de l'approbation: " + e.message),
  });

  return (
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
        <Card className="bg-gradient-card border-none shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Formateurs</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{rolesStats?.formateursCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Comptes formateur</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-card border-none shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Superviseurs</CardTitle>
            <Shield className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-accent">{rolesStats?.superviseursCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Comptes superviseur</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-card border-none shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Éditeurs</CardTitle>
            <Eye className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-secondary">{rolesStats?.editeursCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Comptes éditeur</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-6 md:grid-cols-2 mb-8">
        <Card className="shadow-lg cursor-pointer hover:shadow-xl transition-shadow" onClick={() => navigate("/admin/courses")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              Gestion des cours
            </CardTitle>
            <CardDescription>
              Créez, modifiez et supprimez des cours
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full">
              <Settings className="w-4 h-4 mr-2" />
              Gérer les cours
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-lg cursor-pointer hover:shadow-xl transition-shadow" onClick={() => navigate("/admin/users")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCog className="w-5 h-5 text-primary" />
              Gestion des utilisateurs
            </CardTitle>
            <CardDescription>
              Gérez les utilisateurs et leurs rôles
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full">
              <UserCog className="w-4 h-4 mr-2" />
              Gérer les utilisateurs
            </Button>
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
                      <Button size="sm" variant="outline" onClick={() => navigate(`/admin/courses?lesson=${lesson.id}`)}>
                        <Eye className="w-4 h-4 mr-1" />
                        Voir
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => approveLessonMutation.mutate(lesson.id)}
                        disabled={approveLessonMutation.isPending}
                      >
                        {approveLessonMutation.isPending ? "Validation..." : "Valider"}
                      </Button>
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
  );
};

export default SuperAdminDashboard;
