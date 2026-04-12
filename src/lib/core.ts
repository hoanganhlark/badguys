import type {
  AppConfig,
  CalcResult,
  Player,
  SessionPayload,
  SessionRecord,
} from "../types";

export function formatK(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}K` : `${rounded.toFixed(1)}K`;
}

export function formatSummaryPrice(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}K` : `${rounded.toFixed(1)}K`;
}

export function normalizeKLabels(text: string): string {
  return String(text).replace(/(\d+(?:\.\d+)?)\s*k\b/gi, "$1K");
}

export function formatSessionDateLabel(session: SessionRecord): string {
  if (session.dateKey) {
    const [yyyy, mm, dd] = String(session.dateKey).split("-");
    if (yyyy && mm && dd) return `${dd}/${mm}/${yyyy}`;
  }

  if (session.clientUpdatedAt) {
    const d = new Date(session.clientUpdatedAt);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString("vi-VN");
    }
  }

  return "Không rõ ngày";
}

export function parsePlayersBulk(input: string): Player[] {
  const lines = input.split("\n");
  const newPlayers: Player[] = [];

  lines.forEach((line) => {
    let raw = line.trim();
    if (!raw) return;

    // Allow numbered list input like "1. an", "2/ bo", "5 bi".
    raw = raw.replace(/^\d+(?:(?:\s*[./\-:)]\s*)|\s+)/, "").trim();
    if (!raw) return;

    let isFemale = false;
    let sets = 0;
    let customFee: number | null = null;
    let extraFee: number | null = null;

    if (raw.toLowerCase().endsWith(" n")) {
      isFemale = true;
      raw = raw.substring(0, raw.length - 2).trim();
    }

    const setMatch = raw.toLowerCase().match(/\s(\d+)s$/);
    if (setMatch) {
      sets = parseInt(setMatch[1], 10);
      raw = raw.replace(setMatch[0], "").trim();
    }

    const extraMatch = raw.match(/\+\s*(\d+)(k)?/i);
    if (extraMatch) {
      extraFee = parseInt(extraMatch[1], 10);
      raw = raw.replace(extraMatch[0], "").trim();
    }

    const customMatch = raw.match(/(\d+)(k)?$/i);
    if (customMatch) {
      customFee = parseInt(customMatch[1], 10);
      raw = raw.replace(customMatch[0], "").trim();
    }

    const name = raw.trim();
    if (name) {
      newPlayers.push({ name, isFemale, sets, customFee, extraFee });
    }
  });

  return newPlayers;
}

export function playersToBulk(players: Player[]): string {
  return players
    .map((p) => {
      let suffix = "";
      if (p.sets > 0) suffix += ` ${p.sets}s`;
      if (p.isFemale) suffix += " n";
      if (p.customFee != null) suffix += ` ${p.customFee}k`;
      if (p.extraFee != null) suffix += ` +${p.extraFee}k`;
      return p.name + suffix;
    })
    .join("\n");
}

export function cyclePlayerMode(player: Player): Player {
  if (!player.isFemale && player.sets === 0) {
    return { ...player, isFemale: true };
  }
  if (player.isFemale) {
    return { ...player, isFemale: false, sets: 1 };
  }
  return { ...player, sets: 0 };
}

export function calculateResult(
  players: Player[],
  courtFee: number,
  shuttleCount: number,
  config: AppConfig,
): CalcResult {
  const shuttle = (shuttleCount * config.tubePrice) / config.shuttlesPerTube;
  const total = courtFee + shuttle;

  const setPlayers = players.filter((p) => p.sets > 0);
  const nonSetPlayers = players.filter((p) => p.sets === 0);

  let totalSetRevenue = 0;
  setPlayers.forEach((p) => {
    totalSetRevenue += p.sets * config.setPrice;
  });

  let totalCustomFee = 0;
  let totalExtraFee = 0;
  nonSetPlayers.forEach((p) => {
    if (p.customFee != null) totalCustomFee += p.customFee;
    if (p.extraFee != null) totalExtraFee += p.extraFee;
  });

  const sharedPlayers = nonSetPlayers.filter((p) => p.customFee == null);
  const sharedFemales = sharedPlayers.filter((p) => p.isFemale);
  const sharedMales = sharedPlayers.filter((p) => !p.isFemale);

  const remainingTotal = total - totalSetRevenue - totalCustomFee;
  let fFee = 0;
  let mFee = 0;

  if (sharedPlayers.length > 0) {
    const avg = remainingTotal / sharedPlayers.length;
    if (avg <= config.femaleMax || sharedMales.length === 0) {
      fFee = config.roundResult ? Math.round(avg) : avg;
      mFee = fFee;
    } else {
      fFee = config.femaleMax;
      mFee = config.roundResult
        ? Math.round(
            (remainingTotal - fFee * sharedFemales.length) / sharedMales.length,
          )
        : (remainingTotal - fFee * sharedFemales.length) / sharedMales.length;
    }
  }

  return {
    fFee,
    mFee,
    total,
    setTotal: totalSetRevenue,
    setPlayersCount: setPlayers.length,
    femalesCount: sharedFemales.length,
    malesCount: sharedMales.length,
    totalCustomFee,
    totalExtraFee,
  };
}

export function buildSummaryText(
  players: Player[],
  config: AppConfig,
  calc: CalcResult,
  courtFee: number,
  courtCount: number,
  shuttleCount: number,
): string {
  const effectiveCourtCount = config.enableCourtCount
    ? Math.max(0, courtCount)
    : 1;
  const shuttle = (shuttleCount * config.tubePrice) / config.shuttlesPerTube;

  const setPlayers = players.filter((p) => p.sets > 0);
  const nonSetPlayers = players.filter((p) => p.sets === 0);
  const customFeePlayers = nonSetPlayers.filter((p) => p.customFee != null);
  const sharedPlayers = nonSetPlayers.filter((p) => p.customFee == null);
  const sharedMales = sharedPlayers.filter((p) => !p.isFemale);
  const sharedFemales = sharedPlayers.filter((p) => p.isFemale);

  const formatSummaryAmount = (value: number): string => {
    const rounded = Math.round(value * 10) / 10;
    return Number.isInteger(rounded) ? `${rounded}` : rounded.toFixed(1);
  };

  let text = `NAY CHƠI ${formatSummaryPrice(calc.mFee)} / NGƯỜI\n\u200B\n`;

  const summaryParts: string[] = [];
  if (sharedMales.length > 0)
    summaryParts.push(`${sharedMales.length} người chia đều`);
  if (sharedFemales.length > 0) {
    summaryParts.push(
      `${sharedFemales.length} nữ ${formatSummaryPrice(calc.fFee * sharedFemales.length)}`,
    );
  }

  const totalCustomFee = customFeePlayers.reduce(
    (sum, p) => sum + (p.customFee || 0),
    0,
  );
  const totalSetMoney = setPlayers.reduce(
    (sum, p) => sum + p.sets * config.setPrice,
    0,
  );
  const totalSpecial = totalCustomFee + totalSetMoney;
  const specialCount = customFeePlayers.length + setPlayers.length;
  if (specialCount > 0) {
    summaryParts.push(
      `${specialCount} người đánh ít ${formatSummaryPrice(totalSpecial)}`,
    );
  }

  text += summaryParts.join(" + ") + "\n";
  if (config.enableCourtCount) {
    text += `${formatSummaryAmount(effectiveCourtCount)} sân + ${formatSummaryAmount(shuttleCount)} trái cầu\n\u200B\n`;
  } else {
    text += `${formatSummaryAmount(shuttleCount)} trái cầu\n\u200B\n`;
  }

  text += `${formatSummaryAmount(courtFee)} tiền sân + ${formatSummaryAmount(shuttle)} tiền cầu = ${formatK(calc.total)} tổng cộng\n\u200B\n`;
  text += "Players:\n\u200B\n";

  let count = 1;
  players.forEach((p) => {
    let line = `${count}. ${p.name}`;
    if (p.sets > 0) {
      line += ` ${formatSummaryPrice(p.sets * config.setPrice)} (${p.sets} set)`;
    } else if (p.customFee != null) {
      line += ` ${formatSummaryPrice(p.customFee)}`;
    } else if (p.isFemale) {
      line += ` ${formatSummaryPrice(calc.fFee)}`;
    }
    if (p.extraFee != null) {
      line += ` +${formatSummaryPrice(p.extraFee)}`;
    }
    text += `${line}\n`;
    count += 1;
  });

  return normalizeKLabels(text);
}

export function buildSessionPayload(
  summaryText: string,
  players: Player[],
  courtFee: number,
  courtCount: number,
  shuttleCount: number,
  config: AppConfig,
  calc: CalcResult,
): SessionPayload {
  const effectiveCourtCount = config.enableCourtCount
    ? Math.max(0, courtCount)
    : 1;
  const shuttle = (shuttleCount * config.tubePrice) / config.shuttlesPerTube;

  return {
    summaryText,
    courtFee,
    courtCount: config.enableCourtCount ? effectiveCourtCount : undefined,
    shuttleCount,
    shuttleFee: shuttle,
    total: calc.total,
    maleFee: calc.mFee,
    femaleFee: calc.fFee,
    malesCount: calc.malesCount,
    femalesCount: calc.femalesCount,
    setPlayersCount: calc.setPlayersCount,
    players: players.map((p) => ({
      name: p.name,
      isFemale: !!p.isFemale,
      sets: p.sets || 0,
    })),
  };
}
