/* @meta
{
  "name": "doubao/new",
  "description": "豆包新建会话 (doubao new: navigate to fresh conversation, then verify)",
  "domain": "www.doubao.com",
  "args": {},
  "readOnly": false,
  "example": "bb-browser open https://www.doubao.com/chat/ && bb-browser site doubao/new"
}
*/
async function(args) {
  const url = location.href;
  const onChat = url.includes('doubao.com/chat');
  if (!onChat) return { error: 'not on doubao chat', action: 'bb-browser open https://www.doubao.com/chat/' };

  const ta = document.querySelector('textarea');
  if (!ta) return { error: 'textarea not found', hint: '页面可能未完全加载，稍后重试' };

  const convId = location.pathname.match(/\/chat\/([^/?#]+)/)?.[1] || '';
  if (convId) {
    return { status: 'existing_conversation', conversation_id: convId, hint: '当前已在会话中。如需空白新会话，请先 bb-browser open https://www.doubao.com/chat/' };
  }

  const mds = document.querySelectorAll('[class*="markdown-body"]');
  return {
    status: 'new_conversation',
    conversation_id: convId || 'pending',
    existing_messages: mds.length,
    hint: mds.length === 0 ? '空白新会话，发送消息后将自动创建' : '当前页面有历史消息，可能需要刷新'
  };
}
