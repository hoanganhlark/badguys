import { envConfig } from "../env";
import { getGuestDeviceName } from "./platform";

function isTelegramConfigured(): boolean {
  return (
    envConfig.enableTelegramNotification &&
    !!envConfig.telegramBotToken &&
    !!envConfig.telegramGroupChatId &&
    !envConfig.telegramBotToken.startsWith("__") &&
    !envConfig.telegramGroupChatId.startsWith("__")
  );
}

export async function sendTelegramMessage(text: string): Promise<void> {
  if (!isTelegramConfigured()) return;

  let deviceName = "Unknown device";
  try {
    deviceName = await getGuestDeviceName();
  } catch {
    deviceName = "Unknown device";
  }

  const messageWithDevice = `${text}\nDevice: ${deviceName}`;

  const endpoint = `https://api.telegram.org/bot${envConfig.telegramBotToken}/sendMessage`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: envConfig.telegramGroupChatId,
      text: messageWithDevice,
    }),
  });

  if (!response.ok) {
    throw new Error(`Telegram API error: ${response.status}`);
  }
}

export async function notifyCopyClicked(summaryContent: string): Promise<void> {
  const text = `A guest clicked copy with the content below:\n${summaryContent}`;
  try {
    await sendTelegramMessage(text);
  } catch (error) {
    console.warn("Telegram copy notification failed", error);
  }
}

export async function notifyGuestVisited(timestamp: string): Promise<void> {
  const text = `A guest visited Badguys app at ${timestamp}`;
  try {
    await sendTelegramMessage(text);
  } catch (error) {
    console.warn("Telegram visit notification failed", error);
  }
}
