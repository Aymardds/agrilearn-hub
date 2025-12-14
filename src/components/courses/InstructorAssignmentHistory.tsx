import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserCheck, Calendar, BookOpen, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface InstructorAssignmentHistoryProps {
    courseId: string;
}

const InstructorAssignmentHistory = ({ courseId }: InstructorAssignmentHistoryProps) => {
    const { data: assignments, isLoading } = useQuery({
        queryKey: ["instructor-assignments", courseId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("instructor_assignments")
                .select(`
          *,
          instructor:instructor_id (
            id,
            full_name,
            avatar_url
          ),
          assigner:assigned_by (
            id,
            full_name
          ),
          remover:removed_by (
            id,
            full_name
          )
        `)
                .eq("course_id", courseId)
                .order("assigned_at", { ascending: false });

            if (error) throw error;
            return data || [];
        },
    });

    if (isLoading) {
        return (
            <Card>
                <CardContent className="pt-6">
                    <p className="text-center text-muted-foreground">Chargement...</p>
                </CardContent>
            </Card>
        );
    }

    if (!assignments || assignments.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <UserCheck className="w-5 h-5" />
                        Historique des formateurs
                    </CardTitle>
                    <CardDescription>
                        Aucun historique d'affectation disponible
                    </CardDescription>
                </CardHeader>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <UserCheck className="w-5 h-5" />
                    Historique des formateurs
                </CardTitle>
                <CardDescription>
                    Historique complet des affectations de formateurs pour ce cours
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Formateur</TableHead>
                                <TableHead>Assigné le</TableHead>
                                <TableHead>Assigné par</TableHead>
                                <TableHead>Retiré le</TableHead>
                                <TableHead>Retiré par</TableHead>
                                <TableHead>Statut</TableHead>
                                <TableHead>Notes</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {assignments.map((assignment: any) => (
                                <TableRow key={assignment.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar className="w-8 h-8">
                                                <AvatarImage src={assignment.instructor?.avatar_url} />
                                                <AvatarFallback>
                                                    {assignment.instructor?.full_name?.charAt(0) || "?"}
                                                </AvatarFallback>
                                            </Avatar>
                                            <span className="font-medium">
                                                {assignment.instructor?.full_name || "N/A"}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-muted-foreground" />
                                            <span className="text-sm">
                                                {new Date(assignment.assigned_at).toLocaleDateString("fr-FR", {
                                                    year: "numeric",
                                                    month: "short",
                                                    day: "numeric",
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                })}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <User className="w-4 h-4 text-muted-foreground" />
                                            <span className="text-sm">
                                                {assignment.assigner?.full_name || "Auto"}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {assignment.removed_at ? (
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-4 h-4 text-muted-foreground" />
                                                <span className="text-sm">
                                                    {new Date(assignment.removed_at).toLocaleDateString("fr-FR", {
                                                        year: "numeric",
                                                        month: "short",
                                                        day: "numeric",
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                    })}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-muted-foreground text-sm">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {assignment.removed_by ? (
                                            <div className="flex items-center gap-2">
                                                <User className="w-4 h-4 text-muted-foreground" />
                                                <span className="text-sm">
                                                    {assignment.remover?.full_name || "N/A"}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-muted-foreground text-sm">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={assignment.is_active ? "default" : "secondary"}>
                                            {assignment.is_active ? "Actif" : "Inactif"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-sm text-muted-foreground">
                                            {assignment.notes || "-"}
                                        </span>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
};

export default InstructorAssignmentHistory;
