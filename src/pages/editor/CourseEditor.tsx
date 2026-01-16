import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Save, Send, Layers } from "lucide-react";
import CourseStructureDialog from "@/components/courses/CourseStructureDialog";
import { useQuery } from "@tanstack/react-query";
import RichTextEditor from "@/components/ui/RichTextEditor";

const courseSchema = z.object({
    title: z.string().min(5, "Le titre doit contenir au moins 5 caractères"),
    description: z.string().min(20, "La description doit contenir au moins 20 caractères"),
    thumbnail_url: z.string().url("URL de l'image invalide").optional().or(z.literal("")),
    slug: z.string().min(3, "Le slug est requis"),
    category_id: z.string().min(1, "La catégorie est requise"),
    period_start: z.string().optional(),
    period_end: z.string().optional(),
});

type CourseFormValues = z.infer<typeof courseSchema>;

const CourseEditor = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [isStructureOpen, setIsStructureOpen] = useState(false);
    const isNew = !id;

    const form = useForm<CourseFormValues>({
        resolver: zodResolver(courseSchema),
        defaultValues: {
            title: "",
            description: "",
            thumbnail_url: "",
            slug: "",
            category_id: "",
            period_start: "",
            period_end: "",
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

    useEffect(() => {
        if (!isNew) {
            const fetchCourse = async () => {
                const { data, error } = await supabase
                    .from("courses")
                    .select("*")
                    .eq("id", id)
                    .single();

                if (error) {
                    toast({
                        variant: "destructive",
                        title: "Erreur",
                        description: "Impossible de charger le cours.",
                    });
                    navigate("/editor/my-courses");
                    return;
                }

                form.reset({
                    title: data.title,
                    description: data.description || "",
                    thumbnail_url: data.thumbnail_url || "",
                    slug: data.slug,
                    category_id: data.category_id || "",
                    period_start: data.period_start ? data.period_start.split("T")[0] : "",
                    period_end: data.period_end ? data.period_end.split("T")[0] : "",
                });
            };
            fetchCourse();
        }
    }, [id, isNew, form, navigate, toast]);

    const onSubmit = async (values: CourseFormValues, action: 'draft' | 'submit') => {
        setIsLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Non authentifié");

            const courseData: any = {
                title: values.title,
                description: values.description,
                thumbnail_url: values.thumbnail_url,
                slug: values.slug,
                category_id: values.category_id,
                period_start: values.period_start ? `${values.period_start}T00:00:00` : null,
                period_end: values.period_end ? `${values.period_end}T23:59:59` : null,
                instructor_id: user.id,
                // Si on soumet, on met review_status à 'pending', sinon 'draft'
                // On garde is_published à false tant que ce n'est pas approuvé par l'admin
                review_status: action === 'submit' ? 'pending' : 'draft',
                is_published: false,
                is_approved: false,
            };

            if (isNew) {
                const { error } = await supabase
                    .from("courses")
                    .insert([courseData]);

                if (error) {
                    // Check for common errors like missing period columns if migration not run
                    const msg = String(error.message || "");
                    if (msg.includes("period_start") || msg.includes("period_end")) {
                        // Fallback if schema doesn't match
                        delete courseData.period_start;
                        delete courseData.period_end;
                        const { error: err2 } = await supabase.from("courses").insert([courseData]);
                        if (err2) throw err2;
                        toast({ title: "Attention", description: "Cours créé, mais les dates ne sont pas supportées par la base de données actuelle." });
                    } else {
                        throw error;
                    }
                } else {
                    toast({ title: "Succès", description: "Cours créé avec succès." });
                }
            } else {
                const { error } = await supabase
                    .from("courses")
                    .update(courseData)
                    .eq("id", id);

                if (error) {
                    const msg = String(error.message || "");
                    if (msg.includes("period_start") || msg.includes("period_end")) {
                        delete courseData.period_start;
                        delete courseData.period_end;
                        const { error: err2 } = await supabase.from("courses").update(courseData).eq("id", id);
                        if (err2) throw err2;
                        toast({ title: "Attention", description: "Cours mis à jour, mais les dates ne sont pas supportées." });
                    } else {
                        throw error;
                    }
                } else {
                    toast({ title: "Succès", description: "Cours mis à jour avec succès." });
                }
            }

            navigate("/editor/my-courses");
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Erreur",
                description: error.message || "Une erreur est survenue.",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="container mx-auto py-8 max-w-3xl">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>{isNew ? "Nouveau Cours" : "Éditer le cours"}</CardTitle>
                    {!isNew && (
                        <Button variant="outline" size="sm" onClick={() => setIsStructureOpen(true)}>
                            <Layers className="w-4 h-4 mr-2" />
                            Gérer le contenu
                        </Button>
                    )}
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField
                                    control={form.control}
                                    name="title"
                                    render={({ field }) => (
                                        <FormItem className="col-span-2">
                                            <FormLabel>Titre du cours</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Introduction à l'agriculture..." {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="slug"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Slug (URL convivial)</FormLabel>
                                            <FormControl>
                                                <Input placeholder="introduction-agriculture" {...field} />
                                            </FormControl>
                                            <FormDescription>Identifiant unique pour l'URL.</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="category_id"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Filière / Catégorie</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Choisir une filière" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {categories?.map((category) => (
                                                        <SelectItem key={category.id} value={category.id}>
                                                            {category.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="period_start"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Date de début</FormLabel>
                                            <FormControl>
                                                <Input type="date" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="period_end"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Date de fin</FormLabel>
                                            <FormControl>
                                                <Input type="date" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Description</FormLabel>
                                        <FormControl>
                                            <RichTextEditor
                                                value={field.value}
                                                onChange={field.onChange}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="thumbnail_url"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>URL de l'image (optionnel)</FormLabel>
                                        <FormControl>
                                            <Input placeholder="https://example.com/image.jpg" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="flex gap-4 pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full"
                                    disabled={isLoading}
                                    onClick={form.handleSubmit((values) => onSubmit(values, 'draft'))}
                                >
                                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                    Enregistrer brouillon
                                </Button>
                                <Button
                                    type="button"
                                    className="w-full"
                                    disabled={isLoading}
                                    onClick={form.handleSubmit((values) => onSubmit(values, 'submit'))}
                                >
                                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                    Soumettre pour validation
                                </Button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>

            {!isNew && id && (
                <CourseStructureDialog
                    courseId={id}
                    courseTitle={form.getValues("title")}
                    open={isStructureOpen}
                    onOpenChange={setIsStructureOpen}
                />
            )}
        </div>
    );
};

export default CourseEditor;
