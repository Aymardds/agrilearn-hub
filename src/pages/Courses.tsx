import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Users, Clock, BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import DashboardHeader from "@/components/layout/DashboardHeader";

const Courses = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { data: user } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name");

      if (error) throw error;
      return data;
    },
  });

  const { data: courses } = useQuery({
    queryKey: ["courses", selectedCategory, searchTerm],
    queryFn: async () => {
      let query = supabase
        .from("courses")
        .select(`
          *,
          categories(name, icon),
          profiles!courses_instructor_id_fkey(full_name, avatar_url),
          enrollments(count)
        `)
        .eq("is_published", true)
        .eq("is_approved", true);

      if (selectedCategory) {
        query = query.eq("category_id", selectedCategory);
      }

      if (searchTerm) {
        query = query.ilike("title", `%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const { data: enrollments } = useQuery({
    queryKey: ["my-enrollments", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("enrollments")
        .select("course_id")
        .eq("user_id", user.id);

      if (error) throw error;
      return data.map(e => e.course_id);
    },
    enabled: !!user,
  });

  const handleEnroll = async (courseId: string) => {
    if (!user) {
      toast.error("Veuillez vous connecter pour vous inscrire");
      navigate("/auth");
      return;
    }

    try {
      const { error } = await supabase
        .from("enrollments")
        .insert({
          user_id: user.id,
          course_id: courseId,
        });

      if (error) throw error;

      toast.success("Inscription réussie!");
      navigate(`/courses/${courseId}`);
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'inscription");
    }
  };

  const isEnrolled = (courseId: string) => {
    return enrollments?.includes(courseId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <DashboardHeader />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Catalogue de cours
          </h1>
          <p className="text-muted-foreground">
            Découvrez nos formations agricoles
          </p>
        </div>

        {/* Search and Filter */}
        <div className="mb-8 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input
              placeholder="Rechercher un cours..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button
              variant={selectedCategory === null ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(null)}
            >
              Tous
            </Button>
            {categories?.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category.id)}
              >
                {category.icon} {category.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Courses Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses?.map((course) => (
            <Card
              key={course.id}
              className="hover:shadow-lg transition-shadow cursor-pointer overflow-hidden"
              onClick={() => navigate(`/courses/${course.id}`)}
            >
              {course.thumbnail_url && (
                <div
                  className="h-48 bg-cover bg-center"
                  style={{ backgroundImage: `url(${course.thumbnail_url})` }}
                />
              )}
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <Badge variant="secondary" className="mb-2">
                    {course.categories?.name || "Non catégorisé"}
                  </Badge>
                  {isEnrolled(course.id) && (
                    <Badge variant="default">Inscrit</Badge>
                  )}
                </div>
                <CardTitle className="line-clamp-2">{course.title}</CardTitle>
                <CardDescription className="line-clamp-3">
                  {course.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>{course.enrollments?.[0]?.count || 0} inscrits</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <BookOpen className="w-4 h-4" />
                    <span>Par {course.profiles?.full_name}</span>
                  </div>
                </div>
                <Button
                  className="w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isEnrolled(course.id)) {
                      navigate(`/courses/${course.id}`);
                    } else {
                      handleEnroll(course.id);
                    }
                  }}
                  variant={isEnrolled(course.id) ? "outline" : "default"}
                >
                  {isEnrolled(course.id) ? "Accéder au cours" : "S'inscrire"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {courses?.length === 0 && (
          <div className="text-center py-12">
            <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Aucun cours trouvé</h3>
            <p className="text-muted-foreground">
              Essayez de modifier vos filtres ou votre recherche
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Courses;
