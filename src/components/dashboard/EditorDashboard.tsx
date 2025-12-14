import { User } from "@supabase/supabase-js";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpenCheck, CheckCircle, Clock } from "lucide-react";

interface EditorDashboardProps {
  user: User;
}

const EditorDashboard = ({ user }: EditorDashboardProps) => {
  const { data: profile } = useQuery({
    queryKey: ["editor-profile", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, bio, avatar_url")
        .eq("id", user.id)
        .single();
      if (error) throw error;
      return data;
    },
  });
  const { data: submittedCount } = useQuery({
    queryKey: ["editor-submitted-count", user.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("courses")
        .select("*", { count: "exact", head: true })
        .eq("is_approved", false);
      return count || 0;
    },
  });

  const { data: approvedCount } = useQuery({
    queryKey: ["editor-approved-count", user.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("courses")
        .select("*", { count: "exact", head: true })
        .eq("is_approved", true);
      return count || 0;
    },
  });

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Cours soumis</CardTitle>
            <CardDescription>En attente d'approbation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              <span className="text-2xl font-bold">{submittedCount ?? 0}</span>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Cours approuvés</CardTitle>
            <CardDescription>Validés par l'administration</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-success" />
              <span className="text-2xl font-bold">{approvedCount ?? 0}</span>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <CardDescription>Soumis + approuvés</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <BookOpenCheck className="w-5 h-5 text-accent" />
              <span className="text-2xl font-bold">{(submittedCount ?? 0) + (approvedCount ?? 0)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-6 md:grid-cols-2 mt-8">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Mon profil éditeur</CardTitle>
            <CardDescription>Informations publiques</CardDescription>
          </CardHeader>
          <CardContent>
            {profile?.avatar_url && (
              <img src={profile.avatar_url} alt={profile.full_name} className="w-20 h-20 rounded-full mb-4" />
            )}
            <div className="font-semibold mb-2">{profile?.full_name || user.email}</div>
            <div className="text-sm text-muted-foreground">{profile?.bio || "Aucune biographie renseignée"}</div>
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Rôle</CardTitle>
            <CardDescription>Permissions</CardDescription>
          </CardHeader>
          <CardContent>
            <Badge variant="secondary">Éditeur</Badge>
            <div className="text-sm text-muted-foreground mt-2">Vous pouvez créer des cours, soumis à l'admin pour approbation.</div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default EditorDashboard;