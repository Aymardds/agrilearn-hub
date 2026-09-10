import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Clock, Video, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { format, addDays, startOfWeek, isSameDay } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

export interface CoachingSession {
  id: string;
  scheduled_at: string;
  duration_min: number;
  topic?: string;
  status: "pending" | "confirmed" | "cancelled" | "completed";
  coach_name?: string;
  meeting_url?: string;
  rating?: number;
}

interface CoachingCalendarProps {
  sessions: CoachingSession[];
  onBook?: (data: { scheduled_at: string; topic: string; duration_min: number }) => void;
  isLoading?: boolean;
}

const STATUS_CONFIG = {
  pending: { label: "En attente", icon: AlertCircle, color: "bg-amber-100 text-amber-700" },
  confirmed: { label: "Confirmé", icon: CheckCircle2, color: "bg-emerald-100 text-emerald-700" },
  cancelled: { label: "Annulé", icon: XCircle, color: "bg-red-100 text-red-700" },
  completed: { label: "Terminé", icon: CheckCircle2, color: "bg-gray-100 text-gray-700" },
};

// Créneaux disponibles simulés (9h-17h, lundi-vendredi)
function getAvailableSlots(baseDate: Date): Date[] {
  const slots: Date[] = [];
  for (let d = 0; d < 7; d++) {
    const day = addDays(baseDate, d);
    const dayOfWeek = day.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue; // pas weekend
    for (const hour of [9, 10, 11, 14, 15, 16]) {
      const slot = new Date(day);
      slot.setHours(hour, 0, 0, 0);
      slots.push(slot);
    }
  }
  return slots;
}

export default function CoachingCalendar({ sessions, onBook, isLoading }: CoachingCalendarProps) {
  const [showForm, setShowForm] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Date | null>(null);
  const [topic, setTopic] = useState("");
  const [duration, setDuration] = useState("60");

  const today = startOfWeek(new Date(), { weekStartsOn: 1 });
  const availableSlots = getAvailableSlots(today);

  const isSlotBooked = (slot: Date) =>
    sessions.some(s => isSameDay(new Date(s.scheduled_at), slot) && new Date(s.scheduled_at).getHours() === slot.getHours() && s.status !== "cancelled");

  const handleBook = () => {
    if (!selectedSlot) return;
    onBook?.({
      scheduled_at: selectedSlot.toISOString(),
      topic,
      duration_min: parseInt(duration),
    });
    setShowForm(false);
    setSelectedSlot(null);
    setTopic("");
  };

  return (
    <div className="space-y-6">
      {/* Sessions à venir */}
      <div className="space-y-3">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Sessions planifiées</h3>
        {sessions.filter(s => s.status !== "cancelled").length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Aucune session planifiée. Réservez votre première session de coaching.</p>
        ) : (
          sessions.filter(s => new Date(s.scheduled_at) >= new Date()).map(session => {
            const config = STATUS_CONFIG[session.status];
            const Icon = config.icon;
            return (
              <Card key={session.id} className="border">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-2.5 bg-emerald-100 rounded-lg">
                    <Calendar className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{session.topic || "Session de coaching"}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <Clock className="w-3 h-3" />
                      {format(new Date(session.scheduled_at), "EEEE d MMMM yyyy 'à' HH'h'mm", { locale: fr })}
                      <span>• {session.duration_min} min</span>
                    </div>
                    {session.coach_name && <p className="text-xs text-muted-foreground">Coach: {session.coach_name}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge className={cn("text-xs", config.color)}>
                      <Icon className="w-3 h-3 mr-1" />{config.label}
                    </Badge>
                    {session.meeting_url && session.status === "confirmed" && (
                      <a href={session.meeting_url} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="outline" className="text-xs h-7 gap-1">
                          <Video className="w-3 h-3" /> Rejoindre
                        </Button>
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Booking */}
      {!showForm ? (
        <Button onClick={() => setShowForm(true)} className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700">
          <Calendar className="w-4 h-4" /> Réserver une session de coaching
        </Button>
      ) : (
        <Card className="border-2 border-emerald-300">
          <CardHeader><CardTitle className="text-base">Choisir un créneau</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {/* Grille créneaux */}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {availableSlots.map(slot => {
                const booked = isSlotBooked(slot);
                const selected = selectedSlot && isSameDay(slot, selectedSlot) && slot.getHours() === selectedSlot.getHours();
                return (
                  <Button
                    key={slot.toISOString()}
                    variant="outline"
                    size="sm"
                    disabled={booked}
                    onClick={() => setSelectedSlot(slot)}
                    className={cn(
                      "h-auto flex flex-col p-2 text-xs",
                      selected && "border-emerald-500 bg-emerald-50 text-emerald-700",
                      booked && "opacity-40 cursor-not-allowed"
                    )}
                  >
                    <span className="font-semibold">{format(slot, "EEE", { locale: fr })}</span>
                    <span>{format(slot, "dd/MM")}</span>
                    <span className="text-muted-foreground">{format(slot, "HH'h'")}</span>
                  </Button>
                );
              })}
            </div>

            {selectedSlot && (
              <div className="space-y-3 pt-2 border-t">
                <div className="space-y-1.5">
                  <Label>Sujet de la session</Label>
                  <Input placeholder="ex: Stratégie go-to-market, Levée de fonds..." value={topic} onChange={e => setTopic(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Durée</Label>
                  <select value={duration} onChange={e => setDuration(e.target.value)} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                    <option value="30">30 minutes</option>
                    <option value="60">1 heure</option>
                    <option value="90">1h30</option>
                  </select>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setShowForm(false); setSelectedSlot(null); }} className="flex-1">Annuler</Button>
              <Button
                onClick={handleBook}
                disabled={!selectedSlot || !topic || isLoading}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                {isLoading ? "Réservation..." : "Confirmer la réservation"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
