import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MicOff, Settings2 } from "lucide-react";

interface MicBlockingDialogProps {
  open: boolean;
  onRedoTest: () => void;
}

/**
 * Modal non-dismissible affichée au démarrage de session si la garde micro échoue
 * (pas de test technique valide récent, ou piste audio indisponible).
 * Une seule action : refaire le test technique. Évite les boucles de remesure
 * qui causaient des faux positifs.
 */
export default function MicBlockingDialog({ open, onRedoTest }: MicBlockingDialogProps) {
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
          <DialogTitle className="text-center">Micro indisponible</DialogTitle>
          <DialogDescription className="text-center">
            Votre micro n'est pas accessible ou le test technique n'a pas été validé récemment.
            Refaites le test pour vérifier votre matériel avant de démarrer l'entretien.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
          <Button onClick={onRedoTest} className="w-full">
            <Settings2 className="mr-2 h-4 w-4" />
            Refaire le test technique
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
