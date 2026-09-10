import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { User } from "@supabase/supabase-js";
import { Rocket, ArrowRight } from "lucide-react";
import IncubationDashboard from "@/pages/incubation/IncubationDashboard";

interface IncubeDashboardProps {
  user: User;
}

export default function IncubeDashboard({ user }: IncubeDashboardProps) {
  return <IncubationDashboard />;
}
