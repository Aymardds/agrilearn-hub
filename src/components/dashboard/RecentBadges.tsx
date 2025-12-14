import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useUserBadges } from "@/hooks/useGamification";
import { Award, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { getBadgeColor } from "@/lib/gamification";

interface RecentBadgesProps {
    userId: string;
}

const RecentBadges = ({ userId }: RecentBadgesProps) => {
    const navigate = useNavigate();
    const { data: userBadges, isLoading } = useUserBadges(userId);

    if (isLoading) {
        return (
            <Card>
                <CardContent className="p-6">
                    <div className="animate-pulse space-y-3">
                        <div className="h-4 bg-muted rounded w-1/3"></div>
                        <div className="flex gap-3">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="h-20 w-20 bg-muted rounded-lg"></div>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const recentBadges = userBadges?.slice(0, 5) || [];

    if (recentBadges.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Award className="w-5 h-5" />
                        Vos badges
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground text-center py-4">
                        Vous n'avez pas encore de badges. Continuez à apprendre pour en débloquer !
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Award className="w-5 h-5" />
                        Badges récents
                    </CardTitle>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate("/badges")}
                        className="text-xs"
                    >
                        Voir tous
                        <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex gap-3 overflow-x-auto pb-2">
                    {recentBadges.map((userBadge: any) => {
                        const badge = userBadge.badges;
                        if (!badge) return null;

                        const badgeColor = getBadgeColor(badge.rarity);
                        const earnedDate = new Date(userBadge.earned_at);
                        const daysAgo = Math.floor((Date.now() - earnedDate.getTime()) / (1000 * 60 * 60 * 24));
                        const timeAgo = daysAgo === 0 ? "Aujourd'hui" : daysAgo === 1 ? "Hier" : `Il y a ${daysAgo}j`;

                        return (
                            <div
                                key={userBadge.id}
                                className="flex-shrink-0 group cursor-pointer"
                                title={badge.description}
                            >
                                <div
                                    className="w-20 h-20 rounded-lg flex items-center justify-center text-4xl transition-transform group-hover:scale-110 relative"
                                    style={{
                                        backgroundColor: `${badgeColor}20`,
                                        border: `2px solid ${badgeColor}`,
                                    }}
                                >
                                    {badge.icon}
                                    {daysAgo <= 3 && (
                                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                                    )}
                                </div>
                                <p className="text-xs text-center mt-2 font-medium truncate w-20">
                                    {badge.name}
                                </p>
                                <p className="text-xs text-center text-muted-foreground">
                                    {timeAgo}
                                </p>
                            </div>
                        );
                    })}
                </div>
                {recentBadges.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Total des badges</span>
                            <Badge variant="secondary">{userBadges?.length || 0}</Badge>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default RecentBadges;
