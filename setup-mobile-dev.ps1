# Mobile Development Firewall Setup Script
# Run this script as Administrator

Write-Host "Setting up firewall rules for mobile development..." -ForegroundColor Green

# Add rule for Vite dev server (port 3000)
try {
    netsh advfirewall firewall delete rule name="Vite Dev Server" 2>$null
    netsh advfirewall firewall add rule name="Vite Dev Server" dir=in action=allow protocol=TCP localport=3000
    Write-Host "✓ Added firewall rule for port 3000 (Frontend)" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed to add rule for port 3000" -ForegroundColor Red
}

# Add rule for backend API (port 5000)
try {
    $null = netsh advfirewall firewall delete rule name="Backend API Server" 2>&1
    $result = netsh advfirewall firewall add rule name="Backend API Server" dir=in action=allow protocol=TCP localport=5000 2>&1
    if ($LASTEXITCODE -eq 0 -or $result -match "Ok") {
        Write-Host "✓ Added firewall rule for port 5000 (Backend)" -ForegroundColor Green
    } else {
        Write-Host "✗ Failed to add rule for port 5000: $result" -ForegroundColor Red
        Write-Host "  Try running this manually: netsh advfirewall firewall add rule name=`"Backend API Server`" dir=in action=allow protocol=TCP localport=5000" -ForegroundColor Yellow
    }
} catch {
    Write-Host "✗ Failed to add rule for port 5000: $_" -ForegroundColor Red
    Write-Host "  Try running this manually: netsh advfirewall firewall add rule name=`"Backend API Server`" dir=in action=allow protocol=TCP localport=5000" -ForegroundColor Yellow
}

Write-Host "`nFirewall setup complete!" -ForegroundColor Green
Write-Host "`nYour IP addresses:" -ForegroundColor Yellow
Write-Host "  - 192.168.42.1 (Try this first)" -ForegroundColor Cyan
Write-Host "  - 10.1.22.250" -ForegroundColor Cyan
Write-Host "  - 10.30.231.111" -ForegroundColor Cyan
Write-Host "`nAccess from mobile: http://192.168.42.1:3000" -ForegroundColor Yellow

