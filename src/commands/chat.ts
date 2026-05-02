import { getSession } from "../browser.js";

export async function chatSendAndPoll(
  message: string,
  mode = "",
  thinking = "",
  translateTarget = "",
): Promise<void> {
  const session = await getSession();
  const tabId = await session.requireLogin();
  await session.waitForFiberReady(tabId);

  const sendArgs: Record<string, string> = { message };
  if (mode) sendArgs.mode = mode;
  if (thinking) sendArgs.thinking = thinking;
  if (translateTarget) sendArgs.translate_target = translateTarget;

  const sendResult = await session.runAdapter("send", sendArgs);
  if (sendResult?.error) {
    throw new Error(`Send failed: ${JSON.stringify(sendResult)}`);
  }

  const beforeCount = sendResult?.before_count || 0;
  const result = await session.pollResponse(beforeCount);

  if (result.thinking_mode && result.thinking_mode !== "快速") {
    process.stderr.write(`[${result.thinking_mode} 模式]\n`);
  }
  if (result.references) {
    process.stderr.write(`[${result.references}]\n`);
  }

  console.log(result.message);
}
