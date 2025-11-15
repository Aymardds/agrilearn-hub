import { User } from "@supabase/supabase-js";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Users, CheckCircle } from "lucide-react";
import DashboardHeader from "@/components/layout/DashboardHeader";

interface FormateurDashboardProps {
  user: User;
}

const FormateurDashboard = ({ user }: FormateurDashboardProps) => {
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

  const { data: courses } = useQuery({
    queryKey: ["instructor-courses", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*, modules(count)")
        .eq("instructor_id", user.id);

      if (error) throw error;
      return data;
    },
  });

  const { data: lessons } = useQuery({
    queryKey: ["instructor-lessons", user.id],
    queryFn: async () => {
      // Get instructor's courses first
      const { data: instructorCourses } = await supabase
        .from("courses")
        .select("id")
        .eq("instructor_id", user.id);

      if (!instructorCourses || instructorCourses.length === 0) {
        return [];
      }

      const courseIds = instructorCourses.map(c => c.id);

      // Get modules for those courses
      const { data: modulesData } = await supabase
        .from("modules")
        .select("id")
        .in("course_id", courseIds);

      if (!modulesData || modulesData.length === 0) {
        return [];
      }

      const moduleIds = modulesData.map(m => m.id);

      // Get lessons for those modules
      const { data, error } = await supabase
        .from("lessons")
        .select("*")
        .in("module_id", moduleIds);

      if (error) throw error;
      return data || [];
    },
  });

  const coursesCount = courses?.length || 0;
  const lessonsCount = lessons?.length || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <DashboardHeader />

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <Card className="bg-gradient-card border-none shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Mes cours</CardTitle>
              <BookOpen className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{coursesCount}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Cours créés
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-none shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Leçons</CardTitle>
              <Users className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-accent">{lessonsCount}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Total créées
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-none shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <CheckCircle className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-success">
                {coursesCount + lessonsCount}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Cours et leçons
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Mon profil formateur</CardTitle>
            <CardDescription>
              Informations professionnelles
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Biographie</h3>
                <p className="text-muted-foreground">
                  {profile?.bio || "Aucune biographie renseignée"}
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Années d'expérience</h3>
                <p className="text-muted-foreground">
                  {profile?.experience_years || "Non renseigné"} ans
                </p>
              </div>
              <Button variant="outline">Modifier mon profil</Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default FormateurDashboard;
