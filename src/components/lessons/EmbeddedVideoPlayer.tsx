import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ExternalLink, AlertCircle, RefreshCw } from "lucide-react";
import VideoPlayer from "./VideoPlayer";
import { detectVideoPlatform, getEmbedUrl, isValidVideoUrl } from "@/lib/videoUtils";

interface EmbeddedVideoPlayerProps {
    videoUrl: string;
    title: string;
    onTimeUpdate?: (currentTime: number, duration: number) => void;
    onEnded?: () => void;
}

const EmbeddedVideoPlayer = ({ videoUrl, title, onTimeUpdate, onEnded }: EmbeddedVideoPlayerProps) => {
    const [hasError, setHasError] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Valider l'URL
    if (!isValidVideoUrl(videoUrl)) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    L'URL de la vidéo n'est pas valide. Veuillez contacter l'administrateur.
                </AlertDescription>
            </Alert>
        );
    }

    const platform = detectVideoPlatform(videoUrl);
    const embedUrl = getEmbedUrl(videoUrl);

    if (!embedUrl) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    Impossible de charger la vidéo. Format non supporté.
                </AlertDescription>
            </Alert>
        );
    }

    // Gérer les erreurs de chargement
    if (hasError) {
        return (
            <div className="space-y-4">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        Erreur lors du chargement de la vidéo. La vidéo peut être indisponible ou le lien peut être incorrect.
                    </AlertDescription>
                </Alert>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={() => {
                            setHasError(false);
                            setIsLoading(true);
                        }}
                    >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Réessayer
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => window.open(videoUrl, "_blank")}
                    >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Ouvrir dans un nouvel onglet
                    </Button>
                </div>
            </div>
        );
    }

    // Afficher le lecteur approprié selon la plateforme
    if (platform === 'youtube' || platform === 'vimeo' || platform === 'dailymotion') {
        return (
            <div className="relative">
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg z-10">
                        <div className="text-white">Chargement de la vidéo...</div>
                    </div>
                )}
                <div className="aspect-video bg-black rounded-lg overflow-hidden">
                    <iframe
                        src={embedUrl}
                        className="w-full h-full"
                        allowFullScreen
                        title={title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        onLoad={() => setIsLoading(false)}
                        onError={() => {
                            setHasError(true);
                            setIsLoading(false);
                        }}
                    />
                </div>
                <div className="mt-2 text-sm text-muted-foreground flex items-center gap-2">
                    <span>Source: {platform.charAt(0).toUpperCase() + platform.slice(1)}</span>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(videoUrl, "_blank")}
                        className="h-auto p-0 hover:bg-transparent"
                    >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        Ouvrir dans un nouvel onglet
                    </Button>
                </div>
            </div>
        );
    }

    // Pour les vidéos directes (MP4, etc.)
    if (platform === 'direct') {
        return (
            <div className="space-y-2">
                <VideoPlayer
                    src={embedUrl}
                    title={title}
                    onTimeUpdate={onTimeUpdate}
                    onEnded={onEnded}
                    onError={() => {
                        setHasError(true);
                        setIsLoading(false);
                    }}
                />
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <span>Vidéo hébergée directement</span>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(videoUrl, "_blank")}
                        className="h-auto p-0 hover:bg-transparent"
                    >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        Télécharger
                    </Button>
                </div>
            </div>
        );
    }

    // Fallback pour les plateformes non reconnues
    return (
        <div className="space-y-4">
            <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    Cette plateforme vidéo n'est pas directement supportée. Cliquez sur le bouton ci-dessous pour ouvrir la vidéo dans un nouvel onglet.
                </AlertDescription>
            </Alert>
            <Button
                variant="outline"
                onClick={() => window.open(videoUrl, "_blank")}
                className="w-full"
            >
                <ExternalLink className="w-4 h-4 mr-2" />
                Ouvrir la vidéo dans un nouvel onglet
            </Button>
        </div>
    );
};

export default EmbeddedVideoPlayer;
