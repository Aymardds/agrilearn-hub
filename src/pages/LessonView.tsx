import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, CheckCircle, Video, Clock, ExternalLink, FileText } from "lucide-react";
import { toast } from "sonner";
// header fourni par AppShell
import QuizComponent from "@/components/quiz/QuizComponent";
import VideoPlayer from "@/components/lessons/VideoPlayer";
import EmbeddedVideoPlayer from "@/components/lessons/EmbeddedVideoPlayer";
import ProtectedPDFViewer from "@/components/lessons/ProtectedPDFViewer";
import InteractiveContent from "@/components/lessons/InteractiveContent";
import LessonSidebar from "@/components/lessons/LessonSidebar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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

      // Fetch quizzes associated with these modules
      const moduleIds = data.map((m: any) => m.id);
      const { data: moduleQuizzes } = await supabase
        .from("quizzes")
        .select("*")
        .in("module_id", moduleIds);

      const quizzesByModule: Record<string, any> = {};
      (moduleQuizzes || []).forEach((q: any) => { quizzesByModule[q.module_id!] = q; });

      return { modules: data, quizzesByModule } as any;
    },
    enabled: !!lesson?.modules?.course_id,
  });

  const flatLessons = useMemo(() => {
    if (!courseStructure?.modules) return [];
    const lessons: any[] = [];
    const sortedModules = [...courseStructure.modules].sort((a: any, b: any) => a.order_index - b.order_index);

    for (const mod of sortedModules) {
      const allLessons = mod.lessons || [];
      const directLessons = allLessons.filter((l: any) => !l.chapter_id).map((l: any) => ({ ...l, _type: 'lesson' }));
      const chapters = (mod.chapters || []).map((c: any) => ({
        ...c,
        _type: 'chapter',
        lessons: allLessons.filter((l: any) => l.chapter_id === c.id)
      }));
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

  const { data: allProgress } = useQuery({
    queryKey: ["all-lesson-progress", user?.id, lesson?.modules?.course_id],
    queryFn: async () => {
      if (!user || !lesson?.modules?.course_id) return [];

      const { data: modulesData } = await supabase
        .from("modules")
        .select("id")
        .eq("course_id", lesson.modules.course_id);

      if (!modulesData) return [];
      const moduleIds = modulesData.map(m => m.id);

      const { data: lessonsInCourse } = await supabase
        .from("lessons")
        .select("id")
        .in("module_id", moduleIds);

      if (!lessonsInCourse) return [];

      const { data, error } = await supabase
        .from("lesson_progress")
        .select("*")
        .eq("user_id", user.id)
        .in("lesson_id", lessonsInCourse.map(l => l.id));

      if (error) throw error;
      return data;
    },
    enabled: !!user && !!lesson?.modules?.course_id,
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

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
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-white">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-80 h-full overflow-hidden shrink-0">
        <LessonSidebar
          courseStructure={courseStructure?.modules || []}
          currentLessonId={lessonId}
          courseId={courseId}
          lessonProgress={allProgress || []}
          courseTitle={lesson.modules?.courses?.title}
          quizzesByModule={courseStructure?.quizzesByModule}
        />
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 border-b flex items-center justify-between px-6 bg-white shrink-0">
          <div className="flex items-center gap-4">
            {/* Mobile Sidebar Trigger */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-80">
                <LessonSidebar
                  courseStructure={courseStructure?.modules || []}
                  currentLessonId={lessonId}
                  courseId={courseId}
                  lessonProgress={allProgress || []}
                  courseTitle={lesson.modules?.courses?.title}
                  quizzesByModule={courseStructure?.quizzesByModule}
                />
              </SheetContent>
            </Sheet>

            <nav className="hidden sm:flex items-center gap-2 text-xs font-medium text-gray-400">
              <span className="uppercase tracking-widest">{lesson.modules?.courses?.title}</span>
              <span>/</span>
              <span className="text-gray-600 line-clamp-1">{lesson.modules?.title}</span>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end mr-4">
              <span className="text-[10px] font-bold text-gray-400 uppercase">PROGRESSION</span>
              <div className="flex items-center gap-2 w-32">
                <Progress value={enrollment?.progress_percentage ?? 0} className="h-1 bg-gray-100" />
                <span className="text-xs font-bold text-gray-700">{enrollment?.progress_percentage ?? 0}%</span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/courses/${courseId}`)}
              className="hidden sm:flex border-gray-200 text-gray-600 font-semibold"
            >
              Quitter le cours
            </Button>
          </div>
        </header>

        {/* Lesson Content Scrollable */}
        <div className="flex-1 overflow-y-auto bg-gray-50/50">
          <div className="max-w-4xl mx-auto px-6 py-12">

            {showQuiz && quiz ? (
              <QuizComponent
                quiz={quiz}
                onComplete={handleQuizComplete}
                onCancel={() => setShowQuiz(false)}
              />
            ) : (
              <div className="space-y-8">
                {/* Lesson Title & Info */}
                <div className="space-y-4">
                  <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
                    {lesson.title}
                  </h1>
                  {progress?.is_completed && (
                    <Badge variant="outline" className="bg-green-100 text-green-700 border-none px-3 py-1">
                      <CheckCircle className="w-3 h-3 mr-2" />
                      Terminé
                    </Badge>
                  )}
                </div>

                {/* Content Card */}
                <Card className="border-none shadow-sm overflow-hidden bg-white">
                  <CardContent className="p-0 sm:p-4 lg:p-8">
                    {lesson.lesson_type === "live" && (
                      <div className="mb-8 overflow-hidden rounded-xl border border-blue-100 bg-[#F1F7FF]">
                        <div className="p-6">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white">
                              <Video className="w-5 h-5" />
                            </div>
                            <div>
                              <h3 className="font-bold text-[#002B49]">Session de visioconférence</h3>
                              <p className="text-xs text-blue-600 font-semibold">COURS EN DIRECT</p>
                            </div>
                          </div>

                          {(() => {
                            let info: any = null;
                            try { info = lesson.content ? JSON.parse(lesson.content) : null; } catch { }
                            const when = info ? [info.scheduled_date, info.scheduled_time].filter(Boolean).join(" ") : null;
                            return (
                              <>
                                <div className="flex items-center gap-6 text-sm text-gray-600 mb-6 font-medium">
                                  <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-blue-500" />
                                    {when || "Horaire à venir"}
                                  </div>
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
                                  <Button asChild className="bg-blue-600 hover:bg-blue-700">
                                    <a href={lesson.video_url} target="_blank" rel="noreferrer">
                                      <ExternalLink className="w-4 h-4 mr-2" />
                                      Rejoindre la réunion
                                    </a>
                                  </Button>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    )}

                    {/* Media content */}
                    {lesson.lesson_type === "video" && lesson.video_url && (
                      <div className="mb-8 rounded-xl overflow-hidden shadow-lg border">
                        <EmbeddedVideoPlayer
                          videoUrl={lesson.video_url}
                          title={lesson.title}
                          onEnded={() => toast.success("Vidéo terminée!")}
                        />
                      </div>
                    )}

                    {lesson.lesson_type === "document" && lesson.document_url && user && (
                      <div className="mb-8 rounded-xl overflow-hidden shadow-lg border min-h-[600px]">
                        <ProtectedPDFViewer
                          pdfUrl={lesson.document_url}
                          title={lesson.title}
                          userId={user.id}
                          lessonId={lessonId!}
                        />
                      </div>
                    )}

                    {/* Main content body */}
                    {lesson.content ? (
                      <div className="prose prose-blue max-w-none text-gray-700 leading-relaxed font-inter">
                        <InteractiveContent
                          content={lesson.content}
                          interactiveElements={[]}
                        />
                      </div>
                    ) : (
                      lesson.lesson_type === "text" && (
                        <div className="py-12 text-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                          <p className="text-gray-500 font-medium">Cette leçon n'a pas encore de contenu textuel.</p>
                          <p className="text-sm text-gray-400">Veuillez ajouter du contenu via l'éditeur.</p>
                        </div>
                      )
                    )}
                  </CardContent>
                </Card>

                {/* Bottom Navigation */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 py-12 border-t border-gray-100">
                  <div className="w-full sm:w-auto">
                    {prevLesson && (
                      <Button
                        variant="ghost"
                        className="text-gray-500 hover:text-gray-900 group"
                        onClick={() => navigate(`/courses/${courseId}/lessons/${prevLesson.id}`)}
                      >
                        <ArrowLeft className="w-4 h-4 mr-2 transition-transform group-hover:-translate-x-1" />
                        <div className="text-left">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">PRÉCÉDENT</p>
                          <p className="font-bold text-sm line-clamp-1">{prevLesson.title}</p>
                        </div>
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center gap-4 w-full sm:w-auto">
                    {!progress?.is_completed && (
                      <Button
                        size="lg"
                        className="flex-1 sm:flex-none bg-[#002B49] hover:bg-[#001D31] text-white px-8 h-12 shadow-md"
                        onClick={handleMarkComplete}
                      >
                        {quiz ? "Faire le quiz" : "Compléter cette leçon"}
                        <CheckCircle className="w-4 h-4 ml-2" />
                      </Button>
                    )}

                    {nextLesson && (
                      <Button
                        size="lg"
                        variant={progress?.is_completed ? "default" : "outline"}
                        className={cn(
                          "flex-1 sm:flex-none px-8 h-12 group transition-all",
                          progress?.is_completed ? "bg-blue-600 hover:bg-blue-700" : "border-gray-200 text-gray-600"
                        )}
                        onClick={() => navigate(`/courses/${courseId}/lessons/${nextLesson.id}`)}
                      >
                        <div className="text-right flex flex-col items-end">
                          <p className={cn("text-[10px] font-bold uppercase tracking-widest", progress?.is_completed ? "text-blue-100" : "text-gray-400")}>SUIVANT</p>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-sm line-clamp-1">{nextLesson.title}</p>
                            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                          </div>
                        </div>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LessonView;
