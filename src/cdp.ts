import { execFile } from "child_process";
import { homedir } from "os";
import { join } from "path";

const DEFAULT_PORT = 19825;
const USER_DATA_DIR = join(homedir(), ".bb-browser/browser/user-data");
const PID_FILE = join(homedir(), ".bb-browser/browser/headless-chrome.pid");

export interface CDPTab {
  id: string;
  title: string;
  url: string;
  webSocketDebuggerUrl: string;
}

export interface CDPResult {
  result?: { type: string; value: any };
  exceptionDetails?: { text: string };
  error?: { message: string };
}

interface PendingMessage {
  resolve: (value: any) => void;
  reject: (reason: any) => void;
}

export class CDPClient {
  private ws: WebSocket | null = null;
  private msgId = 0;
  private pending = new Map<number, PendingMessage>();
  private port: number;

  constructor(port = DEFAULT_PORT) {
    this.port = port;
  }

  get portNumber(): number {
    return this.port;
  }

  async canConnect(): Promise<boolean> {
    try {
      const res = await fetch(`http://127.0.0.1:${this.port}/json/version`);
      return res.ok;
    } catch {
      return false;
    }
  }

  async getTabs(): Promise<CDPTab[]> {
    const res = await fetch(`http://127.0.0.1:${this.port}/json`);
    const tabs = (await res.json()) as CDPTab[];
    return tabs.filter((t) => t.type === "page");
  }

  async findTabByUrl(pattern: string): Promise<CDPTab | null> {
    const tabs = await this.getTabs();
    return tabs.find((t) => t.url.includes(pattern)) || null;
  }

  async connectToTab(tab: CDPTab): Promise<void> {
    if (this.ws) {
      this.ws.close();
      this.pending.clear();
    }

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(tab.webSocketDebuggerUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (e) => reject(new Error(`WebSocket error: ${e}`));
      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data as string);
        const pending = this.pending.get(data.id);
        if (pending) {
          this.pending.delete(data.id);
          if (data.error) {
            pending.reject(data.error);
          } else {
            pending.resolve(data.result);
          }
        }
      };
    });
  }

  async connectToTabByUrl(pattern: string): Promise<CDPTab | null> {
    const tab = await this.findTabByUrl(pattern);
    if (!tab) return null;
    await this.connectToTab(tab);
    return tab;
  }

  async send(method: string, params: Record<string, any> = {}): Promise<any> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket not connected");
    }
    const id = ++this.msgId;
    const message = JSON.stringify({ id, method, params });
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws!.send(message);
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`Timeout waiting for CDP response: ${method}`));
        }
      }, 30000);
    });
  }

  async evaluate(expression: string): Promise<any> {
    const result = await this.send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.text);
    }
    return result.result?.value;
  }

  async navigate(url: string): Promise<void> {
    await this.send("Page.navigate", { url });
  }

  async press(key: string): Promise<void> {
    const keyDefs: Record<string, { key: string; code: string; keyCode: number }> = {
      Enter: { key: "Enter", code: "Enter", keyCode: 13 },
      Tab: { key: "Tab", code: "Tab", keyCode: 9 },
      Escape: { key: "Escape", code: "Escape", keyCode: 27 },
      Backspace: { key: "Backspace", code: "Backspace", keyCode: 8 },
    };
    const kd = keyDefs[key] || { key, code: key, keyCode: key.charCodeAt(0) };
    await this.send("Input.dispatchKeyEvent", {
      type: "keyDown",
      ...kd,
      text: kd.keyCode < 32 ? undefined : key,
    });
    await this.send("Input.dispatchKeyEvent", { type: "keyUp", ...kd });
  }

  async typeText(text: string): Promise<void> {
    await this.send("Input.insertText", { text });
  }

  async click(x: number, y: number): Promise<void> {
    await this.send("Input.dispatchMouseEvent", {
      type: "mousePressed",
      x,
      y,
      button: "left",
      clickCount: 1,
    });
    await this.send("Input.dispatchMouseEvent", {
      type: "mouseReleased",
      x,
      y,
      button: "left",
      clickCount: 1,
    });
  }

  close(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.pending.clear();
    }
  }
}

export async function findChrome(): Promise<string | null> {
  const candidates = [
    "google-chrome",
    "google-chrome-stable",
    "chromium-browser",
    "chromium",
    "microsoft-edge",
    "brave-browser",
  ];

  for (const name of candidates) {
    try {
      await new Promise<void>((resolve, reject) => {
        execFile("which", [name], (err) => (err ? reject(err) : resolve()));
      });
      return name;
    } catch {
      continue;
    }
  }

  // Check common paths on macOS
  const macPaths = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  ];
  const fs = await import("fs");
  for (const p of macPaths) {
    if (fs.existsSync(p)) return p;
  }

  return null;
}

export async function launchChrome(
  port = DEFAULT_PORT,
  visible = false,
): Promise<void> {
  const chrome = await findChrome();
  if (!chrome) throw new Error("Chrome/Chromium not found");

  const fs = await import("fs");
  const { unlink } = await import("fs/promises");

  // Clean stale locks
  const lockFiles = ["SingletonLock", "SingletonSocket", "SingletonCookie"];
  for (const f of lockFiles) {
    try {
      await unlink(join(USER_DATA_DIR, f));
    } catch {}
  }

  fs.mkdirSync(USER_DATA_DIR, { recursive: true });

  const args = [
    chrome,
    "--no-sandbox",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${USER_DATA_DIR}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-sync",
    "--disable-background-networking",
    "--disable-component-update",
    "--disable-features=Translate,MediaRouter",
    "--disable-session-crashed-bubble",
    "--hide-crash-restore-bubble",
    "--window-size=1280,800",
    "https://www.doubao.com/chat/",
  ];

  // Use xvfb-run if available and not visible
  let finalArgs = args;
  if (!visible) {
    try {
      await new Promise<void>((resolve, reject) => {
        execFile("which", ["xvfb-run"], (err) =>
          err ? reject(err) : resolve(),
        );
      });
      finalArgs = [
        "xvfb-run",
        "--auto-servernum",
        "--server-args",
        "-screen 0 1920x1080x24",
        ...args,
      ];
    } catch {}
  }

  const child = execFile(finalArgs[0], finalArgs.slice(1), {
    detached: true,
    stdio: "ignore",
  });
  child.unref();

  // Write PID
  if (child.pid) {
    fs.writeFileSync(PID_FILE, String(child.pid));
  }

  // Wait up to 10s for CDP
  const client = new CDPClient(port);
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 500));
    if (await client.canConnect()) return;
  }
  throw new Error("Chrome failed to start");
}

export { DEFAULT_PORT, USER_DATA_DIR };
