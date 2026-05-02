import { CDPClient } from "./cdp.js";
import { adapterSources } from "./adapters-data.js";

// Transform adapter code exactly like bb-browser does:
// 1. Remove the @meta comment block
// 2. Wrap as IIFE: (async function(args) { ... })(argsJson)
function buildAdapterExpression(code: string, argsJson: string): string {
  const jsBody = code.replace(/\/\*\s*@meta[\s\S]*?\*\//, "").trim();
  return `(${jsBody})(${argsJson})`;
}

export async function runAdapter(
  client: CDPClient,
  name: string,
  args: Record<string, string> = {},
): Promise<any> {
  const code = adapterSources[name];
  if (!code) throw new Error(`Adapter not found: ${name}`);

  const argsJson = JSON.stringify(args).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  const expression = buildAdapterExpression(code, argsJson);

  return client.evaluate(expression);
}

export async function installAdapters(): Promise<void> {
  const fs = await import("fs/promises");
  const { join } = await import("path");
  const { homedir } = await import("os");
  const dstDir = join(homedir(), ".bb-browser", "sites", "doubao");

  try {
    await fs.mkdir(dstDir, { recursive: true });
    for (const [name, code] of Object.entries(adapterSources)) {
      await fs.writeFile(join(dstDir, `${name}.js`), code);
    }
  } catch {}
}
