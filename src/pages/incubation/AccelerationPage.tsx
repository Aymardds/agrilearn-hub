import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import CoachingCalendar, { CoachingSession } from "@/components/incubation/CoachingCalendar";
import IncubationChat, { ChatMessage } from "@/components/incubation/IncubationChat";
import { toast } from "sonner";
import { BookOpen, Calendar, MessageSquare, Cpu, Sparkles, ArrowRight, Loader2, ExternalLink } from "lucide-react";

const LMS_MODULES = [
  { id: 1, title: "Finance & Comptabilité", emoji: "💰", lessons: 8, desc: "Lecture de bilan, flux de trésorerie, levée de fonds", progress: 0, url: "/courses" },
  { id: 2, title: "Juridique & IP", emoji: "⚖️", lessons: 6, desc: "SAS, pacte actionnaires, propriété intellectuelle, RGPD", progress: 0, url: "/courses" },
  { id: 3, title: "Prototypage Fablab", emoji: "🔧", lessons: 5, desc: "Impression 3D, découpe laser, PCB, design industriel", progress: 0, url: "/courses" },
  { id: 4, title: "Marketing & Growth", emoji: "📈", lessons: 10, desc: "Product-Market Fit, acquisition, SEO, réseaux sociaux", progress: 0, url: "/courses" },
  { id: 5, title: "Pitch & Fundraising", emoji: "🎤", lessons: 7, desc: "Storytelling, pitch deck, due diligence, négociation", progress: 0, url: "/courses" },
  { id: 6, title: "Tech & Développement", emoji: "💻", lessons: 9, desc: "Architecture MVP, CI/CD, no-code, API integrations", progress: 0, url: "/courses" },
];

const FABLAB_MACHINES = [
  { name: "Imprimante 3D Prusa MK4", type: "impression_3d", location: "Atelier B - Station 1", available: true },
  { name: "Imprimante 3D Bambu Lab X1", type: "impression_3d", location: "Atelier B - Station 2", available: false },
  { name: "Découpe Laser Trotec Speedy", type: "decoupe_laser", location: "Atelier A - Station 1", available: true },
  { name: "CNC Shopbot", type: "fraiseuse", location: "Atelier A - Station 2", available: true },
];

export default function AccelerationPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [startupId, setStartupId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("Vous");
  const [sessions, setSessions] = useState<CoachingSession[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [bookingLoading, setBookingLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data: profile } = await supabase.from("profiles" as any).select("full_name").eq("id", user.id).single();
      if (profile) setUserName((profile as any).full_name || user.email || "Vous");

      const { data: sp } = await supabase.from("startup_profiles" as any).select("id").eq("user_id", user.id).single();
      if (sp) {
        setStartupId((sp as any).id);

        // Sessions de coaching
        const { data: bookings } = await supabase
          .from("coaching_bookings" as any)
          .select("*")
          .eq("startup_id", (sp as any).id)
          .order("scheduled_at", { ascending: true });
        if (bookings) setSessions(bookings as CoachingSession[]);

        // Messages
        const { data: msgs } = await supabase
          .from("incubation_messages" as any)
          .select("*")
          .eq("startup_id", (sp as any).id)
          .order("created_at", { ascending: true })
          .limit(100);
        if (msgs) setMessages(msgs as ChatMessage[]);

        // Realtime messages
        const channel = supabase
          .channel(`incubation_chat_${(sp as any).id}`)
          .on("postgres_changes", {
            event: "INSERT",
            schema: "public",
            table: "incubation_messages",
            filter: `startup_id=eq.${(sp as any).id}`,
          }, (payload) => {
            setMessages(prev => [...prev, payload.new as ChatMessage]);
          })
          .subscribe();

        return () => supabase.removeChannel(channel);
      }
      setLoading(false);
    };
    fetchData().then(() => setLoading(false));
  }, []);

  const handleBook = async (data: { scheduled_at: string; topic: string; duration_min: number }) => {
    if (!startupId) return;
    setBookingLoading(true);
    try {
      // Pour la démo, on utilise un coach fictif
      const { data: { user } } = await supabase.auth.getUser();

      // Chercher un coach assigné ou prendre le premier formateur
      const { data: coaches } = await supabase
        .from("user_roles" as any)
        .select("user_id")
        .eq("role", "formateur")
        .limit(1);

      const coachId = (coaches?.[0] as any)?.user_id || user?.id;

      await supabase.from("coaching_bookings" as any).insert({
        startup_id: startupId,
        coach_id: coachId,
        booked_by: user?.id,
        scheduled_at: data.scheduled_at,
        duration_min: data.duration_min,
        topic: data.topic,
        status: "pending",
      });

      const { data: bookings } = await supabase
        .from("coaching_bookings" as any)
        .select("*")
        .eq("startup_id", startupId)
        .order("scheduled_at", { ascending: true });
      if (bookings) setSessions(bookings as CoachingSession[]);
      toast.success("Session de coaching réservée !");
    } catch (e: any) {
      toast.error(e.message || "Erreur lors de la réservation");
    } finally {
      setBookingLoading(false);
    }
  };

  const handleSendMessage = async (content: string, channel: string) => {
    if (!startupId || !userId) return;
    await supabase.from("incubation_messages" as any).insert({
      startup_id: startupId,
      sender_id: userId,
      channel,
      content,
    });
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /></div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50/30 via-background to-background py-10 px-4">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 px-4 py-1.5 rounded-full text-sm font-semibold">
            <Sparkles className="w-4 h-4" /> Étape 3 — Accélération & Apprentissage
          </div>
          <h1 className="text-3xl font-black">Votre espace d'accélération</h1>
          <p className="text-muted-foreground">Formation, coaching et collaboration pour accélérer votre croissance.</p>
        </div>

        <Tabs defaultValue="lms" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 h-12">
            <TabsTrigger value="lms" className="gap-2"><BookOpen className="w-4 h-4" /><span className="hidden sm:inline">Formations</span></TabsTrigger>
            <TabsTrigger value="coaching" className="gap-2"><Calendar className="w-4 h-4" /><span className="hidden sm:inline">Coaching</span></TabsTrigger>
            <TabsTrigger value="chat" className="gap-2"><MessageSquare className="w-4 h-4" /><span className="hidden sm:inline">Messagerie</span></TabsTrigger>
            <TabsTrigger value="fablab" className="gap-2"><Cpu className="w-4 h-4" /><span className="hidden sm:inline">Fablab</span></TabsTrigger>
          </TabsList>

          {/* LMS */}
          <TabsContent value="lms">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {LMS_MODULES.map(mod => (
                <Card key={mod.id} className="hover:shadow-lg transition-all hover:border-purple-300 cursor-pointer group">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-start justify-between">
                      <span className="text-3xl">{mod.emoji}</span>
                      <Badge variant="outline" className="text-xs">{mod.lessons} leçons</Badge>
                    </div>
                    <div>
                      <h3 className="font-bold">{mod.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{mod.desc}</p>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Progression</span><span>{mod.progress}%</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-purple-500 rounded-full" style={{ width: `${mod.progress}%` }} />
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="w-full gap-1.5 bg-purple-600 hover:bg-purple-700 group-hover:shadow-md"
                      onClick={() => navigate(mod.url)}
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Accéder au cours
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Coaching */}
          <TabsContent value="coaching">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600" /> Sessions de mentorat
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CoachingCalendar sessions={sessions} onBook={handleBook} isLoading={bookingLoading} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Chat */}
          <TabsContent value="chat">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-emerald-600" /> Messagerie de l'incubation
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {startupId && userId && (
                  <IncubationChat
                    startupId={startupId}
                    currentUserId={userId}
                    currentUserName={userName}
                    messages={messages}
                    onSend={handleSendMessage}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Fablab */}
          <TabsContent value="fablab">
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                {FABLAB_MACHINES.map(machine => (
                  <Card key={machine.name} className={`border-2 ${machine.available ? "border-emerald-200" : "border-red-100 opacity-70"}`}>
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className={`p-3 rounded-lg ${machine.available ? "bg-emerald-100" : "bg-red-50"}`}>
                        <Cpu className={`w-6 h-6 ${machine.available ? "text-emerald-600" : "text-red-400"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">{machine.name}</p>
                        <p className="text-xs text-muted-foreground">{machine.location}</p>
                      </div>
                      <Badge className={machine.available ? "bg-emerald-100 text-emerald-700" : "bg-red-50 text-red-600"}>
                        {machine.available ? "Disponible" : "Occupé"}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Button className="w-full gap-2 bg-orange-600 hover:bg-orange-700" onClick={() => toast.info("Module de réservation Fablab complet disponible dans la version admin.")}>
                <Cpu className="w-4 h-4" /> Réserver une machine
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end">
          <Button onClick={() => navigate("/incubation/kpi")} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
            Étape 4 : Pilotage KPI <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
