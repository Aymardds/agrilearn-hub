import { useSearchParams, useNavigate } from "react-router-dom";
import { Calendar } from "@/components/ui/calendar";
import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, BookOpen, TrendingUp, Calendar as CalendarIcon } from "lucide-react";

const CalendarPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const startParam = searchParams.get("start");
  const endParam = searchParams.get("end");
  const range = React.useMemo(() => {
    const from = startParam ? new Date(`${startParam}T00:00:00`) : undefined;
    const to = endParam ? new Date(`${endParam}T00:00:00`) : undefined;
    return { from, to };
  }, [startParam, endParam]);

  const { data: courses } = useQuery({
    queryKey: ["calendar-courses", startParam, endParam],
    queryFn: async () => {
      const sortList = (list: any[]) => {
        const now = new Date();
        const score = (c: any) => {
          const ps = c.period_start ? new Date(c.period_start) : null;
          const pe = c.period_end ? new Date(c.period_end) : null;
          if (ps && pe) {
            if (now < ps) return 2;
            if (now >= ps && now <= pe) return 3;
            return 1;
          }
          return 0;
        };
        return [...(list || [])].sort((a, b) => {
          const sb = score(b) - score(a);
          if (sb !== 0) return sb;
          const ad = a.created_at ? new Date(a.created_at).getTime() : 0;
          const bd = b.created_at ? new Date(b.created_at).getTime() : 0;
          return bd - ad;
        });
      };
      // Try query using period_* columns, fallback to created_at when columns are missing
      const base = supabase
        .from("courses")
        .select(`
          *,
          categories(name, icon),
          enrollments(count)
        `)
        .eq("is_published", true)
        .eq("is_approved", true)
        .order("created_at", { ascending: false });

      try {
        let q = base;
        if (startParam) q = q.or(`period_start.gte.${startParam}T00:00:00,created_at.gte.${startParam}T00:00:00`);
        if (endParam) q = q.or(`period_end.lte.${endParam}T23:59:59,created_at.lte.${endParam}T23:59:59`);
        const { data, error } = await q;
        if (error) throw error;
        return sortList(data || []);
      } catch (e: any) {
        const msg = String(e?.message || "");
        if (msg.includes("period_start") || msg.includes("period_end")) {
          let q = base;
          if (startParam) q = q.gte("created_at", `${startParam}T00:00:00`);
          if (endParam) q = q.lte("created_at", `${endParam}T23:59:59`);
          const { data, error } = await q;
          if (error) throw error;
          return sortList(data || []);
        }
        throw e;
      }
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Calendrier des cours</h1>
            <p className="text-muted-foreground">
              {startParam && endParam ? (
                <span>
                  Période sélectionnée: <strong>{startParam}</strong> → <strong>{endParam}</strong>
                </span>
              ) : (
                <span>
                  Sélectionnez une période pour filtrer les cours
                </span>
              )}
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate("/calendar")}>Réinitialiser</Button>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filtrer par calendrier</CardTitle>
            <CardDescription>Choisissez une plage de dates</CardDescription>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="range"
              selected={range}
              onSelect={(sel) => {
                if (sel?.from && sel?.to) {
                  const start = sel.from.toISOString().slice(0, 10);
                  const end = sel.to.toISOString().slice(0, 10);
                  setSearchParams({ start, end });
                }
              }}
              numberOfMonths={1}
            />
            <div className="mt-3 flex gap-2">
              <Button
                variant="outline"
                onClick={() => setSearchParams({})}
              >
                Effacer
              </Button>
            </div>
          </CardContent>
        </Card>

        {(!courses || courses.length === 0) && (
          <div className="text-center py-12">
            <CalendarIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Aucun cours sur cette période</h3>
            <p className="text-muted-foreground">Modifiez la plage de dates dans le menu latéral</p>
          </div>
        )}

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses?.map((course) => (
            <Card
              key={course.id}
              className="hover:shadow-lg transition-all cursor-pointer overflow-hidden"
              onClick={() => navigate(`/courses/${course.id}`)}
            >
              {course.thumbnail_url && (
                <img
                  src={course.thumbnail_url}
                  alt={course.title}
                  className="h-40 w-full object-cover"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='640' height='160'%3E%3Crect width='100%25' height='100%25' fill='%23ddd'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23666' font-size='16'%3EImage indisponible%3C/text%3E%3C/svg%3E";
                  }}
                />
              )}
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {course.categories?.icon} {course.categories?.name || "Non catégorisé"}
                    </Badge>
                    {(() => {
                      const ps = course.period_start ? new Date(course.period_start) : null;
                      const pe = course.period_end ? new Date(course.period_end) : null;
                      const now = new Date();
                      let label: string | null = null;
                      let variant: "default" | "outline" | "secondary" = "secondary";
                      if (ps && pe) {
                        if (now < ps) { label = "À venir"; variant = "secondary"; }
                        else if (now >= ps && now <= pe) { label = "En cours"; variant = "default"; }
                        else { label = "Terminé"; variant = "outline"; }
                      }
                      return label ? <Badge variant={variant}>{label}</Badge> : null;
                    })()}
                  </div>
                </div>
                <CardTitle className="line-clamp-2">{course.title}</CardTitle>
                <CardDescription className="line-clamp-3">{course.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>{course.enrollments?.[0]?.count || 0} inscrits</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <BookOpen className="w-4 h-4" />
                    <span className="truncate max-w-[100px]">{course.instructor_id || "Formateur"}</span>
                  </div>
                </div>
                {course.period_start && course.period_end && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    Période: {new Date(course.period_start).toLocaleDateString("fr-FR")} → {new Date(course.period_end).toLocaleDateString("fr-FR")}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
};

export default CalendarPage;