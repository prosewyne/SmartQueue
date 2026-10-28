# SmartQueue

SmartQueue is a React frontend with an Express API for campus service queues.

## Run a public demo with GitHub Codespaces

The Codespace runs both the React frontend and Express backend in GitHub's cloud, so your personal computer can be off while the demo is running.

1. Sign in to GitHub and [create a Codespace for this repository's `main` branch](https://github.com/codespaces/new?repo=prosewyne/SmartQueue&ref=main).
2. Wait for setup to finish. The Codespace installs dependencies, builds the frontend, and starts the server.
3. Open the **Ports** tab, find port `3000`, and choose **Open in Browser**. Share that forwarded app URL to access the same queue from a MacBook, PC, or phone. Do not share the GitHub repository URL as the app URL.

Codespaces stops after its idle timeout, so this is not an always-on service. If the forwarded app URL is unavailable, open [your Codespaces](https://github.com/codespaces), resume this Codespace, wait for the server to start, and open port `3000` again. The Codespace's workspace data is retained while that Codespace exists, but deleting or recreating it can lose queue data. Port `3000` is public to anyone with its link; this is a demo only, so do not enter real student information.

## Run locally on the computer running the server

```powershell
npm.cmd ci
npm.cmd run build
npm.cmd start
```

Open http://localhost:3000 on that same computer. This local address does not work from a different computer and is not the public demo URL.
