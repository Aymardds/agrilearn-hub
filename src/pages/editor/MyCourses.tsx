import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";

const MyCourses = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [filter, setFilter] = useState<string>("all");

    const { data: courses, isLoading, refetch } = useQuery({
        queryKey: ["my-courses"],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Non authentifié");

            const { data, error } = await supabase
                .from("courses")
                .select("*")
                .eq("instructor_id", user.id)
                .order("created_at", { ascending: false });

            if (error) {
                toast({
                    variant: "destructive",
                    title: "Erreur",
                    description: "Impossible de charger vos cours.",
                });
                throw error;
            }

            return data;
        },
    });

    const getStatusBadge = (course: any) => {
        // Logique basée sur les nouveaux champs ou existants
        // Si on a review_status, on l'utilise
        const status = course.review_status || (course.is_published ? (course.is_approved ? 'published' : 'pending') : 'draft');

        switch (status) {
            case "published":
            case "approved":
                return <Badge className="bg-green-500">Publié</Badge>;
            case "pending":
            case "submitted":
                return <Badge className="bg-yellow-500">En révision</Badge>;
            case "rejected":
                return <Badge className="bg-red-500">Rejeté</Badge>;
            default:
                return <Badge variant="secondary">Brouillon</Badge>;
        }
    };

    const handleDelete = async (courseId: string) => {
        if (!confirm("Êtes-vous sûr de vouloir supprimer ce cours ?")) return;

        const { error } = await supabase
            .from("courses")
            .delete()
            .eq("id", courseId);

        if (error) {
            toast({
                variant: "destructive",
                title: "Erreur",
                description: "Impossible de supprimer le cours.",
            });
        } else {
            toast({
                title: "Succès",
                description: "Cours supprimé avec succès.",
            });
            refetch();
        }
    };

    const filteredCourses = courses?.filter(course => {
        if (filter === "all") return true;
        const status = course.review_status || (course.is_published ? (course.is_approved ? 'published' : 'pending') : 'draft');
        return status === filter;
    });

    return (
        <div className="container mx-auto py-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold">Mes Cours</h1>
                    <p className="text-muted-foreground">Gérez vos contenus pédagogiques</p>
                </div>
                <Button onClick={() => navigate("/editor/courses/new")}>
                    <Plus className="mr-2 h-4 w-4" /> Nouveau Cours
                </Button>
            </div>

            <div className="flex gap-2 mb-6">
                <Button
                    variant={filter === "all" ? "default" : "outline"}
                    onClick={() => setFilter("all")}
                >
                    Tous
                </Button>
                <Button
                    variant={filter === "draft" ? "default" : "outline"}
                    onClick={() => setFilter("draft")}
                >
                    Brouillons
                </Button>
                <Button
                    variant={filter === "pending" ? "default" : "outline"}
                    onClick={() => setFilter("pending")}
                >
                    En révision
                </Button>
                <Button
                    variant={filter === "published" ? "default" : "outline"}
                    onClick={() => setFilter("published")}
                >
                    Publiés
                </Button>
            </div>

            {isLoading ? (
                <div>Chargement...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredCourses?.map((course) => (
                        <Card key={course.id} className="flex flex-col">
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <CardTitle className="line-clamp-1">{course.title}</CardTitle>
                                    {getStatusBadge(course)}
                                </div>
                                <CardDescription className="line-clamp-2">
                                    {course.description || "Pas de description"}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow">
                                {course.thumbnail_url && (
                                    <img
                                        src={course.thumbnail_url}
                                        alt={course.title}
                                        className="w-full h-40 object-cover rounded-md mb-4"
                                    />
                                )}
                                {course.rejection_reason && course.review_status === 'rejected' && (
                                    <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm mt-2">
                                        <strong>Raison du rejet :</strong> {course.rejection_reason}
                                    </div>
                                )}
                            </CardContent>
                            <CardFooter className="flex justify-between border-t pt-4">
                                <Button variant="ghost" size="sm" onClick={() => navigate(`/courses/${course.id}`)}>
                                    <Eye className="h-4 w-4 mr-1" /> Voir
                                </Button>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" onClick={() => navigate(`/editor/courses/${course.id}/edit`)}>
                                        <Pencil className="h-4 w-4 mr-1" /> Éditer
                                    </Button>
                                    <Button variant="destructive" size="sm" onClick={() => handleDelete(course.id)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardFooter>
                        </Card>
                    ))}
                    {filteredCourses?.length === 0 && (
                        <div className="col-span-full text-center py-12 text-muted-foreground">
                            Aucun cours trouvé dans cette catégorie.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default MyCourses;
