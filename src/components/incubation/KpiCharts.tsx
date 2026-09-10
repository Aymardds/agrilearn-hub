import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from "recharts";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { TrendingUp, Users, RefreshCw, Cpu } from "lucide-react";

interface KpiDataPoint {
  report_month: string;
  revenue: number;
  revenue_target?: number;
  active_users: number;
  active_users_target?: number;
  retention_rate: number;
  prototype_progress: number;
}

interface KpiChartsProps {
  data: KpiDataPoint[];
}

const formatMonth = (date: string) => format(new Date(date), "MMM yy", { locale: fr });

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border rounded-lg shadow-lg p-3 text-sm">
        <p className="font-semibold mb-1">{formatMonth(label)}</p>
        {payload.map((entry: any) => (
          <p key={entry.name} style={{ color: entry.color }}>
            {entry.name}: <span className="font-bold">{entry.value?.toLocaleString("fr-FR")}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function KpiCharts({ data }: KpiChartsProps) {
  if (!data.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>Aucun rapport KPI disponible. Soumettez votre premier rapport mensuel.</p>
      </div>
    );
  }

  const chartData = data.map(d => ({
    ...d,
    month: d.report_month,
  }));

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Chiffre d'affaires */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            Chiffre d'affaires (€)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tickFormatter={formatMonth} tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="revenue" stroke="#10b981" fill="url(#revenueGrad)" strokeWidth={2} name="CA réel" />
              {data.some(d => d.revenue_target) && (
                <Area type="monotone" dataKey="revenue_target" stroke="#d1fae5" strokeDasharray="5 5" fill="none" strokeWidth={1.5} name="Objectif" />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Utilisateurs actifs */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" />
            Utilisateurs actifs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tickFormatter={formatMonth} tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="active_users" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Utilisateurs" />
              {data.some(d => d.active_users_target) && (
                <Bar dataKey="active_users_target" fill="#dbeafe" radius={[4, 4, 0, 0]} name="Objectif" />
              )}
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Taux de rétention */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-purple-600" />
            Taux de rétention (%)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="retentionGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tickFormatter={formatMonth} tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={v => `${v}%`} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={70} stroke="#d1d5db" strokeDasharray="4 4" label={{ value: "70% cible", position: "insideRight", fontSize: 10 }} />
              <Area type="monotone" dataKey="retention_rate" stroke="#8b5cf6" fill="url(#retentionGrad)" strokeWidth={2} name="Rétention" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Avancement prototype */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Cpu className="w-4 h-4 text-orange-600" />
            Avancement prototype (%)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="protoGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tickFormatter={formatMonth} tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={v => `${v}%`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="prototype_progress" stroke="#f97316" fill="url(#protoGrad)" strokeWidth={2} name="Prototype" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
