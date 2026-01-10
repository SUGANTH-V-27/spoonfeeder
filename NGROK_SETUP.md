# ngrok Setup Guide

## Issue: ngrok Opens and Closes Quickly

This usually means ngrok needs authentication or there's a connection issue.

## Step 1: Create Free ngrok Account

1. Go to: https://dashboard.ngrok.com/signup
2. Sign up for a free account
3. Verify your email

## Step 2: Get Your Authtoken

1. After signing up, go to: https://dashboard.ngrok.com/get-started/your-authtoken
2. Copy your authtoken (looks like: `2abc123def456ghi789jkl_1a2b3c4d5e6f7g8h9i0j`)

## Step 3: Configure ngrok

Run this command (replace with your actual token):

```bash
ngrok config add-authtoken YOUR_AUTHTOKEN_HERE
```

Example:
```bash
ngrok config add-authtoken 2abc123def456ghi789jkl_1a2b3c4d5e6f7g8h9i0j
```

## Step 4: Run ngrok

Now run:
```bash
ngrok http 3000
```

Or use the PowerShell script:
```powershell
.\start-ngrok.ps1
```

## Step 5: Use the URL

You'll see output like:
```
Forwarding   https://abc123.ngrok.io -> http://localhost:3000
```

Use the `https://abc123.ngrok.io` URL on your mobile device!

## Alternative: Use PowerShell Script

I've created `start-ngrok.ps1` that will keep the window open. Run:
```powershell
.\start-ngrok.ps1
```

This will show any errors and keep the window open so you can read them.

