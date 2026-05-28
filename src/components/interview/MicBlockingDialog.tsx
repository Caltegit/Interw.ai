import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MicOff, RotateCcw, Settings2 } from "lucide-react";

interface MicBlockingDialogProps {
  open: boolean;
  retrying?: boolean;
  onRetry: () => void;
  onRedoTest: () => void;
}

/**
 * Modal non-dismissible affichée au démarrage de session quand le micro est
 * silencieux ou coupé. Empêche le candidat de commencer un entretien muet.
 */
export default function MicBlockingDialog({ open, retrying, onRetry, onRedoTest }: MicBlockingDialogProps) {
  return (
    <Dialog open={open}>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/15">
            <MicOff className="h-6 w-6 text-destructive" />
          </div>
          <DialogTitle className="text-center">Micro non détecté</DialogTitle>
          <DialogDescription className="text-center">
            Aucun son n'a été capté. Votre micro est peut-être coupé, débranché, ou utilisé par une autre application
            (Teams, Zoom, autre onglet). Vérifiez votre matériel puis réessayez.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
          <Button onClick={onRetry} disabled={retrying} className="w-full">
            <RotateCcw className="mr-2 h-4 w-4" />
            {retrying ? "Vérification…" : "Réessayer"}
          </Button>
          <Button onClick={onRedoTest} variant="outline" className="w-full">
            <Settings2 className="mr-2 h-4 w-4" />
            Refaire le test technique
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
