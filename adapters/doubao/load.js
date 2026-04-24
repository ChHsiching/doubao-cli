/* @meta
{
  "name": "doubao/load",
  "description": "豆包加载当前页面会话消息 (doubao load: extract messages from current conversation page)",
  "domain": "www.doubao.com",
  "args": {
    "limit": {"required": false, "description": "加载最近N条消息，默认10"}
  },
  "readOnly": true,
  "example": "bb-browser open https://www.doubao.com/chat/CONV_ID && bb-browser site doubao/load"
}
*/
async function(args) {
  const convId = location.pathname.match(/\/chat\/([^/?#]+)/)?.[1] || '';
  if (!convId) return { error: 'no conversation loaded', hint: '先用 bb-browser open https://www.doubao.com/chat/CONV_ID 导航到会话' };

  const limit = parseInt(args.limit) || 10;

  // Collect all message pairs from DOM
  // Doubao renders user messages and AI responses as sibling elements in a chat container
  const containers = document.querySelectorAll('[class*="chat-message"], [class*="message-item"], [class*="MessageItem"]');
  if (containers.length === 0) {
    // Fallback: use bubble + markdown-body extraction
    const bubbles = Array.from(document.querySelectorAll('[class*="bubble"]')).map(el => ({
      role: 'user', text: el.innerText?.trim() || ''
    })).filter(m => m.text);

    const responses = Array.from(document.querySelectorAll('[class*="markdown-body"]')).map(el => ({
      role: 'assistant', text: el.innerText?.trim() || ''
    })).filter(m => m.text);

    // Interleave by position
    const allMessages = [];
    const maxCount = Math.max(bubbles.length, responses.length);
    const start = Math.max(0, maxCount - limit);
    for (let i = start; i < maxCount; i++) {
      if (i < bubbles.length) allMessages.push(bubbles[i]);
      if (i < responses.length) allMessages.push(responses[i]);
    }

    return {
      conversation_id: convId,
      title: document.title?.replace(' - 豆包', '') || '',
      messages: allMessages,
      total_user: bubbles.length,
      total_assistant: responses.length
    };
  }

  // Structured extraction from message containers
  const messages = [];
  const start = Math.max(0, containers.length - limit);
  for (let i = start; i < containers.length; i++) {
    const el = containers[i];
    const isUser = el.querySelector('[class*="bubble"]') && !el.querySelector('[class*="markdown-body"]');
    const isAssistant = !!el.querySelector('[class*="markdown-body"]');
    if (isUser) {
      messages.push({ role: 'user', text: el.querySelector('[class*="bubble"]')?.innerText?.trim() || '' });
    } else if (isAssistant) {
      messages.push({ role: 'assistant', text: el.querySelector('[class*="markdown-body"]')?.innerText?.trim() || '' });
    }
  }

  return {
    conversation_id: convId,
    title: document.title?.replace(' - 豆包', '') || '',
    messages: messages.filter(m => m.text),
    total_containers: containers.length
  };
}
