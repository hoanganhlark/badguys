param(
    [string]$EnvFile = ".env",
    [string]$InputFile = "index.html",
    [string]$OutputFile = "index.local.html"
)

if (!(Test-Path $EnvFile)) {
    Write-Error "Missing $EnvFile. Copy .env.example to .env and fill values first."
    exit 1
}

if (!(Test-Path $InputFile)) {
    Write-Error "Missing input file: $InputFile"
    exit 1
}

$envMap = @{}
Get-Content $EnvFile -Encoding UTF8 | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#")) { return }
    $idx = $line.IndexOf("=")
    if ($idx -lt 1) { return }
    $key = $line.Substring(0, $idx).Trim()
    $val = $line.Substring($idx + 1).Trim()
    $envMap[$key] = $val
}

$content = Get-Content $InputFile -Raw -Encoding UTF8

function ConvertTo-EscapedDoubleQuote {
    param([string]$value)
    return ($value -replace '\\', '\\\\' -replace '"', '\\"')
}

if ($envMap.ContainsKey("TELEGRAM_BOT_TOKEN")) {
    $token = ConvertTo-EscapedDoubleQuote $envMap["TELEGRAM_BOT_TOKEN"]
    if ($content -match 'telegramBotToken:\s*".*?"') {
        $content = $content -replace 'telegramBotToken:\s*".*?"', "telegramBotToken: `"$token`""
    }
}

if ($envMap.ContainsKey("TELEGRAM_GROUP_CHAT_ID")) {
    $chatId = ConvertTo-EscapedDoubleQuote $envMap["TELEGRAM_GROUP_CHAT_ID"]
    if ($content -match 'telegramGroupChatId:\s*".*?"') {
        $content = $content -replace 'telegramGroupChatId:\s*".*?"', "telegramGroupChatId: `"$chatId`""
    }
}

if ($envMap.ContainsKey("APP_VERSION")) {
    $version = ConvertTo-EscapedDoubleQuote $envMap["APP_VERSION"]
    if ($content -match 'appVersion:\s*".*?"') {
        $content = $content -replace 'appVersion:\s*".*?"', "appVersion: `"$version`""
    }
}

if ($envMap.ContainsKey("BADGUY_FEMALE_MAX")) {
    $femaleMax = ConvertTo-EscapedDoubleQuote $envMap["BADGUY_FEMALE_MAX"]
    if ($content -match 'femaleMax:\s*".*?"') {
        $content = $content -replace 'femaleMax:\s*".*?"', "femaleMax: `"$femaleMax`""
    }
}

if ($envMap.ContainsKey("BADGUY_TUBE_PRICE")) {
    $tubePrice = ConvertTo-EscapedDoubleQuote $envMap["BADGUY_TUBE_PRICE"]
    if ($content -match 'tubePrice:\s*".*?"') {
        $content = $content -replace 'tubePrice:\s*".*?"', "tubePrice: `"$tubePrice`""
    }
}

if ($envMap.ContainsKey("BADGUY_SET_PRICE")) {
    $setPrice = ConvertTo-EscapedDoubleQuote $envMap["BADGUY_SET_PRICE"]
    if ($content -match 'setPrice:\s*".*?"') {
        $content = $content -replace 'setPrice:\s*".*?"', "setPrice: `"$setPrice`""
    }
}

if ($envMap.ContainsKey("BADGUY_SHUTTLES_PER_TUBE")) {
    $shuttlesPerTube = ConvertTo-EscapedDoubleQuote $envMap["BADGUY_SHUTTLES_PER_TUBE"]
    if ($content -match 'shuttlesPerTube:\s*".*?"') {
        $content = $content -replace 'shuttlesPerTube:\s*".*?"', "shuttlesPerTube: `"$shuttlesPerTube`""
    }
}

if ($envMap.ContainsKey("BADGUY_ROUND_RESULT")) {
    $roundResult = ConvertTo-EscapedDoubleQuote $envMap["BADGUY_ROUND_RESULT"]
    if ($content -match 'roundResult:\s*".*?"') {
        $content = $content -replace 'roundResult:\s*".*?"', "roundResult: `"$roundResult`""
    }
}

Set-Content -Path $OutputFile -Value $content -Encoding UTF8
Write-Host "Created $OutputFile from $InputFile using $EnvFile"
