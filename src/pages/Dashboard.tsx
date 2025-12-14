import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { Loader2 } from "lucide-react";
import ApprenantDashboard from "@/components/dashboard/ApprenantDashboard";
import FormateurDashboard from "@/components/dashboard/FormateurDashboard";
import SuperAdminDashboard from "@/components/dashboard/SuperAdminDashboard";
import SupervisorDashboard from "@/components/dashboard/SupervisorDashboard";
import EditorDashboard from "@/components/dashboard/EditorDashboard";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Enums } from "@/integrations/supabase/types";

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<Enums<"app_role"> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes("access_token")) {
      const params = new URLSearchParams(hash.slice(1));
      const access_token = params.get("access_token") || "";
      const refresh_token = params.get("refresh_token") || "";
      if (access_token && refresh_token) {
        supabase.auth.setSession({ access_token, refresh_token })
          .then(() => {
            window.history.replaceState({}, document.title, window.location.pathname);
          });
      } else {
        navigate("/auth");
      }
      return;
    }
    // Set up auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (!session) {
        navigate("/auth");
      }
    });

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .single();

        if (error) throw error;
        setUserRole(data.role);
      } catch (error) {
        console.error("Error fetching user role:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();
  }, [user]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const renderDashboard = () => {
    const role = (userRole || "").toLowerCase();
    const normalized =
      role === "éditeur" ? "editeur" :
        role === "editor" ? "editeur" :
          role;

    switch (normalized) {
      case "apprenant":
        return (
          <DashboardLayout>
            <ApprenantDashboard user={user} />
          </DashboardLayout>
        );
      case "formateur":
        return (
          <DashboardLayout title="Tableau de bord formateur" description="Gérez vos cours et votre contenu pédagogique">
            <FormateurDashboard user={user} />
          </DashboardLayout>
        );
      case "superadmin":
        return (
          <DashboardLayout title="Administration" description="Gestion complète de la plateforme">
            <SuperAdminDashboard user={user} />
          </DashboardLayout>
        );
      case "superviseur":
        return (
          <DashboardLayout title="Supervision" description="Supervision des cours et formateurs">
            <SupervisorDashboard user={user} />
          </DashboardLayout>
        );
      case "editeur":
        return (
          <DashboardLayout title="Édition" description="Gestion du contenu">
            <EditorDashboard user={user} />
          </DashboardLayout>
        );
      default:
        return (
          <DashboardLayout>
            <ApprenantDashboard user={user} />
          </DashboardLayout>
        );
    }
  };

  return renderDashboard();
};

export default Dashboard;

