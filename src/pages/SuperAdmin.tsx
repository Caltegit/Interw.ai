import { useState } from "react";
import { Link } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { StatsOverview } from "@/components/superadmin/StatsOverview";
import { OrgsTable } from "@/components/superadmin/OrgsTable";
import { UsersTable } from "@/components/superadmin/UsersTable";
import { CreateOrgDialog } from "@/components/superadmin/CreateOrgDialog";
import { AudioLines } from "lucide-react";

export default function SuperAdmin() {
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = () => setRefreshKey((k) => k + 1);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Console Super Admin</h1>
          <p className="text-muted-foreground">Gérez la plateforme : organisations, utilisateurs et statistiques.</p>
        </div>
        <Button asChild variant="outline">
          <Link to="/admin/tts-compare">
            <AudioLines className="mr-2 h-4 w-4" />
            Comparer les voix TTS
          </Link>
        </Button>
      </div>

      <StatsOverview />

      <Tabs defaultValue="orgs">
        <TabsList>
          <TabsTrigger value="orgs">Organisations</TabsTrigger>
          <TabsTrigger value="users">Utilisateurs</TabsTrigger>
        </TabsList>

        <TabsContent value="orgs" className="space-y-4">
          <div className="flex justify-end">
            <CreateOrgDialog onCreated={refresh} />
          </div>
          <OrgsTable refreshKey={refreshKey} onChange={refresh} />
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <UsersTable refreshKey={refreshKey} onChange={refresh} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
