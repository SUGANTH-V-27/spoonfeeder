# Fix "Site Can't Be Reached" - Windows Firewall Setup

## Method 1: Run PowerShell Script as Administrator (Easiest)

1. **Close the current PowerShell window**

2. **Open PowerShell as Administrator:**
   - Press `Windows Key + X`
   - Select "Windows PowerShell (Admin)" or "Terminal (Admin)"
   - OR Right-click on PowerShell icon → "Run as Administrator"

3. **Navigate to your project:**
   ```powershell
   cd C:\Users\sugan\spoon
   ```

4. **Run the script:**
   ```powershell
   .\setup-mobile-dev.ps1
   ```

5. **You should see:**
   ```
   ✓ Added firewall rule for port 3000 (Frontend)
   ✓ Added firewall rule for port 5000 (Backend)
   ```

## Method 2: Manual Firewall Configuration (If script doesn't work)

### For Port 3000 (Frontend):
1. Open **Windows Security** → **Firewall & network protection**
2. Click **"Advanced settings"**
3. Click **"Inbound Rules"** → **"New Rule"**
4. Select **"Port"** → Next
5. Select **TCP** → Enter **3000** → Next
6. Select **"Allow the connection"** → Next
7. Check all (Domain, Private, Public) → Next
8. Name: **"Vite Dev Server"** → Finish

### For Port 5000 (Backend):
Repeat steps 3-8 above, but use port **5000** and name it **"Backend API Server"**

## Method 3: Quick Test (Temporary - Not Secure)

If you just want to test quickly:

1. Open **Windows Security** → **Firewall & network protection**
2. Click on your active network (Private network)
3. Turn **OFF** "Windows Defender Firewall" temporarily
4. Test on mobile
5. **Remember to turn it back ON after testing!**

## After Setting Up Firewall:

1. **Make sure dev server is running:**
   ```bash
   npm run dev
   ```

2. **On your mobile device (same WiFi), try:**
   - `http://192.168.42.1:3000`
   - `http://10.1.22.250:3000`
   - `http://10.30.231.111:3000`

3. **If still not working:**
   - Verify both devices are on same WiFi network
   - Check if your router has AP isolation enabled (disable it)
   - Try using your phone's hotspot and connect your computer to it

