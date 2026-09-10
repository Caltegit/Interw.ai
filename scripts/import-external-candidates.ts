/**
 * Import de candidats externes (VideoAsk, Typeform, etc.) dans un poste Interw.
 *
 * Script d'outillage : il n'est branché sur aucune page de l'application et
 * n'apparaît nulle part dans l'interface. Il se lance à la main :
 *
 *   bun run scripts/import-external-candidates.ts \
 *     --file /chemin/export.xlsx \
 *     --project-id eb7db435-1f2f-4ccf-a2ff-f49d68f851db \
 *     --mapping "name=Nom,email=Email,phone=Téléphone,media=Media URL" \
 *     --limit 10 \
 *     --dry-run
 *
 * Options :
 *   --file        chemin du fichier .xlsx ou .csv exporté
 *   --project-id  poste de destination
 *   --mapping     correspondance colonnes -> champs (name, email, phone, media)
 *   --limit       nombre maximum de candidats à traiter (défaut 10)
 *   --sheet       nom de l'onglet (défaut : le premier)
 *   --order       "last" (les plus récents, défaut) ou "first"
 *   --dry-run     n'écrit rien, affiche seulement ce qui serait fait
 *   --yes         saute la confirmation interactive
 *   --no-analysis crée les fiches sans lancer transcription ni scoring
 *   --columns     affiche seulement les colonnes détectées puis s'arrête
 *
 * GARDE-FOU : ce script n'appelle aucune fonction d'envoi d'e-mail. Aucun
 * candidat n'est contacté, aucune invitation n'est générée.
 */
import { readFileSync, existsSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import * as XLSX from "xlsx";

const FORBIDDEN = [
  "send-candidate-message",
  "resend-candidate-thank-you",
  "finalize-session",
  "send-invitation",
  "enqueue_report_job",
];

type Args = Record<string, string | boolean>;

function parseArgs(argv: string[]): Args {
  const args: Args = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) args[key] = true;
    else {
      args[key] = next;
      i++;
    }
  }
  return args;
}

function fail(message: string): never {
  console.error(`\n  Erreur : ${message}\n`);
  process.exit(1);
}

function readRows(file: string, sheet?: string): Record<string, unknown>[] {
  if (!existsSync(file)) fail(`fichier introuvable : ${file}`);
  const workbook = XLSX.read(readFileSync(file), { type: "buffer" });
  const name = sheet ?? workbook.SheetNames[0];
  const worksheet = workbook.Sheets[name];
  if (!worksheet) fail(`onglet introuvable : ${name} (disponibles : ${workbook.SheetNames.join(", ")})`);
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: "" });
}

function parseMapping(raw: string | undefined): Record<string, string> {
  if (!raw) fail("--mapping est requis, par ex. --mapping \"name=Nom,email=Email,media=Media URL\"");
  const mapping: Record<string, string> = {};
  for (const pair of raw.split(",")) {
    const [field, ...rest] = pair.split("=");
    if (!field || rest.length === 0) fail(`correspondance invalide : "${pair}"`);
    mapping[field.trim()] = rest.join("=").trim();
  }
  for (const required of ["name", "email", "media"]) {
    if (!mapping[required]) fail(`la correspondance doit contenir "${required}"`);
  }
  return mapping;
}

function cell(row: Record<string, unknown>, column?: string): string {
  if (!column) return "";
  const value = row[column];
  return value === undefined || value === null ? "" : String(value).trim();
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const file = typeof args.file === "string" ? args.file : undefined;
  if (!file) fail("--file est requis");

  const rows = readRows(file, typeof args.sheet === "string" ? args.sheet : undefined);
  if (rows.length === 0) fail("le fichier ne contient aucune ligne");

  const columns = Object.keys(rows[0]);
  console.log(`\nFichier : ${file}`);
  console.log(`Lignes  : ${rows.length}`);
  console.log(`Colonnes détectées :\n${columns.map((c) => `  - ${c}`).join("\n")}\n`);

  if (args.columns) return;

  const projectId = typeof args["project-id"] === "string" ? args["project-id"] : undefined;
  if (!projectId) fail("--project-id est requis");

  const mapping = parseMapping(typeof args.mapping === "string" ? args.mapping : undefined);
  const limit = Number(args.limit ?? 10);
  const dryRun = args["dry-run"] === true;
  const runAnalysis = args["no-analysis"] !== true;
  const order = args.order === "first" ? "first" : "last";

  const candidates = rows
    .map((row) => ({
      name: cell(row, mapping.name),
      email: cell(row, mapping.email).toLowerCase(),
      phone: cell(row, mapping.phone) || null,
      media_url: cell(row, mapping.media),
    }))
    .filter((c) => c.email.includes("@") && c.media_url.startsWith("http"));

  const selected = (order === "last" ? candidates.slice(-limit) : candidates.slice(0, limit));

  if (selected.length === 0) {
    fail("aucune ligne exploitable (e-mail + lien média valides) après filtrage");
  }

  console.log(`Candidats retenus (${selected.length} sur ${candidates.length} exploitables) :`);
  for (const c of selected) {
    console.log(`  - ${c.name} | ${c.email} | ${c.phone ?? "—"}`);
  }

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const secret = process.env.INTERNAL_FUNCTION_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !secret) {
    fail("SUPABASE_URL et INTERNAL_FUNCTION_SECRET doivent être présents dans l'environnement");
  }

  const endpoint = `${supabaseUrl}/functions/v1/import-external-candidates`;
  if (FORBIDDEN.some((fn) => endpoint.includes(fn))) fail("cible interdite");

  if (!dryRun && args.yes !== true) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const answer = await rl.question(`\nCréer ces ${selected.length} fiches dans le poste ${projectId} ? (oui/non) `);
    rl.close();
    if (answer.trim().toLowerCase() !== "oui") {
      console.log("Annulé, rien n'a été écrit.\n");
      return;
    }
  }

  console.log(dryRun ? "\nMode simulation : aucune écriture.\n" : "\nImport en cours…\n");

  const summary: Array<{ email: string; status: string; detail: string }> = [];

  for (const candidate of selected) {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-internal-secret": secret },
      body: JSON.stringify({
        project_id: projectId,
        candidate,
        dry_run: dryRun,
        run_analysis: runAnalysis,
      }),
    });
    const payload = await res.json().catch(() => ({}));
    const status = payload.status ?? (res.ok ? "ok" : `erreur ${res.status}`);
    const detail = payload.error ?? payload.reason ?? payload.session_id ?? "";
    summary.push({ email: candidate.email, status, detail: String(detail) });
    console.log(`  ${candidate.email} → ${status}${detail ? ` (${detail})` : ""}`);
  }

  console.log("\nRécapitulatif :");
  for (const line of summary) {
    console.log(`  ${line.status.padEnd(10)} ${line.email} ${line.detail}`);
  }
  console.log(
    "\nAucun e-mail candidat n'a été déclenché : l'import écrit directement en base " +
      "et n'appelle aucune fonction d'envoi.\n",
  );
}

main().catch((e) => fail(e instanceof Error ? e.message : String(e)));
