import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import RichTextEditor from "@/components/ui/RichTextEditor";

interface CourseStructureDialogProps {
    courseId: string;
    courseTitle: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    userRole?: string | null;
}

const CourseStructureDialog = ({ courseId, courseTitle, open, onOpenChange, userRole }: CourseStructureDialogProps) => {
    const queryClient = useQueryClient();
    const [moduleForm, setModuleForm] = useState({ title: "", description: "", order_index: 1 });
    const [chapterForm, setChapterForm] = useState({ title: "", description: "", order_index: 1 });
    const [lessonForm, setLessonForm] = useState<any>({ title: "", lesson_type: "video", order_index: 1, duration_minutes: null, video_url: "", document_url: "", content: "", live_date: "", live_time: "", live_link: "", live_capacity: 100, target_chapter_id: null });
    const [liveEdit, setLiveEdit] = useState({ scheduled_date: "", scheduled_time: "", meeting_link: "", duration_minutes: 60, capacity: 100 });
    const [quizForm, setQuizForm] = useState<any>({ title: "", passing_score: 70 });
    const [questionForm, setQuestionForm] = useState<any>({ question_text: "", options: [], correct_answer: "", order_index: 1 });

    // Bulk features
    const [bulkModuleCount, setBulkModuleCount] = useState<number>(1);
    const [bulkModuleBaseTitle, setBulkModuleBaseTitle] = useState<string>("");
    const [bulkQuizPassingScore, setBulkQuizPassingScore] = useState<number>(70);

    const [isLessonDialogOpen, setIsLessonDialogOpen] = useState(false);
    const [selectedLesson, setSelectedLesson] = useState<any>(null);

    const { data: structureData, refetch: refetchStructure } = useQuery({
        queryKey: ["course-structure", courseId],
        queryFn: async () => {
            if (!courseId) return { modules: [] };
            const { data: modules, error: modErr } = await supabase
                .from("modules")
                .select("*, lessons(*), chapters(*, lessons(*))")
                .eq("course_id", courseId)
                .order("order_index");
            if (modErr) throw modErr;

            // Collect all lesson IDs from modules and chapters
            const moduleLessonIds = modules.flatMap((m: any) => (m.lessons || []).map((l: any) => l.id));
            const chapterLessonIds = modules.flatMap((m: any) => (m.chapters || []).flatMap((c: any) => (c.lessons || []).map((l: any) => l.id)));
            const lessonIds = [...moduleLessonIds, ...chapterLessonIds];
            let quizzesByLesson: Record<string, any> = {};
            if (lessonIds.length > 0) {
                const { data: quizzes } = await supabase
                    .from("quizzes")
                    .select("*, quiz_questions(*)")
                    .in("lesson_id", lessonIds);
                (quizzes || []).forEach((q: any) => { quizzesByLesson[q.lesson_id] = q; });
            }
            return { modules, quizzesByLesson };
        },
        enabled: !!courseId && open,
    });

    const createModuleMutation = useMutation({
        mutationFn: async () => {
            if (!courseId) throw new Error("Cours non sélectionné");
            const { error } = await supabase
                .from("modules")
                .insert({
                    course_id: courseId,
                    title: moduleForm.title,
                    description: moduleForm.description || null,
                    order_index: moduleForm.order_index || 1,
                });
            if (error) throw error;
        },
        onSuccess: async () => {
            await refetchStructure();
            setModuleForm({ title: "", description: "", order_index: 1 });
            toast.success("Module ajouté");
        },
        onError: (e: any) => toast.error("Erreur module: " + e.message),
    });

    const createChapterMutation = useMutation({
        mutationFn: async (moduleId: string) => {
            if (!moduleId) throw new Error("Module non sélectionné");
            const { error } = await supabase
                .from("chapters")
                .insert({
                    module_id: moduleId,
                    title: chapterForm.title,
                    description: chapterForm.description || null,
                    order_index: chapterForm.order_index || 1,
                });
            if (error) throw error;
        },
        onSuccess: async () => {
            await refetchStructure();
            setChapterForm({ title: "", description: "", order_index: 1 });
            toast.success("Chapitre ajouté");
        },
        onError: (e: any) => toast.error("Erreur chapitre: " + e.message),
    });

    const createBulkModulesMutation = useMutation({
        mutationFn: async () => {
            if (!courseId) throw new Error("Cours non sélectionné");
            const count = Math.max(1, Number(bulkModuleCount) || 1);
            const baseTitle = bulkModuleBaseTitle?.trim() || "Module";
            const { data: existingModules, error: readErr } = await supabase
                .from("modules")
                .select("id, order_index")
                .eq("course_id", courseId)
                .order("order_index");
            if (readErr) throw readErr;
            let nextOrder = Math.max(0, ...((existingModules || []).map((m: any) => m.order_index))) + 1;

            for (let i = 1; i <= count; i++) {
                const { data: createdModule, error: modErr } = await supabase
                    .from("modules")
                    .insert({
                        course_id: courseId,
                        title: `${baseTitle} ${existingModules.length + i}`,
                        description: null,
                        order_index: nextOrder++,
                    })
                    .select()
                    .single();
                if (modErr) throw modErr;

                const { data: createdLesson, error: lessonErr } = await supabase
                    .from("lessons")
                    .insert({
                        module_id: createdModule.id,
                        title: `Évaluation du ${baseTitle} ${existingModules.length + i}`,
                        lesson_type: "text",
                        order_index: 1,
                        content: "",
                        duration_minutes: null,
                        video_url: null,
                        document_url: null,
                    })
                    .select()
                    .single();
                if (lessonErr) throw lessonErr;

                const { error: quizErr } = await supabase
                    .from("quizzes")
                    .insert({
                        lesson_id: createdLesson.id,
                        title: `Quiz ${baseTitle} ${existingModules.length + i}`,
                        passing_score: bulkQuizPassingScore || 70,
                    });
                if (quizErr) throw quizErr;
            }
        },
        onSuccess: async () => {
            await refetchStructure();
            setBulkModuleCount(1);
            setBulkModuleBaseTitle("");
            setBulkQuizPassingScore(70);
            toast.success("Modules et quiz créés en masse");
        },
        onError: (e: any) => toast.error("Erreur ajout en masse: " + e.message),
    });

    const createLessonMutation = useMutation({
        mutationFn: async (params: { moduleId?: string; chapterId?: string }) => {
            const { moduleId, chapterId } = params;
            if (!moduleId && !chapterId) throw new Error("Parent manquant");

            let query = supabase.from("lessons").select("order_index");
            if (chapterId) {
                query = query.eq("chapter_id", chapterId);
            } else if (moduleId) {
                query = query.eq("module_id", moduleId).is("chapter_id", null);
            }

            const { data: existingLessons, error: fetchError } = await query.order("order_index");
            if (fetchError) throw fetchError;

            const maxOrder = existingLessons && existingLessons.length > 0
                ? Math.max(...existingLessons.map((l: any) => l.order_index || 0))
                : 0;
            const nextOrderIndex = maxOrder + 1;

            const payload: any = {
                title: lessonForm.title,
                lesson_type: lessonForm.lesson_type,
                order_index: nextOrderIndex,
                duration_minutes: lessonForm.duration_minutes || null,
                video_url: lessonForm.lesson_type === "live" ? (lessonForm.live_link || null) : (lessonForm.video_url || null),
                document_url: lessonForm.document_url || null,
                content: lessonForm.lesson_type === "live"
                    ? JSON.stringify({ scheduled_date: lessonForm.live_date || null, scheduled_time: lessonForm.live_time || null, meeting_link: lessonForm.live_link || null, capacity: lessonForm.live_capacity || null })
                    : (lessonForm.content || null),
            };

            if (chapterId) {
                payload.chapter_id = chapterId;
                if (!moduleId) {
                    const { data: chap } = await supabase.from("chapters").select("module_id").eq("id", chapterId).single();
                    if (chap) payload.module_id = chap.module_id;
                } else {
                    payload.module_id = moduleId;
                }
            } else {
                payload.module_id = moduleId;
            }

            const { error } = await supabase.from("lessons").insert(payload);
            if (error) throw error;
        },
        onSuccess: async () => {
            await refetchStructure();
            setLessonForm({ title: "", lesson_type: "video", order_index: 1, duration_minutes: null, video_url: "", document_url: "", content: "", live_date: "", live_time: "", live_link: "", target_chapter_id: null });
            toast.success("Leçon ajoutée");
        },
        onError: (e: any) => toast.error("Erreur leçon: " + e.message),
    });

    const updateLiveLessonMutation = useMutation({
        mutationFn: async (payload: { id: string; scheduled_date: string; scheduled_time: string; meeting_link: string; duration_minutes?: number }) => {
            const { id, scheduled_date, scheduled_time, meeting_link, duration_minutes } = payload;
            const content = JSON.stringify({ scheduled_date: scheduled_date || null, scheduled_time: scheduled_time || null, meeting_link: meeting_link || null });
            const { error } = await supabase
                .from("lessons")
                .update({
                    content,
                    video_url: meeting_link || null,
                    duration_minutes: duration_minutes || null,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", id);
            if (error) throw error;
        },
        onSuccess: async () => {
            await refetchStructure();
            toast.success("Session live mise à jour");
            setIsLessonDialogOpen(false);
        },
        onError: (e: any) => toast.error("Erreur mise à jour live: " + e.message),
    });

    const deleteLiveLessonMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from("lessons")
                .delete()
                .eq("id", id);
            if (error) throw error;
        },
        onSuccess: async () => {
            await refetchStructure();
            toast.success("Leçon supprimée");
            setIsLessonDialogOpen(false);
        },
        onError: (e: any) => toast.error("Erreur: " + e.message),
    });

    const updateLessonStatusMutation = useMutation({
        mutationFn: async (payload: { id: string; is_approved?: boolean; is_published?: boolean }) => {
            const { id, ...rest } = payload;
            const { error } = await supabase
                .from("lessons")
                .update(rest as any)
                .eq("id", id);
            if (error) {
                toast.warning("Impossible de mettre à jour le statut de la leçon");
                return;
            }
        },
        onSuccess: async () => {
            await refetchStructure();
            toast.success("Statut mis à jour");
        },
        onError: (e: any) => toast.error("Erreur: " + e.message),
    });

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Gérer le contenu : {courseTitle}</DialogTitle>
                        <DialogDescription>
                            Ajouter des modules, des leçons, et programmer des sessions Live.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <h3 className="font-semibold">Ajouter un module</h3>
                            <div className="grid grid-cols-3 gap-3">
                                <Input placeholder="Titre" value={moduleForm.title} onChange={(e) => setModuleForm({ ...moduleForm, title: e.target.value })} />
                                <Input placeholder="Description" value={moduleForm.description} onChange={(e) => setModuleForm({ ...moduleForm, description: e.target.value })} />
                                <Input placeholder="Ordre" type="number" value={moduleForm.order_index} onChange={(e) => setModuleForm({ ...moduleForm, order_index: parseInt(e.target.value || "1", 10) })} />
                            </div>
                            <div className="flex justify-end">
                                <Button onClick={() => createModuleMutation.mutate()} disabled={!moduleForm.title}>Ajouter le module</Button>
                            </div>

                            {/* Fonctionnalité Bulk pour Admin/Editeur seulement ? Pour simplifier je la laisse dispo */}
                            <div className="mt-6 space-y-2 border-t pt-4">
                                <h3 className="font-semibold text-sm">Génération rapide (Modules + Quiz)</h3>
                                <div className="grid grid-cols-4 gap-3">
                                    <Input placeholder="Baseitre (ex: Module)" value={bulkModuleBaseTitle} onChange={(e) => setBulkModuleBaseTitle(e.target.value)} />
                                    <Input placeholder="Nombre" type="number" value={bulkModuleCount} onChange={(e) => setBulkModuleCount(parseInt(e.target.value || "1", 10))} />
                                    <Input placeholder="Score min quiz" type="number" value={bulkQuizPassingScore} onChange={(e) => setBulkQuizPassingScore(parseInt(e.target.value || "70", 10))} />
                                    <Button variant="secondary" onClick={() => createBulkModulesMutation.mutate()} disabled={!bulkModuleBaseTitle || bulkModuleCount < 1}>Générer</Button>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="font-semibold">Structure du cours</h3>
                            {structureData?.modules?.length ? (
                                <div className="space-y-4">
                                    {structureData.modules.map((m: any, mi: number) => (
                                        <Card key={m.id}>
                                            <CardHeader className="py-4">
                                                <CardTitle className="text-lg">Module {m.order_index}: {m.title}</CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-6">
                                                {/* 1. Direct Lessons */}
                                                <div>
                                                    <h4 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Leçons Directes</h4>
                                                    <div className="space-y-2">
                                                        {(m.lessons || []).filter((l: any) => !l.chapter_id).sort((a: any, b: any) => a.order_index - b.order_index).map((l: any, li: number) => (
                                                            <div key={l.id} className="p-3 border rounded bg-background flex items-center justify-between">
                                                                <div className="font-medium flex items-center gap-2">
                                                                    <span className="text-muted-foreground text-sm">#{l.order_index}</span>
                                                                    {l.lesson_type === 'live' && <span className="text-red-500 font-bold">[LIVE]</span>}
                                                                    {l.title}
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <Badge variant="outline">{l.lesson_type}</Badge>
                                                                    <Button variant="ghost" size="sm" onClick={() => { setSelectedLesson(l); setIsLessonDialogOpen(true); }}>
                                                                        <Edit className="w-4 h-4" />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                        {!(m.lessons || []).some((l: any) => !l.chapter_id) && <p className="text-xs text-muted-foreground italic">Aucune leçon directe.</p>}
                                                    </div>
                                                </div>

                                                {/* 2. Chapters */}
                                                <div>
                                                    <h4 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Chapitres</h4>
                                                    <div className="space-y-4">
                                                        {(m.chapters || []).sort((a: any, b: any) => a.order_index - b.order_index).map((c: any, ci: number) => (
                                                            <div key={c.id} className="border rounded-lg p-3 bg-muted/10">
                                                                <div className="font-semibold text-md mb-2 flex items-center gap-2">
                                                                    <span className="bg-primary/10 text-primary w-5 h-5 rounded-full flex items-center justify-center text-xs">{c.order_index}</span>
                                                                    {c.title}
                                                                </div>
                                                                <div className="space-y-2 pl-2">
                                                                    {(c.lessons || []).sort((a: any, b: any) => a.order_index - b.order_index).map((l: any, li: number) => (
                                                                        <div key={l.id} className="p-2 border rounded bg-background flex items-center justify-between text-sm">
                                                                            <div className="font-medium flex items-center gap-2">
                                                                                <span className="text-muted-foreground text-xs">{l.order_index}.</span>
                                                                                {l.lesson_type === 'live' && <span className="text-red-500 text-xs font-bold">[LIVE]</span>}
                                                                                {l.title}
                                                                            </div>
                                                                            <div className="flex items-center gap-2">
                                                                                <Badge variant="outline" className="text-xs">{l.lesson_type}</Badge>
                                                                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setSelectedLesson(l); setIsLessonDialogOpen(true); }}>
                                                                                    <Edit className="w-3 h-3" />
                                                                                </Button>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                    {!(c.lessons || []).length && <p className="text-xs text-muted-foreground italic">Aucune leçon.</p>}
                                                                </div>
                                                            </div>
                                                        ))}
                                                        {!(m.chapters || []).length && <p className="text-xs text-muted-foreground italic">Aucun chapitre.</p>}
                                                    </div>
                                                </div>

                                                {/* 3. Add Content Forms */}
                                                <div className="border-t pt-4 bg-muted/20 p-4 rounded-lg mt-4">
                                                    <h4 className="font-medium mb-4 text-sm">Ajouter contenu au module "{m.title}"</h4>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                        {/* Add Chapter */}
                                                        <div className="space-y-3 p-3 border rounded bg-background">
                                                            <h5 className="text-sm font-medium flex items-center gap-2"><Plus className="w-4 h-4" /> Nouveau Chapitre</h5>
                                                            <Input placeholder="Titre" value={chapterForm.title} onChange={(e) => setChapterForm({ ...chapterForm, title: e.target.value })} className="h-8" />
                                                            <Label className="text-xs">Description du chapitre</Label>
                                                            <RichTextEditor
                                                                value={chapterForm.description || ""}
                                                                onChange={(v) => setChapterForm({ ...chapterForm, description: v })}
                                                            />
                                                            <Button size="sm" onClick={() => createChapterMutation.mutate(m.id)} disabled={!chapterForm.title} className="w-full h-8">Ajouter Chapitre</Button>
                                                        </div>

                                                        {/* Add Lesson */}
                                                        <div className="space-y-3 p-3 border rounded bg-background">
                                                            <h5 className="text-sm font-medium flex items-center gap-2"><Plus className="w-4 h-4" /> Nouvelle Leçon</h5>
                                                            <Input placeholder="Titre" value={lessonForm.title} onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })} className="h-8" />
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <Select value={lessonForm.lesson_type} onValueChange={(v) => setLessonForm({ ...lessonForm, lesson_type: v })}>
                                                                    <SelectTrigger className="h-8"><SelectValue placeholder="Type" /></SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="video">Vidéo</SelectItem>
                                                                        <SelectItem value="document">Document</SelectItem>
                                                                        <SelectItem value="text">Texte</SelectItem>
                                                                        <SelectItem value="live">Live (Meet)</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                                <Select onValueChange={(v) => setLessonForm({ ...lessonForm, target_chapter_id: v === "root" ? null : v })}>
                                                                    <SelectTrigger className="h-8"><SelectValue placeholder="Emplacement" /></SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="root">Racine Module</SelectItem>
                                                                        {(m.chapters || []).map((c: any) => (
                                                                            <SelectItem key={c.id} value={c.id}>Ch: {c.title}</SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>

                                                            {lessonForm.lesson_type === "video" && <Input placeholder="URL vidéo" value={lessonForm.video_url} onChange={(e) => setLessonForm({ ...lessonForm, video_url: e.target.value })} className="h-8" />}
                                                            {lessonForm.lesson_type === "document" && <Input placeholder="URL document" value={lessonForm.document_url} onChange={(e) => setLessonForm({ ...lessonForm, document_url: e.target.value })} className="h-8" />}
                                                            {lessonForm.lesson_type === "live" && (
                                                                <div className="space-y-2">
                                                                    <Input placeholder="Date (YYYY-MM-DD)" value={lessonForm.live_date} onChange={(e) => setLessonForm({ ...lessonForm, live_date: e.target.value })} className="h-8" />
                                                                    <Input placeholder="Heure (HH:mm)" value={lessonForm.live_time} onChange={(e) => setLessonForm({ ...lessonForm, live_time: e.target.value })} className="h-8" />
                                                                    <Input placeholder="Lien Meet" value={lessonForm.live_link} onChange={(e) => setLessonForm({ ...lessonForm, live_link: e.target.value })} className="h-8" />
                                                                </div>
                                                            )}
                                                            {lessonForm.lesson_type === "text" && (
                                                                <div className="space-y-2">
                                                                    <Label className="text-xs">Contenu de la leçon</Label>
                                                                    <RichTextEditor
                                                                        value={lessonForm.content || ""}
                                                                        onChange={(v) => setLessonForm({ ...lessonForm, content: v })}
                                                                    />
                                                                </div>
                                                            )}

                                                            <Button size="sm" onClick={() => createLessonMutation.mutate({ moduleId: m.id, chapterId: lessonForm.target_chapter_id })} disabled={!lessonForm.title} className="w-full h-8">Ajouter Leçon</Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-sm text-muted-foreground p-4 text-center border rounded-lg bg-muted/10">Commencez par ajouter un module ci-dessus.</div>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => onOpenChange(false)}>Fermer</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Lesson Details & Edit Dialog */}
            <Dialog open={isLessonDialogOpen} onOpenChange={setIsLessonDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Détails leçon : {selectedLesson?.title}</DialogTitle>
                    </DialogHeader>
                    {selectedLesson && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="text-sm text-muted-foreground">Type</div>
                                    <Badge variant="secondary">{selectedLesson.lesson_type}</Badge>
                                </div>
                                <div>
                                    <div className="text-sm text-muted-foreground">Durée</div>
                                    <div>{selectedLesson.duration_minutes || '-'} min</div>
                                </div>
                            </div>

                            {/* Live Session Editing */}
                            {selectedLesson.lesson_type === "live" && (
                                <div className="space-y-3 border border-red-200 bg-red-50 p-4 rounded-md">
                                    <h4 className="font-medium text-red-800 flex items-center gap-2">Configuration Session Live</h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <Label className="text-xs">Date (YYYY-MM-DD)</Label>
                                            <Input
                                                value={liveEdit.scheduled_date || (JSON.parse(selectedLesson.content || "{}").scheduled_date || "")}
                                                onChange={(e) => setLiveEdit({ ...liveEdit, scheduled_date: e.target.value })}
                                                placeholder="2024-01-01"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-xs">Heure (HH:mm)</Label>
                                            <Input
                                                value={liveEdit.scheduled_time || (JSON.parse(selectedLesson.content || "{}").scheduled_time || "")}
                                                onChange={(e) => setLiveEdit({ ...liveEdit, scheduled_time: e.target.value })}
                                                placeholder="14:00"
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <Label className="text-xs">Lien Visio (Meet/Zoom)</Label>
                                            <Input
                                                value={liveEdit.meeting_link || (JSON.parse(selectedLesson.content || "{}").meeting_link || "")}
                                                onChange={(e) => setLiveEdit({ ...liveEdit, meeting_link: e.target.value })}
                                                placeholder="https://meet.google.com/..."
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-2 mt-2">
                                        <Button variant="destructive" size="sm" onClick={() => deleteLiveLessonMutation.mutate(selectedLesson.id)}>Supprimer Leçon</Button>
                                        <Button size="sm" onClick={() => updateLiveLessonMutation.mutate({
                                            id: selectedLesson.id,
                                            scheduled_date: liveEdit.scheduled_date || JSON.parse(selectedLesson.content || "{}").scheduled_date,
                                            scheduled_time: liveEdit.scheduled_time || JSON.parse(selectedLesson.content || "{}").scheduled_time,
                                            meeting_link: liveEdit.meeting_link || JSON.parse(selectedLesson.content || "{}").meeting_link,
                                            duration_minutes: liveEdit.duration_minutes
                                        })}>Mettre à jour Live</Button>
                                    </div>
                                </div>
                            )}

                            {/* Text content editing */}
                            {selectedLesson.lesson_type === "text" && (
                                <div className="space-y-3 p-4 border rounded-md bg-muted/30">
                                    <h4 className="font-medium flex items-center gap-2">Contenu de la leçon</h4>
                                    <RichTextEditor
                                        value={selectedLesson.content || ""}
                                        onChange={(v) => setSelectedLesson({ ...selectedLesson, content: v })}
                                    />
                                    <div className="flex justify-end gap-2 mt-2">
                                        <Button size="sm" onClick={async () => {
                                            const { error } = await supabase
                                                .from("lessons")
                                                .update({ content: selectedLesson.content })
                                                .eq("id", selectedLesson.id);
                                            if (error) {
                                                toast.error("Erreur lors de la mise à jour");
                                            } else {
                                                toast.success("Leçon mise à jour");
                                                await refetchStructure();
                                            }
                                        }}>Mettre à jour le contenu</Button>
                                    </div>
                                </div>
                            )}

                            {/* Other lesson types delete */}
                            {selectedLesson.lesson_type !== "live" && (
                                <div className="flex justify-end">
                                    <Button variant="destructive" size="sm" onClick={() => deleteLiveLessonMutation.mutate(selectedLesson.id)}>
                                        <Trash2 className="w-4 h-4 mr-2" /> Supprimer la leçon
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
};

export default CourseStructureDialog;
