import { useState } from "react";
import { useAllBadges, useUserBadges } from "@/hooks/useGamification";
import BadgeCard from "./BadgeCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Award } from "lucide-react";

interface BadgesGridProps {
    userId: string;
}

const BadgesGrid = ({ userId }: BadgesGridProps) => {
    const { data: allBadges, isLoading: loadingAll } = useAllBadges();
    const { data: userBadges, isLoading: loadingUser } = useUserBadges(userId);
    const [selectedCategory, setSelectedCategory] = useState<string>("all");

    if (loadingAll || loadingUser) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <div key={i} className="animate-pulse">
                        <div className="h-80 bg-muted rounded-lg"></div>
                    </div>
                ))}
            </div>
        );
    }

    const earnedBadgeIds = new Set(userBadges?.map((ub: any) => ub.badge_id) || []);
    const earnedBadgesMap = new Map(
        userBadges?.map((ub: any) => [ub.badge_id, ub.earned_at]) || []
    );

    const categories = [
        { value: "all", label: "Tous", icon: "🎯" },
        { value: "achievement", label: "Réussites", icon: "🏆" },
        { value: "progress", label: "Progression", icon: "📈" },
        { value: "social", label: "Social", icon: "👥" },
        { value: "special", label: "Spécial", icon: "⭐" },
    ];

    const filteredBadges = selectedCategory === "all"
        ? allBadges
        : allBadges?.filter((b: any) => b.category === selectedCategory);

    const earnedCount = allBadges?.filter((b: any) => earnedBadgeIds.has(b.id)).length || 0;
    const totalCount = allBadges?.length || 0;
    const completionPercentage = totalCount > 0 ? Math.round((earnedCount / totalCount) * 100) : 0;

    return (
        <div className="space-y-6">
            {/* En-tête avec statistiques */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Award className="w-6 h-6" />
                        Collection de badges
                    </h2>
                    <p className="text-muted-foreground mt-1">
                        {earnedCount} sur {totalCount} badges obtenus ({completionPercentage}%)
                    </p>
                </div>
            </div>

            {/* Filtres par catégorie */}
            <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
                <TabsList className="grid w-full grid-cols-5">
                    {categories.map((cat) => (
                        <TabsTrigger key={cat.value} value={cat.value} className="text-xs sm:text-sm">
                            <span className="mr-1">{cat.icon}</span>
                            <span className="hidden sm:inline">{cat.label}</span>
                        </TabsTrigger>
                    ))}
                </TabsList>

                {categories.map((cat) => (
                    <TabsContent key={cat.value} value={cat.value} className="mt-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {filteredBadges?.map((badge: any) => {
                                const isEarned = earnedBadgeIds.has(badge.id);
                                const earnedAt = earnedBadgesMap.get(badge.id);

                                // TODO: Calculer la progression réelle basée sur les données utilisateur
                                const progress = isEarned ? 100 : Math.random() * 80;

                                return (
                                    <BadgeCard
                                        key={badge.id}
                                        badge={badge}
                                        isEarned={isEarned}
                                        earnedAt={earnedAt}
                                        progress={progress}
                                    />
                                );
                            })}
                        </div>

                        {filteredBadges?.length === 0 && (
                            <p className="text-center text-muted-foreground py-12">
                                Aucun badge dans cette catégorie
                            </p>
                        )}
                    </TabsContent>
                ))}
            </Tabs>
        </div>
    );
};

export default BadgesGrid;
