import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LogOut, Home, BookOpen, Leaf } from "lucide-react";

const DashboardHeader = () => {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Déconnexion réussie");
    navigate("/");
  };

  return (
    <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <Leaf className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold text-foreground">E-GrainoLab</h1>
          </div>
          <nav className="hidden md:flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate("/dashboard")}
            >
              <Home className="w-4 h-4 mr-2" />
              Tableau de bord
            </Button>
            <Button
              variant="ghost"
              onClick={() => navigate("/courses")}
            >
              <BookOpen className="w-4 h-4 mr-2" />
              Cours
            </Button>
          </nav>
        </div>
        <Button variant="outline" onClick={handleSignOut}>
          <LogOut className="w-4 h-4 mr-2" />
          Déconnexion
        </Button>
      </div>
    </header>
  );
};

export default DashboardHeader;
