import { DEFAULT_PORT, launchChrome, findChrome, CDPClient } from "./cdp.js";
import {
  isDaemonRunning,
  getActiveTab,
  findDoubaoTab,
  evalOnTab,
  runAdapter,
  openUrl,
  getDaemonStatus,
  installAdapters,
} from "./daemon.js";

const DAEMON_JSON_PATH = (() => {
  const { join } = require("path");
  const { homedir } = require("os");
  return join(homedir(), ".bb-browser", "daemon.json");
})();

export class BrowserSession {
  private tabId: string | null = null;

  async ensureChrome(): Promise<void> {
    const client = new CDPClient(DEFAULT_PORT);
    if (await client.canConnect()) return;
    await launchChrome(DEFAULT_PORT, false);
  }

  async ensureDaemon(): Promise<void> {
    if (await isDaemonRunning()) return;
    // Trigger daemon start via CDP — bb-browser daemon auto-starts when Chrome is reachable
    // Wait for daemon to initialize
    for (let i = 0; i < 10; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      if (await isDaemonRunning()) return;
    }
  }

  async getDoubaoTab(): Promise<string> {
    if (this.tabId) return this.tabId;

    let tab = await findDoubaoTab();
    if (tab) {
      this.tabId = tab.tabId;
      return tab.tabId;
    }

    // No doubao tab — open one
    const newTabId = await openUrl("https://www.doubao.com/chat/");
    if (newTabId) {
      this.tabId = newTabId;
      await new Promise((r) => setTimeout(r, 3000));
      return newTabId;
    }

    throw new Error("Cannot open doubao page");
  }

  async checkLogin(tabId: string): Promise<boolean> {
    try {
      const result = await runAdapter(tabId, "check-login");
      return result?.logged_in === true;
    } catch {
      return false;
    }
  }

  async requireLogin(): Promise<string> {
    await this.ensureChrome();
    await this.ensureDaemon();
    const tabId = await this.getDoubaoTab();
    if (!(await this.checkLogin(tabId))) {
      throw new Error("Not logged in. Run: doubao-cli login");
    }
    return tabId;
  }

  async waitForFiberReady(tabId: string, maxRetries = 15): Promise<void> {
    for (let i = 0; i < maxRetries; i++) {
      const ready = await evalOnTab(
        `(function(){
        const ta = document.querySelector('textarea');
        if (!ta) return false;
        const fk = Object.keys(ta).find(k => k.startsWith('__reactFiber'));
        if (!fk) return false;
        let f = ta[fk];
        for (let i = 0; i < 40 && f; i++) {
          if (typeof (f.memoizedProps||{}).onSubmit === 'function') return true;
          f = f.return;
        }
        return false;
      })()`,
        tabId,
      );
      if (ready) return;
      await new Promise((r) => setTimeout(r, 500));
      if (i === 4) {
        await evalOnTab("location.reload()", tabId);
        await new Promise((r) => setTimeout(r, 4000));
      }
    }
  }

  async evalJs(expr: string, tabId?: string): Promise<any> {
    return evalOnTab(expr, tabId || this.tabId || undefined);
  }

  async runAdapter(
    name: string,
    args: Record<string, string> = {},
  ): Promise<any> {
    return runAdapter(this.tabId || undefined, name, args);
  }

  async pollResponse(
    beforeCount: number,
    maxWait = 120,
  ): Promise<{ message: string; thinking_mode?: string; references?: string }> {
    let prevLen = 0;

    for (let elapsed = 0; elapsed < maxWait; elapsed++) {
      await new Promise((r) => setTimeout(r, 1000));

      let pollResult: any;
      try {
        pollResult = await runAdapter(this.tabId || undefined, "poll", {
          before_count: String(beforeCount),
          prev_len: String(prevLen),
        });
      } catch {
        continue;
      }

      if (!pollResult) continue;
      const curLen = pollResult.len || 0;
      prevLen = curLen;

      if (pollResult.status === "done") {
        return {
          message: pollResult.message || "",
          thinking_mode: pollResult.thinking_mode,
          references: pollResult.references,
        };
      }

      if (elapsed % 6 === 0) process.stderr.write(".");
    }

    throw new Error(`Timeout (${maxWait}s). Use 'doubao-cli last' to get response.`);
  }

  async getDaemonStatusInfo(): Promise<{ running: boolean; tabs: number }> {
    const running = await isDaemonRunning();
    if (!running) return { running: false, tabs: 0 };
    const tabs = await findDoubaoTab().then((t) => (t ? 1 : 0)).catch(() => 0);
    return { running: true, tabs };
  }
}

let _session: BrowserSession | null = null;

export async function getSession(): Promise<BrowserSession> {
  if (!_session) {
    _session = new BrowserSession();
    await installAdapters();
  }
  return _session;
}
