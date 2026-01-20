import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, XCircle, Shield, Award, Calendar, User, BookOpen, Loader2 } from "lucide-react";

const CertificateVerification = () => {
    const { code } = useParams<{ code: string }>();
    const [searchParams] = useSearchParams();
    const verificationCode = code || searchParams.get("code");

    const { data: certificate, isLoading, error } = useQuery({
        queryKey: ["verify-certificate", verificationCode],
        queryFn: async () => {
            if (!verificationCode) throw new Error("Code de vérification manquant");

            const { data, error } = await supabase
                .from("certificates")
                .select(`
          *,
          profiles:user_id (
            full_name,
            email
          ),
          courses:course_id (
            title,
            description
          )
        `)
                .eq("verification_code", verificationCode.toUpperCase())
                .maybeSingle();

            if (error) throw error;
            if (!data) throw new Error("Certificat non trouvé");

            return data;
        },
        enabled: !!verificationCode,
    });

    if (!verificationCode) {
        return (
            <div className="container mx-auto py-12 px-4">
                <Card className="max-w-2xl mx-auto">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-destructive">
                            <XCircle className="w-6 h-6" />
                            Code de vérification manquant
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Alert variant="destructive">
                            <AlertDescription>
                                Aucun code de vérification n'a été fourni. Veuillez scanner le QR code sur le certificat ou entrer le code manuellement.
                            </AlertDescription>
                        </Alert>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="container mx-auto py-12 px-4">
                <Card className="max-w-2xl mx-auto">
                    <CardContent className="flex items-center justify-center py-12">
                        <div className="text-center space-y-4">
                            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
                            <p className="text-muted-foreground">Vérification du certificat en cours...</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (error || !certificate) {
        return (
            <div className="container mx-auto py-12 px-4">
                <Card className="max-w-2xl mx-auto border-destructive">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-destructive">
                            <XCircle className="w-6 h-6" />
                            Certificat non valide
                        </CardTitle>
                        <CardDescription>
                            Le code de vérification fourni ne correspond à aucun certificat dans notre système
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Alert variant="destructive">
                            <AlertDescription>
                                <div className="space-y-2">
                                    <p className="font-medium">Ce certificat n'a pas pu être vérifié pour les raisons suivantes :</p>
                                    <ul className="list-disc list-inside space-y-1 text-sm">
                                        <li>Le code de vérification est incorrect</li>
                                        <li>Le certificat a été révoqué</li>
                                        <li>Le certificat n'existe pas dans notre base de données</li>
                                    </ul>
                                    <p className="text-sm mt-4">
                                        Code fourni : <code className="bg-destructive/10 px-2 py-1 rounded">{verificationCode}</code>
                                    </p>
                                </div>
                            </AlertDescription>
                        </Alert>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-12 px-4">
            <Card className="max-w-3xl mx-auto border-green-500">
                <CardHeader className="bg-green-50 border-b border-green-200">
                    <CardTitle className="flex items-center gap-2 text-green-700">
                        <CheckCircle className="w-6 h-6" />
                        Certificat Authentique et Vérifié
                    </CardTitle>
                    <CardDescription className="text-green-600">
                        Ce certificat a été vérifié avec succès dans notre système
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                    {/* Badge de vérification */}
                    <div className="flex items-center justify-center">
                        <Badge className="bg-green-600 text-white px-6 py-2 text-lg">
                            <Shield className="w-5 h-5 mr-2" />
                            Certificat Vérifié
                        </Badge>
                    </div>

                    {/* Informations du certificat */}
                    <div className="grid gap-6">
                        {/* Numéro de certificat */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                <Award className="w-4 h-4" />
                                Numéro de certificat
                            </div>
                            <div className="text-2xl font-bold font-mono">
                                {certificate.certificate_number}
                            </div>
                        </div>

                        {/* Apprenant */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                <User className="w-4 h-4" />
                                Délivré à
                            </div>
                            <div className="text-xl font-semibold">
                                {certificate.profiles?.full_name || "Nom non disponible"}
                            </div>
                        </div>

                        {/* Cours */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                <BookOpen className="w-4 h-4" />
                                Cours complété
                            </div>
                            <div className="text-xl font-semibold">
                                {certificate.courses?.title || "Titre non disponible"}
                            </div>
                            {certificate.courses?.description && (
                                <p className="text-sm text-muted-foreground">
                                    {certificate.courses.description}
                                </p>
                            )}
                        </div>

                        {/* Date d'émission */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                <Calendar className="w-4 h-4" />
                                Date d'émission
                            </div>
                            <div className="text-lg">
                                {new Date(certificate.issued_at).toLocaleDateString("fr-FR", {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                })}
                            </div>
                        </div>

                        {/* Métadonnées supplémentaires */}
                        {certificate.student_name && (
                            <div className="space-y-2">
                                <div className="text-sm font-medium text-muted-foreground">
                                    Nom sur le certificat
                                </div>
                                <div className="text-lg">
                                    {certificate.student_name}
                                </div>
                            </div>
                        )}

                        {certificate.final_score && (
                            <div className="space-y-2">
                                <div className="text-sm font-medium text-muted-foreground">
                                    Score final
                                </div>
                                <div className="text-lg font-semibold">
                                    {certificate.final_score}%
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Informations de sécurité */}
                    <Alert className="bg-blue-50 border-blue-200">
                        <Shield className="h-4 w-4 text-blue-600" />
                        <AlertDescription className="text-blue-800">
                            <div className="space-y-2">
                                <p className="font-medium">Informations de sécurité</p>
                                <ul className="text-sm space-y-1">
                                    <li>• Ce certificat est protégé par une signature numérique</li>
                                    <li>• Le code de vérification est unique et ne peut pas être dupliqué</li>
                                    <li>• Toutes les informations sont stockées de manière sécurisée</li>
                                    <li>• Ce certificat peut être vérifié à tout moment via ce lien</li>
                                </ul>
                                <p className="text-xs mt-4 font-mono bg-blue-100 p-2 rounded">
                                    Code de vérification : {certificate.verification_code}
                                </p>
                            </div>
                        </AlertDescription>
                    </Alert>

                    {/* Footer */}
                    <div className="pt-4 border-t text-center text-sm text-muted-foreground">
                        <p>
                            Ce certificat a été généré par la plateforme e-grainolab
                        </p>
                        <p className="mt-1">
                            Pour toute question, veuillez contacter notre service support
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Informations supplémentaires */}
            <div className="max-w-3xl mx-auto mt-6">
                <Alert>
                    <AlertDescription className="text-sm">
                        <p className="font-medium mb-2">Comment vérifier l'authenticité de ce certificat ?</p>
                        <ol className="list-decimal list-inside space-y-1">
                            <li>Vérifiez que l'URL commence par le domaine officiel</li>
                            <li>Comparez le numéro de certificat avec celui sur le document physique</li>
                            <li>Vérifiez que le nom de l'apprenant correspond</li>
                            <li>Vérifiez la date d'émission</li>
                            <li>En cas de doute, contactez directement l'organisme émetteur</li>
                        </ol>
                    </AlertDescription>
                </Alert>
            </div>
        </div>
    );
};

export default CertificateVerification;
