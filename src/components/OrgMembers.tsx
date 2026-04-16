import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Users, UserPlus, Trash2, Copy, Mail, Clock, ShieldCheck, ShieldAlert, ArrowUp, ArrowDown, Crown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useOrgRole } from "@/hooks/useOrgRole";

interface Member {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  isAdmin: boolean;
  isOwner: boolean;
}

interface Invitation {
  id: string;
  email: string;
  status: string;
  created_at: string;
  token: string;
}

export function OrgMembers({ orgId }: { orgId: string }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isAdmin } = useOrgRole();

  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  const loadData = async () => {
    setLoading(true);
    const [membersRes, invitationsRes, orgRes, rolesRes] = await Promise.all([
      supabase.from("profiles").select("id, user_id, full_name, email").eq("organization_id", orgId),
      supabase
        .from("organization_invitations")
        .select("id, email, status, created_at, token")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false }),
      supabase.from("organizations").select("owner_id").eq("id", orgId).single(),
      supabase.from("user_roles").select("user_id, role").eq("organization_id", orgId).eq("role", "admin"),
    ]);

    const owner = (orgRes.data as any)?.owner_id ?? null;
    setOwnerId(owner);
    const adminIds = new Set((rolesRes.data || []).map((r: any) => r.user_id));

    const enriched: Member[] = (membersRes.data || []).map((m: any) => ({
      ...m,
      isAdmin: adminIds.has(m.user_id),
      isOwner: m.user_id === owner,
    }));

    setMembers(enriched);
    setInvitations(invitationsRes.data || []);
    setLoading(false);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setSending(true);
    try {
      const { data: inv, error: insertError } = await supabase
        .from("organization_invitations")
        .insert({
          organization_id: orgId,
          email: inviteEmail.trim().toLowerCase(),
          invited_by: user!.id,
        })
        .select("token")
        .single();

      if (insertError) {
        if (insertError.message?.includes("duplicate")) {
          toast({ title: "Cet email a déjà été invité.", variant: "destructive" });
        } else {
          throw insertError;
        }
        return;
      }

      const { error: fnError } = await supabase.functions.invoke("send-invitation", {
        body: {
          email: inviteEmail.trim().toLowerCase(),
          organizationId: orgId,
          invitationToken: inv.token,
        },
      });

      if (fnError) {
        toast({
          title: "Invitation créée",
          description: "L'email n'a pas pu être envoyé. Copiez le lien et partagez-le manuellement.",
        });
      } else {
        toast({ title: "Invitation envoyée !", description: `Email envoyé à ${inviteEmail}` });
      }

      setInviteEmail("");
      loadData();
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const handleRemoveMember = async (member: Member) => {
    if (member.isOwner) {
      toast({ title: "Impossible de retirer le propriétaire.", variant: "destructive" });
      return;
    }
    if (member.user_id === user?.id) {
      toast({ title: "Vous ne pouvez pas vous retirer vous-même.", variant: "destructive" });
      return;
    }
    try {
      // Remove org roles first then unlink profile
      await supabase.from("user_roles").delete().eq("user_id", member.user_id).eq("organization_id", orgId);
      const { error } = await supabase.from("profiles").update({ organization_id: null }).eq("id", member.id);
      if (error) throw error;
      toast({ title: `${member.full_name || member.email} a été retiré.` });
      loadData();
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    }
  };

  const handlePromote = async (member: Member) => {
    try {
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: member.user_id, role: "admin", organization_id: orgId });
      if (error) throw error;
      toast({ title: `${member.full_name || member.email} est maintenant admin.` });
      loadData();
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    }
  };

  const handleDemote = async (member: Member) => {
    if (member.isOwner) {
      toast({ title: "Le propriétaire ne peut pas être rétrogradé.", variant: "destructive" });
      return;
    }
    try {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", member.user_id)
        .eq("organization_id", orgId)
        .eq("role", "admin");
      if (error) throw error;
      toast({ title: `${member.full_name || member.email} n'est plus admin.` });
      loadData();
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    }
  };

  const handleCancelInvitation = async (inv: Invitation) => {
    try {
      const { error } = await supabase.from("organization_invitations").delete().eq("id", inv.id);
      if (error) throw error;
      toast({ title: "Invitation annulée." });
      loadData();
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    }
  };

  const copyInviteLink = (token: string) => {
    const link = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(link);
    toast({ title: "Lien copié !" });
  };

  const pendingInvitations = invitations.filter((i) => i.status === "pending");

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-5 w-5" /> Membres de l'organisation
        </CardTitle>
        <CardDescription>
          {members.length} membre{members.length > 1 ? "s" : ""} · {pendingInvitations.length} invitation{pendingInvitations.length > 1 ? "s" : ""} en attente
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!isAdmin && (
          <div className="flex items-start gap-2 rounded-md border border-border bg-muted p-3 text-sm text-muted-foreground">
            <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0" />
            <span>Seuls les administrateurs peuvent inviter ou gérer les membres.</span>
          </div>
        )}

        {isAdmin && (
          <form onSubmit={handleInvite} className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="inviteEmail" className="sr-only">Email</Label>
              <Input
                id="inviteEmail"
                type="email"
                placeholder="email@exemple.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={sending} size="sm">
              <UserPlus className="mr-2 h-4 w-4" />
              {sending ? "Envoi..." : "Inviter"}
            </Button>
          </form>
        )}

        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Membres actifs</h4>
          {members.map((m) => (
            <div key={m.id} className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">{m.full_name || "Sans nom"}</p>
                <p className="text-xs text-muted-foreground">{m.email}</p>
              </div>
              <div className="flex items-center gap-2">
                {m.isOwner ? (
                  <Badge variant="default" className="gap-1">
                    <Crown className="h-3 w-3" /> Propriétaire
                  </Badge>
                ) : m.isAdmin ? (
                  <Badge variant="default" className="gap-1">
                    <ShieldCheck className="h-3 w-3" /> Admin
                  </Badge>
                ) : (
                  <Badge variant="secondary">Recruteur</Badge>
                )}
                {m.user_id === user?.id && <Badge variant="outline">Vous</Badge>}

                {isAdmin && !m.isOwner && (
                  <>
                    {m.isAdmin ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDemote(m)}
                        className="h-8 w-8"
                        title="Rétrograder en recruteur"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handlePromote(m)}
                        className="h-8 w-8"
                        title="Promouvoir admin"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                    )}
                    {m.user_id !== user?.id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveMember(m)}
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        title="Retirer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {pendingInvitations.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Invitations en attente</h4>
            {pendingInvitations.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between rounded-md border border-dashed p-3">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm">{inv.email}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(inv.created_at).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyInviteLink(inv.token)}
                    className="h-8 w-8"
                    title="Copier le lien"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleCancelInvitation(inv)}
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      title="Annuler l'invitation"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
