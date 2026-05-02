import { getSession } from "../browser.js";

export async function doImage(message: string): Promise<void> {
  const session = await getSession();
  await session.ensureChrome();
  await session.ensureDaemon();
  const tabId = await session.getDoubaoTab();
  if (!(await session.checkLogin(tabId))) {
    throw new Error("Not logged in. Run: doubao-cli login");
  }

  let curUrl = await session.evalJs("location.href");

  // Ensure server conversation
  if (!/\/chat\/\d+/.test(curUrl)) {
    await session.runAdapter("send", { message: "." });
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      curUrl = await session.evalJs("location.href");
      if (/\/chat\/\d+$/.test(curUrl)) break;
    }
    if (!/\/chat\/\d+$/.test(curUrl)) {
      throw new Error("Failed to create conversation");
    }
    await new Promise((r) => setTimeout(r, 3000));
  }

  // Switch to image mode
  await session.runAdapter("send", { message, mode: "image" });

  if (snap?.hasRect) {
    await session.evalJs(`(function(){
      const ce = document.querySelector('[contenteditable="true"]');
      if (ce) ce.focus();
    })()`);
    await new Promise((r) => setTimeout(r, 300));
    await session.evalJs(`(function(){
      const ce = document.querySelector('[contenteditable="true"]');
      if (!ce) return;
      ce.focus();
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(ce);
      selection.removeAllRanges();
      selection.addRange(range);
      document.execCommand('insertText', false, ${JSON.stringify(message)});
    })()`);
  } else {
    await session.evalJs(`(function(){
      const ce = document.querySelector('[contenteditable="true"]');
      if (ce) ce.focus();
    })()`);
    await new Promise((r) => setTimeout(r, 300));
    await session.evalJs(`(function(){
      const ce = document.querySelector('[contenteditable="true"]');
      if (!ce) return;
      ce.focus();
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(ce);
      selection.removeAllRanges();
      selection.addRange(range);
      document.execCommand('insertText', false, ${JSON.stringify(message)});
    })()`);
  }
  await new Promise((r) => setTimeout(r, 1000));

  // Click send
  const clickResult = await session.evalJs(`(function(){
    const btns = Array.from(document.querySelectorAll('button'));
    const sendBtn = btns.find(b => {
      const r = b.getBoundingClientRect();
      return r.x > 1100 && r.y > 590 && r.width > 0 && r.width < 60;
    });
    if (!sendBtn) return 'no_btn';
    const fk = Object.keys(sendBtn).find(k => k.startsWith('__reactFiber'));
    if (!fk) return 'no_fiber';
    let f = sendBtn[fk];
    for (let i = 0; i < 10 && f; i++) {
      const p = f.memoizedProps || {};
      if (typeof p.onClick === 'function') {
        p.onClick({currentTarget: sendBtn, target: sendBtn, preventDefault(){}, stopPropagation(){}});
        return 'clicked';
      }
      f = f.return;
    }
    return 'no_onClick';
  })()`);

  if (clickResult !== "clicked") {
    process.stderr.write("Send button not found, trying Enter\n");
    await session.evalJs(`(function(){
      const ce = document.querySelector('[contenteditable="true"]');
      if (!ce) return;
      const fk = Object.keys(ce).find(k => k.startsWith('__reactFiber'));
      if (!fk) return;
      let f = ce[fk];
      for (let i = 0; i < 15 && f; i++) {
        const p = f.memoizedProps || {};
        if (typeof p.onKeyDown === 'function') {
          p.onKeyDown({
            key: 'Enter', code: 'Enter', keyCode: 13, which: 13,
            shiftKey: false, ctrlKey: false, altKey: false, metaKey: false,
            target: ce, currentTarget: ce,
            nativeEvent: new KeyboardEvent('keydown', {key:'Enter', keyCode:13, bubbles:true}),
            preventDefault(){}, stopPropagation(){}, persist(){},
            isDefaultPrevented(){ return false; }, isPropagationStopped(){ return false; }
          });
          return;
        }
        f = f.return;
      }
    })()`);
  }

  console.log("Generating image...");

  // Poll for image
  const beforeCount = await session.evalJs(
    "document.querySelectorAll('[class*=markdown-body]').length",
  );
  for (let elapsed = 0; elapsed < 120; elapsed++) {
    await new Promise((r) => setTimeout(r, 1000));
    const check = await session.evalJs(`(function(){
      const imgs = document.querySelectorAll('img[src*="generated"], img[src*="image"], [class*=image-card] img, [class*=image-result] img');
      if (imgs.length > 0) return 'has_image';
      const mds = document.querySelectorAll('[class*=markdown-body]');
      if (mds.length > ${beforeCount}) return 'has_text';
      return 'waiting';
    })()`);

    if (check === "has_image") {
      console.log("Image generated successfully");
      return;
    }
    if (check === "has_text") {
      const pollResult = await session.runAdapter("poll", {
        before_count: String(beforeCount),
        prev_len: "0",
      });
      if (pollResult?.status === "done") {
        console.log(pollResult?.message || "Done");
        return;
      }
    }
    if (elapsed % 6 === 0) process.stderr.write(".");
  }
  console.log("Timeout. Use 'doubao-cli last' to get result.");
}
