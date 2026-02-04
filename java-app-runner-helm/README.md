# Java App Runner Helm Chart

A Helm chart for running Java applications in Kubernetes. This chart provides the same functionality as the AMP template for Java App Runner.

## Features

- Runs Java applications from JAR files
- Supports multiple download methods:
  - Git Repository (with Git LFS support)
  - GitHub Releases
  - Direct URL Download
- Configurable Java version (uses Eclipse Temurin)
- Persistent storage for application data
- Configurable resources and scaling
- Path-based configuration file replacements
- Template file copying (e.g., world templates for Minecraft servers)
- **Multiple instances support**: Run multiple instances with different configurations from a single values file

## Installation

```bash
helm install my-java-app ./java-app-runner-helm -f my-values.yaml
```

## Configuration

### Basic Example - Git Repository

```yaml
app:
  download:
    type: "GitRepo"
    source: "https://github.com/username/repo.git"
    git:
      branch: "main"
  
  java:
    version: "21"
    args: "-Xmx2G -Xms2G"
  
  jarName: "server.jar"
  jarOptions: "nogui"
  
  server:
    name: "My Server"
    port: 25565

service:
  type: LoadBalancer
  port: 25565
```

### GitHub Release Example

```yaml
app:
  download:
    type: "GithubRelease"
    source: "username/repo"
    github:
      filename: "app.zip"
      version: "v1.0.0"  # Empty for latest
  
  jarName: "app.jar"
```

### Direct Download Example

```yaml
app:
  download:
    type: "DownloadURL"
    source: "https://example.com/app.zip"

  jarName: "application.jar"
```

### Configuration File Replacements

Replace specific tokens in specific files after download:

```yaml
app:
  configReplacements:
    "server.properties":
      "%SERVER_NAME%": "My Server"
      "%SERVER_PORT%": "25565"
      "%MAX_PLAYERS%": "20"
    "config/paper-global.yml":
      "%ENABLE_COMMAND_BLOCK%": "true"
      "%VIEW_DISTANCE%": "10"
```

This will:
- Replace `%SERVER_NAME%` with `My Server` in `server.properties`
- Replace `%SERVER_PORT%` with `25565` in `server.properties`
- Replace `%MAX_PLAYERS%` with `20` in `server.properties`
- Replace `%ENABLE_COMMAND_BLOCK%` with `true` in `config/paper-global.yml`
- Replace `%VIEW_DISTANCE%` with `10` in `config/paper-global.yml`

File paths are relative to `/app/java-app-runner` (or `/app/java-app-runner/{appDir}` if `appDir` is specified).

### Template File Copying

Copy and extract template files (e.g., pre-built Minecraft worlds) before running:

```yaml
app:
  templateFiles:
    - hostPath: "/Users/username/minecraft-templates/overworld.zip"
      extractTo: "world"
      overwrite: false  # Only copy if destination doesn't exist
    - hostPath: "/Users/username/minecraft-templates/nether.zip"
      extractTo: "world_nether"
      overwrite: false
    - hostPath: "/Users/username/minecraft-templates/plugins.zip"
      extractTo: "plugins"
      overwrite: true  # Always overwrite
```

This will:
- Copy the zip file from the host path (read-only)
- Extract it to the specified destination relative to `/app/java-app-runner`
- If `overwrite: false`, only extract if the destination doesn't exist
- If `overwrite: true`, always extract (useful for updating plugins/configs)

**Note:** The host path must be accessible from the Kubernetes node. For local development (Docker Desktop, Minikube), use paths on your local machine.

### Multiple Instances

Run multiple instances as separate containers in a single pod. This is useful when you want to run multiple servers that share the same base configuration (e.g., same Git repository, same template files) but differ in specific settings like ports and environment variables.

**Architecture**: All instances run as separate containers within one pod, sharing:
- The same network namespace (localhost communication is extremely fast)
- The same storage volume (no duplication of downloaded files)
- The same node resources

Each instance gets its own isolated directory (`instance-<name>`) with a copy of the application files, allowing independent configuration.

```yaml
# Base configuration (shared across all instances)
hostNetwork: true

app:
  download:
    type: "GitRepo"
    source: "https://github.com/HyzoFR/server-hub"
    git:
      branch: "main"

  templateFiles:
    - hostPath: "/var/templates/floor1.zip"
      extractTo: "world"
      overwrite: true

  java:
    version: "21"
    args: "-Xmx2G -Xms2G -XX:+UseG1GC"

  jarName: "folia.jar"

service:
  type: ClusterIP
  protocol: TCP

resources:
  limits:
    cpu: 2000m
    memory: 4Gi

# Multiple instances with different configurations
instances:
  - name: "hub-1"
    service:
      port: 25502
    app:
      configReplacements:
        "server.properties":
          "%SERVER_NAME%": "Hub-1"
          "%SERVER_PORT%": "25502"
    env:
      - name: SERVER_ID
        value: "1"

  - name: "hub-2"
    service:
      port: 25503
    app:
      configReplacements:
        "server.properties":
          "%SERVER_NAME%": "Hub-2"
          "%SERVER_PORT%": "25503"
    env:
      - name: SERVER_ID
        value: "2"

  - name: "hub-3"
    service:
      port: 25504
    app:
      configReplacements:
        "server.properties":
          "%SERVER_NAME%": "Hub-3"
          "%SERVER_PORT%": "25504"
    env:
      - name: SERVER_ID
        value: "3"
```

This will create **one pod** with 3 containers (`hub-1`, `hub-2`, `hub-3`), where:
- All containers share the same downloaded Git repository and template files
- Each container runs on a different port (25502, 25503, 25504)
- Each container has its own configuration files in `/app/java-app-runner/instance-<name>/`
- Each container has its own environment variables
- All ports are exposed via a single service

**Benefits:**
- ✅ Extremely fast inter-server communication (localhost)
- ✅ Shared storage - Git repo downloaded once, copied to each instance directory
- ✅ Lower resource overhead compared to multiple pods
- ✅ All servers start/stop together atomically
- ✅ Works perfectly with `hostNetwork: true` - all ports exposed on host

Each instance can override any base configuration:
- `service.port`: Override the port for this instance (required)
- `app.configReplacements`: Override or add config replacements
- `env`: Set instance-specific environment variables
- `resources`: Override resource limits for this container

**Note:** When using `instances`, a single pod with multiple containers is created instead of the base deployment.

## Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `replicaCount` | Number of replicas | `1` |
| `hostNetwork` | Use host network for direct port exposure | `true` |
| `image.repository` | Container image repository | `eclipse-temurin` |
| `image.tag` | Container image tag | `21-jdk-alpine` |
| `app.download.type` | Download type (GitRepo, GithubRelease, DownloadURL, None) | `""` |
| `app.download.source` | Download source URL | `""` |
| `app.java.version` | Java version to use | `"21"` |
| `app.java.args` | JVM arguments | `""` |
| `app.jarName` | JAR file name to run | `""` |
| `app.jarOptions` | Options to pass to JAR | `""` |
| `app.configReplacements` | Configuration file replacements | `{}` |
| `app.templateFiles` | Template files to copy | `[]` |
| `service.type` | Kubernetes service type | `ClusterIP` |
| `service.port` | Service port | `25565` |
| `service.protocol` | Service protocol (TCP, UDP, Both) | `TCP` |
| `persistence.enabled` | Enable persistent storage | `false` |
| `persistence.type` | Persistence type (pvc, hostPath) | `pvc` |
| `persistence.size` | Storage size | `10Gi` |
| `instances` | Array of instance configurations | `[]` |

## Upgrading

```bash
helm upgrade my-java-app ./java-app-runner-helm -f my-values.yaml
```

## Uninstalling

```bash
helm uninstall my-java-app
```

