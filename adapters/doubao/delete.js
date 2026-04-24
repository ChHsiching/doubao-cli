/* @meta
{
  "name": "doubao/delete",
  "description": "豆包删除会话 (doubao delete: remove a conversation by navigating to it and deleting)",
  "domain": "www.doubao.com",
  "args": {
    "conversation_id": {"required": true, "description": "要删除的会话ID"}
  },
  "readOnly": false,
  "example": "bb-browser site doubao/delete 38422287845001986"
}
*/
async function(args) {
  // Find the conversation link in sidebar and delete via IM protocol
  const body = {
    cmd: 2100,
    uplink_body: {
      delete_conv_uplink_body: {
        conversation_id: args.conversation_id,
        conversation_type: 3,
      },
    },
    sequence_id: crypto.randomUUID(),
    channel: 2,
    version: '1',
  };

  const response = await fetch('https://www.doubao.com/im/chain/delete_conv?version_code=20800&language=zh&device_platform=web&aid=497858&real_aid=497858&pkg_type=release_version&samantha_web=1&region=CN&sys_region=CN&use-olympus-account=1', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', 'Agw-Js-Conv': 'str' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    return { error: 'HTTP ' + response.status };
  }

  const data = await response.json();
  if (data.status_code && data.status_code !== 0) {
    return { error: 'IM error ' + data.status_code + ': ' + (data.status_desc || '') };
  }

  return { success: true, conversation_id: args.conversation_id };
}
