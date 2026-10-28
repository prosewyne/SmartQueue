# SmartQueue

SmartQueue is a React frontend with an Express API for campus service queues.

## Open on a MacBook or share the demo

### Current live demo

[Open SmartQueue](https://nightmarish-spooky-phantasm-v65qp6794jg7fwqwq-3000.app.github.dev/)

This link uses the current GitHub Codespace. It works while the Codespace is running; if it stops after being idle, resume the Codespace and reopen the link. Creating a replacement Codespace may give you a different app URL.

1. Sign in to GitHub and [create a Codespace for the `main` branch](https://github.com/codespaces/new?repo=prosewyne/SmartQueue&ref=main).
2. Wait for setup to finish. Codespaces installs dependencies, builds the frontend, starts the backend, and checks that `/api/health` responds.
3. Open the **Ports** tab, find port `3000`, and choose **Open in Browser**. Use the generated Codespaces app link (usually ending in `app.github.dev`), not the repository link or a `192.168...` address.

If you already have a Codespace from before this setup change, run **Codespaces: Rebuild Container** from the VS Code Command Palette, or create a new Codespace from the link above. If port `3000` does not appear, check the Codespace terminal for the startup error; the log is at `/tmp/smartqueue.log`.

The Codespace must be running while the demo is in use and may stop after its idle timeout. Port `3000` is public, so anyone with its link can use the demo. Do not enter real student information.

## Run locally on the computer running the server

```powershell
npm.cmd ci
npm.cmd run build
npm.cmd start
```

Open http://localhost:3000 on that same computer. This local address does not work from a different computer.

## Publish to GitHub

Double-click `Publish-SmartQueue.bat`. Git for Windows, GitHub CLI, Node.js, and a one-time GitHub sign-in are required. The publisher defaults to a private repository and excludes the local `smartqueue-data.json` history file.
