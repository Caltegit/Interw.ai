import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FeedbackStatus, getFeedbackStatusConfig } from "./FeedbackStatusBadge";
import { cn } from "@/lib/utils";

interface Props {
  value: FeedbackStatus;
  onChange: (next: FeedbackStatus) => void;
  disabled?: boolean;
}

const STATUSES: FeedbackStatus[] = ["open", "in_progress", "archived"];

const DOT: Record<FeedbackStatus, string> = {
  open: "bg-success",
  in_progress: "bg-warning",
  archived: "bg-destructive",
};

export function FeedbackStatusSelect({ value, onChange, disabled }: Props) {
  const cfg = getFeedbackStatusConfig(value);
  return (
    <Select value={value} onValueChange={(v) => onChange(v as FeedbackStatus)} disabled={disabled}>
      <SelectTrigger className={cn("h-8 w-[140px] text-xs", cfg.className)}>
        <SelectValue>
          <span className="inline-flex items-center gap-2">
            <span className={cn("h-2 w-2 rounded-full", DOT[value])} />
            {cfg.label}
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {STATUSES.map((s) => {
          const c = getFeedbackStatusConfig(s);
          return (
            <SelectItem key={s} value={s}>
              <span className="inline-flex items-center gap-2">
                <span className={cn("h-2 w-2 rounded-full", DOT[s])} />
                {c.label}
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
