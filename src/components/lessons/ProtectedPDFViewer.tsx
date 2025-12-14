import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Download, Lock, Eye, ZoomIn, ZoomOut, RotateCw, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ProtectedPDFViewerProps {
  pdfUrl: string;
  title: string;
  userId: string;
  lessonId: string;
}

const ProtectedPDFViewer = ({ pdfUrl, title, userId, lessonId }: ProtectedPDFViewerProps) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [accessGranted, setAccessGranted] = useState(false);

  useEffect(() => {
    // Vérifier l'accès à la leçon
    const checkAccess = async () => {
      try {
        // Vérifier si l'utilisateur est inscrit au cours
        const { data: enrollments, error: enrollError } = await supabase
          .from("enrollments")
          .select("course_id")
          .eq("user_id", userId);

        if (enrollError) throw enrollError;

        if (!enrollments || enrollments.length === 0) {
          setError("Vous devez être inscrit au cours pour accéder à ce document");
          setLoading(false);
          return;
        }

        // Vérifier si la leçon est accessible
        const { data: lesson, error: lessonError } = await supabase
          .from("lessons")
          .select("module_id, modules(course_id)")
          .eq("id", lessonId)
          .single();

        if (lessonError) throw lessonError;

        if (!lesson) {
          setError("Leçon non trouvée");
          setLoading(false);
          return;
        }

        const hasAccess = enrollments.some(
          (e) => e.course_id === (lesson.modules as any)?.course_id
        );

        if (!hasAccess) {
          setError("Accès non autorisé à ce document");
          setLoading(false);
          return;
        }

        setAccessGranted(true);
        setLoading(false);
      } catch (err: any) {
        setError(err.message || "Erreur lors de la vérification d'accès");
        setLoading(false);
      }
    };

    checkAccess();
  }, [userId, lessonId]);

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 10, 200));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 10, 50));
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleDownload = () => {
    toast.error("Le téléchargement est désactivé pour protéger le contenu");
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-12">
            <Progress className="w-full max-w-xs mb-4" />
            <p className="text-muted-foreground">Chargement du document...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !accessGranted) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Alert variant="destructive">
            <Lock className="h-4 w-4" />
            <AlertDescription>{error || "Accès non autorisé"}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-4 p-3 bg-muted rounded-lg">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-muted-foreground" />
            <span className="font-medium">{title}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomOut}
              disabled={zoom <= 50}
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium w-16 text-center">{zoom}%</span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomIn}
              disabled={zoom >= 200}
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleRotate}>
              <RotateCw className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="cursor-not-allowed opacity-50"
            >
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* PDF Viewer */}
        <div className="border rounded-lg overflow-hidden bg-gray-100" style={{ height: "700px" }}>
          <div
            style={{
              transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
              transformOrigin: "top left",
              width: `${100 / (zoom / 100)}%`,
              height: `${100 / (zoom / 100)}%`,
            }}
          >
            <iframe
              ref={iframeRef}
              src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
              className="w-full h-full"
              title={title}
              style={{
                pointerEvents: "auto",
              }}
            />
          </div>
        </div>

        {/* Protection Notice */}
        <Alert className="mt-4">
          <Eye className="h-4 w-4" />
          <AlertDescription>
            Ce document est protégé. Le téléchargement et l'impression sont désactivés pour protéger
            le contenu. Vous pouvez uniquement le consulter en ligne.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default ProtectedPDFViewer;

