import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, Clock, Trophy, Flame } from "lucide-react";
import { formatLearningTime, formatPoints, getStreakEmoji } from "@/lib/gamification";

interface StatsCardsProps {
    coursesInProgress: number;
    weekTime: number;
    totalPoints: number;
    currentStreak: number;
}

const StatsCards = ({ coursesInProgress, weekTime, totalPoints, currentStreak }: StatsCardsProps) => {
    const stats = [
        {
            icon: BookOpen,
            label: "Modules en cours",
            value: coursesInProgress,
            color: "text-blue-600",
            bgColor: "bg-blue-50",
        },
        {
            icon: Clock,
            label: "Cette semaine",
            value: formatLearningTime(weekTime),
            color: "text-green-600",
            bgColor: "bg-green-50",
        },
        {
            icon: Trophy,
            label: "Points totaux",
            value: formatPoints(totalPoints),
            color: "text-yellow-600",
            bgColor: "bg-yellow-50",
        },
        {
            icon: Flame,
            label: "Série",
            value: `${currentStreak} ${getStreakEmoji(currentStreak)}`,
            color: "text-orange-600",
            bgColor: "bg-orange-50",
        },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                    <Card key={index} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                                    <p className="text-2xl font-bold">{stat.value}</p>
                                </div>
                                <div className={`${stat.bgColor} p-3 rounded-full`}>
                                    <Icon className={`w-6 h-6 ${stat.color}`} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
};

export default StatsCards;
