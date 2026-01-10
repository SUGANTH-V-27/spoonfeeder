# Troubleshooting Mobile Connection Issues

## Step 1: Restart Dev Server

After changing `vite.config.ts`, you MUST restart the dev server:

1. Stop the current `npm run dev` (Ctrl+C)
2. Start it again: `npm run dev`
3. Look for this line in the output:
   ```
   ➜  Local:   http://localhost:3000/
   ➜  Network: http://192.168.x.x:3000/
   ```
   The "Network" line shows the correct IP to use!

## Step 2: Test from Computer First

Before testing on mobile, test from your computer using the IP:

1. Open browser on your computer
2. Try: `http://192.168.42.1:3000`
3. If this works, the server is accessible
4. If this doesn't work, the issue is with the IP or network

## Step 3: Check Windows Firewall (Again)

Even though rules are added, sometimes Windows Firewall needs a refresh:

1. Open **Windows Security** → **Firewall & network protection**
2. Click **"Allow an app through firewall"**
3. Look for **Node.js** or your terminal app
4. Make sure it's checked for **Private** networks
5. If not there, click **"Change settings"** → **"Allow another app"** → Browse to your Node.js installation

## Step 4: Check Router Settings

Some routers have **AP Isolation** or **Client Isolation** enabled:

1. Access your router admin panel (usually `192.168.1.1` or `192.168.0.1`)
2. Look for **Wireless** or **WiFi Settings**
3. Find **AP Isolation** or **Client Isolation**
4. **Disable it** if enabled
5. Save and restart router if needed

## Step 5: Try Different Network

If router settings can't be changed:

1. Use your **phone's hotspot**
2. Connect your **computer** to the phone's hotspot
3. Find your computer's IP on the hotspot network
4. Access from another device on the same hotspot

## Step 6: Alternative - Use ngrok (Works from Anywhere)

If nothing works, use ngrok:

1. Install: `npm install -g ngrok` or download from ngrok.com
2. Run: `ngrok http 3000`
3. Use the ngrok URL (like `https://abc123.ngrok.io`) on your mobile
4. Works from anywhere, no network config needed!

## Step 7: Verify Server Output

When you run `npm run dev`, you should see:

```
VITE v7.x.x  ready in xxx ms

➜  Local:   http://localhost:3000/
➜  Network: http://192.168.42.1:3000/
```

**Use the Network URL shown here!**

## Common Issues:

- **"Site can't be reached"**: Firewall or wrong IP
- **"Connection refused"**: Server not running or wrong port
- **Page loads but API fails**: Backend port 5000 not accessible
- **Works on computer IP but not mobile**: Router AP isolation

