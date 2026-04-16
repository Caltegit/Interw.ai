import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, FolderKanban, Video } from "lucide-react";

export function StatsOverview() {
  const [stats, setStats] = useState({ orgs: 0, users: 0, projects: 0, sessions: 0 });

  useEffect(() => {
    Promise.all([
      supabase.from("organizations").select("id", { count: "exact", head: true }),
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("projects").select("id", { count: "exact", head: true }),
      supabase.from("sessions").select("id", { count: "exact", head: true }),
    ]).then(([o, u, p, s]) => {
      setStats({ orgs: o.count ?? 0, users: u.count ?? 0, projects: p.count ?? 0, sessions: s.count ?? 0 });
    });
  }, []);

  const items = [
    { label: "Organisations", value: stats.orgs, icon: Building2 },
    { label: "Utilisateurs", value: stats.users, icon: Users },
    { label: "Projets", value: stats.projects, icon: FolderKanban },
    { label: "Sessions", value: stats.sessions, icon: Video },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((item) => (
        <Card key={item.label}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{item.label}</CardTitle>
            <item.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{item.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
