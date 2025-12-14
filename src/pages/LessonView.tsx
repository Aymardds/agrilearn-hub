import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, CheckCircle, Video, Clock, ExternalLink } from "lucide-react";
import { toast } from "sonner";
// header fourni par AppShell
import QuizComponent from "@/components/quiz/QuizComponent";
import VideoPlayer from "@/components/lessons/VideoPlayer";
import EmbeddedVideoPlayer from "@/components/lessons/EmbeddedVideoPlayer";
import ProtectedPDFViewer from "@/components/lessons/ProtectedPDFViewer";
import InteractiveContent from "@/components/lessons/InteractiveContent";

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

  const { data: enrollment } = useQuery({
    queryKey: ["enrollment", user?.id, lesson?.modules?.course_id],
    queryFn: async () => {
      if (!user || !lesson?.modules?.course_id) return null;
      const { data, error } = await supabase
        .from("enrollments")
        .select("*")
        .eq("user_id", user.id)
        .eq("course_id", lesson.modules.course_id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user && !!lesson?.modules?.course_id,
  });

  const { data: courseStructure } = useQuery({
    queryKey: ["course-structure", lesson?.modules?.course_id],
    queryFn: async () => {
      if (!lesson?.modules?.course_id) return [];
      const { data, error } = await supabase
        .from("modules")
        .select(`
          id,
          title,
          order_index,
          lessons (id, title, order_index, chapter_id),
          chapters (
            id,
            title,
            order_index,
            lessons (id, title, order_index)
          )
        `)
        .eq("course_id", lesson.modules.course_id)
        .order("order_index");

      if (error) throw error;
      return data;
    },
    enabled: !!lesson?.modules?.course_id,
  });

  const flatLessons = useMemo(() => {
    if (!courseStructure) return [];
    const lessons: any[] = [];
    const sortedModules = [...courseStructure].sort((a: any, b: any) => a.order_index - b.order_index);

    for (const mod of sortedModules) {
      const directLessons = (mod.lessons || []).filter((l: any) => !l.chapter_id).map((l: any) => ({ ...l, _type: 'lesson' }));
      const chapters = (mod.chapters || []).map((c: any) => ({ ...c, _type: 'chapter' }));
      const combined = [...directLessons, ...chapters].sort((a: any, b: any) => a.order_index - b.order_index);

      for (const item of combined) {
        if (item._type === 'lesson') {
          lessons.push(item);
        } else {
          const chapLessons = (item.lessons || []).sort((a: any, b: any) => a.order_index - b.order_index);
          lessons.push(...chapLessons);
        }
      }
    }
    return lessons;
  }, [courseStructure]);

  const markCompleteMutation = useMutation({
    mutationFn: async () => {
      if (!user || !lesson?.modules?.course_id) throw new Error("Non connecté");

      // Marquer la leçon comme complétée
      const { error: progressError } = await supabase
        .from("lesson_progress")
        .upsert({
          user_id: user.id,
          lesson_id: lessonId!,
          is_completed: true,
          completed_at: new Date().toISOString(),
        });

      if (progressError) throw progressError;

      // Calculer et mettre à jour la progression du cours
      const { data: modulesData } = await supabase
        .from("modules")
        .select("id")
        .eq("course_id", lesson.modules.course_id);

      if (!modulesData || modulesData.length === 0) return;

      const moduleIds = modulesData.map(m => m.id);

      const { data: allLessonsInCourse } = await supabase
        .from("lessons")
        .select("id")
        .in("module_id", moduleIds);

      if (allLessonsInCourse && allLessonsInCourse.length > 0) {
        // Attendre un peu pour s'assurer que la leçon est bien enregistrée
        await new Promise(resolve => setTimeout(resolve, 100));

        const { data: completedLessons } = await supabase
          .from("lesson_progress")
          .select("lesson_id")
          .eq("user_id", user.id)
          .eq("is_completed", true)
          .in("lesson_id", allLessonsInCourse.map(l => l.id));

        const completedCount = completedLessons?.length || 0;
        const totalCount = allLessonsInCourse.length;
        const progressPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

        // Mettre à jour la progression dans enrollments
        const updateData: any = {
          progress_percentage: progressPercentage,
        };

        if (progressPercentage === 100) {
          updateData.completed_at = new Date().toISOString();
        }

        const { error: enrollmentError } = await supabase
          .from("enrollments")
          .update(updateData)
          .eq("user_id", user.id)
          .eq("course_id", lesson.modules.course_id);

        if (enrollmentError) throw enrollmentError;
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["lesson-progress"] });
      await queryClient.invalidateQueries({ queryKey: ["enrollment"] });
      await queryClient.invalidateQueries({ queryKey: ["enrollments"] });
      await queryClient.invalidateQueries({ queryKey: ["course-modules"] });
      await queryClient.invalidateQueries({ queryKey: ["module-quizzes"] });
      await queryClient.invalidateQueries({ queryKey: ["available-courses"] });
      toast.success("Leçon marquée comme terminée!");
    },
  });

  const currentLessonIndex = flatLessons?.findIndex((l: any) => l.id === lessonId) ?? -1;
  const nextLesson = flatLessons?.[currentLessonIndex + 1];
  const prevLesson = flatLessons?.[currentLessonIndex - 1];

  const handleMarkComplete = async () => {
    if (quiz && !showQuiz && !progress?.is_completed) {
      // Afficher le quiz si disponible et pas encore complété
      setShowQuiz(true);
    } else if (!quiz) {
      // Pas de quiz, marquer directement comme complété
      markCompleteMutation.mutate();
    }
  };

  const handleQuizComplete = async (passed: boolean) => {
    setShowQuiz(false);
    if (passed) {
      // Si le quiz est réussi, marquer la leçon comme complétée
      markCompleteMutation.mutate();
    } else {
      // Si le quiz est échoué, permettre de réessayer
      toast.error("Vous pouvez réessayer le quiz en cliquant sur 'Passer le quiz'");
    }
  };

  if (!lesson) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted">

        <div className="container mx-auto px-4 py-8">
          <p>Chargement...</p>
        </div>
      </div>
    );
  }

  // Vérifier l'inscription avant d'afficher le contenu
  if (user && !enrollment) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted">

        <main className="container mx-auto px-4 py-8">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Accès restreint</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Vous devez être inscrit à ce cours pour accéder aux leçons.
              </p>
              <Button
                onClick={() => navigate(`/courses/${courseId}`)}
                className="w-full"
              >
                Retour au cours et s'inscrire
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">


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
          <>
            <Card className="mb-6">
              <CardContent className="pt-6">
                {lesson.lesson_type === "live" && (
                  <div className="mb-6 space-y-2">
                    {(() => {
                      let info: any = null;
                      try { info = lesson.content ? JSON.parse(lesson.content) : null; } catch { }
                      const when = info ? [info.scheduled_date, info.scheduled_time].filter(Boolean).join(" ") : null;
                      return (
                        <div className="p-4 rounded-lg border bg-muted/30">
                          <div className="flex items-center gap-2 mb-2">
                            <Video className="w-4 h-4" />
                            <span className="font-semibold">Session en visioconférence</span>
                          </div>
                          <div className="text-sm text-muted-foreground flex items-center gap-2">
                            <Clock className="w-3 h-3" />
                            <span>{when || "Horaire à venir"}</span>
                            {(() => {
                              const start = info && info.scheduled_date && info.scheduled_time ? new Date(`${info.scheduled_date}T${info.scheduled_time}:00`) : null;
                              const minutes = lesson.duration_minutes || 60;
                              const end = start ? new Date(start.getTime() + minutes * 60000) : null;
                              const now = new Date();
                              const statusLabel = start && end ? (now < start ? "À venir" : now <= end ? "En cours" : "Terminé") : null;
                              return statusLabel ? <span>• {statusLabel}</span> : null;
                            })()}
                          </div>
                          {lesson.video_url && (
                            <div className="mt-2">
                              <a href={lesson.video_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 underline">
                                <ExternalLink className="w-3 h-3" />
                                Rejoindre la réunion
                              </a>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
                {/* Video Player */}
                {lesson.lesson_type === "video" && lesson.video_url && (
                  <div className="mb-6">
                    <EmbeddedVideoPlayer
                      videoUrl={lesson.video_url}
                      title={lesson.title}
                      onTimeUpdate={(currentTime, duration) => {
                        // Track video progress if needed
                      }}
                      onEnded={() => {
                        toast.success("Vidéo terminée!");
                      }}
                    />
                  </div>
                )}

                {/* PDF Viewer */}
                {lesson.lesson_type === "document" && lesson.document_url && user && (
                  <div className="mb-6">
                    <ProtectedPDFViewer
                      pdfUrl={lesson.document_url}
                      title={lesson.title}
                      userId={user.id}
                      lessonId={lessonId!}
                    />
                  </div>
                )}

                {/* Text Content with Interactive Elements */}
                {lesson.content && (
                  <div className="mb-6">
                    <InteractiveContent
                      content={lesson.content}
                      interactiveElements={[]}
                    />
                  </div>
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
                        {quiz ? "Passer le quiz" : lesson.lesson_type === "live" ? "Marquer comme participé" : "Marquer comme terminé"}
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
          </>
        )}
      </main>
    </div>
  );
};

export default LessonView;
