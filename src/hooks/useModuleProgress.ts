import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook to manage module progression and completion status
 */
export const useModuleProgress = (userId: string | undefined, courseId: string | undefined) => {
    // Get all modules for the course
    const { data: modules } = useQuery({
        queryKey: ["course-modules", courseId],
        queryFn: async () => {
            if (!courseId) return [];
            const { data, error } = await supabase
                .from("modules")
                .select("id, title, order_index")
                .eq("course_id", courseId)
                .order("order_index");

            if (error) throw error;
            return data;
        },
        enabled: !!courseId,
    });

    // Get all lessons for the course
    const { data: lessons } = useQuery({
        queryKey: ["course-lessons", courseId],
        queryFn: async () => {
            if (!courseId || !modules) return [];
            const moduleIds = modules.map(m => m.id);
            const { data, error } = await supabase
                .from("lessons")
                .select("id, module_id, title, order_index")
                .in("module_id", moduleIds);

            if (error) throw error;
            return data;
        },
        enabled: !!courseId && !!modules,
    });

    // Get user's lesson progress
    const { data: lessonProgress } = useQuery({
        queryKey: ["user-lesson-progress", userId, courseId],
        queryFn: async () => {
            if (!userId || !lessons) return [];
            const lessonIds = lessons.map(l => l.id);
            const { data, error } = await supabase
                .from("lesson_progress")
                .select("*")
                .eq("user_id", userId)
                .in("lesson_id", lessonIds)
                .eq("is_completed", true);

            if (error) throw error;
            return data;
        },
        enabled: !!userId && !!lessons,
    });

    // Get quiz attempts for module quizzes
    const { data: quizAttempts } = useQuery({
        queryKey: ["user-quiz-attempts", userId, courseId],
        queryFn: async () => {
            if (!userId || !modules) return [];
            const moduleIds = modules.map(m => m.id);

            // Get all quizzes for these modules
            const { data: quizzes } = await supabase
                .from("quizzes")
                .select("id, module_id, passing_score")
                .in("module_id", moduleIds);

            if (!quizzes) return [];
            const quizIds = quizzes.map(q => q.id);

            // Get user's attempts
            const { data, error } = await supabase
                .from("quiz_attempts")
                .select("*, quizzes(module_id, passing_score)")
                .eq("user_id", userId)
                .in("quiz_id", quizIds)
                .eq("passed", true);

            if (error) throw error;
            return data;
        },
        enabled: !!userId && !!modules,
    });

    /**
     * Check if all lessons in a module are completed
     */
    const checkModuleCompletion = (moduleId: string): boolean => {
        if (!lessons || !lessonProgress) return false;

        const moduleLessons = lessons.filter(l => l.module_id === moduleId);
        const completedLessonIds = new Set(lessonProgress.map(p => p.lesson_id));

        return moduleLessons.every(lesson => completedLessonIds.has(lesson.id));
    };

    /**
     * Check if the quiz for a module has been passed
     */
    const checkModuleQuizPassed = (moduleId: string): boolean => {
        if (!quizAttempts) return false;

        return quizAttempts.some((attempt: any) =>
            attempt.quizzes?.module_id === moduleId && attempt.passed
        );
    };

    /**
     * Check if all modules and their quizzes are completed
     */
    const checkAllModulesCompleted = (): boolean => {
        if (!modules || modules.length === 0) return false;

        return modules.every(module => {
            const lessonsCompleted = checkModuleCompletion(module.id);
            const quizPassed = checkModuleQuizPassed(module.id);
            return lessonsCompleted && quizPassed;
        });
    };

    /**
     * Check if user is eligible for final assessment
     */
    const checkFinalAssessmentEligibility = (): boolean => {
        return checkAllModulesCompleted();
    };

    /**
     * Get the next incomplete module
     */
    const getNextIncompleteModule = (): typeof modules[0] | null => {
        if (!modules) return null;

        for (const module of modules) {
            if (!checkModuleCompletion(module.id) || !checkModuleQuizPassed(module.id)) {
                return module;
            }
        }
        return null;
    };

    /**
     * Get completion percentage for a specific module
     */
    const getModuleCompletionPercentage = (moduleId: string): number => {
        if (!lessons || !lessonProgress) return 0;

        const moduleLessons = lessons.filter(l => l.module_id === moduleId);
        if (moduleLessons.length === 0) return 0;

        const completedLessonIds = new Set(lessonProgress.map(p => p.lesson_id));
        const completedCount = moduleLessons.filter(l => completedLessonIds.has(l.id)).length;

        return Math.round((completedCount / moduleLessons.length) * 100);
    };

    return {
        modules,
        lessons,
        lessonProgress,
        quizAttempts,
        checkModuleCompletion,
        checkModuleQuizPassed,
        checkAllModulesCompleted,
        checkFinalAssessmentEligibility,
        getNextIncompleteModule,
        getModuleCompletionPercentage,
    };
};
