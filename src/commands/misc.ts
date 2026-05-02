import { getSession } from "../browser.js";
import { CDPClient } from "../cdp.js";
import { isDaemonRunning, getActiveTab } from "../daemon.js";
import { readFile, unlink } from "fs/promises";
import { join } from "path";
import { homedir } from "os";

export async function doAccount(): Promise<void> {
  const session = await getSession();
  await session.ensureChrome();
  await session.ensureDaemon();
  const tabId = await session.getDoubaoTab();

  // Wait for page load
  for (let i = 0; i < 15; i++) {
    const host = await session.evalJs("location.hostname", tabId);
    if (host === "www.doubao.com") break;
    await new Promise((r) => setTimeout(r, 500));
  }

  const result = await session.runAdapter("account");
  if (result?.logged_in) {
    console.log("Logged in");
    if (result.username) console.log(`  User: ${result.username}`);
    if (result.avatar) console.log(`  Avatar: ${result.avatar}`);
  } else if (result?.error) {
    console.log(`Account query failed: ${result.error}`);
    console.log("  Run 'doubao-cli login --web' to login");
  } else {
    console.log("Not logged in. Run 'doubao-cli login' to login.");
  }
}

export async function doConversations(): Promise<void> {
  const session = await getSession();
  await session.ensureChrome();
  await session.ensureDaemon();
  const result = await session.runAdapter("conversations");
  console.log(typeof result === "string" ? result : JSON.stringify(result, null, 2));
}

export async function doNew(): Promise<void> {
  const session = await getSession();
  await session.ensureChrome();
  await session.ensureDaemon();
  const tabId = await session.getDoubaoTab();

  await session.evalJs(`(function(){
    const btn = Array.from(document.querySelectorAll('a,button')).find(b => {
      const t = b.innerText?.trim();
      return t === '新对话' && b.getBoundingClientRect().width > 0 && b.getBoundingClientRect().y < 200;
    });
    if (btn) { btn.click(); return 'clicked'; }
    location.href = 'https://www.doubao.com/chat/';
    return 'navigated';
  })()`);
  await new Promise((r) => setTimeout(r, 4000));
  console.log("New conversation created");
}

export async function doLast(): Promise<void> {
  const session = await getSession();
  await session.ensureChrome();
  await session.ensureDaemon();
  await session.getDoubaoTab();
  const result = await session.runAdapter("last-response");
  if (typeof result === "string") {
    console.log(result);
  } else {
    console.log(JSON.stringify(result, null, 2));
  }
}

export async function doRetry(): Promise<void> {
  const session = await getSession();
  await session.ensureChrome();
  await session.ensureDaemon();
  const tabId = await session.getDoubaoTab();

  // Hover over last response
  await session.evalJs(`(function(){
    const mds = document.querySelectorAll('[class*=markdown-body]');
    const last = mds[mds.length-1];
    if (!last) return;
    let c = last;
    for (let i = 0; i < 3; i++) c = c.parentElement;
    const r = c.getBoundingClientRect();
    c.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,cancelable:true,pointerId:1,pointerType:'mouse',clientX:r.x+r.width/2,clientY:r.y+r.height/2}));
    c.dispatchEvent(new MouseEvent('mousemove',{bubbles:true,cancelable:true,clientX:r.x+r.width/2,clientY:r.y+r.height/2}));
  })()`);
  await new Promise((r) => setTimeout(r, 500));

  // Click regenerate
  await session.evalJs(`(function(){
    const ab = document.querySelector('[class*=message-action-button-main]');
    if (!ab) return;
    const btns = ab.querySelectorAll('button');
    if (btns.length < 2) return;
    btns[1].click();
  })()`);

  // Poll for new response
  let beforeMds = await session.evalJs(
    "document.querySelectorAll('[class*=markdown-body]').length",
  );
  beforeMds = Math.max(0, beforeMds - 1);

  const result = await session.pollResponse(beforeMds);
  if (result.thinking_mode && result.thinking_mode !== "快速") {
    process.stderr.write(`[${result.thinking_mode} 模式]\n`);
  }
  if (result.references) {
    process.stderr.write(`[${result.references}]\n`);
  }
  if (result.message) console.log(result.message);
}

export async function doLoad(convId?: string): Promise<void> {
  const session = await getSession();
  await session.ensureChrome();
  await session.ensureDaemon();
  const tabId = await session.getDoubaoTab();

  if (convId) {
    await session.evalJs(`location.href='https://www.doubao.com/chat/${convId}'`, tabId);
    await new Promise((r) => setTimeout(r, 3000));
  }
  await session.runAdapter("load");
}

export async function doDelete(convId: string): Promise<void> {
  if (!convId) {
    console.log("Usage: doubao-cli delete <conversation-id>");
    return;
  }
  const session = await getSession();
  await session.ensureChrome();
  await session.ensureDaemon();
  await session.runAdapter("delete", { id: convId });
}

export async function doDaemon(): Promise<void> {
  const running = await isDaemonRunning();
  if (running) {
    const status = await getSession().then((s) => s.getDaemonStatusInfo());
    console.log(`Daemon running, Chrome ${status.running ? "connected" : "disconnected"}`);
  } else {
    // Check Chrome directly
    const client = new CDPClient();
    if (await client.canConnect()) {
      console.log("Chrome running (daemon not connected)");
    } else {
      console.log("Chrome not running");
    }
  }
}

export async function doStop(): Promise<void> {
  try {
    const pidFile = join(homedir(), ".bb-browser/browser/headless-chrome.pid");
    const pid = await readFile(pidFile, "utf-8");
    process.kill(Number(pid.trim()), "SIGTERM");
    await unlink(pidFile);
  } catch {}

  console.log("Stopped");
}
