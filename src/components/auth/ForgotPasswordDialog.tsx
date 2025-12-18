import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Mail } from "lucide-react";

export const ForgotPasswordDialog = () => {
    const [open, setOpen] = useState(false);
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [emailSent, setEmailSent] = useState(false);

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            // Vérifier la limite de tentatives
            const { data: canProceed, error: limitError } = await supabase.rpc(
                'check_password_reset_rate_limit',
                { user_email: email }
            );

            if (limitError) throw limitError;

            if (!canProceed) {
                toast.error("Trop de tentatives. Veuillez attendre 15 minutes avant de réessayer.");
                return;
            }

            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            });

            if (error) throw error;

            // Enregistrer la tentative pour le rate limiting
            await supabase.rpc('log_password_reset_attempt', { p_email: email });

            setEmailSent(true);
            toast.success("Email de réinitialisation envoyé! Vérifiez votre boîte de réception.");
        } catch (error: any) {
            toast.error(error.message || "Erreur lors de l'envoi de l'email");
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        setOpen(false);
        setEmail("");
        setEmailSent(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="link" className="text-sm px-0">
                    Mot de passe oublié?
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Réinitialiser le mot de passe</DialogTitle>
                    <DialogDescription>
                        {emailSent
                            ? "Un email de réinitialisation a été envoyé à votre adresse."
                            : "Entrez votre email pour recevoir un lien de réinitialisation."}
                    </DialogDescription>
                </DialogHeader>
                {emailSent ? (
                    <div className="space-y-4">
                        <div className="flex justify-center">
                            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                                <Mail className="w-8 h-8 text-green-600 dark:text-green-400" />
                            </div>
                        </div>
                        <p className="text-center text-sm text-muted-foreground">
                            Vérifiez votre boîte de réception et cliquez sur le lien pour réinitialiser votre mot de passe.
                        </p>
                        <Button onClick={handleClose} className="w-full">
                            Fermer
                        </Button>
                    </div>
                ) : (
                    <form onSubmit={handleResetPassword} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="reset-email">Adresse email</Label>
                            <Input
                                id="reset-email"
                                type="email"
                                placeholder="votre@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                disabled={isLoading}
                            />
                        </div>
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Envoi en cours...
                                </>
                            ) : (
                                "Envoyer le lien de réinitialisation"
                            )}
                        </Button>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
};
