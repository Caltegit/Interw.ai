import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listPostesTool from "./tools/list-postes";
import listCandidatsTool from "./tools/list-candidats";
import getRapportTool from "./tools/get-rapport";
import getTranscriptTool from "./tools/get-transcript";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "interw",
  title: "Interw",
  version: "0.1.0",
  instructions:
    "Outils Interw pour le recrutement par entretien vidéo asynchrone. Utilise list_postes pour retrouver un poste, list_candidats pour ses candidats, puis get_rapport et get_transcript pour analyser un entretien.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listPostesTool, listCandidatsTool, getRapportTool, getTranscriptTool],
});
