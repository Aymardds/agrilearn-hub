import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
    Settings,
    Upload,
    Image as ImageIcon,
    Save,
    Eye,
    Palette,
    FileSignature,
    QrCode,
    Users,
    Loader2,
    Plus,
    X
} from "lucide-react";
import { toast } from "sonner";

interface PartnerLogo {
    name: string;
    logo_url: string;
    website?: string;
}

const CertificateSettings = () => {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState("general");
    const [isUploading, setIsUploading] = useState(false);

    // Récupérer les paramètres actifs
    const { data: settings, isLoading } = useQuery({
        queryKey: ["certificate-settings"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("certificate_settings")
                .select("*")
                .eq("is_active", true)
                .maybeSingle();

            if (error && error.code !== "PGRST116") throw error;

            // Si aucun paramétrage n'existe, retourner des valeurs par défaut
            if (!data) {
                return {
                    attestation_text: "Ceci certifie que",
                    completion_text: "a complété avec succès le cours",
                    signature_name: "",
                    signature_title: "",
                    primary_color: "#228B22",
                    secondary_color: "#FFFFFF",
                    text_color: "#000000",
                    enable_qr_code: true,
                    qr_code_base_url: "https://agrilearn.com/verify/",
                    admin_logo_url: "",
                    admin_logo_width: 60,
                    admin_logo_height: 20,
                    signature_image_url: "",
                    partner_logos: [],
                };
            }

            return data;
        },
    });

    const [formData, setFormData] = useState(settings || {});

    // Mettre à jour formData quand settings change
    useState(() => {
        if (settings) {
            setFormData(settings);
        }
    });

    // Mutation pour sauvegarder les paramètres
    const saveMutation = useMutation({
        mutationFn: async (data: any) => {
            const { data: user } = await supabase.auth.getUser();

            if (settings?.id) {
                // Mise à jour
                const { error } = await supabase
                    .from("certificate_settings")
                    .update({
                        ...data,
                        updated_by: user.user?.id,
                    })
                    .eq("id", settings.id);

                if (error) throw error;
            } else {
                // Création
                const { error } = await supabase
                    .from("certificate_settings")
                    .insert({
                        ...data,
                        is_active: true,
                        created_by: user.user?.id,
                        updated_by: user.user?.id,
                    });

                if (error) throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["certificate-settings"] });
            toast.success("Paramètres sauvegardés avec succès");
        },
        onError: (error: any) => {
            toast.error("Erreur lors de la sauvegarde: " + error.message);
        },
    });

    // Upload d'image
    const uploadImage = async (file: File, path: string): Promise<string> => {
        setIsUploading(true);
        try {
            const fileExt = file.name.split(".").pop();
            const fileName = `${path}-${Date.now()}.${fileExt}`;
            const filePath = `certificates/${fileName}`;

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

    const handleFileUpload = async (
        e: React.ChangeEvent<HTMLInputElement>,
        field: string
    ) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const url = await uploadImage(file, field);
            setFormData({ ...formData, [field]: url });
            toast.success("Image uploadée avec succès");
        } catch (error: any) {
            toast.error("Erreur lors de l'upload: " + error.message);
        }
    };

    const handleAddPartner = () => {
        const partners = formData.partner_logos || [];
        setFormData({
            ...formData,
            partner_logos: [...partners, { name: "", logo_url: "", website: "" }],
        });
    };

    const handleRemovePartner = (index: number) => {
        const partners = [...(formData.partner_logos || [])];
        partners.splice(index, 1);
        setFormData({ ...formData, partner_logos: partners });
    };

    const handlePartnerChange = (index: number, field: string, value: string) => {
        const partners = [...(formData.partner_logos || [])];
        partners[index] = { ...partners[index], [field]: value };
        setFormData({ ...formData, partner_logos: partners });
    };

    const handleSave = () => {
        saveMutation.mutate(formData);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="container mx-auto py-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <Settings className="w-8 h-8" />
                        Paramétrage des Certificats
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Personnalisez l'apparence et le contenu de vos certificats
                    </p>
                </div>
                <Button onClick={handleSave} disabled={saveMutation.isPending}>
                    {saveMutation.isPending ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Sauvegarde...
                        </>
                    ) : (
                        <>
                            <Save className="w-4 h-4 mr-2" />
                            Sauvegarder
                        </>
                    )}
                </Button>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="general">
                        <FileSignature className="w-4 h-4 mr-2" />
                        Général
                    </TabsTrigger>
                    <TabsTrigger value="logos">
                        <ImageIcon className="w-4 h-4 mr-2" />
                        Logos
                    </TabsTrigger>
                    <TabsTrigger value="partners">
                        <Users className="w-4 h-4 mr-2" />
                        Partenaires
                    </TabsTrigger>
                    <TabsTrigger value="signature">
                        <FileSignature className="w-4 h-4 mr-2" />
                        Signature
                    </TabsTrigger>
                    <TabsTrigger value="colors">
                        <Palette className="w-4 h-4 mr-2" />
                        Couleurs
                    </TabsTrigger>
                </TabsList>

                {/* Onglet Général */}
                <TabsContent value="general" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Textes d'attestation</CardTitle>
                            <CardDescription>
                                Personnalisez les textes qui apparaissent sur le certificat
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="attestation_text">Texte d'introduction</Label>
                                <Input
                                    id="attestation_text"
                                    value={formData.attestation_text || ""}
                                    onChange={(e) =>
                                        setFormData({ ...formData, attestation_text: e.target.value })
                                    }
                                    placeholder="Ceci certifie que"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Texte affiché avant le nom de l'apprenant
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="completion_text">Texte de complétion</Label>
                                <Input
                                    id="completion_text"
                                    value={formData.completion_text || ""}
                                    onChange={(e) =>
                                        setFormData({ ...formData, completion_text: e.target.value })
                                    }
                                    placeholder="a complété avec succès le cours"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Texte affiché après le nom de l'apprenant
                                </p>
                            </div>

                            <div className="flex items-center justify-between space-x-2 pt-4">
                                <div className="space-y-0.5">
                                    <Label htmlFor="enable_qr_code">QR Code de vérification</Label>
                                    <p className="text-xs text-muted-foreground">
                                        Ajouter un QR code pour vérifier l'authenticité du certificat
                                    </p>
                                </div>
                                <Switch
                                    id="enable_qr_code"
                                    checked={formData.enable_qr_code || false}
                                    onCheckedChange={(checked) =>
                                        setFormData({ ...formData, enable_qr_code: checked })
                                    }
                                />
                            </div>

                            {formData.enable_qr_code && (
                                <div className="space-y-2">
                                    <Label htmlFor="qr_code_base_url">URL de base pour le QR Code</Label>
                                    <Input
                                        id="qr_code_base_url"
                                        value={formData.qr_code_base_url || ""}
                                        onChange={(e) =>
                                            setFormData({ ...formData, qr_code_base_url: e.target.value })
                                        }
                                        placeholder="https://agrilearn.com/verify/"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Le code de vérification sera ajouté à cette URL
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Onglet Logos */}
                <TabsContent value="logos" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Logo de l'administration</CardTitle>
                            <CardDescription>
                                Logo principal affiché en haut du certificat
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {formData.admin_logo_url && (
                                <div className="flex items-center justify-center p-4 border rounded-lg bg-muted/50">
                                    <img
                                        src={formData.admin_logo_url}
                                        alt="Logo administration"
                                        style={{
                                            width: `${formData.admin_logo_width || 60}mm`,
                                            height: `${formData.admin_logo_height || 20}mm`,
                                            objectFit: "contain",
                                        }}
                                    />
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="admin_logo">Uploader le logo</Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="admin_logo"
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => handleFileUpload(e, "admin_logo_url")}
                                        disabled={isUploading}
                                    />
                                    {isUploading && <Loader2 className="w-4 h-4 animate-spin" />}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="admin_logo_width">Largeur (mm)</Label>
                                    <Input
                                        id="admin_logo_width"
                                        type="number"
                                        value={formData.admin_logo_width || 60}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                admin_logo_width: parseFloat(e.target.value),
                                            })
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="admin_logo_height">Hauteur (mm)</Label>
                                    <Input
                                        id="admin_logo_height"
                                        type="number"
                                        value={formData.admin_logo_height || 20}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                admin_logo_height: parseFloat(e.target.value),
                                            })
                                        }
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Onglet Partenaires */}
                <TabsContent value="partners" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                                <span>Logos des partenaires</span>
                                <Button onClick={handleAddPartner} size="sm">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Ajouter un partenaire
                                </Button>
                            </CardTitle>
                            <CardDescription>
                                Logos affichés en bas du certificat
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {(!formData.partner_logos || formData.partner_logos.length === 0) ? (
                                <Alert>
                                    <AlertDescription>
                                        Aucun partenaire ajouté. Cliquez sur "Ajouter un partenaire" pour commencer.
                                    </AlertDescription>
                                </Alert>
                            ) : (
                                formData.partner_logos.map((partner: PartnerLogo, index: number) => (
                                    <Card key={index} className="relative">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="absolute top-2 right-2"
                                            onClick={() => handleRemovePartner(index)}
                                        >
                                            <X className="w-4 h-4" />
                                        </Button>
                                        <CardContent className="pt-6 space-y-4">
                                            <div className="space-y-2">
                                                <Label>Nom du partenaire</Label>
                                                <Input
                                                    value={partner.name || ""}
                                                    onChange={(e) =>
                                                        handlePartnerChange(index, "name", e.target.value)
                                                    }
                                                    placeholder="Nom du partenaire"
                                                />
                                            </div>

                                            {partner.logo_url && (
                                                <div className="flex items-center justify-center p-4 border rounded-lg bg-muted/50">
                                                    <img
                                                        src={partner.logo_url}
                                                        alt={partner.name}
                                                        className="max-h-20 object-contain"
                                                    />
                                                </div>
                                            )}

                                            <div className="space-y-2">
                                                <Label>Logo</Label>
                                                <Input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={async (e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                            try {
                                                                const url = await uploadImage(file, `partner-${index}`);
                                                                handlePartnerChange(index, "logo_url", url);
                                                            } catch (error: any) {
                                                                toast.error("Erreur lors de l'upload: " + error.message);
                                                            }
                                                        }
                                                    }}
                                                    disabled={isUploading}
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label>Site web (optionnel)</Label>
                                                <Input
                                                    value={partner.website || ""}
                                                    onChange={(e) =>
                                                        handlePartnerChange(index, "website", e.target.value)
                                                    }
                                                    placeholder="https://example.com"
                                                />
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Onglet Signature */}
                <TabsContent value="signature" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Signature numérique</CardTitle>
                            <CardDescription>
                                Informations sur le signataire du certificat
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="signature_name">Nom du signataire</Label>
                                <Input
                                    id="signature_name"
                                    value={formData.signature_name || ""}
                                    onChange={(e) =>
                                        setFormData({ ...formData, signature_name: e.target.value })
                                    }
                                    placeholder="Ex: Dr. Jean Dupont"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="signature_title">Titre du signataire</Label>
                                <Input
                                    id="signature_title"
                                    value={formData.signature_title || ""}
                                    onChange={(e) =>
                                        setFormData({ ...formData, signature_title: e.target.value })
                                    }
                                    placeholder="Ex: Directeur de la Formation"
                                />
                            </div>

                            {formData.signature_image_url && (
                                <div className="flex items-center justify-center p-4 border rounded-lg bg-muted/50">
                                    <img
                                        src={formData.signature_image_url}
                                        alt="Signature"
                                        className="max-h-24 object-contain"
                                    />
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="signature_image">Image de signature (optionnel)</Label>
                                <Input
                                    id="signature_image"
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handleFileUpload(e, "signature_image_url")}
                                    disabled={isUploading}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Format recommandé: PNG avec fond transparent
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Onglet Couleurs */}
                <TabsContent value="colors" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Palette de couleurs</CardTitle>
                            <CardDescription>
                                Personnalisez les couleurs du certificat
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="primary_color">Couleur principale</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="primary_color"
                                            type="color"
                                            value={formData.primary_color || "#228B22"}
                                            onChange={(e) =>
                                                setFormData({ ...formData, primary_color: e.target.value })
                                            }
                                            className="w-20 h-10"
                                        />
                                        <Input
                                            value={formData.primary_color || "#228B22"}
                                            onChange={(e) =>
                                                setFormData({ ...formData, primary_color: e.target.value })
                                            }
                                            placeholder="#228B22"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="secondary_color">Couleur secondaire</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="secondary_color"
                                            type="color"
                                            value={formData.secondary_color || "#FFFFFF"}
                                            onChange={(e) =>
                                                setFormData({ ...formData, secondary_color: e.target.value })
                                            }
                                            className="w-20 h-10"
                                        />
                                        <Input
                                            value={formData.secondary_color || "#FFFFFF"}
                                            onChange={(e) =>
                                                setFormData({ ...formData, secondary_color: e.target.value })
                                            }
                                            placeholder="#FFFFFF"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="text_color">Couleur du texte</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="text_color"
                                            type="color"
                                            value={formData.text_color || "#000000"}
                                            onChange={(e) =>
                                                setFormData({ ...formData, text_color: e.target.value })
                                            }
                                            className="w-20 h-10"
                                        />
                                        <Input
                                            value={formData.text_color || "#000000"}
                                            onChange={(e) =>
                                                setFormData({ ...formData, text_color: e.target.value })
                                            }
                                            placeholder="#000000"
                                        />
                                    </div>
                                </div>
                            </div>

                            <Alert>
                                <Palette className="h-4 w-4" />
                                <AlertDescription>
                                    Les couleurs seront appliquées à tous les nouveaux certificats générés
                                </AlertDescription>
                            </Alert>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default CertificateSettings;
