import { User } from "@supabase/supabase-js";
import { useUserStats } from "@/hooks/useGamification";
import StatsCards from "./StatsCards";
import LevelProgress from "./LevelProgress";
import ContinueLearning from "./ContinueLearning";
import RecentBadges from "./RecentBadges";
import Leaderboard from "../gamification/Leaderboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getStreakMessage } from "@/lib/gamification";

interface ApprenantDashboardProps {
  user: User;
}

const ApprenantDashboard = ({ user }: ApprenantDashboardProps) => {
  const navigate = useNavigate();
  const { data: stats, isLoading } = useUserStats(user.id);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-12 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="h-64 bg-muted rounded"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const streakMessage = getStreakMessage(stats?.currentStreak || 0);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* En-tête avec salutation */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">
          👋 Bonjour, {user.user_metadata?.full_name || "Apprenant"} !
        </h1>
        <p className="text-muted-foreground text-lg">
          {streakMessage}
        </p>
      </div>

      {/* Cartes de statistiques */}
      <div className="mb-8">
        <StatsCards
          coursesInProgress={stats?.coursesInProgress || 0}
          weekTime={stats?.weekTime || 0}
          totalPoints={stats?.totalPoints || 0}
          currentStreak={stats?.currentStreak || 0}
        />
      </div>

      {/* Grille principale */}
      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        {/* Colonne gauche - 2/3 */}
        <div className="lg:col-span-2 space-y-6">
          {/* Progression de niveau */}
          <LevelProgress totalPoints={stats?.totalPoints || 0} />

          {/* Continuer l'apprentissage */}
          <ContinueLearning userId={user.id} />

          {/* Badges récents */}
          <RecentBadges userId={user.id} />

          {/* Cours recommandés */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-yellow-500" />
                  Recommandés pour vous
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/courses")}
                >
                  Voir tous
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center py-8">
                Explorez notre catalogue de cours pour découvrir de nouvelles formations
              </p>
              <Button
                onClick={() => navigate("/courses")}
                className="w-full"
                variant="outline"
              >
                Parcourir les cours
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Colonne droite - 1/3 */}
        <div className="space-y-6">
          {/* Leaderboard */}
          <Leaderboard currentUserId={user.id} />

          {/* Objectifs rapides */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Objectifs rapides</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="text-sm">Compléter une leçon</span>
                <span className="text-xs font-medium text-primary">+10 pts</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="text-sm">Réussir un quiz</span>
                <span className="text-xs font-medium text-primary">+20 pts</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="text-sm">Maintenir votre série</span>
                <span className="text-xs font-medium text-primary">+5 pts</span>
              </div>
            </CardContent>
          </Card>

          {/* Statistiques supplémentaires */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Vos records</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Série la plus longue</span>
                <span className="font-bold">{stats?.longestStreak || 0} jours</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Niveau actuel</span>
                <span className="font-bold">Niveau {stats?.level || 1}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Points totaux</span>
                <span className="font-bold">{stats?.totalPoints?.toLocaleString('fr-FR') || 0}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ApprenantDashboard;
