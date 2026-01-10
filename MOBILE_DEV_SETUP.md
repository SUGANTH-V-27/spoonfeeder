# Mobile Development Setup Guide

## Quick Fix: Allow Firewall Access

### Option 1: Windows Firewall (Recommended - Run as Administrator)

1. **Open PowerShell or Command Prompt as Administrator:**
   - Right-click on PowerShell/CMD
   - Select "Run as Administrator"

2. **Run these commands:**
   ```powershell
   netsh advfirewall firewall add rule name="Vite Dev Server" dir=in action=allow protocol=TCP localport=3000
   netsh advfirewall firewall add rule name="Backend API Server" dir=in action=allow protocol=TCP localport=5000
   ```

### Option 2: Windows Firewall GUI

1. Open **Windows Defender Firewall** (search in Start menu)
2. Click **"Advanced settings"** on the left
3. Click **"Inbound Rules"** → **"New Rule"**
4. Select **"Port"** → Next
5. Select **TCP** and enter **3000** → Next
6. Select **"Allow the connection"** → Next
7. Check all profiles (Domain, Private, Public) → Next
8. Name it "Vite Dev Server" → Finish
9. **Repeat for port 5000** (name it "Backend API Server")

## Find Your IP Address

Your computer has these IP addresses:
- `192.168.42.1` (Most likely for WiFi)
- `10.1.22.250` 
- `10.30.231.111`

**To find which one to use:**
1. Make sure your phone is on the **same WiFi network**
2. Try each IP address:
   - `http://192.168.42.1:3000`
   - `http://10.1.22.250:3000`
   - `http://10.30.231.111:3000`

## Test Connection

1. **Start the dev server:**
   ```bash
   npm run dev
   ```

2. **On your mobile device:**
   - Make sure it's on the **same WiFi network**
   - Open browser
   - Try: `http://192.168.42.1:3000` (or the other IPs)

3. **If still not working:**
   - Check Windows Firewall is allowing the ports
   - Verify both devices are on same WiFi
   - Try disabling Windows Firewall temporarily to test (not recommended for long-term)

## Alternative: Use ngrok (If Firewall is too restrictive)

If firewall configuration is difficult, you can use ngrok:

1. Install ngrok: `npm install -g ngrok` or download from ngrok.com
2. Run: `ngrok http 3000`
3. Use the ngrok URL on your mobile device (works from anywhere)

## Troubleshooting

- **"Site can't be reached"**: Usually firewall blocking
- **"Connection refused"**: Server not running or wrong IP
- **API calls fail**: Make sure backend is running on port 5000

