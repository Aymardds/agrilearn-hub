import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, Search, BookOpen } from "lucide-react";
import { toast } from "sonner";
// header fourni par AppShell
import { useNavigate, useSearchParams } from "react-router-dom";
import { Calendar } from "@/components/ui/calendar";
import * as React from "react";
import InstructorAssignmentHistory from "@/components/courses/InstructorAssignmentHistory";

const CoursesManagement = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const startParam = searchParams.get("start");
  const endParam = searchParams.get("end");
  const range = React.useMemo(() => {
    const from = startParam ? new Date(`${startParam}T00:00:00`) : undefined;
    const to = endParam ? new Date(`${endParam}T00:00:00`) : undefined;
    return { from, to };
  }, [startParam, endParam]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [isStructureDialogOpen, setIsStructureDialogOpen] = useState(false);
  const [structureCourse, setStructureCourse] = useState<any>(null);
  const [moduleForm, setModuleForm] = useState({ title: "", description: "", order_index: 1 });
  const [chapterForm, setChapterForm] = useState({ title: "", description: "", order_index: 1 });
  const [lessonForm, setLessonForm] = useState<any>({ title: "", lesson_type: "video", order_index: 1, duration_minutes: null, video_url: "", document_url: "", content: "", live_date: "", live_time: "", live_link: "", live_capacity: 100 });
  const [liveEdit, setLiveEdit] = useState({ scheduled_date: "", scheduled_time: "", meeting_link: "", duration_minutes: 60, capacity: 100 });
  const [quizForm, setQuizForm] = useState<any>({ title: "", passing_score: 70 });
  const [questionForm, setQuestionForm] = useState<any>({ question_text: "", options: [], correct_answer: "", order_index: 1 });
  const [bulkModuleCount, setBulkModuleCount] = useState<number>(1);
  const [bulkModuleBaseTitle, setBulkModuleBaseTitle] = useState<string>("");
  const [bulkQuizPassingScore, setBulkQuizPassingScore] = useState<number>(70);
  const [isLessonDialogOpen, setIsLessonDialogOpen] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<any>(null);
  const [selectedInstructorId, setSelectedInstructorId] = useState<string>("");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category_id: "",
    thumbnail_url: "",
    slug: "",
    period_start: "",
    period_end: "",
    is_published: false,
    is_approved: false,
  });

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

  const { data: courses } = useQuery({
    queryKey: ["admin-courses", searchTerm, user?.id, userRole, startParam, endParam],
    queryFn: async () => {
      const base = supabase
        .from("courses")
        .select(`
          *,
          categories(name, icon)
        `)
        .order("created_at", { ascending: false });

      let q = base;
      if (userRole !== "superadmin" && userRole !== "superviseur") {
        q = q.eq("instructor_id", user?.id);
      }
      if (searchTerm) {
        q = q.ilike("title", `%${searchTerm}%`);
      }

      try {
        let q2 = q;
        if (startParam) {
          q2 = q2.gte("period_end", `${startParam}T00:00:00`);
        }
        if (endParam) {
          q2 = q2.lte("period_start", `${endParam}T23:59:59`);
        }
        const { data, error } = await q2;
        if (error) throw error;
        return data || [];
      } catch (err: any) {
        const msg = String(err?.message || "");
        if (msg.includes("period_start") || msg.includes("period_end")) {
          let q3 = q;
          if (startParam) {
            q3 = q3.gte("created_at", `${startParam}T00:00:00`);
          }
          if (endParam) {
            q3 = q3.lte("created_at", `${endParam}T23:59:59`);
          }
          const { data, error } = await q3;
          if (error) throw error;
          return data || [];
        }
        throw err;
      }
    },
    enabled: !!user,
  });

  const { data: instructorProfiles } = useQuery({
    queryKey: ["admin-courses-instructors", courses?.map((c: any) => c.instructor_id)],
    queryFn: async () => {
      const ids = Array.from(new Set((courses || []).map((c: any) => c.instructor_id))).filter(Boolean);
      if (ids.length === 0) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", ids as string[]);
      if (error) throw error;
      return data || [];
    },
    enabled: !!courses && (courses as any[]).length > 0,
  });

  const instructorMap = Object.fromEntries((instructorProfiles || []).map((p: any) => [p.id, p]));

  const { data: allFormateurs } = useQuery({
    queryKey: ["all-formateurs", userRole],
    queryFn: async () => {
      const { data: roleRows, error: roleErr } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "formateur");
      if (roleErr) throw roleErr;
      const ids = (roleRows || []).map((r: any) => r.user_id);
      if (ids.length === 0) return [];
      const { data: profs, error: profErr } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", ids);
      if (profErr) throw profErr;
      return profs || [];
    },
    enabled: userRole === "editeur" || userRole === "superviseur" || userRole === "superadmin",
  });

  const { data: structureData, refetch: refetchStructure } = useQuery({
    queryKey: ["admin-course-structure", structureCourse?.id, isStructureDialogOpen],
    queryFn: async () => {
      if (!structureCourse?.id) return { modules: [] };
      const { data: modules, error: modErr } = await supabase
        .from("modules")
        .select("*, lessons(*), chapters(*, lessons(*))")
        .eq("course_id", structureCourse.id)
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
    enabled: !!structureCourse?.id && isStructureDialogOpen,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      let instructorIdToUse = user?.id;
      if (userRole === "editeur") {
        if (!selectedInstructorId) throw new Error("Sélectionnez un formateur pour ce cours");
        instructorIdToUse = selectedInstructorId;
      }
      const payload: any = {
        ...data,
        instructor_id: instructorIdToUse!,
        slug: data.slug || data.title.toLowerCase().replace(/\s+/g, "-"),
      };
      if (data.period_start) payload.period_start = `${data.period_start}T00:00:00`;
      if (data.period_end) payload.period_end = `${data.period_end}T23:59:59`;
      const { error } = await supabase.from("courses").insert(payload);
      if (error) {
        const msg = String(error.message || "");
        if (msg.includes("period_start") || msg.includes("period_end")) {
          const fallback: any = { ...payload };
          delete fallback.period_start;
          delete fallback.period_end;
          const { error: err2 } = await supabase.from("courses").insert(fallback);
          if (err2) throw err2;
          toast.warning(
            "Colonnes de période absentes. Appliquez la migration SQL pour activer la gestion des périodes."
          );
        } else {
          throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      queryClient.invalidateQueries({ queryKey: ["available-courses"] });
      toast.success("Cours créé avec succès!");
      setIsCreateDialogOpen(false);
      resetForm();
      setSelectedInstructorId("");
    },
    onError: (error: any) => {
      toast.error("Erreur lors de la création: " + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const updatePayload: any = {
        title: data.title,
        description: data.description,
        category_id: data.category_id || null,
        thumbnail_url: data.thumbnail_url || null,
        slug: data.slug || data.title.toLowerCase().replace(/\s+/g, "-"),
        period_start: data.period_start ? `${data.period_start}T00:00:00` : null,
        period_end: data.period_end ? `${data.period_end}T23:59:59` : null,
        is_published: data.is_published,
        is_approved: data.is_approved,
        updated_at: new Date().toISOString(),
      };

      // Include instructor_id if it has been changed
      if (selectedCourse?.instructor_id) {
        updatePayload.instructor_id = selectedCourse.instructor_id;
      }

      const { error } = await supabase
        .from("courses")
        .update(updatePayload)
        .eq("id", selectedCourse.id);
      if (error) {
        const msg = String(error.message || "");
        if (msg.includes("period_start") || msg.includes("period_end")) {
          const fallbackPayload = { ...updatePayload };
          delete fallbackPayload.period_start;
          delete fallbackPayload.period_end;
          const { error: err2 } = await supabase
            .from("courses")
            .update(fallbackPayload)
            .eq("id", selectedCourse.id);
          if (err2) throw err2;
          toast.warning(
            "Colonnes de période absentes. Appliquez la migration SQL pour activer la gestion des périodes."
          );
        } else {
          throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      queryClient.invalidateQueries({ queryKey: ["available-courses"] });
      toast.success("Cours mis à jour avec succès!");
      setIsEditDialogOpen(false);
      setSelectedCourse(null);
      resetForm();
    },
    onError: (error: any) => {
      toast.error("Erreur lors de la mise à jour: " + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (courseId: string) => {
      const { error } = await supabase.from("courses").delete().eq("id", courseId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      queryClient.invalidateQueries({ queryKey: ["available-courses"] });
      toast.success("Cours supprimé avec succès!");
      setIsDeleteDialogOpen(false);
      setSelectedCourse(null);
    },
    onError: (error: any) => {
      toast.error("Erreur lors de la suppression: " + error.message);
    },
  });

  const createModuleMutation = useMutation({
    mutationFn: async () => {
      if (!structureCourse?.id) throw new Error("Cours non sélectionné");
      const { error } = await supabase
        .from("modules")
        .insert({
          course_id: structureCourse.id,
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
      if (!structureCourse?.id) throw new Error("Cours non sélectionné");
      const count = Math.max(1, Number(bulkModuleCount) || 1);
      const baseTitle = bulkModuleBaseTitle?.trim() || "Module";
      const { data: existingModules, error: readErr } = await supabase
        .from("modules")
        .select("id, order_index")
        .eq("course_id", structureCourse.id)
        .order("order_index");
      if (readErr) throw readErr;
      let nextOrder = Math.max(0, ...((existingModules || []).map((m: any) => m.order_index))) + 1;
      for (let i = 1; i <= count; i++) {
        const { data: createdModule, error: modErr } = await supabase
          .from("modules")
          .insert({
            course_id: structureCourse.id,
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

      // Récupérer les leçons existantes pour calculer le prochain order_index
      let query = supabase.from("lessons").select("order_index");
      if (chapterId) {
        query = query.eq("chapter_id", chapterId);
      } else if (moduleId) {
        query = query.eq("module_id", moduleId).is("chapter_id", null);
      }

      const { data: existingLessons, error: fetchError } = await query.order("order_index");

      if (fetchError) throw fetchError;

      // Calculer le prochain order_index disponible
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
        // We still need module_id because it's non-nullable in the schema? 
        // Let's check schema. lessons.module_id is NOT NULL.
        // So we need to find the module_id from the chapter or pass it.
        // For now, let's assume we pass moduleId even for chapters, or fetch it.
        // Actually, if chapterId is present, module_id might be redundant but required.
        // Let's fetch module_id from chapter if not provided.
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
      setLessonForm({ title: "", lesson_type: "video", order_index: 1, duration_minutes: null, video_url: "", document_url: "", content: "", live_date: "", live_time: "", live_link: "" });
      toast.success("Leçon ajoutée");
    },
    onError: (e: any) => toast.error("Erreur leçon: " + e.message),
  });

  const createQuizMutation = useMutation({
    mutationFn: async (lessonId: string) => {
      if (!lessonId) throw new Error("Leçon manquante");
      const { data, error } = await supabase
        .from("quizzes")
        .insert({ lesson_id: lessonId, title: quizForm.title, passing_score: quizForm.passing_score || 70 })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      await refetchStructure();
      setQuizForm({ title: "", passing_score: 70 });
      toast.success("Quiz créé");
    },
    onError: (e: any) => toast.error("Erreur quiz: " + e.message),
  });

  const addQuestionMutation = useMutation({
    mutationFn: async (quizId: string) => {
      if (!quizId) throw new Error("Quiz manquant");
      const { error } = await supabase
        .from("quiz_questions")
        .insert({
          quiz_id: quizId,
          question_text: questionForm.question_text,
          options: questionForm.options || [],
          correct_answer: questionForm.correct_answer,
          order_index: questionForm.order_index || 1,
        });
      if (error) throw error;
    },
    onSuccess: async () => {
      await refetchStructure();
      setQuestionForm({ question_text: "", options: [], correct_answer: "", order_index: 1 });
      toast.success("Question ajoutée");
    },
    onError: (e: any) => toast.error("Erreur question: " + e.message),
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
      toast.success("Session live annulée");
      setIsLessonDialogOpen(false);
    },
    onError: (e: any) => toast.error("Erreur annulation live: " + e.message),
  });

  const setFinalEvaluation = useMutation({
    mutationFn: async (lessonId: string) => {
      if (!structureCourse?.id) throw new Error("Cours non sélectionné");
      const { data: modules } = await supabase
        .from("modules")
        .select("id, order_index")
        .eq("course_id", structureCourse.id);
      const maxModuleOrder = Math.max(0, ...((modules || []).map((m: any) => m.order_index)));
      const { data: targetLesson } = await supabase
        .from("lessons")
        .select("id, module_id, order_index")
        .eq("id", lessonId)
        .single();
      await supabase
        .from("modules")
        .update({ order_index: maxModuleOrder + 1 })
        .eq("id", targetLesson.module_id);
      const { data: moduleLessons } = await supabase
        .from("lessons")
        .select("order_index")
        .eq("module_id", targetLesson.module_id);
      const maxLessonOrder = Math.max(0, ...((moduleLessons || []).map((l: any) => l.order_index)));
      await supabase
        .from("lessons")
        .update({ order_index: maxLessonOrder + 1 })
        .eq("id", lessonId);
    },
    onSuccess: async () => {
      await refetchStructure();
      toast.success("Évaluation finale positionnée en fin de cours");
    },
    onError: (e: any) => toast.error("Erreur évaluation finale: " + e.message),
  });

  const updateLessonStatusMutation = useMutation({
    mutationFn: async (payload: { id: string; is_approved?: boolean; is_published?: boolean }) => {
      const { id, ...rest } = payload;
      const { error } = await supabase
        .from("lessons")
        .update(rest as any)
        .eq("id", id);
      if (error) {
        const msg = String(error.message || "");
        if (msg.includes("is_approved") || msg.includes("is_published")) {
          toast.warning("Colonnes d'état de leçon absentes. Ignoré.");
          return;
        }
        throw error;
      }
    },
    onSuccess: async () => {
      await refetchStructure();
      toast.success("Leçon mise à jour");
    },
    onError: (e: any) => toast.error("Erreur mise à jour leçon: " + e.message),
  });

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      category_id: "",
      thumbnail_url: "",
      slug: "",
      period_start: "",
      period_end: "",
      is_published: false,
      is_approved: false,
    });
  };

  const handleCreate = () => {
    createMutation.mutate(formData);
  };

  const handleEdit = (course: any) => {
    setSelectedCourse(course);
    setFormData({
      title: course.title,
      description: course.description || "",
      category_id: course.category_id || "",
      thumbnail_url: course.thumbnail_url || "",
      slug: course.slug || "",
      period_start: course.period_start ? String(course.period_start).slice(0, 10) : "",
      period_end: course.period_end ? String(course.period_end).slice(0, 10) : "",
      is_published: course.is_published,
      is_approved: course.is_approved,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = () => {
    updateMutation.mutate(formData);
  };

  const handleDelete = (course: any) => {
    setSelectedCourse(course);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedCourse) {
      deleteMutation.mutate(selectedCourse.id);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">


      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Gestion des cours</h1>
            <p className="text-muted-foreground">
              Créez, modifiez et supprimez des cours
            </p>
          </div>
          {(userRole === "superadmin" || userRole === "superviseur" || userRole === "editeur") && (
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nouveau cours
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Créer un nouveau cours</DialogTitle>
                  <DialogDescription>
                    Remplissez les informations pour créer un nouveau cours
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Titre *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Titre du cours"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Description du cours"
                      rows={4}
                    />
                  </div>
                  <div>
                    <Label htmlFor="category">Catégorie</Label>
                    <Select
                      value={formData.category_id}
                      onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner une catégorie" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories?.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.icon} {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {(userRole === "editeur" || userRole === "superviseur" || userRole === "superadmin") && (
                    <div>
                      <Label htmlFor="instructor">Formateur assigné</Label>
                      <Select
                        value={selectedInstructorId}
                        onValueChange={(value) => setSelectedInstructorId(value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un formateur" />
                        </SelectTrigger>
                        <SelectContent>
                          {allFormateurs?.map((f: any) => (
                            <SelectItem key={f.id} value={f.id}>
                              {f.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {userRole === "editeur" && !selectedInstructorId && (
                        <p className="text-xs text-muted-foreground mt-1">Obligatoire pour les éditeurs</p>
                      )}
                    </div>
                  )}
                  <div>
                    <Label htmlFor="thumbnail">URL de la miniature</Label>
                    <Input
                      id="thumbnail"
                      value={formData.thumbnail_url}
                      onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })}
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                  <div>
                    <Label htmlFor="slug">Slug</Label>
                    <Input
                      id="slug"
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                      placeholder="auto-généré si vide"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="period_start">Début de période</Label>
                      <Input
                        id="period_start"
                        type="date"
                        value={formData.period_start}
                        onChange={(e) => setFormData({ ...formData, period_start: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="period_end">Fin de période</Label>
                      <Input
                        id="period_end"
                        type="date"
                        value={formData.period_end}
                        onChange={(e) => setFormData({ ...formData, period_end: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="published"
                      checked={formData.is_published}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, is_published: checked })
                      }
                    />
                    <Label htmlFor="published">Publié</Label>
                  </div>
                  {userRole === "superadmin" && (
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="approved"
                        checked={formData.is_approved}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, is_approved: checked })
                        }
                      />
                      <Label htmlFor="approved">Approuvé</Label>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button onClick={handleCreate} disabled={!formData.title || (userRole === "editeur" && !selectedInstructorId)}>
                    Créer
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {userRole !== "superadmin" && userRole !== "superviseur" && (
          <div className="mb-6">
            <Alert>
              <AlertDescription>
                Vous voyez uniquement vos cours. L'approbation globale nécessite le rôle superadmin.
              </AlertDescription>
            </Alert>
          </div>
        )}

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filtrer par calendrier</CardTitle>
            <CardDescription>Sélectionnez une période pour afficher les cours</CardDescription>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="range"
              selected={range}
              onSelect={(sel) => {
                if (sel?.from && sel?.to) {
                  const start = sel.from.toISOString().slice(0, 10);
                  const end = sel.to.toISOString().slice(0, 10);
                  setSearchParams({ start, end });
                }
              }}
              numberOfMonths={1}
            />
            <div className="mt-3 flex items-center gap-3">
              <Badge variant="outline">
                {startParam && endParam ? `${startParam} → ${endParam}` : "Aucune période sélectionnée"}
              </Badge>
              <Button variant="outline" onClick={() => setSearchParams({})}>Effacer</Button>
            </div>
          </CardContent>
        </Card>
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input
              placeholder="Rechercher un cours..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Courses Table */}
        <Card>
          <CardHeader>
            <CardTitle>Cours ({courses?.length || 0})</CardTitle>
            <CardDescription>Liste de tous les cours</CardDescription>
          </CardHeader>
          <CardContent>
            {courses && courses.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Titre</TableHead>
                      <TableHead>Catégorie</TableHead>
                      <TableHead>Formateur</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {courses.map((course) => (
                      <TableRow key={course.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {course.thumbnail_url && (
                              <img
                                src={course.thumbnail_url}
                                alt={course.title}
                                className="w-12 h-12 rounded object-cover"
                                loading="lazy"
                                referrerPolicy="no-referrer"
                                onError={(e) => { (e.currentTarget as HTMLImageElement).src = "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='96'%3E%3Crect width='100%25' height='100%25' fill='%23ddd'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23666' font-size='12'%3E%3C/text%3E%3C/svg%3E"; }}
                              />
                            )}
                            <div>
                              <div className="font-medium">{course.title}</div>
                              <div className="text-sm text-muted-foreground line-clamp-1">
                                {course.description}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {course.categories?.icon} {course.categories?.name || "Non catégorisé"}
                          </Badge>
                        </TableCell>
                        <TableCell>{instructorMap[course.instructor_id]?.full_name || "N/A"}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {course.is_published && (
                              <Badge variant="default">Publié</Badge>
                            )}
                            {course.is_approved && (
                              <Badge variant="outline">Approuvé</Badge>
                            )}
                            {!course.is_published && !course.is_approved && (
                              <Badge variant="secondary">Brouillon</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/courses/${course.id}`)}
                            >
                              <BookOpen className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setStructureCourse(course);
                                setIsStructureDialogOpen(true);
                              }}
                            >
                              Gérer contenu
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(course)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(course)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Aucun cours trouvé</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Modifier le cours</DialogTitle>
              <DialogDescription>
                Modifiez les informations du cours
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-title">Titre *</Label>
                <Input
                  id="edit-title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                />
              </div>
              <div>
                <Label htmlFor="edit-category">Catégorie</Label>
                <Select
                  value={formData.category_id}
                  onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une catégorie" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.icon} {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-thumbnail">URL de la miniature</Label>
                <Input
                  id="edit-thumbnail"
                  value={formData.thumbnail_url}
                  onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-slug">Slug</Label>
                <Input
                  id="edit-slug"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                />
              </div>
              {(userRole === "editeur" || userRole === "superviseur" || userRole === "superadmin") && (
                <div>
                  <Label htmlFor="edit-instructor">Formateur assigné</Label>
                  <Select
                    value={selectedCourse?.instructor_id || ""}
                    onValueChange={(value) => {
                      if (selectedCourse) {
                        setSelectedCourse({ ...selectedCourse, instructor_id: value });
                      }
                    }}
                  >
                    <SelectTrigger id="edit-instructor">
                      <SelectValue placeholder="Sélectionner un formateur" />
                    </SelectTrigger>
                    <SelectContent>
                      {allFormateurs?.map((f: any) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Modifier le formateur créera un nouvel enregistrement dans l'historique
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="edit-period-start">Début de période</Label>
                  <Input
                    id="edit-period-start"
                    type="date"
                    value={formData.period_start}
                    onChange={(e) => setFormData({ ...formData, period_start: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-period-end">Fin de période</Label>
                  <Input
                    id="edit-period-end"
                    type="date"
                    value={formData.period_end}
                    onChange={(e) => setFormData({ ...formData, period_end: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-published"
                  checked={formData.is_published}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_published: checked })
                  }
                />
                <Label htmlFor="edit-published">Publié</Label>
              </div>
              {userRole === "superadmin" && (
                <div className="flex items-center space-x-2">
                  <Switch
                    id="edit-approved"
                    checked={formData.is_approved}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, is_approved: checked })
                    }
                  />
                  <Label htmlFor="edit-approved">Approuvé</Label>
                </div>
              )}
            </div>

            {/* Historique des affectations de formateurs */}
            {selectedCourse && (userRole === "superadmin" || userRole === "superviseur" || userRole === "editeur") && (
              <div className="mt-6">
                <InstructorAssignmentHistory courseId={selectedCourse.id} />
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleUpdate} disabled={!formData.title}>
                Enregistrer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Êtes-vous sûr?</AlertDialogTitle>
              <AlertDialogDescription>
                Cette action est irréversible. Le cours "{selectedCourse?.title}" sera
                définitivement supprimé.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-destructive">
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={isStructureDialogOpen} onOpenChange={setIsStructureDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Gérer le contenu du cours</DialogTitle>
              <DialogDescription>
                Ajouter des modules, des leçons, des quiz et définir l'évaluation finale
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
                <div className="mt-6 space-y-2">
                  <h3 className="font-semibold">Ajout en masse de modules avec quiz</h3>
                  <div className="grid grid-cols-4 gap-3">
                    <Input placeholder="Base du titre (ex: Module)" value={bulkModuleBaseTitle} onChange={(e) => setBulkModuleBaseTitle(e.target.value)} />
                    <Input placeholder="Nombre" type="number" value={bulkModuleCount} onChange={(e) => setBulkModuleCount(parseInt(e.target.value || "1", 10))} />
                    <Input placeholder="Score minimum du quiz" type="number" value={bulkQuizPassingScore} onChange={(e) => setBulkQuizPassingScore(parseInt(e.target.value || "70", 10))} />
                    <Button onClick={() => createBulkModulesMutation.mutate()} disabled={!bulkModuleBaseTitle || bulkModuleCount < 1}>Créer</Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Crée N modules pour ce cours. Pour chaque module: ajoute une leçon "Évaluation" et un quiz avec le score minimum indiqué.</p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold">Modules</h3>
                {structureData?.modules?.length ? (
                  <div className="space-y-4">
                    {structureData.modules.map((m: any, mi: number) => (
                      <Card key={m.id}>
                        <CardHeader>
                          <CardTitle>Module {mi + 1}: {m.title}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                          {/* 1. Direct Lessons (Introduction) */}
                          <div>
                            <h4 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Introduction & Leçons Directes</h4>
                            <div className="space-y-2">
                              {(m.lessons || []).filter((l: any) => !l.chapter_id).sort((a: any, b: any) => a.order_index - b.order_index).map((l: any, li: number) => (
                                <div key={l.id} className="p-3 border rounded bg-background">
                                  <div className="flex items-center justify-between">
                                    <div className="font-medium flex items-center gap-2">
                                      <span className="text-muted-foreground text-sm">#{li + 1}</span>
                                      {l.title}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline">{l.lesson_type}</Badge>
                                      <Button variant="ghost" size="sm" onClick={() => { setSelectedLesson(l); setIsLessonDialogOpen(true); }}>
                                        <Edit className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                              {!(m.lessons || []).some((l: any) => !l.chapter_id) && <p className="text-sm text-muted-foreground italic pl-2">Aucune leçon directe.</p>}
                            </div>
                          </div>

                          {/* 2. Chapters */}
                          <div>
                            <h4 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Chapitres</h4>
                            <div className="space-y-4">
                              {(m.chapters || []).sort((a: any, b: any) => a.order_index - b.order_index).map((c: any, ci: number) => (
                                <div key={c.id} className="border rounded-lg p-4 bg-muted/10">
                                  <div className="font-semibold text-lg mb-4 flex items-center gap-2">
                                    <span className="bg-primary/10 text-primary w-6 h-6 rounded-full flex items-center justify-center text-xs">{ci + 1}</span>
                                    {c.title}
                                  </div>
                                  <div className="space-y-2 pl-2">
                                    {(c.lessons || []).sort((a: any, b: any) => a.order_index - b.order_index).map((l: any, li: number) => (
                                      <div key={l.id} className="p-3 border rounded bg-background">
                                        <div className="flex items-center justify-between">
                                          <div className="font-medium flex items-center gap-2">
                                            <span className="text-muted-foreground text-sm">{li + 1}.</span>
                                            {l.title}
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <Badge variant="outline">{l.lesson_type}</Badge>
                                            <Button variant="ghost" size="sm" onClick={() => { setSelectedLesson(l); setIsLessonDialogOpen(true); }}>
                                              <Edit className="w-4 h-4" />
                                            </Button>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                    {!(c.lessons || []).length && <p className="text-sm text-muted-foreground italic">Aucune leçon dans ce chapitre.</p>}
                                  </div>
                                </div>
                              ))}
                              {!(m.chapters || []).length && <p className="text-sm text-muted-foreground italic pl-2">Aucun chapitre.</p>}
                            </div>
                          </div>

                          {/* 3. Add Content Area */}
                          <div className="border-t pt-4 bg-muted/20 p-4 rounded-lg mt-6">
                            <h4 className="font-medium mb-4">Ajouter du contenu au module</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                              {/* Add Chapter Form */}
                              <div className="space-y-3 p-3 border rounded bg-background">
                                <h5 className="text-sm font-medium flex items-center gap-2"><Plus className="w-4 h-4" /> Nouveau Chapitre</h5>
                                <Input placeholder="Titre du chapitre" value={chapterForm.title} onChange={(e) => setChapterForm({ ...chapterForm, title: e.target.value })} />
                                <Input placeholder="Description (optionnel)" value={chapterForm.description} onChange={(e) => setChapterForm({ ...chapterForm, description: e.target.value })} />
                                <Button size="sm" onClick={() => createChapterMutation.mutate(m.id)} disabled={!chapterForm.title} className="w-full">Ajouter Chapitre</Button>
                              </div>

                              {/* Add Lesson Form */}
                              <div className="space-y-3 p-3 border rounded bg-background">
                                <h5 className="text-sm font-medium flex items-center gap-2"><Plus className="w-4 h-4" /> Nouvelle Leçon</h5>
                                <Input placeholder="Titre de la leçon" value={lessonForm.title} onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })} />
                                <div className="grid grid-cols-2 gap-2">
                                  <Select value={lessonForm.lesson_type} onValueChange={(v) => setLessonForm({ ...lessonForm, lesson_type: v })}>
                                    <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="video">Vidéo</SelectItem>
                                      <SelectItem value="document">Document</SelectItem>
                                      <SelectItem value="text">Texte</SelectItem>
                                      <SelectItem value="live">Live (Meet)</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <Select onValueChange={(v) => setLessonForm({ ...lessonForm, target_chapter_id: v === "root" ? null : v })}>
                                    <SelectTrigger><SelectValue placeholder="Emplacement" /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="root">Introduction / Racine</SelectItem>
                                      {(m.chapters || []).map((c: any) => (
                                        <SelectItem key={c.id} value={c.id}>Chapitre: {c.title}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                {lessonForm.lesson_type === "video" && <Input placeholder="URL vidéo" value={lessonForm.video_url} onChange={(e) => setLessonForm({ ...lessonForm, video_url: e.target.value })} />}
                                {lessonForm.lesson_type === "document" && <Input placeholder="URL document" value={lessonForm.document_url} onChange={(e) => setLessonForm({ ...lessonForm, document_url: e.target.value })} />}
                                {lessonForm.lesson_type === "live" && (
                                  <div className="space-y-2">
                                    <Input placeholder="Date (YYYY-MM-DD)" value={lessonForm.live_date} onChange={(e) => setLessonForm({ ...lessonForm, live_date: e.target.value })} />
                                    <Input placeholder="Heure (HH:mm)" value={lessonForm.live_time} onChange={(e) => setLessonForm({ ...lessonForm, live_time: e.target.value })} />
                                    <Input placeholder="Lien Meet" value={lessonForm.live_link} onChange={(e) => setLessonForm({ ...lessonForm, live_link: e.target.value })} />
                                  </div>
                                )}

                                <Button size="sm" onClick={() => createLessonMutation.mutate({ moduleId: m.id, chapterId: lessonForm.target_chapter_id })} disabled={!lessonForm.title} className="w-full">Ajouter Leçon</Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">Aucun module pour ce cours</div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsStructureDialogOpen(false)}>Fermer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isLessonDialogOpen} onOpenChange={setIsLessonDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Détails de la leçon</DialogTitle>
              <DialogDescription>Visualiser les métadonnées et le contenu de la leçon</DialogDescription>
            </DialogHeader>
            {selectedLesson ? (
              <div className="space-y-4">
                {(() => {
                  if (selectedLesson?.lesson_type !== "live") return null;
                  try {
                    const info = JSON.parse(selectedLesson.content || "{}");
                    const d = typeof info.scheduled_date === "string" ? info.scheduled_date : "";
                    const t = typeof info.scheduled_time === "string" ? info.scheduled_time : "";
                    const l = typeof info.meeting_link === "string" ? info.meeting_link : (selectedLesson.video_url || "");
                    const dur = typeof selectedLesson.duration_minutes === "number" ? selectedLesson.duration_minutes : 60;
                    if (liveEdit.scheduled_date === "" && liveEdit.scheduled_time === "" && liveEdit.meeting_link === "") {
                      setLiveEdit({ scheduled_date: d, scheduled_time: t, meeting_link: l, duration_minutes: dur });
                    }
                  } catch { }
                  return null;
                })()}
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Titre</div>
                  <div className="font-medium">{selectedLesson.title}</div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Type</div>
                    <div className="font-medium">{selectedLesson.lesson_type}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Durée (min)</div>
                    <div className="font-medium">{selectedLesson.duration_minutes ?? "—"}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">URL vidéo</div>
                    <div className="break-all text-xs">{selectedLesson.video_url ?? "—"}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">URL document</div>
                    <div className="break-all text-xs">{selectedLesson.document_url ?? "—"}</div>
                  </div>
                </div>
                {selectedLesson.lesson_type === "live" && (
                  <div className="space-y-3 border rounded p-3">
                    <div className="text-sm font-medium">Modifier la session live</div>
                    <div className="grid grid-cols-4 gap-3">
                      <Input placeholder="Date (YYYY-MM-DD)" value={liveEdit.scheduled_date} onChange={(e) => setLiveEdit({ ...liveEdit, scheduled_date: e.target.value })} />
                      <Input placeholder="Heure (HH:mm)" value={liveEdit.scheduled_time} onChange={(e) => setLiveEdit({ ...liveEdit, scheduled_time: e.target.value })} />
                      <Input placeholder="Lien visio" value={liveEdit.meeting_link} onChange={(e) => setLiveEdit({ ...liveEdit, meeting_link: e.target.value })} />
                      <Input placeholder="Durée (min)" type="number" value={liveEdit.duration_minutes} onChange={(e) => setLiveEdit({ ...liveEdit, duration_minutes: parseInt(e.target.value || "60", 10) })} />
                    </div>
                    {(() => {
                      const dateOk = /^\d{4}-\d{2}-\d{2}$/.test(liveEdit.scheduled_date || "");
                      const timeOk = /^\d{2}:\d{2}$/.test(liveEdit.scheduled_time || "");
                      const linkOk = (liveEdit.meeting_link || "").startsWith("http");
                      return (
                        <div className="flex gap-2">
                          <Button
                            onClick={() => updateLiveLessonMutation.mutate({ id: selectedLesson.id, scheduled_date: liveEdit.scheduled_date, scheduled_time: liveEdit.scheduled_time, meeting_link: liveEdit.meeting_link, duration_minutes: liveEdit.duration_minutes })}
                            disabled={!dateOk || !timeOk || !linkOk}
                          >
                            Enregistrer
                          </Button>
                          <Button variant="outline" className="text-destructive" onClick={() => deleteLiveLessonMutation.mutate(selectedLesson.id)}>
                            Annuler la session
                          </Button>
                        </div>
                      );
                    })()}
                  </div>
                )}
                {selectedLesson.content && (
                  <div>
                    <div className="text-sm text-muted-foreground">Contenu</div>
                    <div className="p-3 border rounded text-sm whitespace-pre-wrap">{selectedLesson.content}</div>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={() => updateLessonStatusMutation.mutate({ id: selectedLesson.id, is_approved: true })}>Approuver</Button>
                  <Button variant="default" onClick={() => updateLessonStatusMutation.mutate({ id: selectedLesson.id, is_published: true })}>Publier</Button>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">Aucune leçon sélectionnée</div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsLessonDialogOpen(false)}>Fermer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default CoursesManagement;
