export type CandidateFieldKey = "job_title" | "cv" | "linkedin" | "cover_letter";

export interface CandidateFieldSetting {
  enabled: boolean;
  required: boolean;
}

export type CandidateFieldsConfig = Record<CandidateFieldKey, CandidateFieldSetting>;

export const CANDIDATE_FIELD_KEYS: CandidateFieldKey[] = ["job_title", "cv", "linkedin", "cover_letter"];

export const CANDIDATE_FIELD_LABELS: Record<CandidateFieldKey, string> = {
  job_title: "Poste",
  cv: "CV",
  linkedin: "LinkedIn",
  cover_letter: "Lettre de motivation",
};

export const DEFAULT_CANDIDATE_FIELDS: CandidateFieldsConfig = {
  job_title: { enabled: false, required: false },
  cv: { enabled: false, required: false },
  linkedin: { enabled: false, required: false },
  cover_letter: { enabled: false, required: false },
};

export function mergeCandidateFields(raw: unknown): CandidateFieldsConfig {
  const out: CandidateFieldsConfig = {
    job_title: { ...DEFAULT_CANDIDATE_FIELDS.job_title },
    cv: { ...DEFAULT_CANDIDATE_FIELDS.cv },
    linkedin: { ...DEFAULT_CANDIDATE_FIELDS.linkedin },
    cover_letter: { ...DEFAULT_CANDIDATE_FIELDS.cover_letter },
  };
  if (raw && typeof raw === "object") {
    for (const key of CANDIDATE_FIELD_KEYS) {
      const v = (raw as Record<string, unknown>)[key];
      if (v && typeof v === "object") {
        const obj = v as Record<string, unknown>;
        out[key] = {
          enabled: !!obj.enabled,
          required: !!obj.required,
        };
      }
    }
  }
  return out;
}
