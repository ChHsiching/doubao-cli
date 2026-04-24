/* @meta
{
  "name": "doubao/account",
  "description": "豆包账户信息 (doubao account: check login status and account info)",
  "domain": "www.doubao.com",
  "args": {},
  "readOnly": true,
  "example": "bb-browser site doubao/account"
}
*/
async function(args) {
  function randomAlphaNum(n) {
    const c = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let s = '';
    for (let i = 0; i < n; i++) s += c[Math.floor(Math.random() * c.length)];
    return s;
  }

  function generateMsToken() {
    const bytes = new Uint8Array(96);
    crypto.getRandomValues(bytes);
    return btoa(String.fromCharCode(...bytes))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  const deviceId = (Math.random() * 999999999999999999 + 7e18).toString();
  const webId = (Math.random() * 999999999999999999 + 7e18).toString();
  const msToken = generateMsToken();
  const aBogus = 'mf-' + randomAlphaNum(34) + '-' + randomAlphaNum(6);

  const params = new URLSearchParams({
    aid: '497858',
    device_id: deviceId,
    device_platform: 'web',
    language: 'zh',
    pkg_type: 'release_version',
    real_aid: '497858',
    region: 'CN',
    samantha_web: '1',
    sys_region: 'CN',
    tea_uuid: webId,
    use_olympus_account: '1',
    version_code: '20800',
    web_id: webId,
    msToken: msToken,
    a_bogus: aBogus,
    account_sdk_source: 'web',
  });

  const response = await fetch('https://www.doubao.com/passport/account/info/v2?' + params, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'Agw-js-conv': 'str',
      'Referer': 'https://www.doubao.com/',
    },
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      return {
        error: 'HTTP ' + response.status,
        hint: '请先在浏览器中打开 www.doubao.com 并登录豆包账号',
        action: 'bb-browser open https://www.doubao.com',
      };
    }
    return { error: 'HTTP ' + response.status };
  }

  const data = await response.json();
  if (data.code && data.code !== 0) {
    return { error: data.code + ': ' + data.message };
  }

  const info = data.data || {};
  return {
    logged_in: !!(info.user_id),
    user_id: info.user_id || '',
    username: info.username || info.name || '',
    avatar: info.avatar_url || '',
  };
}
