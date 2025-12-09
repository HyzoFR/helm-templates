const express = require('express');
const { exec, spawn } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const cors = require('cors');
const path = require('path');
const WebSocket = require('ws');
const http = require('http');
const pty = require('node-pty');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Create HTTP server
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Helper function to execute kubectl commands
async function kubectl(command) {
    try {
        const { stdout, stderr } = await execPromise(`kubectl ${command}`);
        return stdout.trim();
    } catch (error) {
        console.error(`kubectl error: ${error.message}`);
        throw error;
    }
}

// Get all servers status
app.get('/api/servers', async (req, res) => {
    try {
        const servers = ['proxy', 'lobby', 'hub', 'islands'];
        const serverData = await Promise.all(servers.map(async (name) => {
            try {
                // Get pod info
                const podJson = await kubectl(`get pods -l app.kubernetes.io/instance=${name} -o json`);
                const pods = JSON.parse(podJson);
                
                if (!pods.items || pods.items.length === 0) {
                    return {
                        name,
                        status: 'Not Deployed',
                        pod: 'N/A',
                        uptime: 'N/A',
                        memory: 'N/A'
                    };
                }
                
                const pod = pods.items[0];
                const podName = pod.metadata.name;
                const status = pod.status.phase;
                
                // Get uptime
                const startTime = new Date(pod.status.startTime);
                const uptime = getUptime(startTime);
                
                // Get memory usage
                let memory = 'N/A';
                try {
                    const metricsJson = await kubectl(`top pod ${podName} --no-headers`);
                    const parts = metricsJson.split(/\s+/);
                    if (parts.length >= 3) {
                        memory = parts[2];
                    }
                } catch (e) {
                    // Metrics server might not be available
                }
                
                return {
                    name,
                    status,
                    pod: podName,
                    uptime,
                    memory
                };
            } catch (error) {
                return {
                    name,
                    status: 'Error',
                    pod: 'N/A',
                    uptime: 'N/A',
                    memory: 'N/A'
                };
            }
        }));
        
        res.json(serverData);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Start server (scale to 1)
app.post('/api/servers/:name/start', async (req, res) => {
    try {
        const { name } = req.params;
        await kubectl(`scale deployment ${name}-java-app-runner --replicas=1`);
        res.json({ success: true, message: `${name} started` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Stop server (scale to 0)
app.post('/api/servers/:name/stop', async (req, res) => {
    try {
        const { name } = req.params;
        await kubectl(`scale deployment ${name}-java-app-runner --replicas=0`);
        res.json({ success: true, message: `${name} stopped` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Restart server (delete pod)
app.post('/api/servers/:name/restart', async (req, res) => {
    try {
        const { name } = req.params;
        await kubectl(`delete pod -l app.kubernetes.io/instance=${name}`);
        res.json({ success: true, message: `${name} restarted` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Helper function to strip ANSI control codes but keep color codes
function stripControlCodes(text) {
    return text
        // Remove bracketed paste mode
        .replace(/\x1b\[\?2004[hl]/g, '')
        // Remove cursor key modes
        .replace(/\x1b\[\?1[hl]\x1b[=>]/g, '')
        // Remove mouse tracking modes
        .replace(/\x1b\[\?100[0-6][lh]/g, '')
        .replace(/\x1b\[\?101[5-6][lh]/g, '')
        // Remove clear line sequences
        .replace(/\x1b\[K/g, '')
        .replace(/\x1b\[[012]K/g, '')
        // Remove prompts and artifacts
        .replace(/^>\s*/gm, '')
        .replace(/>\.\.\.\./g, '')
        // Keep color codes like [31;1m, [0m, etc.
}

// Get logs
app.get('/api/servers/:name/logs', async (req, res) => {
    try {
        const { name } = req.params;
        const logs = await kubectl(`logs -l app.kubernetes.io/instance=${name} --tail=100`);
        const cleanedLogs = stripControlCodes(logs);
        res.json({ logs: cleanedLogs });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Helper function to calculate uptime
function getUptime(startTime) {
    const now = new Date();
    const diff = now - startTime;
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
}

// WebSocket connection handler
wss.on('connection', (ws, req) => {
    const url = req.url;

    // Parse URL to determine if it's attach or shell
    const attachMatch = url.match(/^\/attach\/(.+)$/);
    const shellMatch = url.match(/^\/shell\/(.+)$/);

    if (attachMatch) {
        handleAttach(ws, attachMatch[1]);
    } else if (shellMatch) {
        handleShell(ws, shellMatch[1]);
    } else {
        ws.close();
    }
});

// Handle attach to container (kubectl attach to PID 1)
async function handleAttach(ws, serverName) {
    try {
        // Get pod name
        const podJson = await kubectl(`get pods -l app.kubernetes.io/instance=${serverName} -o json`);
        const pods = JSON.parse(podJson);

        if (!pods.items || pods.items.length === 0) {
            ws.send('Error: No pod found for server\r\n');
            ws.close();
            return;
        }

        const podName = pods.items[0].metadata.name;

        // Use node-pty to spawn kubectl attach with proper PTY (just like k9s does)
        const attachProcess = pty.spawn('kubectl', [
            'attach',
            '-it',
            podName,
            '-c',
            'java-app-runner'
        ], {
            name: 'xterm-color',
            cols: 120,
            rows: 40,
            cwd: process.env.HOME,
            env: process.env
        });

        // Forward attach output to WebSocket
        // Filter out problematic terminal control sequences
        attachProcess.onData((data) => {
            try {
                // Remove all the terminal control sequences that cause formatting issues
                let cleaned = data
                    // Bracketed paste mode
                    .replace(/\x1b\[\?2004h/g, '')
                    .replace(/\x1b\[\?2004l/g, '')
                    // Cursor key modes
                    .replace(/\x1b\[\?1h\x1b=/g, '')
                    .replace(/\x1b\[\?1l\x1b>/g, '')
                    // Mouse tracking modes
                    .replace(/\x1b\[\?1000[lh]/g, '')
                    .replace(/\x1b\[\?1002[lh]/g, '')
                    .replace(/\x1b\[\?1003[lh]/g, '')
                    .replace(/\x1b\[\?1005[lh]/g, '')
                    .replace(/\x1b\[\?1006[lh]/g, '')
                    .replace(/\x1b\[\?1015[lh]/g, '')
                    .replace(/\x1b\[\?1016[lh]/g, '')
                    // Clear line sequences
                    .replace(/\x1b\[K/g, '')
                    .replace(/\x1b\[0K/g, '')
                    .replace(/\x1b\[1K/g, '')
                    .replace(/\x1b\[2K/g, '')
                    // Prompts and artifacts
                    .replace(/^>\s*/gm, '')
                    .replace(/>\.\.\.\./g, '');

                ws.send(cleaned);
            } catch (e) {
                // WebSocket might be closed
            }
        });

        // Handle attach exit
        attachProcess.onExit(({ exitCode, signal }) => {
            try {
                ws.send(`\r\n\x1b[33mAttach session ended (code ${exitCode})\x1b[0m\r\n`);
                ws.close();
            } catch (e) {
                // WebSocket might be closed
            }
        });

        // Forward WebSocket input to attach process
        ws.on('message', (data) => {
            try {
                // Check if it's a resize message
                const parsed = JSON.parse(data);
                if (parsed.type === 'resize') {
                    attachProcess.resize(parsed.cols, parsed.rows);
                    return;
                }
            } catch (e) {
                // Not JSON, treat as regular input
                try {
                    attachProcess.write(data.toString());
                } catch (err) {
                    // Process might be closed
                }
            }
        });

        // Clean up on WebSocket close
        ws.on('close', () => {
            try {
                attachProcess.kill();
            } catch (e) {
                // Already killed
            }
        });

    } catch (error) {
        ws.send(`Error: ${error.message}\r\n`);
        ws.close();
    }
}

// Handle shell access to container (kubectl exec)
async function handleShell(ws, serverName) {
    try {
        // Get pod name
        const podJson = await kubectl(`get pods -l app.kubernetes.io/instance=${serverName} -o json`);
        const pods = JSON.parse(podJson);

        if (!pods.items || pods.items.length === 0) {
            ws.send('Error: No pod found for server\r\n');
            ws.close();
            return;
        }

        const podName = pods.items[0].metadata.name;

        // Use node-pty to spawn kubectl exec with proper PTY
        const shellProcess = pty.spawn('kubectl', [
            'exec',
            '-it',
            podName,
            '-c',
            'java-app-runner',
            '--',
            '/bin/sh'
        ], {
            name: 'xterm-color',
            cols: 80,
            rows: 30,
            cwd: process.env.HOME,
            env: process.env
        });

        // Forward shell output to WebSocket
        shellProcess.onData((data) => {
            try {
                ws.send(data);
            } catch (e) {
                // WebSocket might be closed
            }
        });

        // Handle shell exit
        shellProcess.onExit(({ exitCode, signal }) => {
            try {
                ws.send(`\r\nShell exited with code ${exitCode}\r\n`);
                ws.close();
            } catch (e) {
                // WebSocket might be closed
            }
        });

        // Forward WebSocket input to shell
        ws.on('message', (data) => {
            try {
                shellProcess.write(data.toString());
            } catch (e) {
                // Shell might be closed
            }
        });

        // Handle terminal resize
        ws.on('message', (msg) => {
            try {
                const data = JSON.parse(msg);
                if (data.type === 'resize') {
                    shellProcess.resize(data.cols, data.rows);
                }
            } catch (e) {
                // Not a resize message, ignore
            }
        });

        // Clean up on WebSocket close
        ws.on('close', () => {
            try {
                shellProcess.kill();
            } catch (e) {
                // Already killed
            }
        });

    } catch (error) {
        ws.send(`Error: ${error.message}\r\n`);
        ws.close();
    }
}

server.listen(PORT, () => {
    console.log(`🎮 Minecraft Server Dashboard running on http://localhost:${PORT}`);
    console.log(`📊 Open http://localhost:${PORT} in your browser`);
});

