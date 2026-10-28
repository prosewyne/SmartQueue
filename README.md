# SmartQueue

SmartQueue is a React frontend with an Express API for campus service queues.

## Deploy a public demo

The app can run on Render so it is available without your computer running and can be opened from MacBooks, PCs, and phones.

1. Sign in to [Render](https://dashboard.render.com/) and choose **New** > **Blueprint**.
2. Connect your GitHub account if asked, then select `prosewyne/SmartQueue`.
3. Render reads `render.yaml`. Review the service and choose **Apply** to deploy it on the free plan.
4. When the deployment finishes, open the service in Render and use its `onrender.com` URL. Share that URL to access the same queue from other devices.

The free service sleeps after 15 minutes without requests and can take about a minute to start again when someone opens the link. Its local files are temporary: ticket and window data can reset when the service sleeps, restarts, or is redeployed. This free setup is for demos only; do not enter real student information. For always-on service and durable ticket storage, use paid hosting with a persistent database.

## Run locally on the computer running the server

```powershell
npm.cmd ci
npm.cmd run build
npm.cmd start
```

Open http://localhost:3000 on that same computer. This local address does not work from a different computer and is not the public demo URL.

## Publish to GitHub

Double-click `Publish-SmartQueue.bat`. Git for Windows, GitHub CLI, Node.js, and a one-time GitHub sign-in are required. The publisher defaults to a private repository and excludes the local `smartqueue-data.json` history file.
