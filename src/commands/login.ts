import { getSession } from "../browser.js";
import { launchChrome, findChrome, CDPClient, DEFAULT_PORT } from "../cdp.js";
import { createInterface } from "readline";

async function prompt(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

export async function loginInteractive(): Promise<void> {
  const session = await getSession();
  await session.ensureChrome();
  await session.ensureDaemon();
  const tabId = await session.getDoubaoTab();
  await new Promise((r) => setTimeout(r, 3000));

  if (await session.checkLogin(tabId)) {
    console.log("Already logged in.");
    return;
  }

  const phone = await prompt("Phone number: ");
  if (!phone) {
    console.log("Phone number required");
    return;
  }

  console.log("Sending verification code...");
  const sendResult = await session.runAdapter("login-send-code", { phone });
  if (sendResult?.error) {
    console.log(`Failed: ${JSON.stringify(sendResult)}`);
    console.log("Try: doubao-cli login --web");
    return;
  }
  console.log(`Verification code sent to ${phone}`);

  const code = await prompt("Verification code: ");
  if (!code) {
    console.log("Code required");
    return;
  }

  const verifyResult = await session.runAdapter("login-verify", { code });
  if (verifyResult?.status === "logged_in") {
    console.log(`Login successful! Welcome, ${verifyResult.username || ""}`);
  } else if (verifyResult?.error) {
    console.log(`Login failed: ${JSON.stringify(verifyResult)}`);
  } else {
    console.log(JSON.stringify(verifyResult));
  }
}

export async function loginCli(phone: string, code?: string): Promise<void> {
  if (!phone) {
    console.log("Usage: doubao-cli login <phone> [code]");
    return;
  }

  const session = await getSession();
  await session.ensureChrome();
  await session.ensureDaemon();
  const tabId = await session.getDoubaoTab();
  await new Promise((r) => setTimeout(r, 3000));

  if (await session.checkLogin(tabId)) {
    console.log("Already logged in.");
    return;
  }

  if (code) {
    await session.runAdapter("login-verify", { code, phone });
    for (let i = 0; i < 6; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      if (await session.checkLogin(tabId)) {
        console.log("Login successful!");
        return;
      }
    }
    console.log("Verification failed. Try: doubao-cli login " + phone);
    return;
  }

  const sendResult = await session.runAdapter("login-send-code", { phone });
  if (sendResult?.error) {
    console.log(`Failed: ${JSON.stringify(sendResult)}`);
    console.log("Try: doubao-cli login --web");
    return;
  }
  console.log(`Verification code sent to ${phone}`);
  console.log(`Enter code: doubao-cli login ${phone} <code>`);
}

export async function loginWeb(): Promise<void> {
  console.log("Opening browser...");
  const chrome = await findChrome();
  if (!chrome) {
    console.log("Error: Chrome/Chromium not found");
    return;
  }

  const port = DEFAULT_PORT;
  const client = new CDPClient(port);

  // Check if Chrome is already running
  if (await client.canConnect()) {
    // Try to find doubao tab and reuse
    const tab = await client.findTabByUrl("doubao.com");
    if (tab) {
      console.log("Browser already open with doubao tab.");
    }
  } else {
    await launchChrome(port, true);
    await new Promise((r) => setTimeout(r, 3000));
  }

  console.log("");
  console.log("Browser opened. Please complete login or verification.");
  console.log("Press Enter when done...");

  await prompt("");

  console.log("Verifying login...");
  const session = await getSession();
  const tabId = await session.getDoubaoTab();
  await new Promise((r) => setTimeout(r, 2000));

  if (await session.checkLogin(tabId)) {
    console.log("Login successful! Run 'doubao-cli account' for info.");
  } else {
    console.log("Could not confirm login status.");
    console.log("  Run 'doubao-cli account' to verify.");
  }
  console.log("  Browser can be safely closed.");
}

export async function logout(): Promise<void> {
  const session = await getSession();
  await session.ensureChrome();
  await session.ensureDaemon();
  const tabId = await session.getDoubaoTab();

  // Click user button
  await session.evalJs(`(() => {
    const u = Array.from(document.querySelectorAll('button')).find(b =>
      /^[A-Z]/.test(b.innerText?.trim()) &&
      b.innerText.trim().length < 20 &&
      !/^(AI|PPT|快速|思考|专家|更多|翻译|编程|解题)/.test(b.innerText.trim()) &&
      b.getBoundingClientRect().width > 0
    );
    if (!u) return;
    u.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));
    u.dispatchEvent(new PointerEvent('pointerup',{bubbles:true}));
    u.dispatchEvent(new MouseEvent('click',{bubbles:true}));
  })()`);
  await new Promise((r) => setTimeout(r, 2000));

  // Click logout
  await session.evalJs(`(() => {
    const d = Array.from(document.querySelectorAll('div')).find(e =>
      e.innerText?.trim()==='退出登录' &&
      e.childElementCount<=3 &&
      e.getBoundingClientRect().width>0
    );
    if (d) d.click();
  })()`);
  await new Promise((r) => setTimeout(r, 1000));

  // Confirm
  await session.evalJs(`(() => {
    const b = Array.from(document.querySelectorAll('button')).find(b =>
      b.innerText?.trim()==='退出登录' &&
      b.getBoundingClientRect().height>0 &&
      b.getBoundingClientRect().y>200
    );
    if (b) b.click();
  })()`);
  await new Promise((r) => setTimeout(r, 2000));

  console.log("Logged out.");
}
