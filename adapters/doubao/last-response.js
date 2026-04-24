/* @meta
{
  "name": "doubao/last-response",
  "description": "豆包最新回复 (doubao last-response: get the most recent AI response on current page)",
  "domain": "www.doubao.com",
  "args": {},
  "readOnly": true,
  "example": "bb-browser site doubao/last-response"
}
*/
async function(args) {
  const mds = document.querySelectorAll('[class*="markdown-body"]');
  if (mds.length === 0) return { message: '', hint: '当前页面没有AI回复' };

  const text = mds[mds.length - 1]?.innerText?.trim() || '';
  const imgs = Array.from(mds[mds.length - 1]?.querySelectorAll('img') || [])
    .map(i => i.src).filter(s => s && !s.includes('emoji'));
  const convId = location.pathname.match(/\/chat\/([^/?#]+)/)?.[1] || '';

  return Object.assign({ message: text, conversation_id: convId, response_index: mds.length }, imgs.length ? { images: imgs } : {});
}
