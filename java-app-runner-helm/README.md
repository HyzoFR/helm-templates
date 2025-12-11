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

## Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `replicaCount` | Number of replicas | `1` |
| `image.repository` | Container image repository | `eclipse-temurin` |
| `image.tag` | Container image tag | `21-jdk-alpine` |
| `app.download.type` | Download type (GitRepo, GithubRelease, DownloadURL, None) | `""` |
| `app.download.source` | Download source URL | `""` |
| `app.java.version` | Java version to use | `"21"` |
| `app.java.args` | JVM arguments | `""` |
| `app.jarName` | JAR file name to run | `""` |
| `app.jarOptions` | Options to pass to JAR | `""` |
| `app.server.port` | Server port | `25565` |
| `service.type` | Kubernetes service type | `ClusterIP` |
| `persistence.enabled` | Enable persistent storage | `true` |
| `persistence.size` | Storage size | `10Gi` |

## Upgrading

```bash
helm upgrade my-java-app ./java-app-runner-helm -f my-values.yaml
```

## Uninstalling

```bash
helm uninstall my-java-app
```

