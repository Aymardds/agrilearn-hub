/**
 * Utilitaires pour gérer les URLs de vidéos
 */

/**
 * Extrait l'ID d'une vidéo YouTube depuis différents formats d'URL
 */
export const getYouTubeVideoId = (url: string): string | null => {
    if (!url) return null;

    // Patterns pour différents formats d'URL YouTube
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
        /youtube\.com\/embed\/([^&\n?#]+)/,
        /youtube\.com\/v\/([^&\n?#]+)/,
        /youtube\.com\/shorts\/([^&\n?#]+)/,
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
            return match[1];
        }
    }

    return null;
};

/**
 * Convertit une URL YouTube en URL embed
 */
export const getYouTubeEmbedUrl = (url: string): string | null => {
    const videoId = getYouTubeVideoId(url);
    if (!videoId) return null;

    return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&showinfo=0`;
};

/**
 * Extrait l'ID d'une vidéo Vimeo
 */
export const getVimeoVideoId = (url: string): string | null => {
    if (!url) return null;

    const patterns = [
        /vimeo\.com\/(\d+)/,
        /player\.vimeo\.com\/video\/(\d+)/,
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
            return match[1];
        }
    }

    return null;
};

/**
 * Convertit une URL Vimeo en URL embed
 */
export const getVimeoEmbedUrl = (url: string): string | null => {
    const videoId = getVimeoVideoId(url);
    if (!videoId) return null;

    return `https://player.vimeo.com/video/${videoId}?title=0&byline=0&portrait=0`;
};

/**
 * Extrait l'ID d'une vidéo Dailymotion
 */
export const getDailymotionVideoId = (url: string): string | null => {
    if (!url) return null;

    const patterns = [
        /dailymotion\.com\/video\/([^_\n?#]+)/,
        /dai\.ly\/([^_\n?#]+)/,
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
            return match[1];
        }
    }

    return null;
};

/**
 * Convertit une URL Dailymotion en URL embed
 */
export const getDailymotionEmbedUrl = (url: string): string | null => {
    const videoId = getDailymotionVideoId(url);
    if (!videoId) return null;

    return `https://www.dailymotion.com/embed/video/${videoId}`;
};

/**
 * Détecte le type de plateforme vidéo
 */
export type VideoPlatform = 'youtube' | 'vimeo' | 'dailymotion' | 'direct' | 'unknown';

export const detectVideoPlatform = (url: string): VideoPlatform => {
    if (!url) return 'unknown';

    if (url.includes('youtube.com') || url.includes('youtu.be')) {
        return 'youtube';
    }
    if (url.includes('vimeo.com')) {
        return 'vimeo';
    }
    if (url.includes('dailymotion.com') || url.includes('dai.ly')) {
        return 'dailymotion';
    }

    // Vérifier si c'est une URL Supabase Storage
    if (url.includes('/storage/v1/object/public/')) {
        return 'direct';
    }

    // Vérifier si c'est une URL directe vers un fichier vidéo
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv'];
    if (videoExtensions.some(ext => url.toLowerCase().includes(ext))) {
        return 'direct';
    }

    return 'unknown';
};

/**
 * Convertit n'importe quelle URL vidéo en URL embed appropriée
 */
export const getEmbedUrl = (url: string): string | null => {
    if (!url) return null;

    const platform = detectVideoPlatform(url);

    switch (platform) {
        case 'youtube':
            return getYouTubeEmbedUrl(url);
        case 'vimeo':
            return getVimeoEmbedUrl(url);
        case 'dailymotion':
            return getDailymotionEmbedUrl(url);
        case 'direct':
            return url; // Retourner l'URL directe telle quelle
        default:
            return url; // Retourner l'URL originale si non reconnue
    }
};

/**
 * Vérifie si une URL est une URL embed valide
 */
export const isEmbedUrl = (url: string): boolean => {
    if (!url) return false;

    const embedPatterns = [
        /youtube\.com\/embed\//,
        /player\.vimeo\.com\/video\//,
        /dailymotion\.com\/embed\//,
    ];

    return embedPatterns.some(pattern => pattern.test(url));
};

/**
 * Valide une URL vidéo
 */
export const isValidVideoUrl = (url: string): boolean => {
    if (!url) return false;

    try {
        new URL(url);
        const platform = detectVideoPlatform(url);
        return platform !== 'unknown';
    } catch {
        return false;
    }
};
