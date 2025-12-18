import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Leaf, Mail, AlertCircle, CheckCircle2 } from "lucide-react";
import { ForgotPasswordDialog } from "@/components/auth/ForgotPasswordDialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const Auth = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Messages d'erreur plus explicites
        if (error.message.includes("Invalid login credentials")) {
          throw new Error("Email ou mot de passe incorrect");
        } else if (error.message.includes("Email not confirmed")) {
          throw new Error("Veuillez confirmer votre email avant de vous connecter. Vérifiez votre boîte de réception.");
        }
        throw error;
      }

      toast.success("Connexion réussie!");
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Erreur de connexion");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId) {
      toast.error("Veuillez choisir une filière");
      return;
    }
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            category_id: categoryId,
          },
          emailRedirectTo: `${window.location.origin}/auth`,
        },
      });

      if (error) throw error;

      // Vérifier si l'email existe déjà
      if (data?.user && !data?.session) {
        setShowConfirmation(true);
        toast.success("Inscription réussie!", {
          description: "Vérifiez votre email pour confirmer votre compte.",
        });
      } else if (data?.session) {
        // Auto-confirmation activée (mode développement)
        toast.success("Compte créé et confirmé!");
        navigate("/dashboard");
      }
    } catch (error: any) {
      if (error.message.includes("User already registered")) {
        toast.error("Cet email est déjà utilisé. Essayez de vous connecter ou de réinitialiser votre mot de passe.");
      } else {
        toast.error(error.message || "Erreur lors de l'inscription");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes("access_token")) {
      const params = new URLSearchParams(hash.slice(1));
      const type = params.get("type");
      const access_token = params.get("access_token") || "";
      const refresh_token = params.get("refresh_token") || "";

      // Gérer les erreurs
      if (params.get("error_code")) {
        const errorDescription = params.get("error_description") || "Lien invalide ou expiré";
        toast.error(decodeURIComponent(errorDescription));
        window.history.replaceState({}, document.title, window.location.pathname);
        navigate("/auth");
        return;
      }

      // Rediriger vers la page de réinitialisation si c'est un token de recovery
      if (type === "recovery") {
        // Le token sera géré par la page ResetPassword
        navigate("/reset-password" + hash);
        return;
      }

      // Gérer la confirmation d'email
      if (access_token && refresh_token && type === "signup") {
        supabase.auth.setSession({ access_token, refresh_token })
          .then(({ error }) => {
            if (error) {
              toast.error("Impossible de vous connecter automatiquement.");
              navigate("/auth");
            } else {
              toast.success("Email confirmé avec succès!", {
                description: "Bienvenue sur E-GrainoLab!",
              });
              navigate("/dashboard");
            }
          });
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-2 text-center">
          <div className="flex justify-center mb-2">
            <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
              <Leaf className="w-6 h-6 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">E-GrainoLab</CardTitle>
          <CardDescription>
            Plateforme d'apprentissage pour le secteur agricole
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Connexion</TabsTrigger>
              <TabsTrigger value="signup">Inscription</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="votre@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Mot de passe</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="flex items-center justify-end">
                  <ForgotPasswordDialog />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Connexion...
                    </>
                  ) : (
                    "Se connecter"
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Nom complet</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="Votre nom"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-category">Filière</Label>
                  <Select value={categoryId} onValueChange={setCategoryId} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir une filière" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories?.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="votre@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Mot de passe</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Inscription...
                    </>
                  ) : (
                    "S'inscrire"
                  )}
                </Button>
              </form>

              {showConfirmation && (
                <Alert className="mt-4">
                  <Mail className="h-4 w-4" />
                  <AlertTitle>Vérifiez votre email</AlertTitle>
                  <AlertDescription>
                    Un email de confirmation a été envoyé à <strong>{email}</strong>.
                    Cliquez sur le lien dans l'email pour activer votre compte.
                    <br />
                    <span className="text-xs text-muted-foreground mt-2 block">
                      Vous n'avez pas reçu l'email ? Vérifiez vos spams ou réessayez dans quelques minutes.
                    </span>
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
