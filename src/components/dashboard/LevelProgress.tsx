import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { calculateLevelProgress, LEVELS } from "@/lib/gamification";
import { TrendingUp } from "lucide-react";

interface LevelProgressProps {
    totalPoints: number;
}

const LevelProgress = ({ totalPoints }: LevelProgressProps) => {
    const { currentLevel, nextLevel, progress, pointsToNext } = calculateLevelProgress(totalPoints);

    return (
        <Card className="overflow-hidden border-2">
            <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5">
                <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                        <span className="text-3xl">{currentLevel.icon}</span>
                        <div>
                            <div className="text-lg">Niveau {currentLevel.level}</div>
                            <div className="text-sm font-normal text-muted-foreground">
                                {currentLevel.name}
                            </div>
                        </div>
                    </span>
                    {nextLevel && (
                        <div className="text-right">
                            <div className="text-sm text-muted-foreground">Prochain</div>
                            <div className="flex items-center gap-1">
                                <span className="text-xl">{nextLevel.icon}</span>
                                <span className="text-sm font-normal">{nextLevel.name}</span>
                            </div>
                        </div>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
                <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Progression</span>
                        <span className="font-medium">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-3" />
                    {nextLevel && (
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{totalPoints.toLocaleString('fr-FR')} points</span>
                            <span className="flex items-center gap-1">
                                <TrendingUp className="w-3 h-3" />
                                {pointsToNext.toLocaleString('fr-FR')} points restants
                            </span>
                        </div>
                    )}
                    {!nextLevel && (
                        <p className="text-center text-sm text-muted-foreground pt-2">
                            🎉 Niveau maximum atteint ! Félicitations !
                        </p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

export default LevelProgress;
