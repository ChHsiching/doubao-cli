/* @meta
{
  "name": "doubao/send",
  "description": "发送消息到豆包（不等待回复）",
  "domain": "www.doubao.com",
  "args": {
    "message": {"required": true, "description": "消息内容"},
    "mode": {"required": false, "description": "模式: chat, writing, ppt, coding, image, translate, video, music, podcast, solve, data, super"},
    "thinking": {"required": false, "description": "思考深度: quick/think/expert"},
    "translate_target": {"required": false, "description": "翻译目标语言: english/chinese"}
  },
  "readOnly": false
}
*/
async function(args) {
  if (typeof args.message === 'string' && args.message.startsWith('{')) {
    try { const p = JSON.parse(args.message); if (p.message) args = p; } catch {}
  }

  const modes = {
    chat: null, writing: '帮我写作', ppt: 'PPT 生成', coding: '编程',
    image: '图像生成', translate: '翻译',
    video: '视频生成', music: '音乐生成', podcast: 'AI 播客',
    solve: '解题答疑', data: '数据分析', super: '超能模式',
  };
  // Modes that need UI mode switch + special submit (all go through "更多" popup)
  const skillModes = new Set(['translate', 'solve', 'writing', 'ppt', 'coding', 'image', 'video', 'music', 'podcast', 'data', 'super']);

  const ta = document.querySelector('textarea');
  const ce = document.querySelector('[contenteditable="true"]');
  let inputEl = null;
  if (ce && ce.getBoundingClientRect().height > 0) inputEl = ce;
  else if (ta && ta.getBoundingClientRect().height > 0) inputEl = ta;
  else if (ce) inputEl = ce;
  else if (ta) inputEl = ta;

  if (!inputEl) return { error: 'input not found', hint: '请先打开豆包', action: 'doubao open' };

  // ── Thinking depth ──
  const depthLabels = { quick: '快速', think: '思考', expert: '专家' };
  if (args.thinking && depthLabels[args.thinking]) {
    const targetLabel = depthLabels[args.thinking];
    try {
      if (ta) ta.focus(); else if (ce) ce.focus();
      await new Promise(res => setTimeout(res, 200));

      const triggers = Array.from(document.querySelectorAll('[aria-haspopup="menu"]'));
      const thinkTrigger = triggers.find(t => {
        const inner = t.querySelector('button');
        return inner && /^(快速|思考|专家)/.test(inner.innerText?.trim() || '');
      });
      if (thinkTrigger) {
        const currentLabel = thinkTrigger.querySelector('button')?.innerText?.trim() || '';
        if (currentLabel !== targetLabel && !currentLabel.startsWith(targetLabel)) {
          const r = thinkTrigger.getBoundingClientRect();
          if (r.height > 0) {
            const cx = r.x + r.width / 2, cy = r.y + r.height / 2;
            thinkTrigger.dispatchEvent(new PointerEvent('pointerdown', {bubbles:true, cancelable:true, view:window, pointerId:1, pointerType:'mouse', clientX:cx, clientY:cy}));
            thinkTrigger.dispatchEvent(new PointerEvent('pointerup', {bubbles:true, cancelable:true, view:window, pointerId:1, pointerType:'mouse', clientX:cx, clientY:cy}));
            thinkTrigger.dispatchEvent(new MouseEvent('click', {bubbles:true, cancelable:true, view:window, clientX:cx, clientY:cy}));
            await new Promise(res => setTimeout(res, 200));
            const menus = document.querySelectorAll('[role="menu"][data-state="open"]');
            for (const menu of menus) {
              for (const item of menu.querySelectorAll('[role="menuitem"]')) {
                if ((item.textContent?.trim() || '').startsWith(targetLabel)) {
                  const fk = Object.keys(item).find(k => k.startsWith('__reactFiber'));
                  if (fk) {
                    const onClick = item[fk]?.memoizedProps?.onClick;
                    if (typeof onClick === 'function') {
                      onClick({currentTarget: item, target: item, preventDefault: ()=>{}, stopPropagation: ()=>{}});
                    }
                  }
                  break;
                }
              }
            }
            await new Promise(res => setTimeout(res, 200));
          }
        }
      }
    } catch(e) {}
  }

  // ── Mode switching ──
  const modeLabel = modes[args.mode];
  const isSkillMode = skillModes.has(args.mode);

  // Pre-fill textarea before mode switch so the message state is populated
  if (isSkillMode && ta && inputEl.tagName === 'TEXTAREA') {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(ta, args.message);
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 200));
  }

  if (modeLabel) {
    let modeSwitched = false;

    // Always click "更多" first — all skill modes live behind it
    const allBtns = Array.from(document.querySelectorAll('button, div'));
    const moreBtn = allBtns.find(b => b.innerText?.trim() === '更多' && b.getBoundingClientRect().width > 0);
    if (moreBtn) {
      moreBtn.click();
      await new Promise(r => setTimeout(r, 500));
      // Search in the expanded popup/panel by exact text match
      for (const b of document.querySelectorAll('button, div[class*=cursor-pointer], [data-value]')) {
        if (b.innerText?.trim() === modeLabel && b.getBoundingClientRect().width > 0) {
          b.click();
          modeSwitched = true;
          break;
        }
      }
    }

    // Fallback: direct toolbar click (if button is already visible)
    if (!modeSwitched) {
      for (const b of document.querySelectorAll('button')) {
        if (b.innerText?.trim() === modeLabel && b.getBoundingClientRect().width > 0) {
          b.click();
          modeSwitched = true;
          break;
        }
      }
    }

    // Wait for React state to update the input element
    await new Promise(r => setTimeout(r, 800));
  }

  // ── Translate: select target language ──
  if (args.mode === 'translate' && args.translate_target) {
    const targetLangLabel = args.translate_target === 'english' ? 'English' :
                             args.translate_target === 'chinese' ? '中文（简体）' : null;
    if (targetLangLabel) {
      // Find the current language selector button
      await new Promise(res => setTimeout(res, 300));
      const langBtn = Array.from(document.querySelectorAll('button')).find(
        b => b.innerText?.includes('翻译为') && b.getBoundingClientRect().width > 0
      );
      if (langBtn) {
        // Click to open language menu
        const r = langBtn.getBoundingClientRect();
        const cx = r.x + r.width/2, cy = r.y + r.height/2;
        langBtn.dispatchEvent(new PointerEvent('pointerdown', {bubbles:true, cancelable:true, view:window, pointerId:1, pointerType:'mouse', clientX:cx, clientY:cy}));
        langBtn.dispatchEvent(new PointerEvent('pointerup', {bubbles:true, cancelable:true, view:window, pointerId:1, pointerType:'mouse', clientX:cx, clientY:cy}));
        langBtn.dispatchEvent(new MouseEvent('click', {bubbles:true, cancelable:true, view:window, clientX:cx, clientY:cy}));
        await new Promise(res => setTimeout(res, 300));
        // Find and click the target language option
        const items = document.querySelectorAll('[role="menuitem"]');
        for (const item of items) {
          if (item.innerText?.trim() === targetLangLabel) {
            const fk = Object.keys(item).find(k => k.startsWith('__reactFiber'));
            if (fk) {
              const onClick = item[fk]?.memoizedProps?.onClick;
              if (typeof onClick === 'function') {
                onClick({currentTarget: item, target: item, preventDefault(){}, stopPropagation(){}});
              }
            }
            break;
          }
        }
        await new Promise(res => setTimeout(res, 300));
      }
    }
  }

  // ── Re-discover input after mode switch ──
  // Wait for React to fully render the new input element
  await new Promise(r => setTimeout(r, 300));
  const ta2 = document.querySelector('textarea');
  const ce2 = document.querySelector('[contenteditable="true"]');
  let submitEl = null;
  if (ce2 && ce2.getBoundingClientRect().height > 0) submitEl = ce2;
  else if (ta2 && ta2.getBoundingClientRect().height > 0) submitEl = ta2;
  else if (ce2) submitEl = ce2;
  else if (ta2) submitEl = ta2;
  else submitEl = ta || ce;

  const beforeCount = Array.from(document.querySelectorAll('[class*="markdown-body"]')).filter(md => !md.closest('[data-thinking-box-collapsed-step-content]')).length;

  // ── Set value ──
  // For skill modes, message was pre-filled into textarea before mode switch.
  // React state already has the message — skip re-typing to avoid duplication.
  if (!isSkillMode) {
    if (submitEl.tagName === 'TEXTAREA') {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(submitEl, args.message);
      submitEl.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      // Slate.js editor: use beforeinput event
      submitEl.focus();
      submitEl.dispatchEvent(new InputEvent('beforeinput', {
        inputType: 'insertText',
        data: args.message,
        bubbles: true,
        cancelable: true,
        composed: true,
      }));
    }
  }

  // ── Submit ──
  let submitted = false;

  if (isSkillMode) {
    // Skill modes (编程/数学/etc) use onSubmit from the new inputEl's fiber chain
    const fk = Object.keys(submitEl).find(k => k.startsWith('__reactFiber'));
    if (fk) {
      let fiber = submitEl[fk];
      for (let i = 0; i < 40 && fiber; i++) {
        const p = fiber.memoizedProps || {};
        if (typeof p.onSubmit === 'function') {
          p.onSubmit();
          submitted = true;
          break;
        }
        fiber = fiber.return;
      }
    }
  }

  if (!submitted) {
    // Default: submit via onKeyDown from textarea fiber
    const fk2 = submitEl && Object.keys(submitEl).find(k => k.startsWith('__reactFiber'));
    if (fk2) {
      let f2 = submitEl[fk2];
      for (let i = 0; i < 15 && f2; i++) {
        const p = f2.memoizedProps || {};
        if (typeof p.onKeyDown === 'function') {
          p.onKeyDown({
            key: 'Enter', code: 'Enter', keyCode: 13, which: 13,
            shiftKey: false, ctrlKey: false, altKey: false, metaKey: false,
            target: submitEl, currentTarget: submitEl,
            nativeEvent: new KeyboardEvent('keydown', {key:'Enter', keyCode:13, bubbles:true}),
            preventDefault(){}, stopPropagation(){}, persist(){},
            isDefaultPrevented(){ return false; }, isPropagationStopped(){ return false; }
          });
          submitted = true; break;
        }
        f2 = f2.return;
      }
    }
  }

  return {
    sent: true,
    conversation_id: location.pathname.match(/\/chat\/([^/?#]+)/)?.[1] || '',
    before_count: beforeCount,
    thinking_mode: args.thinking || 'default'
  };
}
