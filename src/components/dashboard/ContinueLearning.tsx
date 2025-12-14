import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowRight, BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLastAccessedCourse } from "@/hooks/useGamification";

interface ContinueLearningProps {
    userId: string;
}

const ContinueLearning = ({ userId }: ContinueLearningProps) => {
    const navigate = useNavigate();
    const { data: lastCourse, isLoading } = useLastAccessedCourse(userId);

    if (isLoading) {
        return (
            <Card>
                <CardContent className="p-6">
                    <div className="animate-pulse space-y-3">
                        <div className="h-4 bg-muted rounded w-1/3"></div>
                        <div className="h-32 bg-muted rounded"></div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!lastCourse || !lastCourse.courses) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5" />
                        Commencez votre apprentissage
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground mb-4">
                        Vous n'avez pas encore commencé de cours. Explorez notre catalogue pour démarrer !
                    </p>
                    <Button onClick={() => navigate("/courses")} className="w-full">
                        Parcourir les cours
                        <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                </CardContent>
            </Card>
        );
    }

    const course = lastCourse.courses as any;
    const lesson = lastCourse.lessons as any;

    // Récupérer la progression du cours (à améliorer avec une vraie requête)
    const courseProgress = 45; // Placeholder - devrait venir de enrollments

    return (
        <Card className="overflow-hidden hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
                <CardTitle className="text-lg">Continuer où vous en étiez</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex gap-4">
                    {course.thumbnail_url && (
                        <img
                            src={course.thumbnail_url}
                            alt={course.title}
                            className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
                            onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src =
                                    "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='96'%3E%3Crect width='100%25' height='100%25' fill='%23ddd'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23666' font-size='12'%3ECours%3C/text%3E%3C/svg%3E";
                            }}
                        />
                    )}
                    <div className="flex-1 min-w-0">
                        <h3 className="font-semibold mb-1 truncate">{course.title}</h3>
                        {lesson && (
                            <p className="text-sm text-muted-foreground mb-3 truncate">
                                {lesson.title}
                            </p>
                        )}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">Progression</span>
                                <span className="font-medium">{courseProgress}%</span>
                            </div>
                            <Progress value={courseProgress} className="h-2" />
                        </div>
                    </div>
                </div>
                <Button
                    onClick={() => {
                        if (lesson) {
                            navigate(`/courses/${course.id}/lessons/${lesson.id}`);
                        } else {
                            navigate(`/courses/${course.id}`);
                        }
                    }}
                    className="w-full mt-4"
                >
                    Continuer
                    <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
            </CardContent>
        </Card>
    );
};

export default ContinueLearning;
