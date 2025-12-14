import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Search, Award, Filter, Calendar, User, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const CertificatesManagement = () => {
    const [searchTerm, setSearchTerm] = useState("");
    const [courseFilter, setCourseFilter] = useState<string>("all");
    const [dateFilter, setDateFilter] = useState<string>("all");

    const { data: user } = useQuery({
        queryKey: ["current-user"],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            return user;
        },
    });

    const { data: userRole } = useQuery({
        queryKey: ["user-role", user?.id],
        queryFn: async () => {
            if (!user) return null;
            const { data, error } = await supabase
                .from("user_roles")
                .select("role")
                .eq("user_id", user.id)
                .single();
            if (error) return null;
            return data?.role;
        },
        enabled: !!user,
    });

    const { data: certificates, isLoading } = useQuery({
        queryKey: ["admin-certificates", searchTerm, courseFilter, dateFilter, user?.id, userRole],
        queryFn: async () => {
            let query = supabase
                .from("certificates")
                .select(`
          *,
          courses:course_id (
            id,
            title,
            thumbnail_url
          ),
          profiles:user_id (
            id,
            full_name,
            avatar_url
          )
        `)
                .order("issued_at", { ascending: false });

            // Filtrer par rôle
            if (userRole === "formateur") {
                // Les formateurs ne voient que les certificats de leurs cours
                const { data: instructorCourses } = await supabase
                    .from("courses")
                    .select("id")
                    .eq("instructor_id", user?.id);

                const courseIds = instructorCourses?.map(c => c.id) || [];
                if (courseIds.length > 0) {
                    query = query.in("course_id", courseIds);
                } else {
                    return [];
                }
            }

            // Filtrer par recherche
            if (searchTerm) {
                query = query.or(`
          certificate_number.ilike.%${searchTerm}%,
          student_name.ilike.%${searchTerm}%,
          course_title.ilike.%${searchTerm}%,
          verification_code.ilike.%${searchTerm}%
        `);
            }

            // Filtrer par cours
            if (courseFilter && courseFilter !== "all") {
                query = query.eq("course_id", courseFilter);
            }

            // Filtrer par date
            if (dateFilter && dateFilter !== "all") {
                const now = new Date();
                let startDate: Date;

                switch (dateFilter) {
                    case "today":
                        startDate = new Date(now.setHours(0, 0, 0, 0));
                        break;
                    case "week":
                        startDate = new Date(now.setDate(now.getDate() - 7));
                        break;
                    case "month":
                        startDate = new Date(now.setMonth(now.getMonth() - 1));
                        break;
                    case "year":
                        startDate = new Date(now.setFullYear(now.getFullYear() - 1));
                        break;
                    default:
                        startDate = new Date(0);
                }

                query = query.gte("issued_at", startDate.toISOString());
            }

            const { data, error } = await query;
            if (error) throw error;
            return data || [];
        },
        enabled: !!user && !!userRole,
    });

    const { data: courses } = useQuery({
        queryKey: ["courses-for-filter", userRole, user?.id],
        queryFn: async () => {
            let query = supabase
                .from("courses")
                .select("id, title")
                .order("title");

            if (userRole === "formateur") {
                query = query.eq("instructor_id", user?.id);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data || [];
        },
        enabled: !!user && !!userRole,
    });

    const downloadCertificate = (certificate: any) => {
        if (!certificate?.pdf_url) {
            toast.error("PDF non disponible pour ce certificat");
            return;
        }

        const link = document.createElement("a");
        link.href = certificate.pdf_url;
        link.download = `Certificat-${certificate.certificate_number}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Téléchargement du certificat...");
    };

    const stats = {
        total: certificates?.length || 0,
        thisMonth: certificates?.filter((cert: any) => {
            const certDate = new Date(cert.issued_at);
            const now = new Date();
            return certDate.getMonth() === now.getMonth() &&
                certDate.getFullYear() === now.getFullYear();
        }).length || 0,
        thisWeek: certificates?.filter((cert: any) => {
            const certDate = new Date(cert.issued_at);
            const now = new Date();
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return certDate >= weekAgo;
        }).length || 0,
    };

    if (!userRole || !["superadmin", "superviseur", "formateur"].includes(userRole)) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-background to-muted">
                <main className="container mx-auto px-4 py-8">
                    <Card>
                        <CardContent className="pt-6">
                            <p className="text-center text-muted-foreground">
                                Vous n'avez pas accès à cette page.
                            </p>
                        </CardContent>
                    </Card>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-background to-muted">
            <main className="container mx-auto px-4 py-8">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold mb-2 flex items-center gap-2">
                        <Award className="w-8 h-8" />
                        Gestion des certificats
                    </h1>
                    <p className="text-muted-foreground">
                        Visualisez et gérez tous les certificats émis
                    </p>
                </div>

                {/* Statistiques */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Total des certificats
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{stats.total}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Ce mois-ci
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-green-600">{stats.thisMonth}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Cette semaine
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-blue-600">{stats.thisWeek}</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filtres */}
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Filter className="w-5 h-5" />
                            Filtres
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <Label htmlFor="search">Rechercher</Label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                                    <Input
                                        id="search"
                                        placeholder="N° certificat, nom, cours..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>
                            </div>
                            <div>
                                <Label htmlFor="course-filter">Cours</Label>
                                <Select value={courseFilter} onValueChange={setCourseFilter}>
                                    <SelectTrigger id="course-filter">
                                        <SelectValue placeholder="Tous les cours" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Tous les cours</SelectItem>
                                        {courses?.map((course) => (
                                            <SelectItem key={course.id} value={course.id}>
                                                {course.title}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="date-filter">Période</Label>
                                <Select value={dateFilter} onValueChange={setDateFilter}>
                                    <SelectTrigger id="date-filter">
                                        <SelectValue placeholder="Toutes les périodes" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Toutes les périodes</SelectItem>
                                        <SelectItem value="today">Aujourd'hui</SelectItem>
                                        <SelectItem value="week">Cette semaine</SelectItem>
                                        <SelectItem value="month">Ce mois-ci</SelectItem>
                                        <SelectItem value="year">Cette année</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Liste des certificats */}
                <Card>
                    <CardHeader>
                        <CardTitle>Certificats émis</CardTitle>
                        <CardDescription>
                            {certificates?.length || 0} certificat(s) trouvé(s)
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="text-center py-8">
                                <p className="text-muted-foreground">Chargement...</p>
                            </div>
                        ) : certificates && certificates.length > 0 ? (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>N° Certificat</TableHead>
                                            <TableHead>Apprenant</TableHead>
                                            <TableHead>Cours</TableHead>
                                            <TableHead>Date d'émission</TableHead>
                                            <TableHead>Score</TableHead>
                                            <TableHead>Code de vérification</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {certificates.map((cert: any) => (
                                            <TableRow key={cert.id}>
                                                <TableCell className="font-mono text-sm">
                                                    {cert.certificate_number}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <User className="w-4 h-4 text-muted-foreground" />
                                                        <span>{cert.student_name || cert.profiles?.full_name || "N/A"}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <BookOpen className="w-4 h-4 text-muted-foreground" />
                                                        <span className="max-w-xs truncate">
                                                            {cert.course_title || cert.courses?.title || "N/A"}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <Calendar className="w-4 h-4 text-muted-foreground" />
                                                        <span>
                                                            {new Date(cert.issued_at).toLocaleDateString("fr-FR")}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {cert.final_score ? (
                                                        <Badge variant={cert.final_score >= 70 ? "default" : "secondary"}>
                                                            {cert.final_score}%
                                                        </Badge>
                                                    ) : (
                                                        <span className="text-muted-foreground">N/A</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <code className="text-xs bg-muted px-2 py-1 rounded">
                                                        {cert.verification_code}
                                                    </code>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => downloadCertificate(cert)}
                                                        disabled={!cert.pdf_url}
                                                    >
                                                        <Download className="w-4 h-4 mr-2" />
                                                        PDF
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <Award className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                                <p className="text-muted-foreground">Aucun certificat trouvé</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </main>
        </div>
    );
};

export default CertificatesManagement;
