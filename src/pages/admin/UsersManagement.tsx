import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, Edit, Trash2, Search, User, Shield } from "lucide-react";
import { toast } from "sonner";
// header fourni par AppShell

const UsersManagement = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "apprenant" | "formateur" | "superviseur" | "superadmin" | "editeur" | "incube">("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    full_name: "",
    phone: "",
    bio: "",
    experience_years: "",
    role: "apprenant" as "apprenant" | "formateur" | "superviseur" | "superadmin" | "editeur" | "incube",
  });

  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const { data: userRole } = useQuery({
    queryKey: ["user-role", currentUser?.id],
    queryFn: async () => {
      if (!currentUser) return null;
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", currentUser.id)
        .single();
      if (error) throw error;
      return data?.role;
    },
    enabled: !!currentUser,
  });

  const { data: users } = useQuery({
    queryKey: ["admin-users", searchTerm, roleFilter],
    queryFn: async () => {
      let query = supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (searchTerm) {
        query = query.or(`full_name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,bio.ilike.%${searchTerm}%`);
      }

      const { data: profilesData, error: profilesError } = await query;
      if (profilesError) throw profilesError;

      const ids = (profilesData || []).map((p: any) => p.id);
      let roleByUser: Record<string, string> = {};
      if (ids.length > 0) {
        const { data: rolesData, error: rolesError } = await supabase
          .from("user_roles")
          .select("user_id, role")
          .in("user_id", ids);
        if (rolesError) throw rolesError;
        (rolesData || []).forEach((r: any) => { roleByUser[r.user_id] = r.role; });
      }

      const mapped = (profilesData || []).map((profile: any) => ({
        ...profile,
        email: "N/A",
        role: roleByUser[profile.id] || "apprenant",
      }));

      return mapped.filter((u: any) => roleFilter === "all" || u.role === roleFilter);
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      // Note: La création d'utilisateur via admin API nécessite des permissions spéciales
      // Pour l'instant, on crée via signUp et on gère les erreurs
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.full_name,
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Erreur lors de la création de l'utilisateur");

      // Créer le profil
      const { error: profileError } = await supabase.from("profiles").insert({
        id: authData.user.id,
        full_name: data.full_name,
        phone: data.phone || null,
        bio: data.bio || null,
        experience_years: data.experience_years ? parseInt(data.experience_years) : null,
      });

      if (profileError) throw profileError;

      // Créer le rôle
      const { error: roleError } = await supabase.from("user_roles").insert({
        user_id: authData.user.id,
        role: data.role,
      });

      if (roleError) throw roleError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Utilisateur créé avec succès!");
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      const msg = String(error?.message || "");
      if (msg.includes("invalid input value for enum app_role")) {
        toast.error("Le rôle 'superviseur' n'est pas configuré dans la base. Exécutez: ALTER TYPE public.app_role ADD VALUE 'superviseur';");
      } else {
        toast.error("Erreur lors de la création: " + error.message);
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      // Mettre à jour le profil
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: data.full_name,
          phone: data.phone || null,
          bio: data.bio || null,
          experience_years: data.experience_years ? parseInt(data.experience_years) : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedUser.id);

      if (profileError) throw profileError;

      // Vérifier si le rôle existe déjà
      const { data: existingRole } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", selectedUser.id)
        .single();

      if (existingRole) {
        // Mettre à jour le rôle existant
        const { error: roleError } = await supabase
          .from("user_roles")
          .update({ role: data.role })
          .eq("user_id", selectedUser.id);
        if (roleError) throw roleError;
      } else {
        // Créer un nouveau rôle
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({
            user_id: selectedUser.id,
            role: data.role,
          });
        if (roleError) throw roleError;
      }

      // Note: La mise à jour de l'email nécessite des permissions admin
      // Pour l'instant, on ne met pas à jour l'email via cette interface
      // L'utilisateur peut le faire via son profil
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Utilisateur mis à jour avec succès!");
      setIsEditDialogOpen(false);
      setSelectedUser(null);
      resetForm();
    },
    onError: (error: any) => {
      const msg = String(error?.message || "");
      if (msg.includes("invalid input value for enum app_role")) {
        toast.error("Le rôle 'superviseur' n'est pas configuré dans la base. Exécutez: ALTER TYPE public.app_role ADD VALUE 'superviseur';");
      } else {
        toast.error("Erreur lors de la mise à jour: " + error.message);
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      // Supprimer le rôle
      const { error: roleError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId);

      if (roleError) throw roleError;

      // Supprimer le profil
      const { error: profileError } = await supabase
        .from("profiles")
        .delete()
        .eq("id", userId);

      if (profileError) throw profileError;

      // Note: La suppression de l'utilisateur auth nécessite des permissions admin
      // Pour l'instant, on supprime seulement le profil et le rôle
      // L'utilisateur auth restera mais ne pourra plus accéder à l'application
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Utilisateur supprimé avec succès!");
      setIsDeleteDialogOpen(false);
      setSelectedUser(null);
    },
    onError: (error: any) => {
      toast.error("Erreur lors de la suppression: " + error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      email: "",
      password: "",
      full_name: "",
      phone: "",
      bio: "",
      experience_years: "",
      role: "apprenant",
    });
  };

  const handleCreate = () => {
    if (!formData.email || !formData.password || !formData.full_name) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }
    createMutation.mutate(formData);
  };

  const handleEdit = (user: any) => {
    setSelectedUser(user);
    setFormData({
      email: user.email || "",
      password: "",
      full_name: user.full_name || "",
      phone: user.phone || "",
      bio: user.bio || "",
      experience_years: user.experience_years?.toString() || "",
      role: user.role || "apprenant",
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = () => {
    if (!formData.full_name) {
      toast.error("Le nom complet est obligatoire");
      return;
    }
    updateMutation.mutate(formData);
  };

  const handleDelete = (user: any) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedUser) {
      deleteMutation.mutate(selectedUser.id);
    }
  };

  const getRoleBadge = (role: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      superadmin: "default",
      superviseur: "default",
      formateur: "secondary",
      editeur: "secondary",
      apprenant: "outline",
      incube: "secondary",
    };
    return (
      <Badge variant={variants[role] || "outline"}>
        {role === "superadmin" && "🔑 "}
        {role === "superviseur" && "🛡️ "}
        {role === "formateur" && "👨‍🏫 "}
        {role === "editeur" && "✍️ "}
        {role === "apprenant" && "👤 "}
        {role === "incube" && "🌱 "}
        {role}
      </Badge>
    );
  };

  // Vérifier l'accès (superadmin uniquement)
  if (userRole !== "superadmin") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted">

        <main className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2">Accès refusé</h2>
                <p className="text-muted-foreground">
                  Vous devez être super administrateur pour accéder à cette page.
                </p>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">


      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Gestion des utilisateurs</h1>
            <p className="text-muted-foreground">
              Créez, modifiez et supprimez des utilisateurs
            </p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="w-4 h-4 mr-2" />
                Nouvel utilisateur
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Créer un nouvel utilisateur</DialogTitle>
                <DialogDescription>
                  Remplissez les informations pour créer un nouvel utilisateur
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="password">Mot de passe *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Mot de passe"
                  />
                </div>
                <div>
                  <Label htmlFor="full_name">Nom complet *</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="Nom complet"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Téléphone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+33 6 12 34 56 78"
                  />
                </div>
                <div>
                  <Label htmlFor="bio">Biographie</Label>
                  <Input
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    placeholder="Biographie"
                  />
                </div>
                <div>
                  <Label htmlFor="experience_years">Années d'expérience</Label>
                  <Input
                    id="experience_years"
                    type="number"
                    value={formData.experience_years}
                    onChange={(e) => setFormData({ ...formData, experience_years: e.target.value })}
                    placeholder="5"
                  />
                </div>
                <div>
                  <Label htmlFor="role">Rôle *</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value: "apprenant" | "formateur" | "superviseur" | "superadmin" | "editeur" | "incube") =>
                      setFormData({ ...formData, role: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="apprenant">👤 Apprenant</SelectItem>
                      <SelectItem value="formateur">👨‍🏫 Formateur</SelectItem>
                      <SelectItem value="editeur">✍️ Éditeur</SelectItem>
                      <SelectItem value="superadmin">🔑 Super Admin</SelectItem>
                      <SelectItem value="superviseur">🛡️ Superviseur</SelectItem>
                      <SelectItem value="incube">🌱 Incubé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={handleCreate}>
                  Créer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="mb-6 grid gap-4 md:grid-cols-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input
              placeholder="Rechercher un utilisateur..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div>
            <Label>Filtrer par rôle</Label>
            <Select value={roleFilter} onValueChange={(v: "all" | "apprenant" | "formateur" | "superviseur" | "superadmin" | "editeur" | "incube") => setRoleFilter(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Tous les rôles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="apprenant">👤 Apprenant</SelectItem>
                <SelectItem value="formateur">👨‍🏫 Formateur</SelectItem>
                <SelectItem value="editeur">✍️ Éditeur</SelectItem>
                <SelectItem value="superviseur">🛡️ Superviseur</SelectItem>
                <SelectItem value="superadmin">🔑 Super Admin</SelectItem>
                <SelectItem value="incube">🌱 Incubé</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>Utilisateurs ({users?.length || 0})</CardTitle>
            <CardDescription>Liste de tous les utilisateurs</CardDescription>
          </CardHeader>
          <CardContent>
            {users && users.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Utilisateur</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Rôle</TableHead>
                      <TableHead>Expérience</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={user.avatar_url || undefined} />
                              <AvatarFallback>
                                {user.full_name
                                  ?.split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .toUpperCase() || "U"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{user.full_name}</div>
                              {user.phone && (
                                <div className="text-sm text-muted-foreground">
                                  {user.phone}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{getRoleBadge(user.role)}</TableCell>
                        <TableCell>
                          {user.experience_years
                            ? `${user.experience_years} ans`
                            : "N/A"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(user)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(user)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Aucun utilisateur trouvé</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Modifier l'utilisateur</DialogTitle>
              <DialogDescription>
                Modifiez les informations de l'utilisateur
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-password">Nouveau mot de passe (laisser vide pour ne pas changer)</Label>
                <Input
                  id="edit-password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Nouveau mot de passe"
                />
              </div>
              <div>
                <Label htmlFor="edit-full_name">Nom complet *</Label>
                <Input
                  id="edit-full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-phone">Téléphone</Label>
                <Input
                  id="edit-phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-bio">Biographie</Label>
                <Input
                  id="edit-bio"
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-experience_years">Années d'expérience</Label>
                <Input
                  id="edit-experience_years"
                  type="number"
                  value={formData.experience_years}
                  onChange={(e) => setFormData({ ...formData, experience_years: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-role">Rôle *</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value: "apprenant" | "formateur" | "superviseur" | "superadmin" | "editeur" | "incube") =>
                    setFormData({ ...formData, role: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="apprenant">👤 Apprenant</SelectItem>
                    <SelectItem value="formateur">👨‍🏫 Formateur</SelectItem>
                    <SelectItem value="editeur">✍️ Éditeur</SelectItem>
                    <SelectItem value="superadmin">🔑 Super Admin</SelectItem>
                    <SelectItem value="superviseur">🛡️ Superviseur</SelectItem>
                    <SelectItem value="incube">🌱 Incubé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleUpdate}>
                Enregistrer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Êtes-vous sûr?</AlertDialogTitle>
              <AlertDialogDescription>
                Cette action est irréversible. L'utilisateur "{selectedUser?.full_name}" sera
                définitivement supprimé.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-destructive">
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
};

export default UsersManagement;

