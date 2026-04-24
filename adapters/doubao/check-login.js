/* @meta
{
  "name": "doubao/check-login",
  "description": "检查豆包登录状态",
  "domain": "www.doubao.com",
  "args": {},
  "readOnly": true
}
*/
async function() {
  const ta = document.querySelector('textarea');
  const ce = document.querySelector('[contenteditable="true"]');
  const inputReady = !!(ta && ta.getBoundingClientRect().height > 0) || !!(ce && ce.getBoundingClientRect().height > 0);

  // Login detection: look for username button (e.g. "ChHsich") or avatar elements
  const btns = Array.from(document.querySelectorAll('button')).filter(b => b.getBoundingClientRect().width > 0);
  const hasUsername = btns.some(b => {
    const t = b.innerText?.trim() || '';
    // Username buttons are short, capitalized, and appear in the header area
    return t.length > 1 && t.length < 20 && /^[A-Z]/.test(t) &&
      !/^(AI|PPT|快速|思考|专家|更多|翻译|编程|解题)/.test(t);
  });
  const hasAvatar = !!document.querySelector('[class*="avatar"], [class*="Avatar"]');
  const hasFiber = ta ? !!Object.keys(ta).find(k => k.startsWith('__reactFiber')) : false;

  return {
    logged_in: hasUsername || hasAvatar,
    input_ready: inputReady && hasFiber,
    url: location.href,
    title: document.title
  };
}
