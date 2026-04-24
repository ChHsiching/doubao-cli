/* @meta
{
  "name": "doubao/conversations",
  "description": "豆包会话列表 (doubao conversations: list recent chat conversations from sidebar)",
  "domain": "www.doubao.com",
  "args": {},
  "readOnly": true,
  "example": "bb-browser site doubao/conversations"
}
*/
async function(args) {
  // Get conversation links from sidebar
  const links = document.querySelectorAll('a[href*="/chat/"]');
  const convs = [];

  for (const link of links) {
    const href = link.getAttribute('href') || '';
    const match = href.match(/\/chat\/([^/?#]+)/);
    if (!match) continue;
    const id = match[1];
    const title = link.innerText?.trim();
    if (!title || title.length < 1 || title.length > 200) continue;
    // Deduplicate
    if (convs.some(c => c.id === id)) continue;
    convs.push({ id, title });
  }

  return { conversations: convs, count: convs.length };
}
