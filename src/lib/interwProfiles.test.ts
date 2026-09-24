import { describe, expect, it } from "vitest";
import { rankProfiles, type InterwProfilesData } from "./interwProfiles";

describe("rankProfiles", () => {
  it("exclut les profils non évalués", () => {
    const data: InterwProfilesData = {
      leader: { score: null, status: "not_evaluated" },
      creative: { score: 82, status: "evaluated" },
      adaptable: { score: 70, status: "evaluated" },
    };
    const rank = rankProfiles(data);
    expect(rank?.dominant.key).toBe("creative");
    expect(rank?.secondary.key).toBe("adaptable");
  });

  it("déclare un profil net uniquement au-dessus de quinze points", () => {
    expect(rankProfiles({ leader: { score: 80 }, fighter: { score: 65 } })?.isNet).toBe(false);
    expect(rankProfiles({ leader: { score: 81 }, fighter: { score: 65 } })?.isNet).toBe(true);
  });

  it("ne classe rien avec moins de deux profils évalués", () => {
    expect(rankProfiles({ leader: { score: 80 }, fighter: { score: null } })).toBeNull();
  });
});