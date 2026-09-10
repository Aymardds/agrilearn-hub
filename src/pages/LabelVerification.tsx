import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import IncubationBadge, { LabelData } from "@/components/incubation/IncubationBadge";
import { Loader2, Shield, XCircle } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function LabelVerification() {
  const { code } = useParams<{ code: string }>();
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState<(LabelData & { startup_name: string }) | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [revoked, setRevoked] = useState(false);

  useEffect(() => {
    if (!code) return;
    const fetchLabel = async () => {
      const { data, error } = await supabase
        .from("incubation_labels" as any)
        .select("*, startup_profiles(name)")
        .eq("verification_code", code)
        .single();

      if (error || !data) {
        setNotFound(true);
      } else {
        const d = data as any;
        if (d.is_revoked) {
          setRevoked(true);
        } else {
          setLabel({
            id: d.id,
            label_number: d.label_number,
            issued_at: d.issued_at,
            startup_name: d.startup_profiles?.name || "Start-up",
            average_jury_score: d.average_jury_score,
            verification_code: d.verification_code,
            pdf_url: d.pdf_url,
          });
        }
      }
      setLoading(false);
    };
    fetchLabel();
  }, [code]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-background to-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-green-600 rounded-full flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/30">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black">Vérification de label</h1>
          <p className="text-sm text-muted-foreground">Système de vérification sécurisé GrainoLab</p>
        </div>

        {loading && (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
          </div>
        )}

        {notFound && !loading && (
          <Card className="border-2 border-red-200 bg-red-50">
            <CardContent className="py-8 text-center space-y-3">
              <XCircle className="w-12 h-12 text-red-500 mx-auto" />
              <h2 className="text-lg font-bold text-red-800">Label introuvable</h2>
              <p className="text-sm text-red-600">Ce code de vérification ne correspond à aucun label GrainoLab. Il est possible que le code soit incorrect ou que le label n'existe pas.</p>
              <Badge className="bg-red-100 text-red-700 border-red-200">❌ Non valide</Badge>
            </CardContent>
          </Card>
        )}

        {revoked && !loading && (
          <Card className="border-2 border-orange-200 bg-orange-50">
            <CardContent className="py-8 text-center space-y-3">
              <XCircle className="w-12 h-12 text-orange-500 mx-auto" />
              <h2 className="text-lg font-bold text-orange-800">Label révoqué</h2>
              <p className="text-sm text-orange-600">Ce label a été révoqué par GrainoLab. Il n'est plus valide.</p>
              <Badge className="bg-orange-100 text-orange-700 border-orange-200">⚠️ Révoqué</Badge>
            </CardContent>
          </Card>
        )}

        {label && !loading && (
          <div className="space-y-4">
            <div className="flex items-center justify-center">
              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 px-4 py-1.5 text-sm font-semibold gap-2">
                ✅ Label authentique et valide
              </Badge>
            </div>
            <IncubationBadge label={label} />
            <p className="text-center text-xs text-muted-foreground">
              Vérifié le {format(new Date(), "dd MMMM yyyy à HH:mm", { locale: fr })} • Système GrainoLab
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
