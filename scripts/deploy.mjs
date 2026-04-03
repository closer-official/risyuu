/**
 * npm run deploy
 * 1) next build で本番ビルド確認
 * 2) 未コミットがあれば git add -A && git commit
 * 3) git push（Vercel が Git 連携していれば自動デプロイ）
 */
import { execSync, spawnSync } from "node:child_process";

function run(cmd, opts = {}) {
  console.log(`\n> ${cmd}\n`);
  execSync(cmd, { stdio: "inherit", shell: true, ...opts });
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

console.log(
  "\n完了: リモートへ push しました。Vercel で Git 連携済みなら、ダッシュボードでデプロイが始まります。\n"
);
