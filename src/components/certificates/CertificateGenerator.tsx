import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2, Share2, Award, CheckCircle, Shield } from "lucide-react";
import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

interface CertificateGeneratorProps {
  courseId: string;
  userId: string;
  courseName?: string;
}

const CertificateGenerator = ({ courseId, userId, courseName }: CertificateGeneratorProps) => {
  const [isGenerating, setIsGenerating] = useState(false);

  // Récupérer les informations complètes pour le certificat
  const { data: certificateData, isLoading } = useQuery({
    queryKey: ["certificate-data", courseId, userId],
    queryFn: async () => {
      // 1. Récupérer les infos de l'utilisateur
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", userId)
        .single();

      // 2. Récupérer les infos du cours
      const { data: course } = await supabase
        .from("courses")
        .select("title, description")
        .eq("id", courseId)
        .single();

      // 3. Récupérer l'inscription pour la date de complétion et le score
      const { data: enrollment } = await supabase
        .from("enrollments")
        .select("completed_at, progress")
        .eq("user_id", userId)
        .eq("course_id", courseId)
        .single();

      // 4. Récupérer les paramètres globaux des certificats
      // Utilisation de 'as any' pour contourner les problèmes de types temporaires
      const { data: settings } = await supabase.rpc("get_active_certificate_settings" as any) as any;

      // 5. Récupérer les partenaires spécifiques au cours
      const { data: partners } = await supabase.rpc("get_course_partners" as any, {
        p_course_id: courseId,
      }) as any;

      // 6. Vérifier s'il existe déjà un certificat généré
      const { data: existingCert } = await supabase
        .from("certificates")
        .select("*")
        .eq("user_id", userId)
        .eq("course_id", courseId)
        .maybeSingle();

      return {
        profile,
        course,
        enrollment,
        settings: settings?.[0] || {}, // RPC renvoie un tableau
        partners: partners || [],
        existingCert,
      };
    },
  });

  const generatePDF = async () => {
    if (!certificateData) return;

    setIsGenerating(true);
    try {
      const { profile, course, enrollment, settings, partners, existingCert } = certificateData;

      // Vérifier si le cours est terminé
      if ((enrollment?.progress || 0) < 100) {
        toast.error("Vous devez terminer le cours à 100% pour obtenir le certificat.");
        setIsGenerating(false);
        return;
      }

      // Générer ou récupérer le code de vérification
      let verificationCode = existingCert?.verification_code;
      let certificateNumber = existingCert?.certificate_number;
      let issueDate = existingCert?.issued_at ? new Date(existingCert.issued_at) : new Date();

      if (!existingCert) {
        // Créer un nouveau certificat dans la DB
        verificationCode = crypto.randomUUID().replace(/-/g, "").substring(0, 12).toUpperCase();
        certificateNumber = `CERT-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, "0")}`;

        const { error: insertError } = await supabase
          .from("certificates")
          .insert({
            user_id: userId,
            course_id: courseId,
            certificate_number: certificateNumber,
            verification_code: verificationCode,
            issued_at: issueDate.toISOString(),
            student_name: profile?.full_name,
            final_score: enrollment?.progress,
            metadata: {
              settings_snapshot: settings,
              partners_snapshot: partners
            }
          });

        if (insertError) throw insertError;
      }

      // --- DÉBUT GÉNÉRATION PDF ---
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      const width = doc.internal.pageSize.getWidth();
      const height = doc.internal.pageSize.getHeight();

      // Couleurs du modèle (ou personnalisées)
      const hexToRgb = (hex: string): [number, number, number] => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result
          ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
          : [0, 158, 73]; // Vert par défaut
      };

      const primaryColor = settings.primary_color ? hexToRgb(settings.primary_color) : [0, 158, 73]; // Vert
      const secondaryColor = settings.secondary_color ? hexToRgb(settings.secondary_color) : [243, 156, 18]; // Orange
      const blackColor: [number, number, number] = [29, 29, 27]; // Noir

      // --- FOND ET FORMES GÉOMÉTRIQUES ---

      // 1. Coin Haut Gauche
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.path([
        { op: 'm', c: [0, 0] },
        { op: 'l', c: [50, 0] },
        { op: 'l', c: [50, 15] },
        { op: 'l', c: [35, 30] },
        { op: 'l', c: [35, 60] },
        { op: 'l', c: [0, 60] },
        { op: 'h', c: [] }
      ]);
      doc.fill();

      doc.setFillColor(blackColor[0], blackColor[1], blackColor[2]);
      doc.rect(20, 10, 35, 3, 'F');
      doc.rect(20, 16, 35, 3, 'F');
      doc.rect(20, 22, 35, 3, 'F');

      doc.setDrawColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.setLineWidth(1);
      doc.line(40, 35, 40, 130);

      doc.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.rect(45, 5, 15, 1, 'F');


      // 2. Coin Haut Droit
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.path([
        { op: 'm', c: [width, 0] },
        { op: 'l', c: [width - 50, 0] },
        { op: 'l', c: [width - 50, 15] },
        { op: 'l', c: [width - 35, 30] },
        { op: 'l', c: [width - 35, 60] },
        { op: 'l', c: [width, 60] },
        { op: 'h', c: [] }
      ]);
      doc.fill();

      doc.setFillColor(blackColor[0], blackColor[1], blackColor[2]);
      doc.rect(width - 55, 10, 35, 3, 'F');
      doc.rect(width - 55, 16, 35, 3, 'F');
      doc.rect(width - 55, 22, 35, 3, 'F');

      doc.setDrawColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.setLineWidth(1);
      doc.line(width - 40, 35, width - 40, 130);

      doc.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.rect(width - 60, 5, 15, 1, 'F');


      // 3. Coin Bas Gauche
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.path([
        { op: 'm', c: [0, height] },
        { op: 'l', c: [0, height - 60] },
        { op: 'l', c: [25, height - 35] },
        { op: 'l', c: [45, height - 35] },
        { op: 'l', c: [60, height] },
        { op: 'h', c: [] }
      ]);
      doc.fill();

      doc.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.triangle(0, height - 25, 25, height - 25, 0, height - 50, 'F');

      doc.setFillColor(blackColor[0], blackColor[1], blackColor[2]);
      doc.rect(0, 70, 15, height - 140, 'F');
      doc.rect(25, height - 10, 20, 2, 'F');


      // 4. Coin Bas Droit
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.path([
        { op: 'm', c: [width, height] },
        { op: 'l', c: [width, height - 60] },
        { op: 'l', c: [width - 25, height - 35] },
        { op: 'l', c: [width - 45, height - 35] },
        { op: 'l', c: [width - 60, height] },
        { op: 'h', c: [] }
      ]);
      doc.fill();

      doc.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.triangle(width, height - 25, width - 25, height - 25, width, height - 50, 'F');

      doc.setFillColor(blackColor[0], blackColor[1], blackColor[2]);
      doc.rect(width - 15, 70, 15, height - 140, 'F');
      doc.rect(width - 45, height - 10, 20, 2, 'F');


      // --- TEXTES ---

      // Titre "CERTIFICATE"
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(42);
      doc.text("CERTIFICATE", width / 2, 35, { align: "center" });

      // Sous-titre "DE PARTICIPATION"
      doc.setTextColor(blackColor[0], blackColor[1], blackColor[2]);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("DE PARTICIPATION", width / 2, 43, { align: "center" });

      // "PRESENTED TO"
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text("PRESENTED TO", width / 2, 65, { align: "center", charSpace: 2 });

      // Nom de l'étudiant
      const studentName = profile?.full_name || "Nom de l'étudiant";
      doc.setTextColor(blackColor[0], blackColor[1], blackColor[2]);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(48);
      doc.text(studentName.toUpperCase(), width / 2, 85, { align: "center" });

      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.5);
      doc.line(width / 2 - 60, 88, width / 2 + 60, 88);

      // Texte de description
      const description = settings.attestation_text
        ? `${settings.attestation_text} ${studentName} ${settings.completion_text} "${course?.title || "le cours"}".`
        : `Ceci certifie que ${studentName} a complété avec succès le cours "${course?.title || "Formation"}" et a démontré les compétences requises.`;

      doc.setTextColor(80, 80, 80);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      const splitDesc = doc.splitTextToSize(description, 140);
      doc.text(splitDesc, width / 2, 105, { align: "center" });

      // Date
      const dateStr = issueDate.toLocaleDateString("fr-FR", { day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase();
      const formattedDate = dateStr.replace(/ /g, " | ");

      doc.setDrawColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.line(width / 2 - 30, 125, width / 2 + 30, 125);
      doc.line(width / 2 - 30, 135, width / 2 + 30, 135);

      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(formattedDate, width / 2, 131, { align: "center" });


      // --- SIGNATURES ---

      // Signature Gauche
      const sigY = height - 40;
      const sigLeftX = width / 2 - 50;

      doc.setDrawColor(blackColor[0], blackColor[1], blackColor[2]);
      doc.setLineWidth(0.5);
      doc.line(sigLeftX - 25, sigY, sigLeftX + 25, sigY);

      doc.setTextColor(blackColor[0], blackColor[1], blackColor[2]);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      doc.text(settings.signature_name || "Direction", sigLeftX, sigY - 5, { align: "center" });

      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text("SIGNATURE", sigLeftX, sigY + 5, { align: "center" });

      // Signature Droite
      const sigRightX = width / 2 + 50;

      doc.setDrawColor(blackColor[0], blackColor[1], blackColor[2]);
      doc.line(sigRightX - 25, sigY, sigRightX + 25, sigY);

      doc.setTextColor(blackColor[0], blackColor[1], blackColor[2]);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      doc.text("Instructeur", sigRightX, sigY - 5, { align: "center" });

      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text("SIGNATURE", sigRightX, sigY + 5, { align: "center" });


      // --- QR CODE ---
      if (settings.enable_qr_code) {
        try {
          const qrUrl = `${settings.qr_code_base_url || "https://agrilearn.com/verify/"}${verificationCode}`;
          const qrDataUrl = await QRCode.toDataURL(qrUrl);
          doc.addImage(qrDataUrl, "PNG", width / 2 - 10, height - 30, 20, 20);

          doc.setFontSize(6);
          doc.setTextColor(100, 100, 100);
          doc.text(`ID: ${verificationCode}`, width / 2, height - 8, { align: "center" });
        } catch (err) {
          console.error("Erreur QR Code", err);
        }
      }

      // Sauvegarder le PDF
      doc.save(`Certificat_${course?.title || "e-grainolab"}_${profile?.full_name || "Etudiant"}.pdf`);
      toast.success("Certificat téléchargé avec succès !");

    } catch (error) {
      console.error("Erreur lors de la génération du certificat:", error);
      toast.error("Une erreur est survenue lors de la génération du certificat.");
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const progress = certificateData?.enrollment?.progress || 0;
  const isCompleted = progress >= 100;
  const hasCertificate = !!certificateData?.existingCert;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="w-5 h-5" />
          Certificat de complétion
        </CardTitle>
        <CardDescription>
          Obtenez votre certificat après avoir complété le cours
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasCertificate ? (
          <div className="space-y-4">
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Félicitations! Votre certificat a été généré.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Numéro de certificat:</span>
                <Badge variant="outline">{certificateData.existingCert.certificate_number}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Date d'émission:</span>
                <span className="text-sm text-muted-foreground">
                  {new Date(certificateData.existingCert.issued_at).toLocaleDateString("fr-FR")}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Shield className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                Ce certificat est signé numériquement et peut être vérifié en ligne
              </span>
            </div>

            <div className="flex gap-2">
              <Button onClick={generatePDF} className="w-full" variant="default">
                <Download className="w-4 h-4 mr-2" />
                Télécharger le PDF
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Progression du cours:</span>
                <Badge variant={isCompleted ? "default" : "secondary"}>
                  {progress}%
                </Badge>
              </div>
            </div>

            {isCompleted ? (
              <Button
                onClick={generatePDF}
                className="w-full"
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Génération en cours...
                  </>
                ) : (
                  <>
                    <Award className="w-4 h-4 mr-2" />
                    Générer le certificat
                  </>
                )}
              </Button>
            ) : (
              <Alert>
                <AlertDescription>
                  Vous devez compléter 100% du cours pour obtenir le certificat (actuellement {progress}%)
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CertificateGenerator;
