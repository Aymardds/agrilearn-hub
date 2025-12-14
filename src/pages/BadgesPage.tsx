import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import BadgesGrid from "@/components/gamification/BadgesGrid";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const BadgesPage = () => {
    const navigate = useNavigate();

    const { data: user } = useQuery({
        queryKey: ["current-user"],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            return user;
        },
    });

    if (!user) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center">
                <p>Chargement...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-background to-muted">
            <main className="container mx-auto px-4 py-8">
                <Button
                    variant="ghost"
                    onClick={() => navigate("/dashboard")}
                    className="mb-6"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Retour au dashboard
                </Button>

                <BadgesGrid userId={user.id} />
            </main>
        </div>
    );
};

export default BadgesPage;
