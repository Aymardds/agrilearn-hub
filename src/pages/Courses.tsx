import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Users, Clock, BookOpen, Star, TrendingUp, Filter, Grid, List } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
// header fourni par AppShell

const Courses = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"newest" | "popular" | "title">("newest");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const startParam = searchParams.get("start");
  const endParam = searchParams.get("end");

  const { data: user } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const { data: userProfile } = useQuery({
    queryKey: ["current-user-profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      return data;
    },
    enabled: !!user,
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
    queryKey: ["courses", selectedCategory, searchTerm, sortBy],
    queryFn: async () => {
      let query = supabase
        .from("courses")
        .select(`
          *,
          categories(name, icon),
          enrollments(count)
        `)
        .eq("is_published", true)
        .eq("is_approved", true);

      if (selectedCategory) {
        query = query.eq("category_id", selectedCategory);
      }

      if (searchTerm) {
        query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      }

      try {
        if (startParam) {
          query = query.or(`period_start.gte.${startParam}T00:00:00,created_at.gte.${startParam}T00:00:00`);
        }
        if (endParam) {
          query = query.or(`period_end.lte.${endParam}T23:59:59,created_at.lte.${endParam}T23:59:59`);
        }

        switch (sortBy) {
          case "newest":
            query = query.order("created_at", { ascending: false });
            break;
          case "popular":
            query = query.order("created_at", { ascending: false });
            break;
          case "title":
            query = query.order("title", { ascending: true });
            break;
        }

        const { data, error } = await query;
        if (error) throw error;
        if (sortBy === "popular" && data) {
          return data.sort((a, b) => {
            const aCount = a.enrollments?.[0]?.count || 0;
            const bCount = b.enrollments?.[0]?.count || 0;
            return bCount - aCount;
          });
        }
        return data;
      } catch (e: any) {
        const msg = String(e?.message || "");
        if (msg.includes("period_start") || msg.includes("period_end")) {
          let q = supabase
            .from("courses")
            .select(`
              *,
              categories(name, icon),
              enrollments(count)
            `)
            .eq("is_published", true)
            .eq("is_approved", true);
          if (selectedCategory) q = q.eq("category_id", selectedCategory);
          if (searchTerm) q = q.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
          if (startParam) q = q.gte("created_at", `${startParam}T00:00:00`);
          if (endParam) q = q.lte("created_at", `${endParam}T23:59:59`);
          switch (sortBy) {
            case "newest":
              q = q.order("created_at", { ascending: false });
              break;
            case "popular":
              q = q.order("created_at", { ascending: false });
              break;
            case "title":
              q = q.order("title", { ascending: true });
              break;
          }
          const { data, error } = await q;
          if (error) throw error;
          if (sortBy === "popular" && data) {
            return data.sort((a, b) => {
              const aCount = a.enrollments?.[0]?.count || 0;
              const bCount = b.enrollments?.[0]?.count || 0;
              return bCount - aCount;
            });
          }
          return data || [];
        }
        throw e;
      }
    },
  });

  const { data: instructorProfiles } = useQuery({
    queryKey: ["courses-instructor-profiles", courses?.map(c => c.instructor_id)],
    queryFn: async () => {
      const instructorIds = Array.from(new Set((courses || []).map(c => c.instructor_id))).filter(Boolean);
      if (instructorIds.length === 0) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", instructorIds as string[]);
      if (error) throw error;
      return data || [];
    },
    enabled: !!courses && courses.length > 0,
  });

  const instructorMap = Object.fromEntries((instructorProfiles || []).map((p: any) => [p.id, p]));

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
          <div className="flex gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <Input
                placeholder="Rechercher un cours par titre ou description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Select value={sortBy} onValueChange={(value: "newest" | "popular" | "title") => setSortBy(value)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Trier par" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Plus récents</SelectItem>
                  <SelectItem value="popular">Plus populaires</SelectItem>
                  <SelectItem value="title">Titre (A-Z)</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex border rounded-md">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className="rounded-r-none"
                >
                  <Grid className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className="rounded-l-none"
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-muted-foreground" />
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

        {/* Courses Grid/List */}
        {viewMode === "grid" ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses?.map((course) => {
              const isAccessible = !userProfile?.category_id || userProfile.category_id === course.category_id || isEnrolled(course.id);

              return (
                <Card
                  key={course.id}
                  className={`transition-all cursor-pointer overflow-hidden border-2 
                ${isAccessible
                      ? "hover:shadow-lg hover:border-primary"
                      : "opacity-60 grayscale cursor-not-allowed hover:border-border"
                    }`}
                  onClick={() => {
                    if (isAccessible) {
                      navigate(`/courses/${course.id}`);
                    } else {
                      toast.error("Ce cours n'est pas disponible pour votre filière");
                    }
                  }}
                >
                  {course.thumbnail_url && (
                    <div
                      className="h-48 bg-cover bg-center relative"
                      style={{ backgroundImage: `url(${course.thumbnail_url})` }}
                    >
                      <div className="absolute top-2 right-2">
                        {isEnrolled(course.id) && (
                          <Badge variant="default" className="bg-primary">Inscrit</Badge>
                        )}
                        {!isAccessible && (
                          <Badge variant="destructive">Non disponible</Badge>
                        )}
                      </div>
                    </div>
                  )}
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">
                          {course.categories?.icon} {course.categories?.name || "Non catégorisé"}
                        </Badge>
                        {(() => {
                          const ps = course.period_start ? new Date(course.period_start) : null;
                          const pe = course.period_end ? new Date(course.period_end) : null;
                          const now = new Date();
                          let label: string | null = null;
                          let variant: "default" | "outline" | "secondary" = "secondary";
                          if (ps && pe) {
                            if (now < ps) { label = "À venir"; variant = "secondary"; }
                            else if (now >= ps && now <= pe) { label = "En cours"; variant = "default"; }
                            else { label = "Terminé"; variant = "outline"; }
                          }
                          return label ? <Badge variant={variant}>{label}</Badge> : null;
                        })()}
                      </div>
                      {course.enrollments?.[0]?.count > 0 && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <TrendingUp className="w-3 h-3" />
                          <span>{course.enrollments[0].count}</span>
                        </div>
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
                        <span className="truncate max-w-[100px]">{instructorMap[course.instructor_id]?.full_name}</span>
                      </div>
                    </div>
                    <Button
                      className="w-full"
                      disabled={!isAccessible}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isAccessible) return;
                        if (isEnrolled(course.id)) {
                          navigate(`/courses/${course.id}`);
                        } else {
                          handleEnroll(course.id);
                        }
                      }}
                      variant={isEnrolled(course.id) ? "outline" : "default"}
                    >
                      {isEnrolled(course.id) ? "Accéder au cours" : isAccessible ? "S'inscrire" : "Non disponible"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="space-y-4">
            {courses?.map((course) => {
              const isAccessible = !userProfile?.category_id || userProfile.category_id === course.category_id || isEnrolled(course.id);

              return (
                <Card
                  key={course.id}
                  className={`transition-all cursor-pointer 
                  ${isAccessible
                      ? "hover:shadow-lg"
                      : "opacity-60 grayscale cursor-not-allowed"
                    }`}
                  onClick={() => {
                    if (isAccessible) {
                      navigate(`/courses/${course.id}`);
                    } else {
                      toast.error("Ce cours n'est pas disponible pour votre filière");
                    }
                  }}
                >
                  <div className="flex gap-4 p-6">
                    {course.thumbnail_url && (
                      <img
                        src={course.thumbnail_url}
                        alt={course.title}
                        className="w-48 h-32 object-cover rounded-lg flex-shrink-0"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).src = "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='200'%3E%3Crect width='100%25' height='100%25' fill='%23ddd'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23666' font-size='18'%3EImage indisponible%3C/text%3E%3C/svg%3E"; }}
                      />
                    )}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">
                            {course.categories?.icon} {course.categories?.name || "Non catégorisé"}
                          </Badge>
                          {(() => {
                            const ps = course.period_start ? new Date(course.period_start) : null;
                            const pe = course.period_end ? new Date(course.period_end) : null;
                            const now = new Date();
                            let label: string | null = null;
                            let variant: "default" | "outline" | "secondary" = "secondary";
                            if (ps && pe) {
                              if (now < ps) { label = "À venir"; variant = "secondary"; }
                              else if (now >= ps && now <= pe) { label = "En cours"; variant = "default"; }
                              else { label = "Terminé"; variant = "outline"; }
                            }
                            return label ? <Badge variant={variant}>{label}</Badge> : null;
                          })()}
                          {isEnrolled(course.id) && (
                            <Badge variant="default">Inscrit</Badge>
                          )}
                          {!isAccessible && (
                            <Badge variant="destructive">Non disponible</Badge>
                          )}
                        </div>
                        {course.enrollments?.[0]?.count > 0 && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <TrendingUp className="w-4 h-4" />
                            <span>{course.enrollments[0].count}</span>
                          </div>
                        )}
                      </div>
                      <h3 className="text-xl font-bold mb-2">{course.title}</h3>
                      <p className="text-muted-foreground mb-4 line-clamp-2">
                        {course.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            <span>{course.enrollments?.[0]?.count || 0} inscrits</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <BookOpen className="w-4 h-4" />
                            <span>Par {instructorMap[course.instructor_id]?.full_name}</span>
                          </div>
                        </div>
                        <Button
                          disabled={!isAccessible}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!isAccessible) return;
                            if (isEnrolled(course.id)) {
                              navigate(`/courses/${course.id}`);
                            } else {
                              handleEnroll(course.id);
                            }
                          }}
                          variant={isEnrolled(course.id) ? "outline" : "default"}
                        >
                          {isEnrolled(course.id) ? "Accéder au cours" : isAccessible ? "S'inscrire" : "Non disponible"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

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
