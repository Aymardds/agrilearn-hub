import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, PlayCircle, FileText, CheckCircle, Lock } from "lucide-react";
import { toast } from "sonner";
import DashboardHeader from "@/components/layout/DashboardHeader";

const CourseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: user } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const { data: course } = useQuery({
    queryKey: ["course", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select(`
          *,
          categories(name, icon),
          profiles!courses_instructor_id_fkey(full_name, avatar_url, bio, experience_years)
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },
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
      default:
        return <FileText className="w-4 h-4" />;
    }
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
        });

      if (error) throw error;
      toast.success("Inscription réussie!");
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'inscription");
    }
  };

  if (!course) {
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
              <div
                className="h-64 rounded-xl bg-cover bg-center mb-6"
                style={{ backgroundImage: `url(${course.thumbnail_url})` }}
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

          {/* Instructor Card */}
          <Card>
            <CardHeader>
              <CardTitle>Formateur</CardTitle>
            </CardHeader>
            <CardContent>
              {course.profiles?.avatar_url && (
                <img
                  src={course.profiles.avatar_url}
                  alt={course.profiles.full_name}
                  className="w-20 h-20 rounded-full mb-4"
                />
              )}
              <h3 className="font-semibold mb-2">{course.profiles?.full_name}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {course.profiles?.bio}
              </p>
              {course.profiles?.experience_years && (
                <p className="text-sm">
                  <strong>{course.profiles.experience_years} ans</strong> d'expérience
                </p>
              )}
              {!enrollment && (
                <Button className="w-full mt-4" onClick={handleEnroll}>
                  S'inscrire au cours
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Modules */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Contenu du cours</h2>
          {modules?.map((module, moduleIndex) => (
            <Card key={module.id}>
              <CardHeader>
                <CardTitle>
                  Module {moduleIndex + 1}: {module.title}
                </CardTitle>
                <CardDescription>{module.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {module.lessons
                    ?.sort((a, b) => a.order_index - b.order_index)
                    .map((lesson) => {
                      const completed = isLessonCompleted(lesson.id);
                      const canAccess = enrollment !== null;

                      return (
                        <div
                          key={lesson.id}
                          className={`flex items-center justify-between p-3 rounded-lg border ${
                            canAccess
                              ? "hover:bg-accent cursor-pointer"
                              : "opacity-60"
                          }`}
                          onClick={() => {
                            if (canAccess) {
                              navigate(`/courses/${id}/lessons/${lesson.id}`);
                            }
                          }}
                        >
                          <div className="flex items-center gap-3">
                            {canAccess ? (
                              completed ? (
                                <CheckCircle className="w-5 h-5 text-success" />
                              ) : (
                                getLessonIcon(lesson.lesson_type)
                              )
                            ) : (
                              <Lock className="w-5 h-5 text-muted-foreground" />
                            )}
                            <div>
                              <p className="font-medium">{lesson.title}</p>
                              {lesson.duration_minutes && (
                                <p className="text-sm text-muted-foreground">
                                  {lesson.duration_minutes} min
                                </p>
                              )}
                            </div>
                          </div>
                          {completed && (
                            <Badge variant="default">Terminé</Badge>
                          )}
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
};

export default CourseDetail;
