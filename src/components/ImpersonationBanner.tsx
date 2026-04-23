import { useEffect, useState } from "react";
import { UserCog, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getImpersonationInfo, stopImpersonation, isImpersonating } from "@/lib/impersonation";

export function ImpersonationBanner() {
  const [active, setActive] = useState(false);
  const [email, setEmail] = useState("");

  useEffect(() => {
    const check = () => {
      setActive(isImpersonating());
      const info = getImpersonationInfo();
      setEmail(info?.target_email ?? "");
    };
    check();
    window.addEventListener("storage", check);
    return () => window.removeEventListener("storage", check);
  }, []);

  if (!active) return null;

  return (
    <div className="sticky top-0 z-[100] w-full bg-orange-500 text-white shadow-md">
      <div className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
        <div className="flex items-center gap-2 min-w-0">
          <UserCog className="h-4 w-4 shrink-0" />
          <span className="truncate">
            Vous êtes connecté en tant que <strong>{email || "utilisateur"}</strong> (prise en main super administrateur)
          </span>
        </div>
        <Button
          size="sm"
          variant="secondary"
          className="shrink-0 bg-white text-orange-700 hover:bg-orange-50"
          onClick={() => stopImpersonation()}
        >
          <LogOut className="h-4 w-4 mr-1" />
          Revenir à mon compte
        </Button>
      </div>
    </div>
  );
}
