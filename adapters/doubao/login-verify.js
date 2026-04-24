/* @meta
{
  "name": "doubao/login-verify",
  "description": "豆包登录: 输入验证码并提交登录",
  "domain": "www.doubao.com",
  "args": {
    "code": {"required": true, "description": "短信验证码"},
    "phone": {"required": false, "description": "手机号（弹窗关闭时重新打开）"}
  },
  "readOnly": false
}
*/
async function(args) {
  if (typeof args.code === 'string' && args.code.startsWith('{')) {
    try { const p = JSON.parse(args.code); if (p.code) args = p; } catch {}
  }
  const code = String(args.code);
  const phone = args.phone ? String(args.phone) : '';

  // Check if already logged in
  const userBtn = Array.from(document.querySelectorAll('button'))
    .find(b => b.getBoundingClientRect().width > 0 && /^[A-Z]/.test(b.innerText?.trim()) && b.innerText.trim().length < 20 && !/^(AI|PPT|快速|思考|专家|更多|翻译|编程|解题)/.test(b.innerText.trim()));
  if (userBtn) return { status: 'logged_in', username: userBtn.innerText.trim() };

  // Find or open login modal
  let modal = document.querySelector('.semi-modal-wrap');
  if (!modal) {
    // Click login button to open modal
    const loginBtn = Array.from(document.querySelectorAll('button'))
      .find(b => b.innerText?.trim() === '登录' && b.getBoundingClientRect().width > 0);
    if (loginBtn) {
      loginBtn.click();
      await new Promise(r => setTimeout(r, 1000));
    }
    modal = document.querySelector('.semi-modal-wrap');
  }
  if (!modal) return { error: 'login_modal_not_found', hint: '请先运行 doubao login <手机号>' };

  // If modal shows phone input (not code input), we need to go through phone step first
  const hasCodeInput = modal.querySelector('input[placeholder*="验证码"]') ||
    modal.querySelector('input[maxlength]');
  if (!hasCodeInput && phone) {
    // Fill phone and click next
    const phoneInput = modal.querySelector('input[placeholder*="手机"]') || modal.querySelector('input[type="text"]');
    if (phoneInput) {
      const checkbox = modal.querySelector('[role="checkbox"]');
      if (checkbox && checkbox.getAttribute('aria-checked') !== 'true') {
        checkbox.click();
        await new Promise(r => setTimeout(r, 200));
      }
      phoneInput.focus();
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      setter.call(phoneInput, phone);
      phoneInput.dispatchEvent(new Event('input', { bubbles: true }));
      phoneInput.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise(r => setTimeout(r, 300));
      const nextBtn = Array.from(modal.querySelectorAll('button'))
        .find(b => b.innerText?.trim() === '下一步' && b.getBoundingClientRect().height > 0);
      if (nextBtn) {
        nextBtn.click();
        await new Promise(r => setTimeout(r, 1500));
      }
    }
  }

  // Find code input
  const codeInput = modal.querySelector('input[placeholder*="验证码"]') ||
    modal.querySelector('input[type="text"]') ||
    modal.querySelector('input[maxlength]');
  if (!codeInput) return { error: 'code_input_not_found', hint: '验证码输入框未找到' };

  codeInput.focus();
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  setter.call(codeInput, code);
  codeInput.dispatchEvent(new Event('input', { bubbles: true }));
  codeInput.dispatchEvent(new Event('change', { bubbles: true }));
  await new Promise(r => setTimeout(r, 300));

  // Click submit button
  const submitBtn = Array.from(modal.querySelectorAll('button'))
    .find(b => /登录|确定|验证|下一步|提交/.test(b.innerText?.trim()) && b.getBoundingClientRect().height > 0)
    || modal.querySelector('button.semi-button-primary')
    || modal.querySelector('button');
  if (submitBtn) {
    submitBtn.click();
    await new Promise(r => setTimeout(r, 3000));
  }

  // Check if logged in
  const userBtn2 = Array.from(document.querySelectorAll('button'))
    .find(b => b.getBoundingClientRect().width > 0 && /^[A-Z]/.test(b.innerText?.trim()) && b.innerText.trim().length < 20 && !/^(AI|PPT|快速|思考|专家|更多|翻译|编程|解题)/.test(b.innerText.trim()));
  if (userBtn2) return { status: 'logged_in', username: userBtn2.innerText.trim() };

  // Check for error messages
  const errors = Array.from(modal.querySelectorAll('[class*="error"], [class*="Error"], [class*="warn"]'))
    .filter(e => e.innerText.trim())
    .map(e => e.innerText.trim().substring(0, 100));

  return errors.length > 0
    ? { status: 'error', errors }
    : { status: 'submitted', hint: '运行 doubao account 检查登录状态' };
}
