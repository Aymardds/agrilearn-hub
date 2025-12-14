import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Hook pour récupérer les statistiques de l'utilisateur
 */
export function useUserStats(userId: string | undefined) {
    return useQuery({
        queryKey: ["user-stats", userId],
        queryFn: async () => {
            if (!userId) throw new Error("User ID required");

            // Récupérer le profil avec niveau et points
            const { data: profile, error: profileError } = await supabase
                .from("profiles")
                .select("level, total_points, experience_points")
                .eq("id", userId)
                .single();

            if (profileError) throw profileError;

            // Récupérer le streak
            const { data: streak, error: streakError } = await supabase
                .from("user_streaks")
                .select("*")
                .eq("user_id", userId)
                .maybeSingle();

            if (streakError) throw streakError;

            // Récupérer les sessions de la semaine
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);

            const { data: sessions, error: sessionsError } = await supabase
                .from("learning_sessions")
                .select("started_at, duration_seconds")
                .eq("user_id", userId)
                .gte("started_at", weekAgo.toISOString());

            if (sessionsError) throw sessionsError;

            // Calculer le temps total de la semaine
            const weekTime = sessions?.reduce((sum, s) => sum + (s.duration_seconds || 0), 0) || 0;

            // Compter les cours en cours
            const { count: coursesInProgress } = await supabase
                .from("enrollments")
                .select("*", { count: "exact", head: true })
                .eq("user_id", userId)
                .gt("progress_percentage", 0)
                .lt("progress_percentage", 100);

            return {
                level: profile?.level || 1,
                totalPoints: profile?.total_points || 0,
                experiencePoints: profile?.experience_points || 0,
                currentStreak: streak?.current_streak || 0,
                longestStreak: streak?.longest_streak || 0,
                weekTime,
                coursesInProgress: coursesInProgress || 0,
            };
        },
        enabled: !!userId,
    });
}

/**
 * Hook pour récupérer les badges de l'utilisateur
 */
export function useUserBadges(userId: string | undefined) {
    return useQuery({
        queryKey: ["user-badges", userId],
        queryFn: async () => {
            if (!userId) throw new Error("User ID required");

            const { data, error } = await supabase
                .from("user_badges")
                .select(`
          *,
          badges (
            id,
            name,
            description,
            icon,
            category,
            rarity,
            points_reward
          )
        `)
                .eq("user_id", userId)
                .order("earned_at", { ascending: false });

            if (error) throw error;
            return data || [];
        },
        enabled: !!userId,
    });
}

/**
 * Hook pour récupérer tous les badges disponibles
 */
export function useAllBadges() {
    return useQuery({
        queryKey: ["all-badges"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("badges")
                .select("*")
                .order("rarity", { ascending: true });

            if (error) throw error;
            return data || [];
        },
    });
}

/**
 * Hook pour récupérer l'historique des points
 */
export function usePointsHistory(userId: string | undefined, limit = 10) {
    return useQuery({
        queryKey: ["points-history", userId, limit],
        queryFn: async () => {
            if (!userId) throw new Error("User ID required");

            const { data, error } = await supabase
                .from("user_points")
                .select("*")
                .eq("user_id", userId)
                .order("created_at", { ascending: false })
                .limit(limit);

            if (error) throw error;
            return data || [];
        },
        enabled: !!userId,
    });
}

/**
 * Hook pour récupérer le leaderboard
 */
export function useLeaderboard(limit = 10, period: "all" | "month" | "week" = "all") {
    return useQuery({
        queryKey: ["leaderboard", limit, period],
        queryFn: async () => {
            let query = supabase
                .from("profiles")
                .select("id, full_name, avatar_url, level, total_points")
                .order("total_points", { ascending: false })
                .limit(limit);

            // Si période spécifique, filtrer par date de création des points
            if (period !== "all") {
                const now = new Date();
                const startDate = new Date();

                if (period === "month") {
                    startDate.setMonth(now.getMonth() - 1);
                } else if (period === "week") {
                    startDate.setDate(now.getDate() - 7);
                }

                // Note: Cette requête est simplifiée. Pour un vrai leaderboard par période,
                // il faudrait une vue matérialisée ou une requête plus complexe
            }

            const { data, error } = await query;

            if (error) throw error;
            return data || [];
        },
    });
}

/**
 * Hook pour récupérer les notifications
 */
export function useNotifications(userId: string | undefined) {
    return useQuery({
        queryKey: ["notifications", userId],
        queryFn: async () => {
            if (!userId) throw new Error("User ID required");

            const { data, error } = await supabase
                .from("notifications")
                .select("*")
                .eq("user_id", userId)
                .order("created_at", { ascending: false })
                .limit(50);

            if (error) throw error;
            return data || [];
        },
        enabled: !!userId,
        refetchInterval: 30000, // Rafraîchir toutes les 30 secondes
    });
}

/**
 * Hook pour récupérer le nombre de notifications non lues
 */
export function useUnreadNotificationsCount(userId: string | undefined) {
    return useQuery({
        queryKey: ["unread-notifications-count", userId],
        queryFn: async () => {
            if (!userId) throw new Error("User ID required");

            const { count, error } = await supabase
                .from("notifications")
                .select("*", { count: "exact", head: true })
                .eq("user_id", userId)
                .eq("is_read", false);

            if (error) throw error;
            return count || 0;
        },
        enabled: !!userId,
        refetchInterval: 30000,
    });
}

/**
 * Hook pour marquer une notification comme lue
 */
export function useMarkNotificationAsRead() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (notificationId: string) => {
            const { error } = await supabase
                .from("notifications")
                .update({ is_read: true })
                .eq("id", notificationId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
            queryClient.invalidateQueries({ queryKey: ["unread-notifications-count"] });
        },
    });
}

/**
 * Hook pour marquer toutes les notifications comme lues
 */
export function useMarkAllNotificationsAsRead() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (userId: string) => {
            const { error } = await supabase
                .from("notifications")
                .update({ is_read: true })
                .eq("user_id", userId)
                .eq("is_read", false);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
            queryClient.invalidateQueries({ queryKey: ["unread-notifications-count"] });
            toast.success("Toutes les notifications ont été marquées comme lues");
        },
    });
}

/**
 * Hook pour supprimer une notification
 */
export function useDeleteNotification() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (notificationId: string) => {
            const { error } = await supabase
                .from("notifications")
                .delete()
                .eq("id", notificationId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
            queryClient.invalidateQueries({ queryKey: ["unread-notifications-count"] });
        },
    });
}

/**
 * Hook pour récupérer le dernier cours consulté
 */
export function useLastAccessedCourse(userId: string | undefined) {
    return useQuery({
        queryKey: ["last-accessed-course", userId],
        queryFn: async () => {
            if (!userId) throw new Error("User ID required");

            const { data, error } = await supabase
                .from("learning_sessions")
                .select(`
          course_id,
          lesson_id,
          started_at,
          courses (
            id,
            title,
            thumbnail_url
          ),
          lessons (
            id,
            title
          )
        `)
                .eq("user_id", userId)
                .not("course_id", "is", null)
                .order("started_at", { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error) throw error;
            return data;
        },
        enabled: !!userId,
    });
}

/**
 * Hook pour enregistrer une session d'apprentissage
 */
export function useTrackLearningSession() {
    return useMutation({
        mutationFn: async (data: {
            userId: string;
            courseId?: string;
            lessonId?: string;
            startedAt: string;
            endedAt?: string;
            durationSeconds?: number;
        }) => {
            const { error } = await supabase
                .from("learning_sessions")
                .insert({
                    user_id: data.userId,
                    course_id: data.courseId || null,
                    lesson_id: data.lessonId || null,
                    started_at: data.startedAt,
                    ended_at: data.endedAt || null,
                    duration_seconds: data.durationSeconds || null,
                });

            if (error) throw error;
        },
    });
}

/**
 * Hook pour récupérer les préférences de notification
 */
export function useNotificationPreferences(userId: string | undefined) {
    return useQuery({
        queryKey: ["notification-preferences", userId],
        queryFn: async () => {
            if (!userId) throw new Error("User ID required");

            const { data, error } = await supabase
                .from("notification_preferences")
                .select("*")
                .eq("user_id", userId)
                .maybeSingle();

            if (error && error.code !== "PGRST116") throw error;

            // Si pas de préférences, retourner les valeurs par défaut
            return data || {
                user_id: userId,
                email_enabled: true,
                push_enabled: true,
                new_course: true,
                live_session: true,
                quiz_reminder: true,
                badge_earned: true,
                level_up: true,
                forum_reply: true,
                weekly_summary: true,
            };
        },
        enabled: !!userId,
    });
}

/**
 * Hook pour mettre à jour les préférences de notification
 */
export function useUpdateNotificationPreferences() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: any) => {
            const { error } = await supabase
                .from("notification_preferences")
                .upsert(data);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notification-preferences"] });
            toast.success("Préférences mises à jour");
        },
        onError: (error: any) => {
            toast.error("Erreur lors de la mise à jour des préférences");
            console.error(error);
        },
    });
}
