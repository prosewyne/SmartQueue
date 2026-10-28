# SmartQueue

SmartQueue is a React frontend with an Express API for campus service queues.

## Open on a MacBook or share the demo

1. Open the repository on GitHub and choose **Code** > **Codespaces** > **Create codespace on main**.
2. Wait for setup to finish. Codespaces builds the React app and starts the Express server automatically.
3. Open the **Ports** tab, find port `3000`, and choose **Open in Browser**. Use that generated `github.dev` URL on your MacBook or share it with your professor.

Do not use `localhost` on your MacBook: it points to the Mac itself, not the Codespace. The Codespace must stay running while the demo is in use. Port `3000` is public, so anyone with its link can use the demo. Do not enter real student information.

## Run locally on the computer running the server

```powershell
npm.cmd ci
npm.cmd run build
npm.cmd start
```

Open http://localhost:3000 on that same computer. This local address does not work from a different computer.

## Publish to GitHub

Double-click `Publish-SmartQueue.bat`. Git for Windows, GitHub CLI, Node.js, and a one-time GitHub sign-in are required. The publisher defaults to a private repository and excludes the local `smartqueue-data.json` history file.
