/**
 * npm run deploy
 * 1) next build で本番ビルド確認
 * 2) 未コミットがあれば git add -A && git commit
 * 3) git push（Vercel が Git 連携していれば自動デプロイ）
 * 4) 本番 URL を表示（Vercel CLI または環境変数・デフォルト）
 */
import { execSync, spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");

/** プロジェクトの本番ドメイン（例: risyuu → risyuu.vercel.app） */
const PROJECT_SLUG = process.env.VERCEL_PROJECT_SLUG || "risyuu";

function run(cmd, opts = {}) {
  console.log(`\n> ${cmd}\n`);
  execSync(cmd, { stdio: "inherit", shell: true, ...opts });
}

/**
 * push 後に表示する本番 URL を決める。
 * 優先: VERCEL_PRODUCTION_URL → vercel ls の解析 → https://{slug}.vercel.app
 */
function resolveProductionUrl() {
  const fixed = process.env.VERCEL_PRODUCTION_URL?.trim();
  if (fixed) return fixed.replace(/\/$/, "");

  const fallback = `https://${PROJECT_SLUG}.vercel.app`;

  let stdout = "";
  try {
    stdout = execSync("npx vercel ls --yes 2>&1", {
      encoding: "utf-8",
      cwd: REPO_ROOT,
      maxBuffer: 10 * 1024 * 1024,
      shell: true,
    });
  } catch (err) {
    stdout =
      (err && typeof err.stdout === "string" && err.stdout) ||
      (err && typeof err.stderr === "string" && err.stderr) ||
      "";
  }

  const hosts = new Set();
  const re = /(?:https:\/\/)?([\w-]+\.vercel\.app)/gi;
  let m;
  while ((m = re.exec(stdout)) !== null) {
    hosts.add(m[1].toLowerCase());
  }

  const alias = `${PROJECT_SLUG}.vercel.app`;
  if (hosts.has(alias)) return `https://${alias}`;

  const preferred = [...hosts].find(
    (h) => h.startsWith(`${PROJECT_SLUG}.`) || h.startsWith(`${PROJECT_SLUG}-`)
  );
  if (preferred) return `https://${preferred}`;

  const first = [...hosts][0];
  if (first) return `https://${first}`;

  return fallback;
}

try {
  run("npm run build");
} catch {
  console.error("\nビルドが失敗したため push しません。");
  process.exit(1);
}

const dirty = execSync("git status --porcelain", { encoding: "utf-8" }).trim();
if (dirty) {
  run("git add -A");
  const msg = `deploy: ${new Date().toISOString()}`;
  const result = spawnSync("git", ["commit", "-m", msg], { stdio: "inherit" });
  if (result.status !== 0) {
    console.warn("\n（コミットをスキップ: ステージ済みの変更がない可能性があります）\n");
  }
} else {
  console.log("\n未コミットの変更はありません。直近のコミットを push します。\n");
}

try {
  run("git push -u origin HEAD");
} catch {
  console.error("\npush に失敗しました。リモート origin とブランチ、認証を確認してください。");
  process.exit(1);
}

const productionUrl = resolveProductionUrl();

console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("完了: リモートへ push しました。");
console.log("Vercel（Git 連携）ならビルドがキューに入ります。数分後に反映されます。");
console.log("");
console.log(`本番 URL: ${productionUrl}`);
console.log("");
console.log(
  "※ 表示が実際のドメインと違う場合: Vercel → Project → Domains で確認し、環境変数 VERCEL_PRODUCTION_URL（例: https://risyuu.divizero.jp）を設定してください。"
);
console.log(
  "※ vercel ls が使えない場合は `npx vercel login` と `npx vercel link`（リポジトリ直下）を一度実行してください。"
);
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
