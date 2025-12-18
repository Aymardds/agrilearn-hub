import * as React from "react";
import { Home, BookOpen, Shield, Users, Calendar as CalendarIcon, LogOut, Award, Settings } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarFooter,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

import { Enums } from "@/integrations/supabase/types";

interface AppSidebarProps {
  userRole?: Enums<"app_role"> | null;
}

const AppSidebar = ({ userRole }: AppSidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = React.useState(false);

  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarGroupLabel>E-GrainoLab</SidebarGroupLabel>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={location.pathname.startsWith("/dashboard")}>
                <Link to="/dashboard">
                  <Home className="size-4" />
                  Tableau de bord
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={location.pathname.startsWith("/courses")}>
                <Link to="/courses">
                  <BookOpen className="size-4" />
                  Cours
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={location.pathname.startsWith("/calendar")}>
                <Link to="/calendar">
                  <CalendarIcon className="size-4" />
                  Calendrier
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {/* Items pour Formateurs et Admins */}
            {(userRole === "formateur" || userRole === "superadmin" || userRole === "superviseur") && (
              <>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location.pathname.startsWith("/admin/courses")}>
                    <Link to="/admin/courses">
                      <Shield className="size-4" />
                      Gestion des cours
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </>
            )}

            {/* Items pour Editeurs */}
            {((userRole as unknown as string) === "editeur" || (userRole as unknown as string) === "editor") && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location.pathname.startsWith("/editor/my-courses")}>
                  <Link to="/editor/my-courses">
                    <BookOpen className="size-4" />
                    Mes Cours
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}

            {/* Items pour Admins seulement */}
            {userRole === "superadmin" && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location.pathname.startsWith("/admin/users")}>
                  <Link to="/admin/users">
                    <Users className="size-4" />
                    Utilisateurs
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
          </SidebarMenu>
        </SidebarGroup>
        <SidebarSeparator />

        {/* Section Administration pour SuperAdmin */}
        {userRole === "superadmin" && (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location.pathname.startsWith("/admin/users")}>
                  <Link to="/admin/users">
                    <Users className="size-4" />
                    Utilisateurs
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location.pathname.startsWith("/admin/courses")}>
                  <Link to="/admin/courses">
                    <Shield className="size-4" />
                    Gestion des cours
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location.pathname.startsWith("/admin/certificates")}>
                  <Link to="/admin/certificates">
                    <Award className="size-4" />
                    Certificats
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location.pathname === "/admin/certificate-settings"}>
                  <Link to="/admin/certificate-settings">
                    <Settings className="size-4" />
                    Paramètres des certificats
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter>
        <Button
          variant="outline"
          disabled={loggingOut}
          onClick={async () => {
            setLoggingOut(true);
            await supabase.auth.signOut();
            setLoggingOut(false);
            navigate("/auth");
          }}
        >
          <LogOut className="size-4 mr-2" /> Déconnexion
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;