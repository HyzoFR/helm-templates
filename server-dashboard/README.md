# Minecraft Server Dashboard

A web-based dashboard for managing your Kubernetes-based Minecraft servers (proxy, lobby, hub, islands).

## Features

- 🎮 View all servers at a glance
- ▶️ Start/Stop/Restart servers
- 📋 View real-time logs
- 🖥️ Attach to console (interactive terminal)
- 💻 Shell access (full shell in container)
- 📊 Resource monitoring (CPU/Memory)
- 🔄 Auto-refresh every 5 seconds

## Installation

1. Install dependencies:
```bash
cd server-dashboard
npm install
```

2. Start the dashboard:
```bash
npm start
```

3. Open your browser:
```
http://localhost:3000
```

## Requirements

- Node.js 16+
- kubectl configured to access your Kubernetes cluster
- Your Minecraft servers deployed via Helm

## Usage

### Start a Server
Click the "▶ Start" button on any stopped server card.

### Stop a Server
Click the "⏹ Stop" button on any running server card.

### Restart a Server
Click the "↻ Restart" button to restart a running server.

### View Logs
Click the "📋 Logs" button to open a new window with real-time logs.

### Attach to Console
Click the "🖥️ Attach" button to attach to the Java process console. You'll see live output from the server. Press **Ctrl+P then Ctrl+Q** to detach safely.

### Shell Access
Click the "💻 Shell" button to open a shell inside the container. Type `exit` or press **Ctrl+D** to close.

### Manual Refresh
Click the "↻" button in the bottom-right corner to manually refresh server status.

## API Endpoints

- `GET /api/servers` - Get all servers status
- `POST /api/servers/:name/start` - Start a server
- `POST /api/servers/:name/stop` - Stop a server
- `POST /api/servers/:name/restart` - Restart a server
- `GET /api/servers/:name/logs` - Get server logs

## Customization

Edit `dashboard.js` to add/remove servers:

```javascript
const servers = [
    { name: 'proxy', displayName: 'Velocity Proxy', port: 25577, type: 'proxy' },
    { name: 'lobby', displayName: 'Lobby Server', port: 25501, type: 'server' },
    // Add more servers here
];
```

## Troubleshooting

### "Error loading servers"
- Make sure kubectl is configured correctly
- Check that your servers are deployed: `kubectl get deployments`

### Metrics not showing
- Install metrics-server: `kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml`

## License

MIT

