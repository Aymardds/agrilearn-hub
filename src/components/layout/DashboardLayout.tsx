import { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import NotificationCenter from "@/components/notifications/NotificationCenter";

import { Enums } from "@/integrations/supabase/types";

type Props = {
    children: ReactNode;
    title?: string;
    description?: string;
    userRole?: Enums<"app_role"> | null;
};

const DashboardLayout = ({ children, title, description }: Props) => {
    const { data: user } = useQuery({
        queryKey: ["current-user"],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            return user;
        },
    });

    return (
        <div className="flex flex-col min-h-full w-full">
            {/* Header avec trigger sidebar et notifications */}
            <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10">
                <SidebarTrigger className="-ml-1" />
                <Separator orientation="vertical" className="mr-2 h-4" />

                {/* Titre de la page */}
                {title && (
                    <div className="flex-1">
                        <h1 className="text-lg font-semibold">{title}</h1>
                        {description && (
                            <p className="text-sm text-muted-foreground">{description}</p>
                        )}
                    </div>
                )}

                {/* Spacer si pas de titre */}
                {!title && <div className="flex-1" />}

                {/* Notification Center */}
                {user && <NotificationCenter userId={user.id} />}
            </header>

            {/* Contenu principal */}
            <div className="flex flex-1 flex-col">
                {children}
            </div>
        </div>
    );
};

export default DashboardLayout;
