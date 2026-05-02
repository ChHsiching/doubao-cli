import { execFile } from "child_process";
import { readdir } from "fs/promises";
import { createHash } from "crypto";

const targets = [
  { target: "bun-linux-x64" as const, suffix: "linux-amd64" },
  { target: "bun-darwin-arm64" as const, suffix: "darwin-arm64" },
  { target: "bun-darwin-x64" as const, suffix: "darwin-amd64" },
  { target: "bun-windows-x64" as const, suffix: "windows-amd64.exe" },
];

async function generateChecksums(dir: string): Promise<void> {
  const fs = await import("fs/promises");
  const files = await readdir(dir);
  const binFiles = files.filter((f) => f.startsWith("doubao-cli-"));

  const lines: string[] = [];
  for (const file of binFiles) {
    const content = await fs.readFile(`${dir}/${file}`);
    const hash = createHash("sha256").update(content).digest("hex");
    lines.push(`${hash}  ${file}`);
  }

  await fs.writeFile(`${dir}/checksums.txt`, lines.join("\n") + "\n");
  console.log("Checksums generated.");
}

async function build() {
  const fs = await import("fs");
  const path = await import("path");
  fs.mkdirSync("dist", { recursive: true });

  for (const { target, suffix } of targets) {
    const outfile = path.join("dist", `doubao-cli-${suffix}`);
    console.log(`Building for ${suffix}...`);
    const result = await Bun.build({
      entrypoints: ["src/cli.ts"],
      outdir: "dist",
      target,
      compile: true,
      minify: true,
    });

    if (!result.success) {
      console.error(`Failed to build ${suffix}:`);
      for (const log of result.logs) {
        console.error(log);
      }
      process.exit(1);
    }

    // Rename to correct name (Bun compile ignores naming option)
    const built = result.outputs[0].path;
    if (built !== outfile) {
      fs.renameSync(built, outfile);
    }

    const size = fs.statSync(outfile).size;
    console.log(`  -> ${outfile} (${(size / 1024 / 1024).toFixed(1)}MB)`);
  }

  await generateChecksums("dist");
  console.log("Build complete!");
}

build();
