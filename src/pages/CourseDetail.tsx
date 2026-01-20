import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, PlayCircle, FileText, CheckCircle, Lock, Award, Clock, Video, ChevronDown } from "lucide-react";
import QuizComponent from "@/components/quiz/QuizComponent";
import { toast } from "sonner";
// header fourni par AppShell
import CertificateGenerator from "@/components/certificates/CertificateGenerator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
          ),
          chapters(
            *,
            lessons(
              id,
              title,
              lesson_type,
              duration_minutes,
              order_index
            )
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
    queryKey: ["final-quiz", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quizzes")
        .select(`
          *,
          quiz_questions(*)
        `)
        .eq("course_id", id)
        .eq("is_final_assessment", true)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
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

          // Chercher le quiz directement associé au module
          const { data: directModuleQuizzes } = await supabase
            .from("quizzes")
            .select(`
              *,
              quiz_questions(*)
            `)
            .eq("module_id", module.id);

          const directModuleQuiz = directModuleQuizzes?.[0] || null;

          // Chercher tous les quiz associés aux leçons du module (fallback/ancêtre)
          const { data: lessonQuizzes } = await supabase
            .from("quizzes")
            .select(`
              *,
              quiz_questions(*)
            `)
            .in("lesson_id", lessonIds);

          // Le quiz principal du module est celui lié directement, ou sinon celui de la dernière leçon
          const sortedLessons = module.lessons.sort((a: any, b: any) => b.order_index - a.order_index);
          const lastLesson = sortedLessons[0];
          const moduleQuiz = directModuleQuiz || lessonQuizzes?.find(q => q.lesson_id === lastLesson.id) || lessonQuizzes?.[0] || null;

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
            allQuizzes: [...(directModuleQuiz ? [directModuleQuiz] : []), ...(lessonQuizzes || [])],
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
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="bg-[#002B49] text-white py-12">
        <div className="container mx-auto px-4">
          <Button
            variant="ghost"
            onClick={() => navigate("/courses")}
            className="mb-8 text-white hover:text-white/80 hover:bg-white/10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Tous les cours
          </Button>

          <div className="flex flex-col md:flex-row justify-between items-start gap-8">
            <div className="flex-1">
              <Badge className="bg-white/20 text-white border-none mb-4 hover:bg-white/30">
                {course.categories?.name}
              </Badge>
              <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
                {course.title}
              </h1>
              <p className="text-lg text-white/80 mb-8 max-w-2xl leading-relaxed">
                {course.description?.substring(0, 200)}...
              </p>

              <div className="flex flex-wrap gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-white border-white/30">Moyen</Badge>
                </div>
                <div className="flex items-center gap-2 text-white/80">
                  <Clock className="w-4 h-4" />
                  <span>10 heures</span>
                </div>
              </div>

              {!enrollment && (
                <div className="mt-8">
                  <Button
                    size="lg"
                    className="bg-[#007BFF] hover:bg-[#0056b3] text-white px-8 h-12 text-lg font-semibold rounded-md shadow-lg"
                    onClick={handleEnroll}
                  >
                    Suivre ce cours
                  </Button>
                </div>
              )}
            </div>

            <div className="w-full md:w-80 shrink-0">
              <Card className="bg-white text-gray-900 border-none shadow-xl overflow-hidden">
                {course.thumbnail_url ? (
                  <img
                    src={course.thumbnail_url}
                    alt={course.title}
                    className="w-full h-48 object-cover"
                    loading="lazy"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1024' height='256'%3E%3Crect width='100%25' height='100%25' fill='%23ddd'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23666' font-size='24'%3EImage indisponible%3C/text%3E%3C/svg%3E"; }}
                  />
                ) : (
                  <div className="w-full h-48 bg-gray-200 flex items-center justify-center text-gray-400">
                    <Video className="w-12 h-12" />
                  </div>
                )}
                <CardContent className="p-6">
                  {enrollment ? (
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm font-medium">
                          <span>PROGRESSION</span>
                          <span>{enrollment.progress_percentage}%</span>
                        </div>
                        <Progress value={enrollment.progress_percentage} className="h-2 bg-gray-100" />
                      </div>

                      <Button
                        className="w-full bg-[#002B49] hover:bg-[#001D31]"
                        onClick={() => {
                          // Trouver la première leçon non terminée ou la première leçon tout court
                          const firstLesson = modules?.[0]?.lessons?.[0];
                          if (firstLesson) {
                            navigate(`/courses/${id}/lessons/${firstLesson.id}`);
                          }
                        }}
                      >
                        Continuer le cours
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-sm text-gray-600">
                        Inscrivez-vous pour accéder à l'intégralité du contenu et obtenir votre certificat.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b sticky top-0 bg-white z-10 shadow-sm">
        <div className="container mx-auto px-4">
          <Tabs defaultValue="aperçu" className="w-full">
            <TabsList className="h-16 bg-transparent gap-8 p-0">
              <TabsTrigger
                value="aperçu"
                className="h-16 rounded-none border-b-4 border-transparent data-[state=active]:border-[#002B49] data-[state=active]:bg-transparent px-0 text-sm font-semibold text-gray-500 data-[state=active]:text-gray-900"
              >
                Aperçu
              </TabsTrigger>
              <TabsTrigger
                value="table"
                className="h-16 rounded-none border-b-4 border-transparent data-[state=active]:border-[#002B49] data-[state=active]:bg-transparent px-0 text-sm font-semibold text-gray-500 data-[state=active]:text-gray-900"
              >
                Table des matières
              </TabsTrigger>
              <TabsTrigger
                value="contributors"
                className="h-16 rounded-none border-b-4 border-transparent data-[state=active]:border-[#002B49] data-[state=active]:bg-transparent px-0 text-sm font-semibold text-gray-500 data-[state=active]:text-gray-900"
              >
                Contributeurs
              </TabsTrigger>
            </TabsList>

            <div className="py-12">
              <TabsContent value="aperçu" className="m-0">
                <div className="grid md:grid-cols-3 gap-12">
                  <div className="md:col-span-2 space-y-12">
                    <section>
                      <h2 className="text-2xl font-bold mb-6 text-gray-900">À propos de ce cours</h2>
                      <div className="prose prose-blue max-w-none text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: course.description }} />
                    </section>

                    <section className="bg-[#F1F7FF] p-8 rounded-xl border border-blue-100">
                      <h2 className="text-xl font-bold mb-4 text-[#002B49]">Objectifs pédagogiques</h2>
                      <ul className="grid sm:grid-cols-2 gap-4">
                        <li className="flex items-start gap-3">
                          <CheckCircle className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
                          <span className="text-gray-700">Comprendre les bases fondamentales</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <CheckCircle className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
                          <span className="text-gray-700">Appliquer les meilleures pratiques</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <CheckCircle className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
                          <span className="text-gray-700">Maîtriser les outils professionnels</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <CheckCircle className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
                          <span className="text-gray-700">Valider vos compétences par un quiz</span>
                        </li>
                      </ul>
                    </section>

                    <section>
                      <h2 className="text-xl font-bold mb-4 text-gray-900">Prérequis</h2>
                      <p className="text-gray-700">Aucun ! Ce cours est accessible à tous.</p>
                    </section>
                  </div>

                  <div className="space-y-8">
                    {/* Instructor Mini Box */}
                    <div className="bg-gray-50 p-6 rounded-xl border">
                      <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">FORMATEUR</h3>
                      <div className="flex items-center gap-4 mb-4">
                        {instructorProfile?.avatar_url ? (
                          <img src={instructorProfile.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover" />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center"><FileText className="w-6 h-6 text-gray-400" /></div>
                        )}
                        <div>
                          <p className="font-bold text-gray-900">{instructorProfile?.full_name}</p>
                          <p className="text-xs text-gray-500">{instructorProfile?.experience_years} ans d'expérience</p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-3 italic">
                        "{instructorProfile?.bio}"
                      </p>
                    </div>

                    {/* Final Assessment Info if applicable */}
                    {enrollment && enrollment.progress_percentage >= 100 && finalQuiz && (
                      <div className="border border-yellow-200 bg-yellow-50 p-6 rounded-xl">
                        <Award className="w-8 h-8 text-yellow-600 mb-4" />
                        <h3 className="font-bold text-yellow-900 mb-2">Prêt pour la certification ?</h3>
                        <p className="text-sm text-yellow-800 mb-4">
                          Vous avez terminé toutes les leçons. Passez l'examen final pour valider votre parcours.
                        </p>
                        <Button
                          className="w-full bg-yellow-600 hover:bg-yellow-700 text-white"
                          onClick={() => {
                            // Naviguer vers la page d'évaluation finale
                            navigate(`/courses/${id}/final-assessment`);
                          }}
                        >
                          Passer l'examen
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="table" className="m-0">
                <div className="max-w-4xl">
                  {showFinalQuiz && finalQuiz ? (
                    <div className="mb-12">
                      <Button
                        variant="ghost"
                        onClick={() => setShowFinalQuiz(false)}
                        className="mb-4"
                      >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Retour au programme
                      </Button>
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
                        timeLimit={30}
                      />
                    </div>
                  ) : showModuleQuiz ? (
                    <div className="mb-12">
                      <Button
                        variant="ghost"
                        onClick={() => setShowModuleQuiz(null)}
                        className="mb-4"
                      >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Retour au programme
                      </Button>
                      {(() => {
                        const moduleQuizData = moduleQuizzes?.find((mq) => mq?.moduleId === showModuleQuiz);
                        if (!moduleQuizData?.quiz) return null;
                        return (
                          <QuizComponent
                            quiz={moduleQuizData.quiz}
                            onComplete={(passed) => {
                              setShowModuleQuiz(null);
                              queryClient.invalidateQueries({ queryKey: ["module-quizzes"] });
                            }}
                            onCancel={() => setShowModuleQuiz(null)}
                            isFinalEvaluation={false}
                            timeLimit={20}
                          />
                        );
                      })()}
                    </div>
                  ) : (
                    <div className="space-y-8">
                      <h2 className="text-2xl font-bold mb-8">Programme du cours</h2>
                      {modules?.map((module, moduleIndex) => {
                        const moduleQuizData = moduleQuizzes?.find((mq) => mq?.moduleId === module.id);
                        const isUnlocked = enrollment !== null;

                        return (
                          <div key={module.id} className="border rounded-xl overflow-hidden bg-white shadow-sm">
                            <div className="bg-gray-50 border-b p-6">
                              <h3 className="text-xl font-bold text-gray-900">{module.title}</h3>
                            </div>
                            <div className="p-0">
                              {(() => {
                                const directLessons = (module.lessons || []).filter((l: any) => !l.chapter_id).map((l: any) => ({ ...l, _type: 'lesson' }));
                                const chapters = (module.chapters || []).map((c: any) => ({
                                  ...c,
                                  _type: 'chapter',
                                  lessons: (module.lessons || []).filter((l: any) => l.chapter_id === c.id)
                                }));
                                const combined = [...directLessons, ...chapters].sort((a: any, b: any) => a.order_index - b.order_index);

                                let lessonCount = 0;

                                return combined.map((item: any) => {
                                  if (item._type === 'lesson') {
                                    lessonCount++;
                                    const lesson = item;
                                    const completed = isLessonCompleted(lesson.id);
                                    return (
                                      <div
                                        key={lesson.id}
                                        className={`flex items-center gap-4 p-4 border-b last:border-b-0 hover:bg-gray-50 transition-colors cursor-pointer ${!isUnlocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        onClick={() => {
                                          if (isUnlocked) navigate(`/courses/${id}/lessons/${lesson.id}`);
                                        }}
                                      >
                                        <div className="w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 border-gray-200 text-gray-400 text-xs font-bold group-hover:border-[#002B49] group-hover:text-[#002B49]">
                                          {lessonCount}
                                        </div>
                                        <div className="flex-1">
                                          <p className="font-semibold text-gray-900">{lesson.title}</p>
                                          <div className="flex items-center gap-3 text-xs text-gray-500">
                                            {getLessonIcon(lesson.lesson_type)}
                                          </div>
                                        </div>
                                        {completed && <CheckCircle className="w-5 h-5 text-green-500" />}
                                      </div>
                                    );
                                  } else {
                                    const chapter = item;
                                    return (
                                      <div key={chapter.id} className="border-b last:border-b-0">
                                        <div className="bg-gray-100/50 p-4 border-l-4 border-[#002B49]">
                                          <h4 className="font-bold text-gray-800 flex items-center gap-2">
                                            <ChevronDown className="w-4 h-4 text-gray-400" />
                                            {chapter.title}
                                          </h4>
                                        </div>
                                        <div className="pl-4">
                                          {chapter.lessons?.sort((a: any, b: any) => a.order_index - b.order_index).map((lesson: any) => {
                                            lessonCount++;
                                            const completed = isLessonCompleted(lesson.id);
                                            return (
                                              <div
                                                key={lesson.id}
                                                className={`flex items-center gap-4 p-4 border-b last:border-b-0 hover:bg-gray-50 transition-colors cursor-pointer ${!isUnlocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                onClick={() => {
                                                  if (isUnlocked) navigate(`/courses/${id}/lessons/${lesson.id}`);
                                                }}
                                              >
                                                <div className="w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 border-gray-200 text-gray-400 text-xs font-bold group-hover:border-[#002B49] group-hover:text-[#002B49]">
                                                  {lessonCount}
                                                </div>
                                                <div className="flex-1">
                                                  <p className="font-semibold text-gray-900">{lesson.title}</p>
                                                  <div className="flex items-center gap-3 text-xs text-gray-500">
                                                    {getLessonIcon(lesson.lesson_type)}
                                                  </div>
                                                </div>
                                                {completed && <CheckCircle className="w-5 h-5 text-green-500" />}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    );
                                  }
                                });
                              })()}

                              {moduleQuizData?.quiz && (
                                <div
                                  className={`flex items-center gap-4 p-4 bg-gray-50/50 hover:bg-gray-100 transition-colors cursor-pointer ${!isUnlocked || !moduleQuizData.canStartQuiz ? 'opacity-50 cursor-not-allowed' : ''}`}
                                  onClick={() => {
                                    if (isUnlocked && moduleQuizData.canStartQuiz) setShowModuleQuiz(module.id);
                                  }}
                                >
                                  <div className="w-8 h-8 rounded-full border-2 border-primary/30 flex items-center justify-center shrink-0 text-primary">
                                    <Award className="w-4 h-4" />
                                  </div>
                                  <div className="flex-1">
                                    <p className="font-semibold text-gray-900">{moduleQuizData.quiz.title || "Évaluation du module"}</p>
                                    <p className="text-xs text-gray-500">Valider vos acquis</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {enrollment && enrollment.progress_percentage >= 100 && finalQuiz && (
                        <div className="border-2 border-yellow-400 rounded-xl overflow-hidden bg-white shadow-lg">
                          <div className="bg-yellow-400 p-6">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                              <Award className="w-6 h-6" />
                              EXAMEN FINAL
                            </h3>
                          </div>
                          <div className="p-6">
                            <p className="text-gray-700 mb-4">
                              Vous êtes sur le point de passer l'examen final pour obtenir votre certificat AgriLearn.
                            </p>
                            <Button
                              className="bg-[#002B49] hover:bg-[#001D31] text-white"
                              onClick={() => navigate(`/courses/${id}/final-assessment`)}
                            >
                              Commencer l'examen
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="contributors" className="m-0">
                <div className="max-w-4xl space-y-12">
                  <h2 className="text-2xl font-bold mb-8">L'équipe pédagogique</h2>

                  <div className="flex flex-col md:flex-row gap-12 items-start">
                    <div className="shrink-0">
                      {instructorProfile?.avatar_url ? (
                        <img src={instructorProfile.avatar_url} alt="" className="w-48 h-48 rounded-2xl object-cover shadow-lg" />
                      ) : (
                        <div className="w-48 h-48 rounded-2xl bg-gray-200 flex items-center justify-center shadow-inner"><FileText className="w-12 h-12 text-gray-400" /></div>
                      )}
                    </div>
                    <div className="flex-1 space-y-4">
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900">{instructorProfile?.full_name}</h3>
                        <p className="text-blue-600 font-semibold">Expert AgriLearn Lab</p>
                      </div>
                      <p className="text-gray-700 leading-relaxed text-lg">
                        {instructorProfile?.bio}
                      </p>
                      <div className="flex gap-4">
                        <div className="bg-gray-100 px-4 py-2 rounded-lg">
                          <p className="text-xs text-gray-500 uppercase font-bold">EXPÉRIENCE</p>
                          <p className="font-bold text-gray-900">{instructorProfile?.experience_years} ans</p>
                        </div>
                        <div className="bg-gray-100 px-4 py-2 rounded-lg">
                          <p className="text-xs text-gray-500 uppercase font-bold">COURS</p>
                          <p className="font-bold text-gray-900">12</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <hr className="border-gray-100" />

                  <div>
                    <h3 className="text-lg font-bold mb-4">Créé par</h3>
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-16 bg-[#002B49] rounded-xl flex items-center justify-center text-white font-bold text-2xl">A</div>
                      <div>
                        <p className="font-bold text-xl">AgriLearn Hub</p>
                        <p className="text-sm text-gray-500">Mis à jour le {new Date().toLocaleDateString('fr-FR')}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default CourseDetail;
