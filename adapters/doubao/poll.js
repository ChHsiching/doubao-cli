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

  // Exclude thinking-chain markdown-bodies: elements inside [data-thinking-box-collapsed-step-content]
  const allMd = Array.from(document.querySelectorAll('[class*="markdown-body"]'));
  const realMd = allMd.filter(md => !md.closest('[data-thinking-box-collapsed-step-content]'));
  const mdCount = realMd.length;

  if (mdCount <= beforeCount) {
    return { status: 'waiting', mdCount: allMd.length, realMdCount: mdCount, beforeCount };
  }

  const newMd = realMd[mdCount - 1];
  if (!newMd) return { status: 'waiting', mdCount, beforeCount };

  const text = newMd.innerText?.trim() || '';
  const len = text.length;

  if (len > 0 && len === prevLen) {
    // PPT: if completion text appears but iframe not yet loaded, wait
    if (/制作完成|已经为您.*完成/.test(text)) {
      const hasIframe = Array.from(document.querySelectorAll('iframe')).some(
        f => f.src && f.src.includes('ccm-slides') && f.getBoundingClientRect().height > 0
      );
      if (!hasIframe) return { status: 'streaming', len, prevLen, preview: text.substring(0, 200), hint: 'waiting for PPT iframe' };
    }

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

    // Check for PPT iframe (ccm-slides) — extract token for clean preview URL
    const pptIframe = Array.from(document.querySelectorAll('iframe')).find(
      f => f.src && f.src.includes('ccm-slides') && f.getBoundingClientRect().height > 0
    );
    if (pptIframe) {
      const token = new URL(pptIframe.src).searchParams.get('token');
      if (token) {
        r.ppt_url = 'https://www.doubao.com/slides/' + token;
      }
    }

    // Check for generated images (byteimg.com/ocean-cloud)
    const genImgs = Array.from(document.querySelectorAll('img[src*="byteimg.com/ocean-cloud"]'))
      .map(i => i.src)
      .filter(u => u && u.includes('generated'));
    if (genImgs.length > 0) {
      r.images = genImgs;
    }

    // Check for document component (writing/super mode)
    const docLink = Array.from(document.querySelectorAll('a[href*="docs"]')).find(
      a => a.href && a.getBoundingClientRect().height > 0
    );
    if (docLink) {
      r.doc_url = docLink.href;
    }

    return r;
  }

  return { status: 'streaming', len, prevLen, preview: text.substring(0, 200) };
}
