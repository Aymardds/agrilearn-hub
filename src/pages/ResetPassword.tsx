import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Leaf, Lock, CheckCircle2 } from "lucide-react";

const ResetPassword = () => {
    const navigate = useNavigate();
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isValidToken, setIsValidToken] = useState(false);
    const [isCheckingToken, setIsCheckingToken] = useState(true);

    useEffect(() => {
        // Vérifier si nous avons un token de réinitialisation valide
        const checkToken = async () => {
            const hash = window.location.hash;

            if (!hash || !hash.includes("access_token")) {
                toast.error("Lien de réinitialisation invalide ou expiré.");
                navigate("/auth");
                return;
            }

            const params = new URLSearchParams(hash.slice(1));
            const type = params.get("type");

            if (type !== "recovery") {
                toast.error("Ce lien n'est pas un lien de réinitialisation de mot de passe.");
                navigate("/auth");
                return;
            }

            setIsValidToken(true);
            setIsCheckingToken(false);
        };

        checkToken();
    }, [navigate]);

    const validatePassword = (password: string): { valid: boolean; message?: string } => {
        if (password.length < 6) {
            return { valid: false, message: "Le mot de passe doit contenir au moins 6 caractères" };
        }
        if (!/[A-Z]/.test(password)) {
            return { valid: false, message: "Le mot de passe doit contenir au moins une majuscule" };
        }
        if (!/[a-z]/.test(password)) {
            return { valid: false, message: "Le mot de passe doit contenir au moins une minuscule" };
        }
        if (!/[0-9]/.test(password)) {
            return { valid: false, message: "Le mot de passe doit contenir au moins un chiffre" };
        }
        return { valid: true };
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            toast.error("Les mots de passe ne correspondent pas");
            return;
        }

        const validation = validatePassword(password);
        if (!validation.valid) {
            toast.error(validation.message);
            return;
        }

        setIsLoading(true);

        try {
            const { error } = await supabase.auth.updateUser({
                password: password,
            });

            if (error) throw error;

            toast.success("Mot de passe réinitialisé avec succès!", {
                description: "Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.",
            });

            // Rediriger vers la page de connexion après un court délai
            setTimeout(() => {
                navigate("/auth");
            }, 2000);
        } catch (error: any) {
            toast.error(error.message || "Erreur lors de la réinitialisation du mot de passe");
        } finally {
            setIsLoading(false);
        }
    };

    if (isCheckingToken) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-hero">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!isValidToken) {
        return null;
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
            <Card className="w-full max-w-md shadow-xl">
                <CardHeader className="space-y-2 text-center">
                    <div className="flex justify-center mb-2">
                        <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
                            <Lock className="w-6 h-6 text-primary-foreground" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold">Nouveau mot de passe</CardTitle>
                    <CardDescription>
                        Choisissez un mot de passe sécurisé pour votre compte
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleResetPassword} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="password">Nouveau mot de passe</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                                disabled={isLoading}
                                placeholder="Au moins 6 caractères"
                            />
                            <div className="space-y-1 text-xs text-muted-foreground">
                                <div className={password.length >= 6 ? "text-green-600 flex items-center gap-1" : "flex items-center gap-1"}>
                                    {password.length >= 6 && <CheckCircle2 className="w-3 h-3" />}
                                    <span>Au moins 6 caractères</span>
                                </div>
                                <div className={/[A-Z]/.test(password) ? "text-green-600 flex items-center gap-1" : "flex items-center gap-1"}>
                                    {/[A-Z]/.test(password) && <CheckCircle2 className="w-3 h-3" />}
                                    <span>Au moins une majuscule</span>
                                </div>
                                <div className={/[a-z]/.test(password) ? "text-green-600 flex items-center gap-1" : "flex items-center gap-1"}>
                                    {/[a-z]/.test(password) && <CheckCircle2 className="w-3 h-3" />}
                                    <span>Au moins une minuscule</span>
                                </div>
                                <div className={/[0-9]/.test(password) ? "text-green-600 flex items-center gap-1" : "flex items-center gap-1"}>
                                    {/[0-9]/.test(password) && <CheckCircle2 className="w-3 h-3" />}
                                    <span>Au moins un chiffre</span>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirm-password">Confirmer le mot de passe</Label>
                            <Input
                                id="confirm-password"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                disabled={isLoading}
                                placeholder="Ressaisissez votre mot de passe"
                            />
                            {confirmPassword && (
                                <p className={`text-xs ${password === confirmPassword ? "text-green-600" : "text-red-600"}`}>
                                    {password === confirmPassword ? "✓ Les mots de passe correspondent" : "✗ Les mots de passe ne correspondent pas"}
                                </p>
                            )}
                        </div>
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Réinitialisation...
                                </>
                            ) : (
                                "Réinitialiser le mot de passe"
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

export default ResetPassword;
