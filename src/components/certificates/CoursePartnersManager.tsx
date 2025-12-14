import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Loader2, Users, Upload } from "lucide-react";
import { toast } from "sonner";

interface CoursePartner {
    id: string;
    course_id: string;
    partner_name: string;
    partner_logo_url?: string;
    partner_website?: string;
    display_order: number;
}

interface CoursePartnersManagerProps {
    courseId: string;
    courseName: string;
}

const CoursePartnersManager = ({ courseId, courseName }: CoursePartnersManagerProps) => {
    const queryClient = useQueryClient();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingPartner, setEditingPartner] = useState<CoursePartner | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const [formData, setFormData] = useState({
        partner_name: "",
        partner_logo_url: "",
        partner_website: "",
        display_order: 0,
    });

    // Récupérer les partenaires du cours
    const { data: partners, isLoading } = useQuery({
        queryKey: ["course-partners", courseId],
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_course_partners', {
                p_course_id: courseId
            } as any) as any;

            if (error) {
                console.error("Error fetching partners:", error);
                return [];
            }

            return data as CoursePartner[];
        },
    });

    // Mutation pour ajouter/modifier un partenaire
    const saveMutation = useMutation({
        mutationFn: async (data: any) => {
            if (editingPartner) {
                const { error } = await supabase.rpc('update_course_partner', {
                    p_partner_id: editingPartner.id,
                    p_partner_name: data.partner_name,
                    p_partner_logo_url: data.partner_logo_url,
                    p_partner_website: data.partner_website,
                    p_display_order: data.display_order,
                } as any);

                if (error) throw error;
            } else {
                const { error } = await supabase.rpc('add_course_partner', {
                    p_course_id: courseId,
                    p_partner_name: data.partner_name,
                    p_partner_logo_url: data.partner_logo_url,
                    p_partner_website: data.partner_website,
                    p_display_order: data.display_order,
                } as any);

                if (error) throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["course-partners", courseId] });
            toast.success(editingPartner ? "Partenaire modifié" : "Partenaire ajouté");
            setIsDialogOpen(false);
            resetForm();
        },
        onError: (error: any) => {
            toast.error("Erreur: " + error.message);
        },
    });

    // Mutation pour supprimer un partenaire
    const deleteMutation = useMutation({
        mutationFn: async (partnerId: string) => {
            const { error } = await supabase.rpc('delete_course_partner', {
                p_partner_id: partnerId,
            } as any);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["course-partners", courseId] });
            toast.success("Partenaire supprimé");
        },
        onError: (error: any) => {
            toast.error("Erreur: " + error.message);
        },
    });

    const uploadImage = async (file: File): Promise<string> => {
        setIsUploading(true);
        try {
            const fileExt = file.name.split(".").pop();
            const fileName = `partner-${courseId}-${Date.now()}.${fileExt}`;
            const filePath = `certificates/partners/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from("course-materials")
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from("course-materials")
                .getPublicUrl(filePath);

            return publicUrl;
        } finally {
            setIsUploading(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const url = await uploadImage(file);
            setFormData({ ...formData, partner_logo_url: url });
            toast.success("Logo uploadé avec succès");
        } catch (error: any) {
            toast.error("Erreur lors de l'upload: " + error.message);
        }
    };

    const resetForm = () => {
        setFormData({
            partner_name: "",
            partner_logo_url: "",
            partner_website: "",
            display_order: 0,
        });
        setEditingPartner(null);
    };

    const handleEdit = (partner: CoursePartner) => {
        setEditingPartner(partner);
        setFormData({
            partner_name: partner.partner_name,
            partner_logo_url: partner.partner_logo_url || "",
            partner_website: partner.partner_website || "",
            display_order: partner.display_order,
        });
        setIsDialogOpen(true);
    };

    const handleSave = () => {
        if (!formData.partner_name.trim()) {
            toast.error("Le nom du partenaire est requis");
            return;
        }
        saveMutation.mutate(formData);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        Partenaires du cours
                    </div>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button size="sm" onClick={resetForm}>
                                <Plus className="w-4 h-4 mr-2" />
                                Ajouter
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>
                                    {editingPartner ? "Modifier" : "Ajouter"} un partenaire
                                </DialogTitle>
                                <DialogDescription>
                                    Les logos des partenaires seront affichés sur les certificats de ce cours
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="partner_name">Nom du partenaire *</Label>
                                    <Input
                                        id="partner_name"
                                        value={formData.partner_name}
                                        onChange={(e) =>
                                            setFormData({ ...formData, partner_name: e.target.value })
                                        }
                                        placeholder="Ex: Organisation XYZ"
                                    />
                                </div>

                                {formData.partner_logo_url && (
                                    <div className="flex items-center justify-center p-4 border rounded-lg bg-muted/50">
                                        <img
                                            src={formData.partner_logo_url}
                                            alt="Logo partenaire"
                                            className="max-h-20 object-contain"
                                        />
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <Label htmlFor="partner_logo">Logo</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="partner_logo"
                                            type="file"
                                            accept="image/*"
                                            onChange={handleFileUpload}
                                            disabled={isUploading}
                                        />
                                        {isUploading && <Loader2 className="w-4 h-4 animate-spin" />}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="partner_website">Site web (optionnel)</Label>
                                    <Input
                                        id="partner_website"
                                        value={formData.partner_website}
                                        onChange={(e) =>
                                            setFormData({ ...formData, partner_website: e.target.value })
                                        }
                                        placeholder="https://example.com"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="display_order">Ordre d'affichage</Label>
                                    <Input
                                        id="display_order"
                                        type="number"
                                        value={formData.display_order}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                display_order: parseInt(e.target.value) || 0,
                                            })
                                        }
                                    />
                                </div>

                                <div className="flex gap-2 justify-end">
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setIsDialogOpen(false);
                                            resetForm();
                                        }}
                                    >
                                        Annuler
                                    </Button>
                                    <Button onClick={handleSave} disabled={saveMutation.isPending}>
                                        {saveMutation.isPending ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Sauvegarde...
                                            </>
                                        ) : (
                                            "Sauvegarder"
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                </CardTitle>
                <CardDescription>
                    Gérez les partenaires qui apparaîtront sur les certificats de "{courseName}"
                </CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                ) : !partners || partners.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        Aucun partenaire ajouté pour ce cours
                    </div>
                ) : (
                    <div className="space-y-3">
                        {partners.map((partner) => (
                            <div
                                key={partner.id}
                                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    {partner.partner_logo_url && (
                                        <img
                                            src={partner.partner_logo_url}
                                            alt={partner.partner_name}
                                            className="h-12 w-12 object-contain"
                                        />
                                    )}
                                    <div>
                                        <div className="font-medium">{partner.partner_name}</div>
                                        {partner.partner_website && (
                                            <a
                                                href={partner.partner_website}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs text-primary hover:underline"
                                            >
                                                {partner.partner_website}
                                            </a>
                                        )}
                                    </div>
                                    <Badge variant="outline">Ordre: {partner.display_order}</Badge>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleEdit(partner)}
                                    >
                                        <Edit className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => deleteMutation.mutate(partner.id)}
                                        disabled={deleteMutation.isPending}
                                    >
                                        <Trash2 className="w-4 h-4 text-destructive" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default CoursePartnersManager;
