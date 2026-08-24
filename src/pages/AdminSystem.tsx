import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import EmailsTab from "@/components/admin/EmailsTab";
import SessionsQueueTab from "@/components/admin/SessionsQueueTab";

const TABS = ["emails", "sessions"] as const;

export default function AdminSystem() {
  const [searchParams, setSearchParams] = useSearchParams();
  const raw = searchParams.get("tab");
  const tab = TABS.includes(raw as (typeof TABS)[number]) ? (raw as string) : "emails";

  const onChange = (value: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", value);
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Système</h1>

      <Tabs value={tab} onValueChange={onChange}>
        <TabsList>
          <TabsTrigger value="emails">Emails</TabsTrigger>
          <TabsTrigger value="sessions">File des sessions</TabsTrigger>
        </TabsList>

        <TabsContent value="emails" className="mt-6">
          <EmailsTab />
        </TabsContent>

        <TabsContent value="sessions" className="mt-6">
          <SessionsQueueTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
