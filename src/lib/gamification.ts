/**
 * Utilitaires pour le système de gamification
 */

export const POINTS = {
    LESSON_COMPLETED: 10,
    QUIZ_PASSED: 20,
    QUIZ_PERFECT: 30,
    MODULE_COMPLETED: 50,
    COURSE_COMPLETED: 100,
    FIRST_LOGIN_DAY: 5,
    STREAK_7_DAYS: 50,
    STREAK_30_DAYS: 200,
} as const;

export const LEVELS = [
    { level: 1, minPoints: 0, maxPoints: 99, name: 'Débutant', icon: '🌱', color: '#22c55e' },
    { level: 2, minPoints: 100, maxPoints: 299, name: 'Apprenti', icon: '📚', color: '#3b82f6' },
    { level: 3, minPoints: 300, maxPoints: 599, name: 'Pratiquant', icon: '💡', color: '#8b5cf6' },
    { level: 4, minPoints: 600, maxPoints: 999, name: 'Expert', icon: '⭐', color: '#f59e0b' },
    { level: 5, minPoints: 1000, maxPoints: 1499, name: 'Maître', icon: '👑', color: '#ef4444' },
    { level: 6, minPoints: 1500, maxPoints: 2499, name: 'Champion', icon: '🏆', color: '#ec4899' },
    { level: 7, minPoints: 2500, maxPoints: 3999, name: 'Légende', icon: '🌟', color: '#14b8a6' },
    { level: 8, minPoints: 4000, maxPoints: 5999, name: 'Titan', icon: '⚡', color: '#a855f7' },
    { level: 9, minPoints: 6000, maxPoints: 8999, name: 'Dieu', icon: '🔥', color: '#f97316' },
    { level: 10, minPoints: 9000, maxPoints: Infinity, name: 'Immortel', icon: '💎', color: '#06b6d4' },
] as const;

export const BADGE_RARITIES = {
    common: { color: '#9ca3af', label: 'Commun' },
    rare: { color: '#3b82f6', label: 'Rare' },
    epic: { color: '#8b5cf6', label: 'Épique' },
    legendary: { color: '#f59e0b', label: 'Légendaire' },
} as const;

/**
 * Calcule le niveau basé sur les points
 */
export function calculateLevel(points: number): typeof LEVELS[number] {
    return LEVELS.find(level => points >= level.minPoints && points <= level.maxPoints) || LEVELS[0];
}

/**
 * Calcule la progression vers le prochain niveau
 */
export function calculateLevelProgress(points: number): {
    currentLevel: typeof LEVELS[number];
    nextLevel: typeof LEVELS[number] | null;
    progress: number;
    pointsToNext: number;
} {
    const currentLevel = calculateLevel(points);
    const currentLevelIndex = LEVELS.findIndex(l => l.level === currentLevel.level);
    const nextLevel = currentLevelIndex < LEVELS.length - 1 ? LEVELS[currentLevelIndex + 1] : null;

    if (!nextLevel) {
        return {
            currentLevel,
            nextLevel: null,
            progress: 100,
            pointsToNext: 0,
        };
    }

    const pointsInCurrentLevel = points - currentLevel.minPoints;
    const pointsNeededForNextLevel = nextLevel.minPoints - currentLevel.minPoints;
    const progress = Math.round((pointsInCurrentLevel / pointsNeededForNextLevel) * 100);
    const pointsToNext = nextLevel.minPoints - points;

    return {
        currentLevel,
        nextLevel,
        progress: Math.min(progress, 100),
        pointsToNext: Math.max(pointsToNext, 0),
    };
}

/**
 * Formate les points avec séparateur de milliers
 */
export function formatPoints(points: number): string {
    return points.toLocaleString('fr-FR');
}

/**
 * Calcule le temps total d'apprentissage en heures et minutes
 */
export function formatLearningTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
        return `${hours}h${minutes > 0 ? ` ${minutes}min` : ''}`;
    }
    return `${minutes}min`;
}

/**
 * Obtient l'emoji du streak
 */
export function getStreakEmoji(streak: number): string {
    if (streak >= 30) return '🔥🔥🔥';
    if (streak >= 14) return '🔥🔥';
    if (streak >= 7) return '🔥';
    if (streak >= 3) return '⚡';
    return '✨';
}

/**
 * Obtient le message de motivation basé sur le streak
 */
export function getStreakMessage(streak: number): string {
    if (streak === 0) return 'Commencez votre série !';
    if (streak === 1) return 'Bon début ! Continuez demain';
    if (streak < 7) return `${streak} jours de suite ! Continuez`;
    if (streak < 14) return `${streak} jours ! Vous êtes en feu`;
    if (streak < 30) return `${streak} jours ! Incroyable`;
    return `${streak} jours ! Vous êtes une légende`;
}

/**
 * Obtient la couleur du badge selon la rareté
 */
export function getBadgeColor(rarity: keyof typeof BADGE_RARITIES): string {
    return BADGE_RARITIES[rarity]?.color || BADGE_RARITIES.common.color;
}

/**
 * Calcule le rang dans le leaderboard
 */
export function calculateRank(userPoints: number, allUsersPoints: number[]): number {
    const sortedPoints = [...allUsersPoints].sort((a, b) => b - a);
    return sortedPoints.findIndex(points => points === userPoints) + 1;
}

/**
 * Obtient le message de félicitations pour un nouveau niveau
 */
export function getLevelUpMessage(level: number): string {
    const messages = [
        `Niveau ${level} ! Vous progressez bien`,
        `Niveau ${level} atteint ! Continuez comme ça`,
        `Félicitations ! Niveau ${level}`,
        `Bravo ! Vous êtes maintenant niveau ${level}`,
        `Niveau ${level} débloqué ! Excellent travail`,
    ];
    return messages[Math.floor(Math.random() * messages.length)];
}

/**
 * Obtient le message pour un nouveau badge
 */
export function getBadgeEarnedMessage(badgeName: string): string {
    return `Vous avez obtenu le badge "${badgeName}" !`;
}

/**
 * Calcule les statistiques hebdomadaires
 */
export function calculateWeeklyStats(sessions: Array<{ started_at: string; duration_seconds: number }>) {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const weekSessions = sessions.filter(s => new Date(s.started_at) >= weekAgo);

    const totalTime = weekSessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0);
    const totalSessions = weekSessions.length;
    const avgSessionTime = totalSessions > 0 ? totalTime / totalSessions : 0;

    // Grouper par jour
    const byDay: Record<string, number> = {};
    weekSessions.forEach(s => {
        const day = new Date(s.started_at).toLocaleDateString('fr-FR', { weekday: 'short' });
        byDay[day] = (byDay[day] || 0) + (s.duration_seconds || 0);
    });

    return {
        totalTime,
        totalSessions,
        avgSessionTime,
        byDay,
    };
}
