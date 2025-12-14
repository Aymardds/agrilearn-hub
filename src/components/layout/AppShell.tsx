import { ReactNode } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import AppSidebar from "./AppSidebar";

type Props = {
  children: ReactNode;
};

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Enums } from "@/integrations/supabase/types";

const AppShell = ({ children }: Props) => {
  const { data: user } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const { data: userRole } = useQuery({
    queryKey: ["user-role", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id)
        .single();

      if (error) return null;
      return data.role as Enums<"app_role">;
    },
  });

  return (
    <SidebarProvider>
      <AppSidebar userRole={userRole} />
      <SidebarInset>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
};

export default AppShell;