import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Brain } from "lucide-react";
import { PersonalityRadar } from "./PersonalityRadar";
import { SoftSkillsCard } from "./SoftSkillsCard";

interface Props {
  personalityProfile?: any;
  softSkills?: any;
  projectAverages?: any;
  onGoToMessage?: (id: string) => void;
}

export function DeepAnalysisAccordion({
  personalityProfile,
  softSkills,
  projectAverages,
  onGoToMessage,
}: Props) {
  const hasContent =
    (personalityProfile && Object.keys(personalityProfile).length > 0) ||
    (softSkills && softSkills.length > 0);
  if (!hasContent) return null;

  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="deep" className="border rounded-lg bg-card">
        <AccordionTrigger className="px-4 py-3 hover:no-underline">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Brain className="h-4 w-4 text-muted-foreground" />
            Analyse approfondie (Big Five & soft skills)
          </div>
        </AccordionTrigger>
        <AccordionContent className="space-y-4 px-4 pb-4">
          <PersonalityRadar
            profile={personalityProfile}
            onGoToMessage={onGoToMessage}
            projectAverages={projectAverages}
          />
          <SoftSkillsCard skills={softSkills} onGoToMessage={onGoToMessage} />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
