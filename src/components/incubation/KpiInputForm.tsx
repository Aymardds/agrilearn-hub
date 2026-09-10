import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Users, RefreshCw, Cpu, Save, AlertCircle } from "lucide-react";
import { format, startOfMonth } from "date-fns";
import { fr } from "date-fns/locale";

export interface KpiFormData {
  report_month: string;
  revenue: number;
  revenue_target?: number;
  active_users: number;
  active_users_target?: number;
  retention_rate: number;
  retention_rate_target?: number;
  prototype_progress: number;
  notes?: string;
}

interface KpiInputFormProps {
  onSubmit: (data: KpiFormData) => void;
  isLoading?: boolean;
  defaultMonth?: Date;
  previousKpi?: Partial<KpiFormData>;
}

const FIELDS = [
  { key: "revenue", label: "Chiffre d'affaires (€)", icon: TrendingUp, color: "text-emerald-600", placeholder: "ex: 12500", targetKey: "revenue_target", suffix: "€", type: "number" },
  { key: "active_users", label: "Utilisateurs actifs", icon: Users, color: "text-blue-600", placeholder: "ex: 340", targetKey: "active_users_target", suffix: "", type: "number" },
  { key: "retention_rate", label: "Taux de rétention (%)", icon: RefreshCw, color: "text-purple-600", placeholder: "ex: 68.5", targetKey: "retention_rate_target", suffix: "%", type: "number" },
  { key: "prototype_progress", label: "Avancement prototype (%)", icon: Cpu, color: "text-orange-600", placeholder: "0 à 100", targetKey: null, suffix: "%", type: "range" },
];

export default function KpiInputForm({ onSubmit, isLoading, defaultMonth, previousKpi }: KpiInputFormProps) {
  const month = defaultMonth || startOfMonth(new Date());
  const [values, setValues] = useState<Record<string, string>>({
    revenue: previousKpi?.revenue?.toString() || "",
    revenue_target: previousKpi?.revenue_target?.toString() || "",
    active_users: previousKpi?.active_users?.toString() || "",
    active_users_target: previousKpi?.active_users_target?.toString() || "",
    retention_rate: previousKpi?.retention_rate?.toString() || "",
    retention_rate_target: previousKpi?.retention_rate_target?.toString() || "",
    prototype_progress: previousKpi?.prototype_progress?.toString() || "0",
    notes: previousKpi?.notes || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      report_month: format(month, "yyyy-MM-01"),
      revenue: parseFloat(values.revenue) || 0,
      revenue_target: parseFloat(values.revenue_target) || undefined,
      active_users: parseInt(values.active_users) || 0,
      active_users_target: parseInt(values.active_users_target) || undefined,
      retention_rate: parseFloat(values.retention_rate) || 0,
      retention_rate_target: parseFloat(values.retention_rate_target) || undefined,
      prototype_progress: parseInt(values.prototype_progress) || 0,
      notes: values.notes,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold">Rapport KPI mensuel</h3>
          <p className="text-sm text-muted-foreground capitalize">
            {format(month, "MMMM yyyy", { locale: fr })}
          </p>
        </div>
        <Badge variant="outline" className="border-amber-400 text-amber-700 bg-amber-50">
          <AlertCircle className="w-3 h-3 mr-1" /> Saisie obligatoire
        </Badge>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {FIELDS.map(field => {
          const Icon = field.icon;
          return (
            <Card key={field.key} className="border-2 hover:border-emerald-300 transition-colors">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${field.color}`} />
                  {field.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-2">
                {field.type === "range" ? (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Avancement</span>
                      <span className="font-bold text-orange-600">{values[field.key]}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={values[field.key]}
                      onChange={e => setValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                      className="w-full accent-orange-500"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>0%</span><span>50%</span><span>100%</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="relative">
                      <Input
                        type="number"
                        placeholder={field.placeholder}
                        value={values[field.key]}
                        onChange={e => setValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                        className="pr-8"
                        step="any"
                        min={0}
                      />
                      {field.suffix && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{field.suffix}</span>
                      )}
                    </div>
                    {field.targetKey && (
                      <div className="relative">
                        <Input
                          type="number"
                          placeholder={`Objectif${field.suffix ? " (" + field.suffix + ")" : ""}`}
                          value={values[field.targetKey]}
                          onChange={e => setValues(prev => ({ ...prev, [field.targetKey!]: e.target.value }))}
                          className="pr-8 border-dashed"
                          step="any"
                          min={0}
                        />
                        {field.suffix && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{field.suffix}</span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label>Notes et commentaires (optionnel)</Label>
        <Textarea
          placeholder="Points importants du mois, blocages, opportunités..."
          value={values.notes}
          onChange={e => setValues(prev => ({ ...prev, notes: e.target.value }))}
          className="resize-none min-h-20"
        />
      </div>

      <Button type="submit" disabled={isLoading} className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 h-12">
        <Save className="w-4 h-4" />
        {isLoading ? "Enregistrement..." : "Soumettre le rapport mensuel"}
      </Button>
    </form>
  );
}
