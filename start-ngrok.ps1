# Start ngrok and keep window open
# This script will keep the window open even if there's an error

Write-Host "Starting ngrok on port 3000..." -ForegroundColor Green
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
Write-Host ""

# Run ngrok and keep window open
ngrok http 3000

# Keep window open after ngrok exits
Write-Host ""
Write-Host "ngrok has stopped. Press any key to exit..." -ForegroundColor Red
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

