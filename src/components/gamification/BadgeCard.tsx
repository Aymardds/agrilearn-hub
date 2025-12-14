import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock, Check } from "lucide-react";
import { getBadgeColor } from "@/lib/gamification";

interface BadgeCardProps {
    badge: {
        id: string;
        name: string;
        description: string;
        icon: string;
        category: string;
        rarity: "common" | "rare" | "epic" | "legendary";
        points_reward: number;
        condition_type: string;
        condition_value: number;
    };
    isEarned?: boolean;
    earnedAt?: string;
    progress?: number;
}

const BadgeCard = ({ badge, isEarned = false, earnedAt, progress = 0 }: BadgeCardProps) => {
    const badgeColor = getBadgeColor(badge.rarity);
    const rarityLabels = {
        common: "Commun",
        rare: "Rare",
        epic: "Épique",
        legendary: "Légendaire",
    };

    const conditionLabels: Record<string, string> = {
        courses_started: "cours commencés",
        courses_completed: "cours complétés",
        lessons_completed: "leçons complétées",
        streak: "jours de suite",
        points_earned: "points gagnés",
        certificates_earned: "certificats obtenus",
        quiz_perfect_score: "quiz avec 100%",
        course_high_score: "cours avec 90%+",
    };

    const conditionLabel = conditionLabels[badge.condition_type] || "objectifs";

    return (
        <Card
            className={`relative overflow-hidden transition-all ${isEarned
                    ? "hover:shadow-lg cursor-pointer"
                    : "opacity-60 hover:opacity-80"
                }`}
            style={{
                borderColor: isEarned ? badgeColor : undefined,
                borderWidth: isEarned ? "2px" : "1px",
            }}
        >
            {isEarned && (
                <div
                    className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: badgeColor }}
                >
                    <Check className="w-4 h-4 text-white" />
                </div>
            )}

            <CardContent className="p-6">
                <div className="flex flex-col items-center text-center space-y-3">
                    {/* Icône du badge */}
                    <div
                        className={`w-20 h-20 rounded-full flex items-center justify-center text-4xl ${isEarned ? "" : "grayscale"
                            }`}
                        style={{
                            backgroundColor: `${badgeColor}20`,
                            border: `3px solid ${badgeColor}`,
                        }}
                    >
                        {isEarned ? badge.icon : <Lock className="w-8 h-8 text-muted-foreground" />}
                    </div>

                    {/* Nom du badge */}
                    <div>
                        <h3 className="font-bold text-lg">{badge.name}</h3>
                        <Badge
                            variant="outline"
                            className="text-xs mt-1"
                            style={{ borderColor: badgeColor, color: badgeColor }}
                        >
                            {rarityLabels[badge.rarity]}
                        </Badge>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-muted-foreground">
                        {badge.description}
                    </p>

                    {/* Condition */}
                    <div className="w-full pt-3 border-t space-y-2">
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Objectif</span>
                            <span className="font-medium">
                                {badge.condition_value} {conditionLabel}
                            </span>
                        </div>

                        {!isEarned && progress > 0 && (
                            <div className="space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-muted-foreground">Progression</span>
                                    <span className="font-medium">{Math.min(progress, 100)}%</span>
                                </div>
                                <div className="w-full bg-muted rounded-full h-1.5">
                                    <div
                                        className="h-1.5 rounded-full transition-all"
                                        style={{
                                            width: `${Math.min(progress, 100)}%`,
                                            backgroundColor: badgeColor,
                                        }}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="flex items-center justify-between text-xs pt-2">
                            <span className="text-muted-foreground">Récompense</span>
                            <span className="font-bold text-primary">
                                +{badge.points_reward} points
                            </span>
                        </div>
                    </div>

                    {/* Date d'obtention */}
                    {isEarned && earnedAt && (
                        <p className="text-xs text-muted-foreground pt-2">
                            Obtenu le {new Date(earnedAt).toLocaleDateString('fr-FR')}
                        </p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

export default BadgeCard;
