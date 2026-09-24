// Grille des 8 profils Interw (copie front de supabase/functions/_shared/interw-profiles.ts).
// L'ordre définit la position sur la roue (sens horaire à partir du haut).
export const INTERW_PROFILES = [
  { key: "leader", label: "Leader", color: "--profile-leader", definition: "Prend la direction, décide et embarque les autres", oral: "« J'ai décidé », « j'ai organisé », « on a suivi mon plan »", forces: "Prise de décision, vision, charisme", vigilance: "Peut écraser le collectif, supporte mal d'être encadré", targets: "Manager, chef d'équipe, responsable de site" },
  { key: "fighter", label: "Battant", color: "--profile-fighter", definition: "Orienté résultats, aime la compétition et les objectifs", oral: "Chiffres, « j'ai atteint », « j'ai dépassé »", forces: "Énergie, ténacité, performance", vigilance: "Individualiste, peut négliger la qualité", targets: "Commercial, développement commercial, postes à objectifs" },
  { key: "creative", label: "Créatif", color: "--profile-creative", definition: "Génère des idées, trouve des angles inattendus", oral: "« Et si on… », associations d'idées, exemples originaux", forces: "Innovation, résolution originale", vigilance: "Peu rigoureux, s'ennuie dans la routine", targets: "Marketing, produit, design, événementiel" },
  { key: "adaptable", label: "Adaptable", color: "--profile-adaptable", definition: "À l'aise dans le flou, rebondit vite", oral: "Raconte des pivots sans dramatiser, « j'ai appris sur le tas »", forces: "Polyvalence, résilience, autonomie", vigilance: "Peut se disperser, engagement long terme à vérifier", targets: "Jeune entreprise, terrain, postes polyvalents" },
  { key: "team_player", label: "Team player", color: "--profile-team-player", definition: "Pense collectif avant ego, fait tenir le groupe", oral: "« Nous », « l'équipe », valorise les autres", forces: "Coopération, loyauté, bonne ambiance", vigilance: "Évite le conflit, peu d'initiative seul", targets: "Tout poste en équipe, support, opérations" },
  { key: "empathetic", label: "Empathique", color: "--profile-empathetic", definition: "Sent les gens, met à l'aise, prend soin", oral: "« Qu'il se sente bien », se met à la place de l'autre", forces: "Écoute, chaleur, désamorçage des tensions", vigilance: "Absorbe le stress des autres, difficulté à dire non", targets: "Accueil, RH, service client, santé" },
  { key: "analytical", label: "Analytique", color: "--profile-analytical", definition: "Raisonne, questionne, creuse avant d'agir", oral: "« Ça dépend », nuance, décompose le problème, cite des données", forces: "Esprit critique, fiabilité du raisonnement", vigilance: "Lent à décider, peut sur-analyser", targets: "Données, finance, tech, conseil, qualité" },
  { key: "reliable_executor", label: "Exécutant fiable", color: "--profile-reliable-executor", definition: "Rigueur, méthode, livre ce qui est promis", oral: "Réponses structurées, étapes, « d'abord… ensuite… »", forces: "Fiabilité, précision, respect des process", vigilance: "Rigide face au changement, peu force de proposition", targets: "Administration, comptabilité, logistique, office manager" },
] as const;

export type InterwProfileKey = typeof INTERW_PROFILES[number]["key"];

export interface InterwTrait {
  score: number | null;
  status?: "evaluated" | "not_evaluated";
  confidence?: "low" | "medium" | "high";
  evidences?: { quote?: string; message_id?: string; question_id?: string; question_title?: string; start_seconds?: number }[];
}
export type InterwProfilesData = Partial<Record<InterwProfileKey, InterwTrait>> & { computed_at?: string; methodology_version?: string };

export function rankProfiles(data: InterwProfilesData | null | undefined) {
  if (!data) return null;
  const list = INTERW_PROFILES
    .map((p) => ({ ...p, score: data[p.key]?.score }))
    .filter((p): p is typeof p & { score: number } => typeof p.score === "number" && Number.isFinite(p.score))
    .sort((a, b) => b.score - a.score);
  if (list.length < 2) return null;
  const [dominant, secondary] = list;
  return { dominant, secondary, isNet: dominant.score - secondary.score > 15 };
}
