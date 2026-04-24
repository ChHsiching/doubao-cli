/* @meta
{
  "name": "doubao/login-send-code",
  "description": "豆包登录: 勾选协议、输入手机号、发送验证码",
  "domain": "www.doubao.com",
  "args": {
    "phone": {"required": true, "description": "手机号"}
  },
  "readOnly": false
}
*/
async function(args) {
  if (typeof args.phone === 'string' && args.message === undefined && args.phone.startsWith('{')) {
    try { const p = JSON.parse(args.phone); if (p.phone) args = p; } catch {}
  }
  const phone = String(args.phone);

  // Check if already logged in
  const userBtn = Array.from(document.querySelectorAll('button'))
    .find(b => b.getBoundingClientRect().width > 0 && /^[A-Z]/.test(b.innerText?.trim()) && b.innerText.trim().length < 20 && !/^(AI|PPT|快速|思考|专家|更多|翻译|编程|解题)/.test(b.innerText.trim()));
  if (userBtn) return { status: 'already_logged_in' };

  // Find or open the login modal (Semi Design modal)
  let modal = document.querySelector('.semi-modal-wrap');
  if (!modal) {
    const loginBtn = Array.from(document.querySelectorAll('button'))
      .find(b => b.innerText?.trim() === '登录' && b.getBoundingClientRect().width > 0);
    if (loginBtn) loginBtn.click();
    await new Promise(r => setTimeout(r, 1000));
    modal = document.querySelector('.semi-modal-wrap');
  }
  if (!modal) return { error: 'login_modal_not_found', hint: '请用 doubao login --web 手动登录' };

  // If modal already shows code input, return status (don't resend)
  if (modal.innerText?.includes('验证码') && modal.innerText?.includes('输入')) {
    return { status: 'code_input_ready', hint: '验证码输入界面已打开，请直接输入验证码' };
  }

  // Step 1: Agree to terms (checkbox)
  const checkbox = modal.querySelector('[role="checkbox"]');
  if (checkbox && checkbox.getAttribute('aria-checked') !== 'true') {
    checkbox.click();
    await new Promise(r => setTimeout(r, 200));
  }

  // Step 2: Fill phone number
  const phoneInput = modal.querySelector('input[placeholder*="手机"]') || modal.querySelector('input[type="text"]');
  if (!phoneInput) return { error: 'phone_input_not_found' };

  phoneInput.focus();
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  setter.call(phoneInput, phone);
  phoneInput.dispatchEvent(new Event('input', { bubbles: true }));
  phoneInput.dispatchEvent(new Event('change', { bubbles: true }));
  await new Promise(r => setTimeout(r, 300));

  // Step 3: Click "下一步" button
  const nextBtn = Array.from(modal.querySelectorAll('button'))
    .find(b => b.innerText?.trim() === '下一步' && b.getBoundingClientRect().height > 0);
  if (!nextBtn) return { error: 'next_button_not_found' };

  nextBtn.click();
  await new Promise(r => setTimeout(r, 1000));

  return { status: 'code_sent', phone };
}
