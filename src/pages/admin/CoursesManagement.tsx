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
import { Plus, Edit, Trash2, Search, BookOpen, Check, X } from "lucide-react";
import { toast } from "sonner";
// header fourni par AppShell
import { useNavigate, useSearchParams } from "react-router-dom";
import { Calendar } from "@/components/ui/calendar";
import * as React from "react";
import InstructorAssignmentHistory from "@/components/courses/InstructorAssignmentHistory";
import CourseStructureDialog from "@/components/courses/CourseStructureDialog";

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

  const approveMutation = useMutation({
    mutationFn: async (courseId: string) => {
      const { error } = await supabase
        .from("courses")
        .update({
          review_status: 'approved',
          is_approved: true,
          is_published: true
        } as any)
        .eq("id", courseId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
      toast.success("Cours approuvé !");
    },
    onError: (e: any) => toast.error("Erreur: " + e.message),
  });

  const rejectMutation = useMutation({
    mutationFn: async (payload: { id: string, reason: string }) => {
      const { error } = await supabase
        .from("courses")
        .update({
          review_status: 'rejected',
          is_approved: false,
          rejection_reason: payload.reason
        } as any)
        .eq("id", payload.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
      toast.success("Cours rejeté.");
    },
    onError: (e: any) => toast.error("Erreur: " + e.message),
  });

  const handleApprove = (course: any) => {
    if (confirm(`Approuver le cours "${course.title}" ?`)) {
      approveMutation.mutate(course.id);
    }
  };

  const handleReject = (course: any) => {
    const reason = prompt("Raison du rejet :");
    if (reason !== null) {
      rejectMutation.mutate({ id: course.id, reason: reason || "Non spécifiée" });
    }
  };

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
                          <div className="flex gap-2 flex-wrap">
                            {(course as any).review_status === 'published' && <Badge className="bg-green-600">Publié</Badge>}
                            {(course as any).review_status === 'approved' && <Badge className="bg-blue-600">Approuvé</Badge>}
                            {(course as any).review_status === 'pending' && <Badge className="bg-yellow-600">En attente</Badge>}
                            {(course as any).review_status === 'rejected' && <Badge className="bg-red-600">Rejeté</Badge>}
                            {(course as any).review_status === 'draft' && <Badge variant="secondary">Brouillon</Badge>}

                            {/* Fallback old flags if status not set */}
                            {!(course as any).review_status && course.is_published && <Badge variant="default">Publié</Badge>}
                            {!(course as any).review_status && course.is_approved && <Badge variant="outline">Approuvé</Badge>}
                            {!(course as any).review_status && !course.is_published && !course.is_approved && <Badge variant="secondary">Brouillon</Badge>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {(userRole === 'superadmin' || userRole === 'superviseur') && (course as any).review_status === 'pending' && (
                              <>
                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700 h-8 w-8 p-0"
                                  title="Approuver"
                                  onClick={() => handleApprove(course)}
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="h-8 w-8 p-0"
                                  title="Rejeter"
                                  onClick={() => handleReject(course)}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </>
                            )}
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

        {structureCourse && (
          <CourseStructureDialog
            courseId={structureCourse.id}
            courseTitle={structureCourse.title}
            open={isStructureDialogOpen}
            onOpenChange={setIsStructureDialogOpen}
            userRole={userRole}
          />
        )}
    </main>
    </div >
  );
};

export default CoursesManagement;
