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

function Escape-DoubleQuote {
    param([string]$value)
    return ($value -replace '\\', '\\\\' -replace '"', '\\"')
}

if ($envMap.ContainsKey("TELEGRAM_BOT_TOKEN")) {
    $token = Escape-DoubleQuote $envMap["TELEGRAM_BOT_TOKEN"]
    $content = $content -replace 'const TELEGRAM_BOT_TOKEN = ".*";', "const TELEGRAM_BOT_TOKEN = `"$token`";"
}

if ($envMap.ContainsKey("TELEGRAM_GROUP_CHAT_ID")) {
    $chatId = Escape-DoubleQuote $envMap["TELEGRAM_GROUP_CHAT_ID"]
    $content = $content -replace 'const TELEGRAM_GROUP_CHAT_ID = ".*";', "const TELEGRAM_GROUP_CHAT_ID = `"$chatId`";"
}

if ($envMap.ContainsKey("APP_VERSION")) {
    $version = Escape-DoubleQuote $envMap["APP_VERSION"]
    $content = $content -replace 'const APP_VERSION = ".*";', "const APP_VERSION = `"$version`";"
}

Set-Content -Path $OutputFile -Value $content -Encoding UTF8
Write-Host "Created $OutputFile from $InputFile using $EnvFile"
