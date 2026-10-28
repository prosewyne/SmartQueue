# SmartQueue

SmartQueue is a React frontend with an Express API for campus service queues.

## Run locally

```powershell
npm.cmd ci
npm.cmd run build
npm.cmd start
```

Open http://192.168.1.34:3000/

## Run from GitHub Codespaces

1. Open the repository on GitHub and choose **Code** > **Codespaces** > **Create codespace on main**.
2. Wait for setup to finish. Codespaces builds the React app and starts the Express server automatically.
3. Open the **Ports** tab and open port `3000`. It is configured as public so it can be opened from your MacBook or shared with your professor.

The Codespace must stay running while the demo is in use. The public link allows anyone who has it to use the demo, so do not enter real student information.

## Publish to GitHub

Double-click `Publish-SmartQueue.bat`. Git for Windows, GitHub CLI, Node.js, and a one-time GitHub sign-in are required. The publisher defaults to a private repository and excludes the local `smartqueue-data.json` history file.
