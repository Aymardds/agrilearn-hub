import { User } from "@supabase/supabase-js";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, BookOpen, Award, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface SupervisorDashboardProps {
  user: User;
}

const SupervisorDashboard = ({ user }: SupervisorDashboardProps) => {
  const navigate = useNavigate();

  const { data: stats } = useQuery({
    queryKey: ["supervisor-stats"],
    queryFn: async () => {
      const [formateurs, modules, certificates] = await Promise.all([
        supabase.from("user_roles").select("id", { count: "exact" }).eq("role", "formateur"),
        supabase.from("modules").select("id", { count: "exact" }),
        supabase.from("certificates").select("id", { count: "exact" }),
      ]);

      return {
        formateursCount: formateurs.count || 0,
        modulesCount: modules.count || 0,
        certificatesCount: certificates.count || 0,
      };
    },
  });

  const { data: recentFormateurs } = useQuery({
    queryKey: ["recent-formateurs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "formateur")
        .limit(5);
      const ids = (data || []).map((r) => r.user_id);
      if (ids.length === 0) return [];
      const { data: profiles } = await supabase.from("profiles").select("id, full_name, avatar_url").in("id", ids);
      return profiles || [];
    },
  });

  const { data: recentCertificates } = useQuery({
    queryKey: ["recent-certificates"],
    queryFn: async () => {
      const { data } = await supabase
        .from("certificates")
        .select("id, user_id, course_id, issued_at")
        .order("issued_at", { ascending: false })
        .limit(5);
      return data || [];
    },
  });

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <Card className="bg-gradient-card border-none shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Formateurs</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{stats?.formateursCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Sous supervision</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-card border-none shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Modules</CardTitle>
            <BookOpen className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-success">{stats?.modulesCount}</div>
            <p className="text-xs text-muted-foreground mt-1">À superviser</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-card border-none shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Certificats</CardTitle>
            <Award className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-warning">{stats?.certificatesCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Délivrés</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 mb-8">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Formateurs récents
            </CardTitle>
            <CardDescription>Derniers comptes formateurs créés</CardDescription>
          </CardHeader>
          <CardContent>
            {(recentFormateurs || []).length > 0 ? (
              <div className="space-y-2">
                {recentFormateurs?.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded border">
                    <span className="font-medium">{p.full_name}</span>
                    <Button variant="outline" size="sm" onClick={() => navigate("/admin/users")}>Gérer</Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">Aucun formateur récent</p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-warning" />
              Certificats récents
            </CardTitle>
            <CardDescription>Dernières délivrances</CardDescription>
          </CardHeader>
          <CardContent>
            {(recentCertificates || []).length > 0 ? (
              <div className="space-y-2">
                {recentCertificates?.map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between p-3 rounded border">
                    <span>#{c.id.slice(0, 8)} • {new Date(c.issued_at).toLocaleDateString("fr-FR")}</span>
                    <Button variant="outline" size="sm" onClick={() => navigate("/courses")}>Voir</Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">Aucun certificat récent</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-lg cursor-pointer hover:shadow-xl transition-shadow" onClick={() => navigate("/admin/courses")}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            Gérer le contenu des cours
          </CardTitle>
          <CardDescription>Accéder à la structure des cours (modules, leçons, quiz)</CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full">
            <Settings className="w-4 h-4 mr-2" />
            Ouvrir la gestion
          </Button>
        </CardContent>
      </Card>
    </main>
  );
};

export default SupervisorDashboard;