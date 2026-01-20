import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Award, Clock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import QuizComponent from "@/components/quiz/QuizComponent";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useModuleProgress } from "@/hooks/useModuleProgress";
import { useCertificateGeneration } from "@/hooks/useCertificateGeneration";

const FinalAssessmentView = () => {
    const { courseId } = useParams();
    const navigate = useNavigate();
    const [assessmentStarted, setAssessmentStarted] = useState(false);
    const { generateCertificate } = useCertificateGeneration();

    const { data: user } = useQuery({
        queryKey: ["current-user"],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            return user;
        },
    });

    const { data: course } = useQuery({
        queryKey: ["course", courseId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("courses")
                .select("*")
                .eq("id", courseId)
                .single();

            if (error) throw error;
            return data;
        },
        enabled: !!courseId,
    });

    const { data: finalAssessment } = useQuery({
        queryKey: ["final-assessment", courseId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("quizzes")
                .select(`
          *,
          quiz_questions(*)
        `)
                .eq("course_id", courseId)
                .eq("is_final_assessment", true)
                .maybeSingle();

            if (error) throw error;
            return data;
        },
        enabled: !!courseId,
    });

    const { data: previousAttempts } = useQuery({
        queryKey: ["final-assessment-attempts", user?.id, finalAssessment?.id],
        queryFn: async () => {
            if (!user || !finalAssessment) return [];
            const { data, error } = await supabase
                .from("quiz_attempts")
                .select("*")
                .eq("user_id", user.id)
                .eq("quiz_id", finalAssessment.id)
                .order("attempted_at", { ascending: false });

            if (error) throw error;
            return data;
        },
        enabled: !!user && !!finalAssessment,
    });

    const { data: existingCertificate } = useQuery({
        queryKey: ["certificate", user?.id, courseId],
        queryFn: async () => {
            if (!user) return null;
            const { data, error } = await supabase
                .from("certificates")
                .select("*")
                .eq("user_id", user.id)
                .eq("course_id", courseId)
                .maybeSingle();

            if (error) throw error;
            return data;
        },
        enabled: !!user && !!courseId,
    });

    const {
        checkFinalAssessmentEligibility,
        checkAllModulesCompleted,
    } = useModuleProgress(user?.id, courseId);

    const isEligible = checkFinalAssessmentEligibility();
    const allModulesCompleted = checkAllModulesCompleted();
    const hasPassed = previousAttempts?.some(attempt => attempt.passed) || false;
    const bestAttempt = previousAttempts?.find(attempt => attempt.passed);

    const handleAssessmentComplete = async (passed: boolean) => {
        if (passed && user && courseId) {
            const score = previousAttempts?.[0]?.score || 0;

            // Generate certificate
            generateCertificate({
                courseId,
                userId: user.id,
                finalScore: score,
            });

            // Redirect to certificate page after a delay
            setTimeout(() => {
                navigate(`/courses/${courseId}`);
            }, 3000);
        } else {
            setAssessmentStarted(false);
        }
    };

    if (!course || !finalAssessment) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-background to-muted">
                <div className="container mx-auto px-4 py-8">
                    <Card className="max-w-2xl mx-auto">
                        <CardHeader>
                            <CardTitle>Évaluation finale non disponible</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Alert variant="destructive">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription>
                                    L'évaluation finale n'a pas encore été créée pour ce cours.
                                </AlertDescription>
                            </Alert>
                            <Button onClick={() => navigate(`/courses/${courseId}`)}>
                                Retour au cours
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    if (!isEligible) {
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
                                    Vous devez compléter tous les modules et réussir tous les quiz de module avant de passer l'évaluation finale.
                                </AlertDescription>
                            </Alert>
                            <Button onClick={() => navigate(`/courses/${courseId}`)}>
                                Retour au cours
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    if (existingCertificate) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-background to-muted">
                <div className="container mx-auto px-4 py-8">
                    <Card className="max-w-2xl mx-auto">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Award className="w-6 h-6 text-yellow-500" />
                                Certificat obtenu
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Alert className="bg-green-50 border-green-200">
                                <AlertDescription className="text-green-800">
                                    Félicitations! Vous avez déjà obtenu votre certificat pour ce cours.
                                </AlertDescription>
                            </Alert>
                            <div className="flex gap-3">
                                <Button onClick={() => navigate(`/certificates/${existingCertificate.id}`)}>
                                    Voir mon certificat
                                </Button>
                                <Button variant="outline" onClick={() => navigate(`/courses/${courseId}`)}>
                                    Retour au cours
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    if (assessmentStarted) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-background to-muted">
                <div className="container mx-auto px-4 py-8 max-w-4xl">
                    <QuizComponent
                        quiz={finalAssessment}
                        onComplete={handleAssessmentComplete}
                        onCancel={() => { }} // Cannot cancel final assessment
                        isFinalEvaluation={true}
                        timeLimit={finalAssessment.time_limit_minutes || 60}
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

                <Card className="border-2 border-primary">
                    <CardHeader>
                        <div className="flex items-center gap-3 mb-2">
                            <Award className="w-10 h-10 text-yellow-500" />
                            <div>
                                <CardTitle className="text-3xl">🎯 {finalAssessment.title}</CardTitle>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {course.title}
                                </p>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <Alert className="bg-orange-50 border-orange-200">
                            <Clock className="h-4 w-4 text-orange-600" />
                            <AlertDescription className="text-orange-800">
                                <strong>Évaluation chronométrée:</strong> Vous disposez de {finalAssessment.time_limit_minutes || 60} minutes pour compléter cette évaluation.
                            </AlertDescription>
                        </Alert>

                        <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-4">
                                <div className="p-4 border rounded-lg bg-background">
                                    <p className="text-sm text-muted-foreground">Questions</p>
                                    <p className="text-2xl font-bold">{finalAssessment.quiz_questions?.length || 0}</p>
                                </div>
                                <div className="p-4 border rounded-lg bg-background">
                                    <p className="text-sm text-muted-foreground">Durée</p>
                                    <p className="text-2xl font-bold">{finalAssessment.time_limit_minutes || 60} min</p>
                                </div>
                                <div className="p-4 border rounded-lg bg-background">
                                    <p className="text-sm text-muted-foreground">Score minimum</p>
                                    <p className="text-2xl font-bold">{finalAssessment.passing_score}%</p>
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
                                        ? "Vous avez déjà réussi cette évaluation. Votre certificat sera généré automatiquement."
                                        : "Réussissez cette évaluation finale pour obtenir votre certificat de formation."}
                                </AlertDescription>
                            </Alert>

                            <Button
                                onClick={() => setAssessmentStarted(true)}
                                className="w-full bg-primary hover:bg-primary/90"
                                size="lg"
                            >
                                {hasPassed ? "Repasser l'évaluation" : "Commencer l'évaluation finale"}
                            </Button>

                            <p className="text-xs text-center text-muted-foreground">
                                Assurez-vous d'avoir suffisamment de temps avant de commencer. Le chronomètre démarrera dès que vous cliquerez sur le bouton.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default FinalAssessmentView;
