import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Hook to generate certificates after successful final assessment
 */
export const useCertificateGeneration = () => {
    const generateCertificateMutation = useMutation({
        mutationFn: async ({
            courseId,
            userId,
            finalScore,
        }: {
            courseId: string;
            userId: string;
            finalScore: number;
        }) => {
            // Check if certificate already exists
            const { data: existingCertificate } = await supabase
                .from("certificates")
                .select("id")
                .eq("user_id", userId)
                .eq("course_id", courseId)
                .maybeSingle();

            if (existingCertificate) {
                return existingCertificate;
            }

            // Generate unique certificate number
            const timestamp = Date.now();
            const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
            const certificateNumber = `CERT-${timestamp}-${randomPart}`;

            // Generate verification code
            const verificationCode = Math.random().toString(36).substring(2, 15).toUpperCase();

            // Create certificate
            const { data: certificate, error } = await supabase
                .from("certificates")
                .insert({
                    user_id: userId,
                    course_id: courseId,
                    certificate_number: certificateNumber,
                    verification_code: verificationCode,
                    issued_at: new Date().toISOString(),
                })
                .select("*")
                .single();

            if (error) throw error;

            return certificate;
        },
        onSuccess: (certificate) => {
            toast.success("🎉 Certificat généré avec succès!", {
                description: `Numéro: ${certificate.certificate_number}`,
                duration: 5000,
            });
        },
        onError: (error: any) => {
            toast.error("Erreur lors de la génération du certificat", {
                description: error.message,
            });
        },
    });

    return {
        generateCertificate: generateCertificateMutation.mutate,
        isGenerating: generateCertificateMutation.isPending,
        certificate: generateCertificateMutation.data,
    };
};
