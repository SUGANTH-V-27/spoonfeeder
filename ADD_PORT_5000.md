# Add Port 5000 Manually

Since port 5000 failed, run this command in your Administrator PowerShell:

```powershell
netsh advfirewall firewall add rule name="Backend API Server" dir=in action=allow protocol=TCP localport=5000
```

You should see "Ok." if it succeeds.

## Verify Both Rules Are Added

Check if both rules exist:

```powershell
netsh advfirewall firewall show rule name="Vite Dev Server"
netsh advfirewall firewall show rule name="Backend API Server"
```

## Test on Mobile

After adding port 5000, try accessing from your mobile:
- `http://192.168.42.1:3000`
- `http://10.1.22.250:3000`

The frontend should load, and API calls should work too!

