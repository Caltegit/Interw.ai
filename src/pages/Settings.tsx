import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";

export default function Settings() {
  const { profile } = useAuth();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Paramètres</h1>
      <Card>
        <CardHeader><CardTitle>Mon compte</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><strong>Nom :</strong> {profile?.full_name || "—"}</p>
          <p><strong>Email :</strong> {profile?.email || "—"}</p>
        </CardContent>
      </Card>
    </div>
  );
}
