import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Clock, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Quiz {
  id: string;
  title: string;
  passing_score: number;
  quiz_questions: QuizQuestion[];
}

interface QuizQuestion {
  id: string;
  question_text: string;
  question_type: string;
  options: any;
  correct_answer: string;
  order_index: number;
}

interface QuizComponentProps {
  quiz: Quiz;
  onComplete: (passed: boolean) => void;
  onCancel: () => void;
  isFinalEvaluation?: boolean;
  timeLimit?: number; // in minutes
}

const QuizComponent = ({
  quiz,
  onComplete,
  onCancel,
  isFinalEvaluation = false,
  timeLimit,
}: QuizComponentProps) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(timeLimit ? timeLimit * 60 : null);

  const questions = quiz.quiz_questions.sort((a, b) => a.order_index - b.order_index);
  const currentQuestion = questions[currentQuestionIndex];

  useEffect(() => {
    if (timeRemaining === null) return;

    if (timeRemaining <= 0) {
      handleSubmit();
      return;
    }

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 1) {
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRemaining]);

  const handleAnswerSelect = (questionId: string, answer: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: answer,
    }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  const calculateScore = () => {
    let correct = 0;
    questions.forEach((question) => {
      if (answers[question.id] === question.correct_answer) {
        correct++;
      }
    });
    return Math.round((correct / questions.length) * 100);
  };

  const handleSubmit = async () => {
    if (showResults) return; // Prevent double submission
    
    const finalScore = calculateScore();
    setScore(finalScore);
    setShowResults(true);

    const passed = finalScore >= quiz.passing_score;
    const timeUsed = timeLimit ? timeLimit * 60 - (timeRemaining || 0) : null;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non connecté");

      await supabase.from("quiz_attempts").insert({
        quiz_id: quiz.id,
        user_id: user.id,
        answers: answers,
        score: finalScore,
        passed: passed,
      });

      if (passed) {
        toast.success(
          isFinalEvaluation
            ? `Félicitations! Vous avez réussi l'évaluation finale avec ${finalScore}%`
            : `Félicitations! Score: ${finalScore}%`
        );
        onComplete(true);
      } else {
        const message = isFinalEvaluation
          ? `Évaluation non réussie: ${finalScore}% (minimum: ${quiz.passing_score}%). Vous pouvez réessayer.`
          : `Score insuffisant: ${finalScore}% (minimum: ${quiz.passing_score}%)`;
        toast.error(message);
        onComplete(false);
      }
    } catch (error: any) {
      toast.error("Erreur lors de l'enregistrement");
      console.error(error);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
  const allQuestionsAnswered = questions.every((q) => answers[q.id]);

  if (showResults) {
    const passed = score >= quiz.passing_score;
    const correctAnswers = Math.round((score / 100) * questions.length);
    
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {passed ? (
              <>
                <CheckCircle className="w-6 h-6 text-green-600" />
                {isFinalEvaluation ? "Évaluation finale réussie!" : "Quiz réussi!"}
              </>
            ) : (
              <>
                <XCircle className="w-6 h-6 text-destructive" />
                {isFinalEvaluation ? "Évaluation finale non réussie" : "Quiz non réussi"}
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-4">
            <div className={`text-5xl font-bold ${passed ? "text-green-600" : "text-destructive"}`}>
              {score}%
            </div>
            <p className="text-muted-foreground">
              Score minimum requis: {quiz.passing_score}%
            </p>
            <div className="space-y-2">
            <p>
              Vous avez répondu correctement à{" "}
                <strong>{correctAnswers}</strong> question{correctAnswers > 1 ? "s" : ""} sur{" "}
              <strong>{questions.length}</strong>
            </p>
              {timeLimit && timeRemaining !== null && (
                <p className="text-sm text-muted-foreground">
                  Temps utilisé: {formatTime(timeLimit * 60 - (timeRemaining || 0))} / {formatTime(timeLimit * 60)}
                </p>
              )}
            </div>
            {!passed && (
              <Alert variant={isFinalEvaluation ? "destructive" : "default"}>
                <AlertDescription>
                  {isFinalEvaluation
                    ? "Vous devez obtenir au moins " + quiz.passing_score + "% pour réussir l'évaluation finale. Vous pouvez réessayer."
                    : "Vous pouvez réessayer le quiz pour améliorer votre score."}
                </AlertDescription>
              </Alert>
            )}
            {passed && isFinalEvaluation && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Félicitations! Vous avez réussi l'évaluation finale. Vous pouvez maintenant obtenir votre certificat.
                </AlertDescription>
              </Alert>
            )}
            <div className="flex gap-2 justify-center pt-4">
              {!passed && (
                <Button variant="outline" onClick={() => {
                  setShowResults(false);
                  setCurrentQuestionIndex(0);
                  setAnswers({});
                  setTimeRemaining(timeLimit ? timeLimit * 60 : null);
                }}>
                  Réessayer
                </Button>
              )}
              <Button onClick={() => onComplete(passed)}>
                {passed ? "Continuer" : "Fermer"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between mb-2">
          <CardTitle>
            {isFinalEvaluation && "🎯 "}
            {quiz.title}
            {isFinalEvaluation && " - Évaluation finale"}
          </CardTitle>
          {timeRemaining !== null && (
            <div className={`flex items-center gap-2 px-3 py-1 rounded-lg ${
              timeRemaining < 60 
                ? "bg-destructive text-destructive-foreground animate-pulse" 
                : timeRemaining < 300
                ? "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
                : "bg-muted"
            }`}>
              <Clock className="w-4 h-4" />
              <span className="font-mono font-bold">{formatTime(timeRemaining)}</span>
            </div>
          )}
        </div>
        <CardDescription>
          Question {currentQuestionIndex + 1} sur {questions.length}
        </CardDescription>
        <Progress value={progress} className="mt-2" />
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-4">
            {currentQuestion.question_text}
          </h3>
          <RadioGroup
            value={answers[currentQuestion.id] || ""}
            onValueChange={(value) =>
              handleAnswerSelect(currentQuestion.id, value)
            }
          >
            {Array.isArray(currentQuestion.options) &&
              currentQuestion.options.map((option: string, index: number) => (
                <div key={index} className="flex items-center space-x-2 mb-3">
                  <RadioGroupItem value={option} id={`option-${index}`} />
                  <Label htmlFor={`option-${index}`} className="cursor-pointer">
                    {option}
                  </Label>
                </div>
              ))}
          </RadioGroup>
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentQuestionIndex === 0}
          >
            Précédent
          </Button>

          <div className="flex gap-2">
            {!isFinalEvaluation && (
            <Button variant="ghost" onClick={onCancel}>
              Annuler
            </Button>
            )}
            {currentQuestionIndex === questions.length - 1 ? (
              <Button
                onClick={handleSubmit}
                disabled={!allQuestionsAnswered || showResults}
                className={isFinalEvaluation ? "w-full" : ""}
              >
                {isFinalEvaluation ? "Soumettre l'évaluation finale" : "Terminer le quiz"}
              </Button>
            ) : (
              <Button onClick={handleNext} className={isFinalEvaluation ? "w-full" : ""}>
                Suivant
              </Button>
            )}
          </div>
        </div>

        {!allQuestionsAnswered && currentQuestionIndex === questions.length - 1 && (
          <Alert>
            <AlertDescription>
              Veuillez répondre à toutes les questions avant de soumettre.
            </AlertDescription>
          </Alert>
        )}

        {isFinalEvaluation && (
          <Alert className="mt-4 border-orange-200 bg-orange-50 dark:bg-orange-950">
            <AlertDescription className="text-orange-800 dark:text-orange-200">
              <strong>Évaluation finale:</strong> Cette évaluation est chronométrée. Assurez-vous de répondre à toutes les questions avant la fin du temps imparti.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default QuizComponent;
