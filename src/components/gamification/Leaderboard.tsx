import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award } from "lucide-react";
import { useLeaderboard } from "@/hooks/useGamification";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface LeaderboardProps {
    currentUserId?: string;
}

const Leaderboard = ({ currentUserId }: LeaderboardProps) => {
    const { data: allTimeLeaders } = useLeaderboard(10, "all");
    const { data: monthLeaders } = useLeaderboard(10, "month");
    const { data: weekLeaders } = useLeaderboard(10, "week");

    const renderLeaderboard = (leaders: any[] | undefined) => {
        if (!leaders || leaders.length === 0) {
            return (
                <p className="text-center text-muted-foreground py-8">
                    Aucun classement disponible
                </p>
            );
        }

        return (
            <div className="space-y-2">
                {leaders.map((leader, index) => {
                    const isCurrentUser = leader.id === currentUserId;
                    const rank = index + 1;

                    let medalIcon = null;
                    let medalColor = "";

                    if (rank === 1) {
                        medalIcon = <Trophy className="w-5 h-5" />;
                        medalColor = "text-yellow-500";
                    } else if (rank === 2) {
                        medalIcon = <Medal className="w-5 h-5" />;
                        medalColor = "text-gray-400";
                    } else if (rank === 3) {
                        medalIcon = <Award className="w-5 h-5" />;
                        medalColor = "text-amber-600";
                    }

                    return (
                        <div
                            key={leader.id}
                            className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${isCurrentUser
                                    ? "bg-primary/10 border-2 border-primary"
                                    : "bg-muted/30 hover:bg-muted/50"
                                }`}
                        >
                            <div className="flex items-center justify-center w-8 h-8">
                                {medalIcon ? (
                                    <span className={medalColor}>{medalIcon}</span>
                                ) : (
                                    <span className="text-sm font-bold text-muted-foreground">
                                        #{rank}
                                    </span>
                                )}
                            </div>

                            <Avatar className="w-10 h-10">
                                <AvatarImage src={leader.avatar_url} alt={leader.full_name} />
                                <AvatarFallback>
                                    {leader.full_name?.charAt(0) || "?"}
                                </AvatarFallback>
                            </Avatar>

                            <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">
                                    {leader.full_name || "Utilisateur"}
                                    {isCurrentUser && (
                                        <Badge variant="secondary" className="ml-2 text-xs">
                                            Vous
                                        </Badge>
                                    )}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Niveau {leader.level}
                                </p>
                            </div>

                            <div className="text-right">
                                <p className="font-bold text-primary">
                                    {leader.total_points?.toLocaleString('fr-FR') || 0}
                                </p>
                                <p className="text-xs text-muted-foreground">points</p>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    Classement
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="all" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="all">Tout temps</TabsTrigger>
                        <TabsTrigger value="month">Ce mois</TabsTrigger>
                        <TabsTrigger value="week">Cette semaine</TabsTrigger>
                    </TabsList>
                    <TabsContent value="all" className="mt-4">
                        {renderLeaderboard(allTimeLeaders)}
                    </TabsContent>
                    <TabsContent value="month" className="mt-4">
                        {renderLeaderboard(monthLeaders)}
                    </TabsContent>
                    <TabsContent value="week" className="mt-4">
                        {renderLeaderboard(weekLeaders)}
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
};

export default Leaderboard;
