/* @meta
{
  "name": "doubao/logout",
  "description": "豆包退出登录",
  "domain": "www.doubao.com",
  "args": {},
  "readOnly": false
}
*/
async function() {
  // Step 1: Click username button (requires pointer events, not just click)
  const userBtn = Array.from(document.querySelectorAll('button'))
    .find(b => b.getBoundingClientRect().width > 0 && /^[A-Z]/.test(b.innerText?.trim()) && b.innerText.trim().length < 20 && !/^(AI|PPT|快速|思考|专家|更多|翻译|编程|解题)/.test(b.innerText.trim()));
  if (!userBtn) return { error: 'not_logged_in' };

  userBtn.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true}));
  userBtn.dispatchEvent(new PointerEvent('pointerup', {bubbles: true}));
  userBtn.dispatchEvent(new MouseEvent('click', {bubbles: true}));
  await new Promise(r => setTimeout(r, 1000));

  // Step 2: Click "退出登录" in user panel
  const logoutDiv = Array.from(document.querySelectorAll('div'))
    .find(e => e.innerText?.trim() === '退出登录' && e.childElementCount <= 3 && e.getBoundingClientRect().width > 0);
  if (!logoutDiv) {
    document.body.click();
    return { error: 'logout_button_not_found' };
  }
  logoutDiv.click();
  await new Promise(r => setTimeout(r, 800));

  // Step 3: Click confirm in dialog
  const confirmBtn = Array.from(document.querySelectorAll('button'))
    .find(b => b.innerText?.trim() === '退出登录' && b.getBoundingClientRect().height > 0 && b.getBoundingClientRect().y > 200);
  if (confirmBtn) {
    confirmBtn.click();
    await new Promise(r => setTimeout(r, 2000));
  }

  return { status: 'logged_out' };
}
