import { describe, expect, it } from "vitest";
import { isInterviewMedia, toStoragePath } from "@/lib/mediaUrl";

describe("normalisation des chemins média", () => {
  it("accepte un chemin interne", () => {
    expect(toStoragePath("interviews/abc/q0.webm")).toBe("interviews/abc/q0.webm");
  });

  it("convertit les anciennes adresses publiques et signées", () => {
    expect(toStoragePath("https://example.test/storage/v1/object/public/media/interviews/abc/q0.webm"))
      .toBe("interviews/abc/q0.webm");
    expect(toStoragePath("https://example.test/storage/v1/object/sign/media/interviews/abc/q0.webm?token=secret"))
      .toBe("interviews/abc/q0.webm");
  });

  it("rejette les chemins traversants", () => {
    expect(toStoragePath("interviews/abc/../secret.webm")).toBeNull();
  });

  it("identifie uniquement les enregistrements d'entretien", () => {
    expect(isInterviewMedia("interviews/abc/q0.webm")).toBe(true);
    expect(isInterviewMedia("org-logos/logo.png")).toBe(false);
  });
});