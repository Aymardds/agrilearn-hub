import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Award, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import QuizComponent from "@/components/quiz/QuizComponent";
import { Alert, AlertDescription } from "@/components/ui/alert";

const ModuleQuizView = () => {
    const { courseId, moduleId } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [quizStarted, setQuizStarted] = useState(false);

    const { data: user } = useQuery({
        queryKey: ["current-user"],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            return user;
        },
    });

    const { data: module } = useQuery({
        queryKey: ["module", moduleId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("modules")
                .select("*, courses(title)")
                .eq("id", moduleId)
                .single();

            if (error) throw error;
            return data;
        },
        enabled: !!moduleId,
    });

    const { data: quiz } = useQuery({
        queryKey: ["module-quiz", moduleId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("quizzes")
                .select(`
          *,
          quiz_questions(*)
        `)
                .eq("module_id", moduleId)
                .maybeSingle();

            if (error) throw error;
            return data;
        },
        enabled: !!moduleId,
    });

    const { data: previousAttempts } = useQuery({
        queryKey: ["quiz-attempts", user?.id, quiz?.id],
        queryFn: async () => {
            if (!user || !quiz) return [];
            const { data, error } = await supabase
                .from("quiz_attempts")
                .select("*")
                .eq("user_id", user.id)
                .eq("quiz_id", quiz.id)
                .order("attempted_at", { ascending: false });

            if (error) throw error;
            return data;
        },
        enabled: !!user && !!quiz,
    });

    const { data: moduleLessons } = useQuery({
        queryKey: ["module-lessons", moduleId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("lessons")
                .select("id, title")
                .eq("module_id", moduleId);

            if (error) throw error;
            return data;
        },
        enabled: !!moduleId,
    });

    const { data: completedLessons } = useQuery({
        queryKey: ["completed-lessons", user?.id, moduleId],
        queryFn: async () => {
            if (!user || !moduleLessons) return [];
            const lessonIds = moduleLessons.map(l => l.id);
            const { data, error } = await supabase
                .from("lesson_progress")
                .select("lesson_id")
                .eq("user_id", user.id)
                .in("lesson_id", lessonIds)
                .eq("is_completed", true);

            if (error) throw error;
            return data;
        },
        enabled: !!user && !!moduleLessons,
    });

    const allLessonsCompleted = moduleLessons && completedLessons
        ? moduleLessons.length === completedLessons.length
        : false;

    const bestAttempt = previousAttempts?.[0];
    const hasPassed = previousAttempts?.some(attempt => attempt.passed) || false;

    const handleQuizComplete = async (passed: boolean) => {
        await queryClient.invalidateQueries({ queryKey: ["quiz-attempts"] });
        await queryClient.invalidateQueries({ queryKey: ["enrollment"] });

        if (passed) {
            toast.success("🎉 Quiz du module réussi!");
            // Redirect to course detail after a short delay
            setTimeout(() => {
                navigate(`/courses/${courseId}`);
            }, 2000);
        } else {
            setQuizStarted(false);
        }
    };

    if (!module || !quiz) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-background to-muted">
                <div className="container mx-auto px-4 py-8">
                    <p>Chargement...</p>
                </div>
            </div>
        );
    }

    if (!allLessonsCompleted) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-background to-muted">
                <div className="container mx-auto px-4 py-8">
                    <Card className="max-w-2xl mx-auto">
                        <CardHeader>
                            <CardTitle>Accès restreint</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Alert>
                                <AlertDescription>
                                    Vous devez compléter toutes les leçons de ce module avant de passer le quiz.
                                </AlertDescription>
                            </Alert>
                            <p className="text-muted-foreground">
                                Progression: {completedLessons?.length || 0} / {moduleLessons?.length || 0} leçons complétées
                            </p>
                            <Button onClick={() => navigate(`/courses/${courseId}`)}>
                                Retour au cours
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    if (quizStarted) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-background to-muted">
                <div className="container mx-auto px-4 py-8 max-w-4xl">
                    <QuizComponent
                        quiz={quiz}
                        onComplete={handleQuizComplete}
                        onCancel={() => setQuizStarted(false)}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-background to-muted">
            <div className="container mx-auto px-4 py-8 max-w-4xl">
                <Button
                    variant="ghost"
                    onClick={() => navigate(`/courses/${courseId}`)}
                    className="mb-6"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Retour au cours
                </Button>

                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-3 mb-2">
                            <Award className="w-8 h-8 text-primary" />
                            <div>
                                <CardTitle className="text-2xl">{quiz.title}</CardTitle>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {module.courses?.title} - {module.title}
                                </p>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {hasPassed && (
                            <Alert className="bg-green-50 border-green-200">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <AlertDescription className="text-green-800">
                                    Vous avez déjà réussi ce quiz avec un score de {bestAttempt?.score}%
                                </AlertDescription>
                            </Alert>
                        )}

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 border rounded-lg">
                                    <p className="text-sm text-muted-foreground">Questions</p>
                                    <p className="text-2xl font-bold">{quiz.quiz_questions?.length || 0}</p>
                                </div>
                                <div className="p-4 border rounded-lg">
                                    <p className="text-sm text-muted-foreground">Score minimum</p>
                                    <p className="text-2xl font-bold">{quiz.passing_score}%</p>
                                </div>
                            </div>

                            {previousAttempts && previousAttempts.length > 0 && (
                                <div className="p-4 border rounded-lg bg-muted/50">
                                    <h3 className="font-semibold mb-3">Historique des tentatives</h3>
                                    <div className="space-y-2">
                                        {previousAttempts.slice(0, 3).map((attempt, index) => (
                                            <div key={attempt.id} className="flex justify-between items-center text-sm">
                                                <span>Tentative {previousAttempts.length - index}</span>
                                                <span className={attempt.passed ? "text-green-600 font-semibold" : "text-muted-foreground"}>
                                                    {attempt.score}% {attempt.passed && "✓"}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <Alert>
                                <AlertDescription>
                                    {hasPassed
                                        ? "Vous pouvez repasser ce quiz pour améliorer votre score."
                                        : "Vous devez obtenir au moins " + quiz.passing_score + "% pour réussir ce quiz et débloquer le module suivant."}
                                </AlertDescription>
                            </Alert>

                            <Button
                                onClick={() => setQuizStarted(true)}
                                className="w-full"
                                size="lg"
                            >
                                {hasPassed ? "Repasser le quiz" : "Commencer le quiz"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default ModuleQuizView;
