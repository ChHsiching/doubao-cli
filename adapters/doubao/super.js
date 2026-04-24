/* @meta
{
  "name": "doubao/super",
  "description": "豆包超能模式 (doubao super: advanced AI)",
  "domain": "www.doubao.com",
  "args": {
    "message": {"required": true, "description": "复杂任务"}
  },
  "readOnly": false,
  "example": "bb-browser site doubao/super 你的消息"
}
*/
async function(args) {
  if (typeof args.message === 'string' && args.message.startsWith('{' )) { try { const p = JSON.parse(args.message); if (p.message) args = p; } catch {} }

  const ta = document.querySelector('textarea');
  if (!ta) return { error: 'textarea not found', hint: '请先打开豆包', action: 'bb-browser open https://www.doubao.com/chat/' };
  const fiberKey = Object.keys(ta).find(k => k.startsWith('__reactFiber$'));
  if (!fiberKey) return { error: 'fiber not found', hint: '刷新页面' };
  let fiber = ta[fiberKey], onSubmit = null;
  for (let i = 0; i < 30 && fiber; i++) { const p = fiber.memoizedProps || {}; if (typeof p.onSubmit === 'function') onSubmit = p.onSubmit; fiber = fiber.return; }
  if (!onSubmit) return { error: 'onSubmit not found' };

  // Click mode button in toolbar or 更多 dialog
  const modeLabel = '超能模式';
  let clicked = false;
  const btns = Array.from(document.querySelectorAll('button'));
  for (const b of btns) { if (b.innerText?.trim() === modeLabel && b.getBoundingClientRect().width > 0) { b.click(); clicked = true; break; } }
  if (!clicked) {
    const more = btns.find(b => b.innerText?.trim() === '更多' && b.getBoundingClientRect().width > 0);
    if (more) { more.click(); await new Promise(r => setTimeout(r, 400)); }
    for (const b of document.querySelectorAll('button')) { if (b.innerText?.trim() === modeLabel && b.getBoundingClientRect().width > 0) { b.click(); clicked = true; break; } }
  }
  await new Promise(r => setTimeout(r, 200));

  const beforeCount = document.querySelectorAll('[class*="markdown-body"]').length;
  const beforeImgs = new Set(Array.from(document.querySelectorAll('img[src*="byteimg.com/ocean-cloud"]')).map(i => i.src));
  Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(ta, args.message);
  ta.dispatchEvent(new Event('input', { bubbles: true }));
  onSubmit();

  let lastLen = 0, stable = 0;
  for (let i = 0; i < 48; i++) {
    await new Promise(r => setTimeout(r, 500));
    const count = document.querySelectorAll('[class*="markdown-body"]').length;
    if (count <= beforeCount) continue;
    const text = document.querySelectorAll('[class*="markdown-body"]')[count-1]?.innerText?.trim() || '';
    const imgs = Array.from(document.querySelectorAll('img[src*="byteimg.com/ocean-cloud"]')).map(i=>i.src).filter(u=>!beforeImgs.has(u));
    const len = text.length + imgs.length * 100;
    if (len > 0 && len === lastLen) { stable++; if (stable >= 3) { const r = {message:text,conversation_id:location.pathname.match(/\/chat\/([^/?#]+)/)?.[1]||''}; if(imgs.length)r.images=imgs; return r; } }
    else if (len > 0) { stable = 0; lastLen = len; }
  }
  const count = document.querySelectorAll('[class*="markdown-body"]').length;
  if (count > beforeCount) { const text = document.querySelectorAll('[class*="markdown-body"]')[count-1]?.innerText?.trim()||''; const imgs = Array.from(document.querySelectorAll('img[src*="byteimg.com/ocean-cloud"]')).map(i=>i.src).filter(u=>!beforeImgs.has(u)); const r = {message:text||'(incomplete)',conversation_id:location.pathname.match(/\/chat\/([^/?#]+)/)?.[1]||''}; if(imgs.length)r.images=imgs; return r; }
  return { error: 'timeout', hint: '用 bb-browser site doubao/last-response 获取回复' };
}
