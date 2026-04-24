/* @meta
{
  "name": "doubao/poll",
  "description": "轮询豆包AI回复（检测内容稳定判断完成，获取Markdown源码）",
  "domain": "www.doubao.com",
  "args": {
    "before_count": {"required": false, "description": "发送前的 markdown-body 数量"},
    "prev_len": {"required": false, "description": "上一次poll的内容长度"}
  },
  "readOnly": true
}
*/
function(args) {
  if (typeof args.before_count === 'string' && args.before_count.startsWith('{')) {
    try { const p = JSON.parse(args.before_count); if (p.before_count !== undefined) args = p; } catch {}
  }
  const beforeCount = parseInt(args.before_count) || 0;
  const prevLen = parseInt(args.prev_len) || 0;
  const mdCount = document.querySelectorAll('[class*="markdown-body"]').length;

  if (mdCount <= beforeCount) {
    return { status: 'waiting', mdCount, beforeCount };
  }

  const newMd = document.querySelectorAll('[class*="markdown-body"]')[mdCount - 1];
  if (!newMd) return { status: 'waiting', mdCount, beforeCount };

  const text = newMd.innerText?.trim() || '';
  const len = text.length;

  if (len > 0 && len === prevLen) {
    const thinkBtn = Array.from(document.querySelectorAll('button'))
      .find(b => /^(快速|思考|专家)/.test(b.innerText?.trim()) && b.querySelector('button') && b.getBoundingClientRect().width > 0);
    const thinkingMode = thinkBtn?.innerText?.trim() || '快速';

    let references = '';
    let container = newMd;
    for (let i = 0; i < 4; i++) container = container.parentElement;
    if (container) {
      const siblings = Array.from(container.parentElement?.children || []);
      for (const sib of siblings) {
        if (sib === container) continue;
        const t = sib.innerText?.trim() || '';
        if (t.startsWith('参考') && t.includes('资料')) references = t.substring(0, 200);
      }
    }

    // Get Markdown source via React fiber (prop name: markDown)
    let markdown = '';
    const fiberKey = Object.keys(newMd).find(k => k.startsWith('__reactFiber'));
    if (fiberKey) {
      let fiber = newMd[fiberKey];
      for (let i = 0; i < 30 && fiber; i++) {
        const p = fiber.memoizedProps || {};
        if (typeof p.markDown === 'string' && p.markDown.length > len * 0.5) { markdown = p.markDown; break; }
        fiber = fiber.return;
      }
    }

    if (!markdown) markdown = text;

    const r = {
      status: 'done',
      message: markdown,
      thinking_mode: thinkingMode,
      conversation_id: location.pathname.match(/\/chat\/([^/?#]+)/)?.[1] || '',
      len
    };
    if (references) r.references = references;
    return r;
  }

  return { status: 'streaming', len, prevLen, preview: text.substring(0, 200) };
}
