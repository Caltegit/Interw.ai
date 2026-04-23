import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "impersonation_origin_session";

interface OriginSession {
  access_token: string;
  refresh_token: string;
  email: string;
  target_email: string;
}

export function isImpersonating(): boolean {
  return !!localStorage.getItem(STORAGE_KEY);
}

export function getImpersonationInfo(): OriginSession | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as OriginSession;
  } catch {
    return null;
  }
}

export async function startImpersonation(userId: string, targetEmail: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Aucune session active");

  const { data, error } = await supabase.functions.invoke("superadmin-impersonate", {
    body: { user_id: userId },
  });

  // Tenter d'extraire un message d'erreur lisible depuis la réponse de l'edge function
  if (error) {
    let detailedMessage = error.message;
    try {
      const ctx = (error as any).context;
      if (ctx && typeof ctx.json === "function") {
        const payload = await ctx.json();
        if (payload?.error) detailedMessage = payload.error;
      } else if (ctx && typeof ctx.text === "function") {
        const txt = await ctx.text();
        try {
          const parsed = JSON.parse(txt);
          if (parsed?.error) detailedMessage = parsed.error;
        } catch {
          if (txt) detailedMessage = txt;
        }
      }
    } catch {
      // ignore parsing errors
    }
    throw new Error(detailedMessage);
  }

  if ((data as any)?.error) throw new Error((data as any).error);
  const actionLink = (data as any)?.action_link as string | undefined;
  if (!actionLink) throw new Error("Lien d'authentification manquant");

  const payload: OriginSession = {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    email: session.user.email ?? "",
    target_email: targetEmail,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));

  window.location.href = actionLink;
}

export async function stopImpersonation(): Promise<void> {
  const info = getImpersonationInfo();
  if (!info) {
    window.location.href = "/admin";
    return;
  }
  await supabase.auth.signOut();
  const { error } = await supabase.auth.setSession({
    access_token: info.access_token,
    refresh_token: info.refresh_token,
  });
  localStorage.removeItem(STORAGE_KEY);
  if (error) {
    window.location.href = "/login";
    return;
  }
  window.location.href = "/admin";
}
