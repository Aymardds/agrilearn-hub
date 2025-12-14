import { useState } from "react";
import { User } from "@supabase/supabase-js";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { BookOpen, Users, CheckCircle, Settings, Plus, Edit, Eye } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

interface FormateurDashboardProps {
  user: User;
}

const FormateurDashboard = ({ user }: FormateurDashboardProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const canCreateCourse = false;
  const [isEditProfileDialogOpen, setIsEditProfileDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category_id: "",
    thumbnail_url: "",
    slug: "",
    is_published: false,
  });
  const [profileFormData, setProfileFormData] = useState({
    full_name: "",
    bio: "",
    phone: "",
    experience_years: "",
    avatar_url: "",
  });
  const { data: profile } = useQuery({
    queryKey: ["profile", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const { data: courses } = useQuery({
    queryKey: ["instructor-courses", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select(`
          *,
          categories(name, icon)
        `)
        .eq("instructor_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Récupérer les statistiques pour chaque cours
      const coursesWithStats = await Promise.all(
        (data || []).map(async (course) => {
          // Compter les modules
          const { count: modulesCount } = await supabase
            .from("modules")
            .select("*", { count: "exact", head: true })
            .eq("course_id", course.id);

          // Compter les inscriptions
          const { count: enrollmentsCount } = await supabase
            .from("enrollments")
            .select("*", { count: "exact", head: true })
            .eq("course_id", course.id);

          return {
            ...course,
            modulesCount: modulesCount || 0,
            enrollmentsCount: enrollmentsCount || 0,
          };
        })
      );

      return coursesWithStats;
    },
  });

  const { data: lessons } = useQuery({
    queryKey: ["instructor-lessons", user.id],
    queryFn: async () => {
      // Get instructor's courses first
      const { data: instructorCourses } = await supabase
        .from("courses")
        .select("id")
        .eq("instructor_id", user.id);

      if (!instructorCourses || instructorCourses.length === 0) {
        return [];
      }

      const courseIds = instructorCourses.map(c => c.id);

      // Get modules for those courses
      const { data: modulesData } = await supabase
        .from("modules")
        .select("id")
        .in("course_id", courseIds);

      if (!modulesData || modulesData.length === 0) {
        return [];
      }

      const moduleIds = modulesData.map(m => m.id);

      // Get lessons for those modules
      const { data, error } = await supabase
        .from("lessons")
        .select("*")
        .in("module_id", moduleIds);

      if (error) throw error;
      return data || [];
    },
  });

  const createCourseMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from("courses").insert({
        ...data,
        instructor_id: user.id,
        slug: data.slug || data.title.toLowerCase().replace(/\s+/g, "-"),
        is_approved: false, // Les cours créés par les formateurs nécessitent une approbation
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["instructor-courses"] });
      toast.success("Cours créé avec succès! Il sera soumis pour approbation.");
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error("Erreur lors de la création: " + error.message);
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: data.full_name,
          bio: data.bio || null,
          phone: data.phone || null,
          experience_years: data.experience_years ? parseInt(data.experience_years) : null,
          avatar_url: data.avatar_url || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
      toast.success("Profil mis à jour avec succès!");
      setIsEditProfileDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error("Erreur lors de la mise à jour: " + error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      category_id: "",
      thumbnail_url: "",
      slug: "",
      is_published: false,
    });
  };

  const handleCreateCourse = () => {
    if (!formData.title.trim()) {
      toast.error("Le titre est obligatoire");
      return;
    }
    createCourseMutation.mutate(formData);
  };

  const handleEditProfile = () => {
    if (profile) {
      setProfileFormData({
        full_name: profile.full_name || "",
        bio: profile.bio || "",
        phone: profile.phone || "",
        experience_years: profile.experience_years?.toString() || "",
        avatar_url: profile.avatar_url || "",
      });
      setIsEditProfileDialogOpen(true);
    }
  };

  const handleUpdateProfile = () => {
    if (!profileFormData.full_name.trim()) {
      toast.error("Le nom complet est obligatoire");
      return;
    }
    updateProfileMutation.mutate(profileFormData);
  };

  const coursesCount = courses?.length || 0;
  const lessonsCount = lessons?.length || 0;

  return (
    <main className="container mx-auto px-4 py-8">
      {/* Header formateur - Titre retiré car dans DashboardLayout */}
      <div className="flex justify-end mb-8">
        {canCreateCourse && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" onClick={resetForm} className="gap-2 w-full sm:w-auto">
                <Plus className="w-5 h-5" />
                Ajouter un cours
              </Button>
            </DialogTrigger>
          </Dialog>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <Card className="bg-gradient-card border-none shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mes cours</CardTitle>
            <BookOpen className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{coursesCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Cours créés
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-none shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leçons</CardTitle>
            <Users className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-accent">{lessonsCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Total créées
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-none shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <CheckCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-success">
              {coursesCount + lessonsCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Cours et leçons
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <Card className="shadow-lg mb-6">
        <CardHeader>
          <CardTitle>Actions rapides</CardTitle>
          <CardDescription>
            Gestion de vos cours et contenu
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate("/admin/courses")}
            >
              <Settings className="w-4 h-4 mr-2" />
              Gérer mes cours
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Mes Cours */}
      <Card className="shadow-lg mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Mes cours ({courses?.length || 0})</CardTitle>
              <CardDescription>
                Liste de tous vos cours créés
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {courses && courses.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {courses.map((course) => (
                <Card
                  key={course.id}
                  className="hover:shadow-lg transition-all overflow-hidden"
                >
                  {course.thumbnail_url && (
                    <div
                      className="h-40 bg-cover bg-center relative"
                      style={{ backgroundImage: `url(${course.thumbnail_url})` }}
                    >
                      <div className="absolute top-2 right-2 flex gap-2">
                        {course.is_published && (
                          <Badge variant="default" className="bg-green-600">
                            Publié
                          </Badge>
                        )}
                        {course.is_approved && (
                          <Badge variant="outline" className="bg-white">
                            Approuvé
                          </Badge>
                        )}
                        {!course.is_published && !course.is_approved && (
                          <Badge variant="secondary">
                            Brouillon
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <Badge variant="secondary" className="text-xs">
                        {course.categories?.icon} {course.categories?.name || "Non catégorisé"}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg line-clamp-2">{course.title}</CardTitle>
                    <CardDescription className="line-clamp-2 text-sm">
                      {course.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        <span>{course.enrollmentsCount || 0} inscrits</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <BookOpen className="w-3 h-3" />
                        <span>{course.modulesCount || 0} modules</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => navigate(`/courses/${course.id}`)}
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        Voir
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => navigate("/admin/courses")}
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Modifier
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Aucun cours affecté</h3>
              <p className="text-muted-foreground mb-4">
                Contactez votre superviseur pour être affecté à des cours
              </p>
              <Button variant="outline" onClick={() => navigate("/admin/courses")}>
                <Settings className="w-4 h-4 mr-2" />
                Voir la gestion des cours
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Mon profil formateur</CardTitle>
          <CardDescription>
            Informations professionnelles
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Biographie</h3>
              <p className="text-muted-foreground">
                {profile?.bio || "Aucune biographie renseignée"}
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Années d'expérience</h3>
              <p className="text-muted-foreground">
                {profile?.experience_years || "Non renseigné"} ans
              </p>
            </div>
            <Dialog open={isEditProfileDialogOpen} onOpenChange={setIsEditProfileDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" onClick={handleEditProfile}>
                  Modifier mon profil
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Modifier mon profil</DialogTitle>
                  <DialogDescription>
                    Mettez à jour vos informations professionnelles
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="full_name">Nom complet *</Label>
                    <Input
                      id="full_name"
                      value={profileFormData.full_name}
                      onChange={(e) => setProfileFormData({ ...profileFormData, full_name: e.target.value })}
                      placeholder="Votre nom complet"
                    />
                  </div>
                  <div>
                    <Label htmlFor="bio">Biographie</Label>
                    <Textarea
                      id="bio"
                      value={profileFormData.bio}
                      onChange={(e) => setProfileFormData({ ...profileFormData, bio: e.target.value })}
                      placeholder="Parlez de votre expérience et expertise..."
                      rows={4}
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Téléphone</Label>
                    <Input
                      id="phone"
                      value={profileFormData.phone}
                      onChange={(e) => setProfileFormData({ ...profileFormData, phone: e.target.value })}
                      placeholder="+33 6 12 34 56 78"
                    />
                  </div>
                  <div>
                    <Label htmlFor="experience_years">Années d'expérience</Label>
                    <Input
                      id="experience_years"
                      type="number"
                      value={profileFormData.experience_years}
                      onChange={(e) => setProfileFormData({ ...profileFormData, experience_years: e.target.value })}
                      placeholder="5"
                      min="0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="avatar_url">URL de l'avatar</Label>
                    <Input
                      id="avatar_url"
                      value={profileFormData.avatar_url}
                      onChange={(e) => setProfileFormData({ ...profileFormData, avatar_url: e.target.value })}
                      placeholder="https://example.com/avatar.jpg"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsEditProfileDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button
                    onClick={handleUpdateProfile}
                    disabled={!profileFormData.full_name.trim() || updateProfileMutation.isPending}
                  >
                    {updateProfileMutation.isPending ? "Enregistrement..." : "Enregistrer"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </main>
  );
};

export default FormateurDashboard;
