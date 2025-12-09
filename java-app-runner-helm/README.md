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

