import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, PlayCircle, FileText, CheckCircle, Lock, Award, Clock, Video } from "lucide-react";
import QuizComponent from "@/components/quiz/QuizComponent";
import { toast } from "sonner";
// header fourni par AppShell
import CertificateGenerator from "@/components/certificates/CertificateGenerator";

const CourseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const { data: userRole } = useQuery({
    queryKey: ["user-role", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();
      if (error) return null;
      return data?.role;
    },
    enabled: !!user,
  });

  const { data: course } = useQuery({
    queryKey: ["course", id, userRole],
    queryFn: async () => {
      let query = supabase
        .from("courses")
        .select(`
          *,
          categories(name, icon)
        `)
        .eq("id", id);

      const { data, error } = await query.single();

      if (error) throw error;
      
      const isInstructor = data?.instructor_id === user?.id;
      const isSupervisor = userRole === "superviseur";
      
      // Autoriser le formateur du cours et les superviseurs à voir les cours même non publiés/non approuvés
      if (userRole !== "superadmin" && !isSupervisor && !isInstructor && (!data?.is_approved || !data?.is_published)) {
        throw new Error("Ce cours n'est pas disponible");
      }
      
      return data;
    },
    enabled: !!id && userRole !== undefined,
  });

  const { data: modules } = useQuery({
    queryKey: ["course-modules", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("modules")
        .select(`
          *,
          lessons(
            id,
            title,
            lesson_type,
            duration_minutes,
            order_index
          )
        `)
        .eq("course_id", id)
        .order("order_index");

      if (error) throw error;
      return data;
    },
  });

  const { data: enrollment } = useQuery({
    queryKey: ["enrollment", user?.id, id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("enrollments")
        .select("*")
        .eq("user_id", user.id)
        .eq("course_id", id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: lessonProgress } = useQuery({
    queryKey: ["lesson-progress", user?.id, id],
    queryFn: async () => {
      if (!user || !modules) return [];

      const lessonIds = modules.flatMap(m => m.lessons?.map(l => l.id) || []);

      const { data, error } = await supabase
        .from("lesson_progress")
        .select("lesson_id, is_completed")
        .eq("user_id", user.id)
        .in("lesson_id", lessonIds);

      if (error) throw error;
      return data;
    },
    enabled: !!user && !!modules,
  });

  const { data: finalQuiz } = useQuery({
    queryKey: ["final-quiz", id, modules],
    queryFn: async () => {
      if (!modules || modules.length === 0) return null;

      // Chercher dans la dernière leçon du dernier module
      const lastModule = modules[modules.length - 1];
      if (!lastModule.lessons || lastModule.lessons.length === 0) return null;

      const lastLesson = lastModule.lessons.sort((a: any, b: any) => b.order_index - a.order_index)[0];

      const { data, error } = await supabase
        .from("quizzes")
        .select(`
          *,
          quiz_questions(*)
        `)
        .eq("lesson_id", lastLesson.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!id && !!modules,
  });

  const [showFinalQuiz, setShowFinalQuiz] = useState(false);
  const [showModuleQuiz, setShowModuleQuiz] = useState<string | null>(null);

  const { data: instructorProfile } = useQuery({
    queryKey: ["instructor-profile", course?.instructor_id],
    queryFn: async () => {
      if (!course?.instructor_id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, bio, experience_years")
        .eq("id", course.instructor_id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!course?.instructor_id,
  });

  // Récupérer tous les quiz associés aux modules
  const { data: moduleQuizzes } = useQuery({
    queryKey: ["module-quizzes", modules, user?.id, lessonProgress],
    queryFn: async () => {
      if (!modules || !user) return [];

      const moduleQuizzesData = await Promise.all(
        modules.map(async (module) => {
          if (!module.lessons || module.lessons.length === 0) {
            return {
              moduleId: module.id,
              moduleTitle: module.title,
              quiz: null,
              allLessonsCompleted: false,
              moduleIndex: modules.indexOf(module),
              lessonsCount: 0,
              completedLessonsCount: 0,
            };
          }

          // Chercher tous les quiz associés aux leçons du module
          const lessonIds = module.lessons.map((l: any) => l.id);
          
          const { data: quizzes } = await supabase
            .from("quizzes")
            .select(`
              *,
              quiz_questions(*)
            `)
            .in("lesson_id", lessonIds);

          // Le quiz principal du module (celui de la dernière leçon ou le premier trouvé)
          const sortedLessons = module.lessons.sort((a: any, b: any) => b.order_index - a.order_index);
          const lastLesson = sortedLessons[0];
          const moduleQuiz = quizzes?.find(q => q.lesson_id === lastLesson.id) || quizzes?.[0] || null;

          // Vérifier la présence d'une séance "live" et sa complétion
          const moduleLessonIds = module.lessons.map((l: any) => l.id);
          const completedLessons = lessonProgress?.filter(
            (p) => moduleLessonIds.includes(p.lesson_id) && p.is_completed
          ) || [];

          const allLessonsCompleted = completedLessons.length === moduleLessonIds.length && moduleLessonIds.length > 0;
          const liveLessons = module.lessons.filter((l: any) => l.lesson_type === "live");
          const hasLive = liveLessons.length > 0;
          const liveCompleted = hasLive ? liveLessons.every((l: any) => completedLessons.some((p) => p.lesson_id === l.id)) : false;
          const canStartQuiz = hasLive ? liveCompleted : allLessonsCompleted;

          return {
            moduleId: module.id,
            moduleTitle: module.title,
            quiz: moduleQuiz,
            allLessonsCompleted,
            canStartQuiz,
            moduleIndex: modules.indexOf(module),
            lessonsCount: module.lessons.length,
            completedLessonsCount: completedLessons.length,
            allQuizzes: quizzes || [],
          };
        })
      );

      return moduleQuizzesData;
    },
    enabled: !!modules && !!user && lessonProgress !== undefined,
  });

  const isLessonCompleted = (lessonId: string) => {
    return lessonProgress?.some(p => p.lesson_id === lessonId && p.is_completed);
  };

  const getLessonIcon = (lessonType: string) => {
    switch (lessonType) {
      case "video":
        return <PlayCircle className="w-4 h-4" />;
      case "document":
      case "text":
        return <FileText className="w-4 h-4" />;
      case "live":
        return <Video className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const parseLiveInfo = (lesson: any) => {
    if (lesson.lesson_type !== "live" || !lesson.content) return null;
    try {
      const info = JSON.parse(lesson.content);
      if (!info || (!info.scheduled_date && !info.scheduled_time && !info.meeting_link)) return null;
      return info;
    } catch {
      return null;
    }
  };

  const getLiveStatus = (lesson: any) => {
    const info = parseLiveInfo(lesson);
    if (!info || !info.scheduled_date || !info.scheduled_time) return null;
    const start = new Date(`${info.scheduled_date}T${info.scheduled_time}:00`);
    const minutes = lesson.duration_minutes || 60;
    const end = new Date(start.getTime() + minutes * 60000);
    const now = new Date();
    if (now < start) return { label: "À venir", variant: "secondary" };
    if (now >= start && now <= end) return { label: "En cours", variant: "default" };
    return { label: "Terminé", variant: "outline" };
  };

  const handleEnroll = async () => {
    if (!user) {
      toast.error("Veuillez vous connecter");
      navigate("/auth");
      return;
    }

    try {
      const { error } = await supabase
        .from("enrollments")
        .insert({
          user_id: user.id,
          course_id: id!,
          progress_percentage: 0,
        });

      if (error) throw error;
      
      // Invalider les queries pour mettre à jour l'interface
      await queryClient.invalidateQueries({ queryKey: ["enrollment"] });
      await queryClient.invalidateQueries({ queryKey: ["enrollments"] });
      await queryClient.invalidateQueries({ queryKey: ["available-courses"] });
      await queryClient.invalidateQueries({ queryKey: ["course-modules"] });
      await queryClient.invalidateQueries({ queryKey: ["module-quizzes"] });
      
      toast.success("Inscription réussie!");
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'inscription");
    }
  };

  if (!course) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted">
        
        <div className="container mx-auto px-4 py-8">
          <p>Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      

      <main className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/courses")}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour aux cours
        </Button>

        {/* Course Header */}
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          <div className="md:col-span-2">
            {course.thumbnail_url && (
              <img
                src={course.thumbnail_url}
                alt={course.title}
                className="h-64 w-full object-cover rounded-xl mb-6"
                loading="lazy"
                referrerPolicy="no-referrer"
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1024' height='256'%3E%3Crect width='100%25' height='100%25' fill='%23ddd'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23666' font-size='24'%3EImage indisponible%3C/text%3E%3C/svg%3E"; }}
              />
            )}
            <Badge variant="secondary" className="mb-4">
              {course.categories?.name}
            </Badge>
            <h1 className="text-4xl font-bold mb-4">{course.title}</h1>
            <p className="text-lg text-muted-foreground mb-6">
              {course.description}
            </p>

            {enrollment && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Progression</span>
                  <span className="text-sm text-muted-foreground">
                    {enrollment.progress_percentage}%
                  </span>
                </div>
                <Progress value={enrollment.progress_percentage} />
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
          {/* Instructor Card */}
          <Card>
            <CardHeader>
              <CardTitle>Formateur</CardTitle>
            </CardHeader>
            <CardContent>
              {instructorProfile && instructorProfile?.avatar_url && (
                <img
                  src={instructorProfile.avatar_url}
                  alt={instructorProfile.full_name}
                  className="w-20 h-20 rounded-full mb-4"
                />
              )}
              <h3 className="font-semibold mb-2">{instructorProfile?.full_name}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {instructorProfile?.bio}
              </p>
              {instructorProfile?.experience_years && (
                <p className="text-sm">
                  <strong>{instructorProfile.experience_years} ans</strong> d'expérience
                </p>
              )}
              {!enrollment && (
                <Button className="w-full mt-4" onClick={handleEnroll}>
                  S'inscrire au cours
                </Button>
              )}
            </CardContent>
          </Card>

            {/* Certificate Generator */}
            {enrollment && user && (
              <CertificateGenerator courseId={id!} userId={user.id} />
            )}
          </div>
        </div>

        {/* Final Evaluation */}
        {enrollment && enrollment.progress_percentage >= 100 && finalQuiz && !showFinalQuiz && (
          <Card className="mb-6 border-2 border-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5 text-primary" />
                Évaluation finale
              </CardTitle>
              <CardDescription>
                Passez l'évaluation finale pour obtenir votre certificat
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    Cette évaluation est chronométrée et contient {finalQuiz.quiz_questions?.length || 0} questions
                  </p>
                  <p className="text-sm font-medium">
                    Score minimum requis: {finalQuiz.passing_score}%
                  </p>
                </div>
                <Button onClick={() => setShowFinalQuiz(true)}>
                  <Clock className="w-4 h-4 mr-2" />
                  Commencer l'évaluation
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {showFinalQuiz && finalQuiz && (
          <Card className="mb-6">
            <CardHeader>
              <Button
                variant="ghost"
                onClick={() => setShowFinalQuiz(false)}
                className="mb-4"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour au cours
              </Button>
            </CardHeader>
            <CardContent>
              <QuizComponent
                quiz={finalQuiz}
                onComplete={(passed) => {
                  setShowFinalQuiz(false);
                  if (passed) {
                    toast.success("Félicitations! Vous pouvez maintenant générer votre certificat.");
                  }
                }}
                onCancel={() => setShowFinalQuiz(false)}
                isFinalEvaluation={true}
                timeLimit={30} // 30 minutes par défaut
              />
            </CardContent>
          </Card>
        )}

        {/* Modules */}
        {!showFinalQuiz && !showModuleQuiz && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Contenu du cours</h2>
          {modules?.map((module, moduleIndex) => {
            const moduleQuizData = moduleQuizzes?.find((mq) => mq?.moduleId === module.id);
            const canStartQuiz = moduleQuizData?.canStartQuiz || false;
            const allLessonsCompleted = moduleQuizData?.allLessonsCompleted || false;
            const moduleQuiz = moduleQuizData?.quiz;
            const lessonsCount = moduleQuizData?.lessonsCount || 0;
            const completedLessonsCount = moduleQuizData?.completedLessonsCount || 0;
            const moduleProgress = lessonsCount > 0 ? Math.round((completedLessonsCount / lessonsCount) * 100) : 0;

            return (
              <Card key={module.id} className="overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary" className="text-xs">
                          Module {moduleIndex + 1}
                        </Badge>
                        {canStartQuiz && moduleQuiz && (
                          <Badge variant="default" className="bg-green-600">
                            Prêt pour l'évaluation
                          </Badge>
                        )}
                        {enrollment && !allLessonsCompleted && (
                          <Badge variant="outline">
                            {completedLessonsCount}/{lessonsCount} leçons complétées
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="text-xl mb-2">
                        {module.title}
                      </CardTitle>
                      <CardDescription className="mb-3">
                        {module.description || "Aucune description"}
                      </CardDescription>
                      {enrollment && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Progression du module</span>
                            <span className="font-medium">{moduleProgress}%</span>
                          </div>
                          <Progress value={moduleProgress} className="h-1.5" />
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="mb-4">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Leçons ({module.lessons?.length || 0})
                    </h3>
                    <div className="space-y-2">
                      {module.lessons
                        ?.sort((a, b) => a.order_index - b.order_index)
                        .map((lesson, lessonIndex) => {
                          const completed = isLessonCompleted(lesson.id);
                          const canAccess = enrollment !== null;

                          return (
                            <div
                              key={lesson.id}
                              className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                                canAccess
                                  ? "hover:bg-accent cursor-pointer hover:shadow-sm"
                                  : "opacity-60"
                              } ${completed ? "bg-green-50 border-green-200" : ""}`}
                              onClick={() => {
                                if (canAccess) {
                                  navigate(`/courses/${id}/lessons/${lesson.id}`);
                                }
                              }}
                            >
                              <div className="flex items-center gap-3 flex-1">
                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                                  {lessonIndex + 1}
                                </div>
                                {canAccess ? (
                                  completed ? (
                                    <CheckCircle className="w-5 h-5 text-success" />
                                  ) : (
                                    getLessonIcon(lesson.lesson_type)
                                  )
                                ) : (
                                  <Lock className="w-5 h-5 text-muted-foreground" />
                                )}
                                <div className="flex-1">
                                  <p className="font-medium">{lesson.title}</p>
                                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                    {lesson.duration_minutes && (
                                      <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {lesson.duration_minutes} min
                                      </span>
                                    )}
                                    <span className="capitalize">{lesson.lesson_type}</span>
                                    {lesson.lesson_type === "live" && (() => {
                                      const info = parseLiveInfo(lesson);
                                      if (!info) return null;
                                      const when = [info.scheduled_date, info.scheduled_time].filter(Boolean).join(" ");
                                      return (
                                        <span className="flex items-center gap-1">
                                          <Clock className="w-3 h-3" />
                                          {when || "Horaire à venir"}
                                        </span>
                                      );
                                    })()}
                                    {lesson.lesson_type === "live" && lesson.video_url && (
                                      <a href={lesson.video_url} target="_blank" rel="noreferrer" className="underline">
                                        Lien visio
                                      </a>
                                    )}
                                    {lesson.lesson_type === "live" && (() => {
                                      const status = getLiveStatus(lesson);
                                      if (!status) return null;
                                      return (
                                        <Badge variant={status.variant as any}>{status.label}</Badge>
                                      );
                                    })()}
                                  </div>
                                </div>
                              </div>
                              {completed && (
                                <Badge variant="default" className="bg-green-600">
                                  Terminé
                                </Badge>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </div>

                  {/* Quiz associé au module */}
                  {moduleQuiz && (
                    <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 mt-4">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Award className="w-5 h-5 text-primary" />
                              <h3 className="font-semibold text-lg">
                                Quiz du module
                              </h3>
                            </div>
                            <p className="text-sm text-muted-foreground mb-3">
                              {moduleQuiz.title || "Évaluation finale du module"}
                            </p>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-muted-foreground" />
                                <div>
                                  <p className="font-medium">{moduleQuiz.quiz_questions?.length || 0}</p>
                                  <p className="text-xs text-muted-foreground">Questions</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Award className="w-4 h-4 text-muted-foreground" />
                                <div>
                                  <p className="font-medium">{moduleQuiz.passing_score}%</p>
                                  <p className="text-xs text-muted-foreground">Score minimum</p>
                                </div>
                              </div>
                            </div>
                          </div>
                          {enrollment && (
                            <div className="flex flex-col items-end gap-2">
                              {canStartQuiz ? (
                                <Button
                                  onClick={() => setShowModuleQuiz(module.id)}
                                  size="sm"
                                  className="bg-primary hover:bg-primary/90"
                                >
                                  <Clock className="w-4 h-4 mr-2" />
                                  Passer l'évaluation
                                </Button>
                              ) : (
                                <Badge variant="outline" className="text-xs">
                                  Participez à la session visio du module
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {!moduleQuiz && enrollment && (
                    <div className="mt-4 p-4 rounded-lg border border-dashed border-muted-foreground/30 text-center">
                      <p className="text-sm text-muted-foreground">
                        Aucun quiz associé à ce module
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
        )}

        {/* Quiz de module */}
        {showModuleQuiz && moduleQuizzes && (
          <Card className="mb-6">
            <CardHeader>
              <Button
                variant="ghost"
                onClick={() => setShowModuleQuiz(null)}
                className="mb-4"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour au cours
              </Button>
            </CardHeader>
            <CardContent>
              {(() => {
                const moduleQuizData = moduleQuizzes.find((mq) => mq?.moduleId === showModuleQuiz);
                if (!moduleQuizData?.quiz) return null;
                return (
                  <QuizComponent
                    quiz={moduleQuizData.quiz}
                    onComplete={(passed) => {
                      setShowModuleQuiz(null);
                      queryClient.invalidateQueries({ queryKey: ["module-quizzes"] });
                      if (passed) {
                        toast.success(`Félicitations! Vous avez réussi l'évaluation du module "${moduleQuizData.moduleTitle}"`);
                      }
                    }}
                    onCancel={() => setShowModuleQuiz(null)}
                    isFinalEvaluation={false}
                    timeLimit={20} // 20 minutes pour les évaluations de module
                  />
                );
              })()}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default CourseDetail;
