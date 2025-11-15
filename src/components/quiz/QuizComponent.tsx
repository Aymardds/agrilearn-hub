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
      setTimeRemaining((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearInterval(timer);
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
    const finalScore = calculateScore();
    setScore(finalScore);
    setShowResults(true);

    const passed = finalScore >= quiz.passing_score;

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
        toast.success(`Félicitations! Score: ${finalScore}%`);
        onComplete(true);
      } else {
        toast.error(`Score insuffisant: ${finalScore}% (minimum: ${quiz.passing_score}%)`);
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
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {passed ? (
              <>
                <CheckCircle className="w-6 h-6 text-success" />
                Quiz réussi!
              </>
            ) : (
              <>
                <XCircle className="w-6 h-6 text-destructive" />
                Quiz non réussi
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-4">
            <div className="text-5xl font-bold text-primary">{score}%</div>
            <p className="text-muted-foreground">
              Score minimum requis: {quiz.passing_score}%
            </p>
            <p>
              Vous avez répondu correctement à{" "}
              <strong>{Math.round((score / 100) * questions.length)}</strong> questions sur{" "}
              <strong>{questions.length}</strong>
            </p>
            {!passed && !isFinalEvaluation && (
              <Alert>
                <AlertDescription>
                  Vous pouvez réessayer le quiz pour améliorer votre score.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between mb-2">
          <CardTitle>{quiz.title}</CardTitle>
          {timeRemaining !== null && (
            <div className={`flex items-center gap-2 ${timeRemaining < 60 ? "text-destructive" : ""}`}>
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
            <Button variant="ghost" onClick={onCancel}>
              Annuler
            </Button>
            {currentQuestionIndex === questions.length - 1 ? (
              <Button
                onClick={handleSubmit}
                disabled={!allQuestionsAnswered}
              >
                Terminer le quiz
              </Button>
            ) : (
              <Button onClick={handleNext}>Suivant</Button>
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
      </CardContent>
    </Card>
  );
};

export default QuizComponent;
