import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, ExternalLink, Shield, CheckCircle2, QrCode } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export interface LabelData {
  id: string;
  label_number: string;
  issued_at: string;
  startup_name: string;
  average_jury_score?: number;
  verification_code: string;
  pdf_url?: string;
}

interface IncubationBadgeProps {
  label: LabelData;
  onDownload?: () => void;
  compact?: boolean;
}

export default function IncubationBadge({ label, onDownload, compact }: IncubationBadgeProps) {
  const verificationUrl = `${window.location.origin}/verify-label/${label.verification_code}`;

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-xl">
        <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-500 rounded-full flex items-center justify-center shadow-lg">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-emerald-800">GrainoLab Certifié</p>
          <p className="text-xs text-emerald-600">{label.label_number} • {format(new Date(label.issued_at), "dd MMM yyyy", { locale: fr })}</p>
        </div>
        <Badge className="bg-emerald-500 text-white text-xs">
          <CheckCircle2 className="w-3 h-3 mr-1" /> Certifié
        </Badge>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      {/* Badge visuel principal */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-green-600 to-teal-700 p-8 text-white shadow-2xl shadow-emerald-500/30">
        {/* Décorations */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-16 translate-x-16" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12" />

        {/* Logo / Icône */}
        <div className="flex justify-center mb-4">
          <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center ring-4 ring-white/30">
            <Shield className="w-10 h-10 text-white" />
          </div>
        </div>

        {/* Texte principal */}
        <div className="text-center space-y-1">
          <p className="text-white/70 text-sm font-medium uppercase tracking-widest">Certifié par</p>
          <h2 className="text-3xl font-black">GrainoLab</h2>
          <p className="text-white/80 text-lg font-semibold">{label.startup_name}</p>
        </div>

        {/* Divider */}
        <div className="my-5 border-t border-white/20" />

        {/* Métadonnées */}
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <p className="text-white/60 text-xs uppercase tracking-wide">Numéro</p>
            <p className="font-bold text-sm mt-0.5">{label.label_number}</p>
          </div>
          <div>
            <p className="text-white/60 text-xs uppercase tracking-wide">Délivré le</p>
            <p className="font-bold text-sm mt-0.5">
              {format(new Date(label.issued_at), "dd MMM yyyy", { locale: fr })}
            </p>
          </div>
          {label.average_jury_score && (
            <div className="col-span-2">
              <p className="text-white/60 text-xs uppercase tracking-wide">Score jury moyen</p>
              <p className="font-black text-2xl mt-0.5">{label.average_jury_score}<span className="text-sm text-white/70">/100</span></p>
            </div>
          )}
        </div>

        {/* Bande vérification */}
        <div className="mt-5 bg-white/15 rounded-lg px-3 py-2 flex items-center gap-2">
          <QrCode className="w-4 h-4 flex-shrink-0 text-white/80" />
          <p className="text-xs text-white/80 font-mono truncate">{label.verification_code}</p>
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-300" />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 mt-4">
        {label.pdf_url && (
          <Button onClick={onDownload} className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700">
            <Download className="w-4 h-4" /> Télécharger PDF
          </Button>
        )}
        <Button
          variant="outline"
          onClick={() => window.open(verificationUrl, "_blank")}
          className="flex-1 gap-2"
        >
          <ExternalLink className="w-4 h-4" /> Vérifier en ligne
        </Button>
      </div>

      {/* Lien de vérification */}
      <div className="mt-3 p-3 bg-muted rounded-lg">
        <p className="text-xs text-muted-foreground font-medium mb-1">🔗 URL de vérification publique :</p>
        <p className="text-xs font-mono text-foreground break-all">{verificationUrl}</p>
      </div>
    </div>
  );
}
