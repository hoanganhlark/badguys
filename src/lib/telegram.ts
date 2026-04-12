import { envConfig } from "../env";

function isTelegramConfigured(): boolean {
  return (
    !!envConfig.telegramBotToken &&
    !!envConfig.telegramGroupChatId &&
    !envConfig.telegramBotToken.startsWith("__") &&
    !envConfig.telegramGroupChatId.startsWith("__")
  );
}

export async function sendTelegramMessage(text: string): Promise<void> {
  if (!isTelegramConfigured()) return;

  const endpoint = `https://api.telegram.org/bot${envConfig.telegramBotToken}/sendMessage`;
  await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: envConfig.telegramGroupChatId,
      text,
    }),
  });
}

export async function notifyCopyClicked(summaryContent: string): Promise<void> {
  const text = `A guest clicked copy with the content below:\n${summaryContent}`;
  try {
    await sendTelegramMessage(text);
  } catch (error) {
    console.warn("Telegram copy notification failed", error);
  }
}

export async function notifyGuestVisited(
  timestamp: string,
  deviceName: string,
): Promise<void> {
  const text = `A guest visited BadGuys app at ${timestamp}\nDevice: ${deviceName}`;
  try {
    await sendTelegramMessage(text);
  } catch (error) {
    console.warn("Telegram visit notification failed", error);
  }
}
