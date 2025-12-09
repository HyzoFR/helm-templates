// Server configurations
const servers = [
    {name: 'proxy', displayName: 'Velocity Proxy', port: 25565, type: 'proxy'},
    {name: 'lobby', displayName: 'Lobby Server', port: 25501, type: 'server'},
    {name: 'hub', displayName: 'Hub Server', port: 25503, type: 'server'},
    {name: 'islands', displayName: 'Islands Server', port: 25502, type: 'server'}
];

// API endpoint (will be served by our backend)
const API_URL = 'http://localhost:3000/api';

let isFirstLoad = true;

async function loadServers() {
    const container = document.getElementById('servers');

    // Only show loading on first load
    if (isFirstLoad) {
        container.innerHTML = '<div class="loading">Loading servers...</div>';
    }

    try {
        const response = await fetch(`${API_URL}/servers`);
        const data = await response.json();

        if (isFirstLoad) {
            // First load: create all cards
            container.innerHTML = '';
            servers.forEach(server => {
                const serverData = data.find(s => s.name === server.name) || {};
                const card = createServerCard(server, serverData);
                card.id = `server-${server.name}`;
                container.appendChild(card);
            });
            isFirstLoad = false;
        } else {
            // Subsequent loads: update existing cards
            servers.forEach(server => {
                const serverData = data.find(s => s.name === server.name) || {};
                updateServerCard(server, serverData);
            });
        }
    } catch (error) {
        if (isFirstLoad) {
            container.innerHTML = `<div class="loading">Error loading servers: ${error.message}</div>`;
        }
    }
}

function createServerCard(server, data) {
    const card = document.createElement('div');
    card.className = 'server-card';
    card.innerHTML = getServerCardHTML(server, data);
    return card;
}

function updateServerCard(server, data) {
    const card = document.getElementById(`server-${server.name}`);
    if (card) {
        card.innerHTML = getServerCardHTML(server, data);
    }
}

function getServerCardHTML(server, data) {
    const status = data.status || 'unknown';
    const statusClass = status === 'Running' ? 'running' : status === 'Pending' ? 'pending' : 'stopped';

    return `
        <div class="server-header">
            <div class="server-name">${server.displayName}</div>
            <div class="status ${statusClass}">${status}</div>
        </div>
        <div class="server-info">
            <div>📦 Release: ${server.name}</div>
            <div>🔌 Port: ${server.port}</div>
            <div>🖥️  Pod: ${data.pod || 'N/A'}</div>
            <div>⏱️  Uptime: ${data.uptime || 'N/A'}</div>
            <div>💾 Memory: ${data.memory || 'N/A'}</div>
        </div>
        <div class="actions">
            ${status !== 'Running' ? `<button class="btn-start" onclick="startServer('${server.name}')">▶ Start</button>` : ''}
            ${status === 'Running' ? `<button class="btn-stop" onclick="stopServer('${server.name}')">⏹ Stop</button>` : ''}
            ${status === 'Running' ? `<button class="btn-restart" onclick="restartServer('${server.name}')">↻ Restart</button>` : ''}
            ${status === 'Running' ? `<button class="btn-logs" onclick="viewLogs('${server.name}')">📋 Logs</button>` : ''}
            ${status === 'Running' ? `<button class="btn-attach" onclick="attachConsole('${server.name}')">🖥️ Attach</button>` : ''}
            ${status === 'Running' ? `<button class="btn-shell" onclick="openShell('${server.name}')">💻 Shell</button>` : ''}
        </div>
    `;
}

async function startServer(name) {
    try {
        await fetch(`${API_URL}/servers/${name}/start`, {method: 'POST'});
        setTimeout(loadServers, 1000);
    } catch (error) {
        alert(`Error starting server: ${error.message}`);
    }
}

async function stopServer(name) {
    if (!confirm(`Are you sure you want to stop ${name}?`)) return;

    try {
        await fetch(`${API_URL}/servers/${name}/stop`, {method: 'POST'});
        setTimeout(loadServers, 1000);
    } catch (error) {
        alert(`Error stopping server: ${error.message}`);
    }
}

async function restartServer(name) {
    if (!confirm(`Are you sure you want to restart ${name}?`)) return;

    try {
        await fetch(`${API_URL}/servers/${name}/restart`, {method: 'POST'});
        setTimeout(loadServers, 1000);
    } catch (error) {
        alert(`Error restarting server: ${error.message}`);
    }
}

function viewLogs(name) {
    window.open(`logs.html?server=${name}`, '_blank', 'width=1000,height=600');
}

function attachConsole(name) {
    window.open(`console.html?server=${name}`, '_blank', 'width=1000,height=600');
}

function openShell(name) {
    window.open(`shell.html?server=${name}`, '_blank', 'width=1000,height=600');
}

// Load servers on page load
loadServers();

// Auto-refresh every 5 seconds
setInterval(loadServers, 5000);

