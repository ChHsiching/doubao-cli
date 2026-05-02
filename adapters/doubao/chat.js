/* @meta
{
  "name": "doubao/chat",
  "description": "豆包AI对话 (doubao chat: send message, get AI response with mode & thinking depth)",
  "domain": "www.doubao.com",
  "args": {
    "message": {"required": true, "description": "消息内容"},
    "mode": {"required": false, "description": "模式: chat, writing, ppt, coding, image, translate, research, video, music, podcast, meeting, math, data, super"},
    "thinking": {"required": false, "description": "思考深度: quick(快速), think(思考), expert(专家)"}
  },
  "readOnly": false,
  "example": "bb-browser site doubao/chat 你好"
}
*/
async function(args) {
  if (typeof args.message === 'string' && args.message.startsWith('{')) {
    try { const p = JSON.parse(args.message); if (p.message) args = p; } catch {}
  }

  const ta = document.querySelector('textarea');
  const ce = document.querySelector('[contenteditable="true"]');
  // Prefer contenteditable (visible), fallback to textarea
  // Hidden textareas without React fiber are phantom elements
  let inputEl = null;
  if (ce && ce.getBoundingClientRect().height > 0) {
    inputEl = ce;
  } else if (ta && ta.getBoundingClientRect().height > 0) {
    inputEl = ta;
  } else if (ce) {
    inputEl = ce; // contenteditable exists but might be collapsed
  } else if (ta) {
    inputEl = ta;
  }

  if (!inputEl) return { error: 'input not found', hint: '请先打开豆包', action: 'doubao open' };

  const fiberKey = Object.keys(inputEl).find(k => k.startsWith('__reactFiber$'));
  if (!fiberKey) return { error: 'fiber not found', hint: '刷新页面重试', auto_retry: true };

  let fiber = inputEl[fiberKey], onSubmit = null;
  for (let i = 0; i < 40 && fiber; i++) {
    const p = fiber.memoizedProps || {};
    if (typeof p.onSubmit === 'function') onSubmit = p.onSubmit;
    fiber = fiber.return;
  }
  if (!onSubmit) return { error: 'onSubmit not found' };

  const modes = {
    chat: null, writing: '帮我写作', ppt: 'PPT 生成', coding: '编程',
    image: '图像生成', translate: '翻译', research: '深入研究',
    video: '视频生成', music: '音乐生成', podcast: 'AI 播客',
    meeting: '记录会议', math: '解题答疑', data: '数据分析', super: '超能模式',
  };
  const depths = { quick: '快速', think: '思考', expert: '专家' };

  if (args.thinking && depths[args.thinking]) {
    const target = depths[args.thinking];
    const btns = Array.from(document.querySelectorAll('button'));
    const sel = btns.find(b => /^(快速|思考|专家)/.test(b.innerText?.trim()));
    if (sel) { sel.click(); await new Promise(r => setTimeout(r, 400)); }
    for (const el of document.querySelectorAll('div,button')) {
      if (el.innerText?.trim() === target && el.getBoundingClientRect().width > 0 && el.childElementCount <= 3) { el.click(); break; }
    }
    await new Promise(r => setTimeout(r, 200));
  }

  const modeLabel = modes[args.mode];
  if (modeLabel) {
    let clicked = false;
    const toolbarBtns = Array.from(document.querySelectorAll('button'));
    for (const b of toolbarBtns) {
      if (b.innerText?.trim() === modeLabel && b.getBoundingClientRect().width > 0) {
        b.click(); clicked = true; break;
      }
    }
    if (!clicked) {
      const moreBtn = toolbarBtns.find(b => b.innerText?.trim() === '更多' && b.getBoundingClientRect().width > 0);
      if (moreBtn) { moreBtn.click(); await new Promise(r => setTimeout(r, 400)); }
      for (const b of document.querySelectorAll('dialog button, [role="dialog"] button, button')) {
        if (b.innerText?.trim() === modeLabel && b.getBoundingClientRect().width > 0) {
          b.click(); clicked = true; break;
        }
      }
    }
    await new Promise(r => setTimeout(r, 200));
  }

  const beforeCount = document.querySelectorAll('[class*="markdown-body"]').length;
  const beforeImgs = new Set(Array.from(document.querySelectorAll('img[src*="byteimg.com/ocean-cloud"]')).map(i => i.src));

  if (ta) {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(ta, args.message);
    ta.dispatchEvent(new Event('input', { bubbles: true }));
  } else if (ce) {
    ce.focus();
    // Clear and insert via execCommand (triggers Slate's onInput)
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(ce);
    selection.removeAllRanges();
    selection.addRange(range);
    document.execCommand('insertText', false, args.message);
  }

  onSubmit();

  let lastLen = 0, stable = 0;
  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 500));
    const count = document.querySelectorAll('[class*="markdown-body"]').length;
    if (count <= beforeCount) continue;
    const text = document.querySelectorAll('[class*="markdown-body"]')[count - 1]?.innerText?.trim() || '';
    const imgs = Array.from(document.querySelectorAll('img[src*="byteimg.com/ocean-cloud"]')).map(i => i.src).filter(u => !beforeImgs.has(u));
    const len = text.length + imgs.length * 100;
    if (len > 0 && len === lastLen) { stable++; if (stable >= 3) return mkResult(text, imgs); }
    else if (len > 0) { stable = 0; lastLen = len; }
  }

  const count = document.querySelectorAll('[class*="markdown-body"]').length;
  if (count > beforeCount) {
    const text = document.querySelectorAll('[class*="markdown-body"]')[count - 1]?.innerText?.trim() || '';
    const imgs = Array.from(document.querySelectorAll('img[src*="byteimg.com/ocean-cloud"]')).map(i => i.src).filter(u => !beforeImgs.has(u));
    return mkResult(text || '(incomplete)', imgs);
  }
  return { error: 'timeout', hint: '用 doubao last 获取回复' };

  function mkResult(text, imgs) {
    const r = { message: text, conversation_id: location.pathname.match(/\/chat\/([^/?#]+)/)?.[1] || '' };
    if (imgs.length) r.images = imgs;
    return r;
  }
}
