import { CDPClient } from "./cdp.js";
import { adapterSources } from "./adapters-data.js";
import { readFile } from "fs/promises";
import { join } from "path";
import { homedir } from "os";

interface DaemonInfo {
  pid: number;
  host: string;
  port: number;
  token: string;
}

interface DaemonTab {
  index: number;
  url: string;
  title: string;
  active: boolean;
  tabId: string;
  tab: string;
}

let cachedDaemon: DaemonInfo | null = null;

async function readDaemonJson(): Promise<DaemonInfo | null> {
  try {
    const content = await readFile(
      join(homedir(), ".bb-browser", "daemon.json"),
      "utf-8",
    );
    return JSON.parse(content);
  } catch {
    return null;
  }
}

async function getDaemonInfo(): Promise<DaemonInfo | null> {
  if (!cachedDaemon) {
    cachedDaemon = await readDaemonJson();
  }
  return cachedDaemon;
}

function clearDaemonCache(): void {
  cachedDaemon = null;
}

async function daemonCommand<T = any>(request: Record<string, any>): Promise<T> {
  const info = await getDaemonInfo();
  if (!info) throw new Error("Daemon not running");

  const url = `http://${info.host}:${info.port}/command`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${info.token}`,
    },
    body: JSON.stringify(request),
  });

  if (!res.ok) throw new Error(`Daemon returned ${res.status}`);
  return res.json();
}

export async function isDaemonRunning(): Promise<boolean> {
  const info = await getDaemonInfo();
  if (!info) return false;
  try {
    const res = await fetch(`http://${info.host}:${info.port}/status`, {
      headers: { Authorization: `Bearer ${info.token}` },
    });
    return res.ok;
  } catch {
    clearDaemonCache();
    return false;
  }
}

export async function getTabs(): Promise<DaemonTab[]> {
  const resp = await daemonCommand<{ success: boolean; data: { tabs: DaemonTab[] } }>({
    id: "tab_list",
    action: "tab_list",
  });
  return resp.data?.tabs || [];
}

export async function getActiveTab(): Promise<DaemonTab | null> {
  const tabs = await getTabs();
  return tabs.find((t) => t.active) || tabs[0] || null;
}

export async function findDoubaoTab(): Promise<DaemonTab | null> {
  const tabs = await getTabs();
  const doubaoTabs = tabs.filter((t) => t.url.includes("doubao.com"));
  // Prefer active tab, then first doubao tab
  return doubaoTabs.find((t) => t.active) || doubaoTabs[0] || null;
}

async function daemonEval(script: string, tabId?: string): Promise<any> {
  const resp = await daemonCommand<{
    success: boolean;
    data: { result: any };
    error?: string;
  }>({
    id: `eval_${Date.now()}`,
    action: "eval",
    script,
    tabId: tabId || undefined,
  });

  if (!resp.success) throw new Error(resp.error || "Eval failed");
  return resp.data?.result;
}

export async function evalOnTab(
  expression: string,
  tabId?: string,
): Promise<any> {
  return daemonEval(expression, tabId);
}

export async function runAdapter(
  tabId: string | undefined,
  name: string,
  args: Record<string, string> = {},
): Promise<any> {
  const code = adapterSources[name];
  if (!code) throw new Error(`Adapter not found: ${name}`);

  // Same approach as bb-browser: strip meta comment, wrap as IIFE
  const jsBody = code.replace(/\/\*\s*@meta[\s\S]*?\*\//, "").trim();
  const argsJson = JSON.stringify(args).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  const script = `(${jsBody})(${argsJson})`;

  return daemonEval(script, tabId);
}

export async function openUrl(url: string): Promise<string | undefined> {
  const resp = await daemonCommand<{
    success: boolean;
    data: { tabId: string };
  }>({
    id: `open_${Date.now()}`,
    action: "tab_new",
    url,
  });
  return resp.data?.tabId;
}

export async function getDaemonStatus(): Promise<any> {
  const info = await getDaemonInfo();
  if (!info) return null;
  try {
    const res = await fetch(`http://${info.host}:${info.port}/status`, {
      headers: { Authorization: `Bearer ${info.token}` },
    });
    return res.json();
  } catch {
    return null;
  }
}

export async function installAdapters(): Promise<void> {
  const fs = await import("fs/promises");
  const dstDir = join(homedir(), ".bb-browser", "sites", "doubao");
  try {
    await fs.mkdir(dstDir, { recursive: true });
    for (const [name, code] of Object.entries(adapterSources)) {
      await fs.writeFile(join(dstDir, `${name}.js`), code);
    }
  } catch {}
}
