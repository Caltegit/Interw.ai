import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { logger } from "@/lib/logger";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: { id: string; full_name: string; email: string } | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AuthContextType["profile"]>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      logger.setUser(session?.user?.id ?? null);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      logger.setUser(session?.user?.id ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    (async () => {
      const { data: prof } = await supabase
        .from("profiles")
        .select("id, full_name, email, organization_id")
        .eq("user_id", user.id)
        .single();
      setProfile(prof);

      // Filet de sécurité : si aucune org rattachée, accepter une éventuelle invitation en cours
      const email = (prof?.email || user.email || "").toLowerCase();
      if (prof && !prof.organization_id && email) {
        const { data: inv } = await supabase
          .from("organization_invitations")
          .select("token")
          .ilike("email", email)
          .eq("status", "pending")
          .gt("expires_at", new Date().toISOString())
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (inv?.token) {
          const { error: acceptErr } = await supabase.rpc("accept_invitation", {
            _token: inv.token,
            _user_id: user.id,
          });
          if (!acceptErr) {
            const { data: refreshed } = await supabase
              .from("profiles")
              .select("id, full_name, email")
              .eq("user_id", user.id)
              .single();
            setProfile(refreshed);
          }
        }
      }
    })();
  }, [user]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
