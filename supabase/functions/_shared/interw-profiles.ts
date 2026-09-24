// Grille des 8 profils Interw (source unique côté serveur).
export const INTERW_PROFILES = [
  { key: "leader", label: "Leader", definition: "Prend la direction, décide et embarque les autres", oral: "« J'ai décidé », « j'ai organisé », « on a suivi mon plan »", forces: "Prise de décision, vision, charisme", vigilance: "Peut écraser le collectif, supporte mal d'être encadré" },
  { key: "team_player", label: "Team player", definition: "Pense collectif avant ego, fait tenir le groupe", oral: "« Nous », « l'équipe », valorise les autres", forces: "Coopération, loyauté, bonne ambiance", vigilance: "Évite le conflit, peu d'initiative seul" },
  { key: "creative", label: "Créatif", definition: "Génère des idées, trouve des angles inattendus", oral: "« Et si on… », associations d'idées, exemples originaux", forces: "Innovation, résolution originale", vigilance: "Peu rigoureux, s'ennuie dans la routine" },
  { key: "reliable_executor", label: "Exécutant fiable", definition: "Rigueur, méthode, livre ce qui est promis", oral: "Réponses structurées, étapes, « d'abord… ensuite… »", forces: "Fiabilité, précision, respect des process", vigilance: "Rigide face au changement, peu force de proposition" },
  { key: "fighter", label: "Battant", definition: "Orienté résultats, aime la compétition et les objectifs", oral: "Chiffres, « j'ai atteint », « j'ai dépassé »", forces: "Énergie, ténacité, performance", vigilance: "Individualiste, peut négliger la qualité" },
  { key: "empathetic", label: "Empathique", definition: "Sent les gens, met à l'aise, prend soin", oral: "« Qu'il se sente bien », se met à la place de l'autre", forces: "Écoute, chaleur, désamorçage des tensions", vigilance: "Absorbe le stress des autres, difficulté à dire non" },
  { key: "adaptable", label: "Adaptable", definition: "À l'aise dans le flou, rebondit vite", oral: "Raconte des pivots sans dramatiser, « j'ai appris sur le tas »", forces: "Polyvalence, résilience, autonomie", vigilance: "Peut se disperser, engagement long terme à vérifier" },
  { key: "analytical", label: "Analytique", definition: "Raisonne, questionne, creuse avant d'agir", oral: "« Ça dépend », nuance, décompose le problème, cite des données", forces: "Esprit critique, fiabilité du raisonnement", vigilance: "Lent à décider, peut sur-analyser" },
] as const;

export type InterwProfileKey = typeof INTERW_PROFILES[number]["key"];
