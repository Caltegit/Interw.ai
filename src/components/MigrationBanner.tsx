import { ArrowRight } from "lucide-react";
import { V2_LOGIN_URL } from "@/lib/migration";

export function MigrationBanner() {
  return (
    <div className="sticky top-0 z-30 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b bg-foreground px-4 py-2 text-sm text-background">
      <span>Interw déménage sur app.interw.com. Vos nouveaux postes se créent là-bas.</span>
      <a href={V2_LOGIN_URL} className="inline-flex items-center gap-1 font-medium underline underline-offset-4 hover:opacity-80">
        Ouvrir la nouvelle version <ArrowRight className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}
