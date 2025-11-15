import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import DashboardHeader from "@/components/layout/DashboardHeader";
import QuizComponent from "@/components/quiz/QuizComponent";

const LessonView = () => {
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showQuiz, setShowQuiz] = useState(false);

  const { data: user } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const { data: lesson } = useQuery({
    queryKey: ["lesson", lessonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select(`
          *,
          modules(
            id,
            title,
            course_id,
            courses(title)
          )
        `)
        .eq("id", lessonId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const { data: quiz } = useQuery({
    queryKey: ["lesson-quiz", lessonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quizzes")
        .select(`
          *,
          quiz_questions(*)
        `)
        .eq("lesson_id", lessonId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  const { data: progress } = useQuery({
    queryKey: ["lesson-progress", user?.id, lessonId],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("lesson_progress")
        .select("*")
        .eq("user_id", user.id)
        .eq("lesson_id", lessonId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: allLessons } = useQuery({
    queryKey: ["module-lessons", lesson?.modules?.id],
    queryFn: async () => {
      if (!lesson?.modules?.id) return [];
      const { data, error } = await supabase
        .from("lessons")
        .select("id, title, order_index")
        .eq("module_id", lesson.modules.id)
        .order("order_index");

      if (error) throw error;
      return data;
    },
    enabled: !!lesson?.modules?.id,
  });

  const markCompleteMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Non connecté");

      const { error } = await supabase
        .from("lesson_progress")
        .upsert({
          user_id: user.id,
          lesson_id: lessonId!,
          is_completed: true,
          completed_at: new Date().toISOString(),
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lesson-progress"] });
      queryClient.invalidateQueries({ queryKey: ["enrollment"] });
      toast.success("Leçon marquée comme terminée!");
    },
  });

  const currentLessonIndex = allLessons?.findIndex(l => l.id === lessonId) ?? -1;
  const nextLesson = allLessons?.[currentLessonIndex + 1];
  const prevLesson = allLessons?.[currentLessonIndex - 1];

  const handleMarkComplete = async () => {
    if (quiz && !showQuiz) {
      setShowQuiz(true);
    } else {
      markCompleteMutation.mutate();
    }
  };

  const handleQuizComplete = async (passed: boolean) => {
    if (passed) {
      markCompleteMutation.mutate();
      setShowQuiz(false);
    }
  };

  if (!lesson) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted">
        <DashboardHeader />
        <div className="container mx-auto px-4 py-8">
          <p>Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <DashboardHeader />

      <main className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate(`/courses/${courseId}`)}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour au cours
        </Button>

        {/* Lesson Header */}
        <div className="mb-6">
          <p className="text-sm text-muted-foreground mb-2">
            {lesson.modules?.courses?.title} → {lesson.modules?.title}
          </p>
          <h1 className="text-4xl font-bold mb-4">{lesson.title}</h1>
          {progress?.is_completed && (
            <div className="flex items-center gap-2 text-success">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">Leçon terminée</span>
            </div>
          )}
        </div>

        {showQuiz && quiz ? (
          <QuizComponent
            quiz={quiz}
            onComplete={handleQuizComplete}
            onCancel={() => setShowQuiz(false)}
          />
        ) : (
          <Card className="mb-6">
            <CardContent className="pt-6">
              {/* Video Player */}
              {lesson.lesson_type === "video" && lesson.video_url && (
                <div className="mb-6">
                  <div className="aspect-video bg-black rounded-lg overflow-hidden">
                    {lesson.video_url.includes("youtube.com") ||
                    lesson.video_url.includes("youtu.be") ? (
                      <iframe
                        src={lesson.video_url.replace("watch?v=", "embed/")}
                        className="w-full h-full"
                        allowFullScreen
                        title={lesson.title}
                      />
                    ) : (
                      <video
                        src={lesson.video_url}
                        controls
                        className="w-full h-full"
                      >
                        Votre navigateur ne supporte pas la vidéo.
                      </video>
                    )}
                  </div>
                </div>
              )}

              {/* PDF Viewer */}
              {lesson.lesson_type === "document" && lesson.document_url && (
                <div className="mb-6">
                  <div className="border rounded-lg overflow-hidden" style={{ height: "600px" }}>
                    <iframe
                      src={`${lesson.document_url}#toolbar=0&navpanes=0`}
                      className="w-full h-full"
                      title={lesson.title}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground mt-2 flex items-center gap-2">
                    <span>📄</span>
                    Le téléchargement est désactivé pour protéger le contenu
                  </p>
                </div>
              )}

              {/* Text Content */}
              {lesson.content && (
                <div
                  className="prose prose-lg max-w-none mb-6"
                  dangerouslySetInnerHTML={{ __html: lesson.content }}
                />
              )}

              {/* Navigation */}
              <div className="flex items-center justify-between pt-6 border-t">
                <div>
                  {prevLesson && (
                    <Button
                      variant="outline"
                      onClick={() =>
                        navigate(`/courses/${courseId}/lessons/${prevLesson.id}`)
                      }
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Leçon précédente
                    </Button>
                  )}
                </div>

                <div className="flex gap-3">
                  {!progress?.is_completed && (
                    <Button onClick={handleMarkComplete}>
                      {quiz ? "Passer le quiz" : "Marquer comme terminé"}
                      <CheckCircle className="w-4 h-4 ml-2" />
                    </Button>
                  )}
                  {nextLesson && (
                    <Button
                      onClick={() =>
                        navigate(`/courses/${courseId}/lessons/${nextLesson.id}`)
                      }
                    >
                      Leçon suivante
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default LessonView;
