# Installation Guide

## Prerequisites

- Kubernetes cluster (1.19+)
- Helm 3.x installed
- kubectl configured to access your cluster

## Quick Start

1. **Create a values file** (e.g., `my-values.yaml`):

```yaml
app:
  download:
    type: "GitRepo"
    source: "https://github.com/yourusername/your-java-app.git"
  
  jarName: "app.jar"
  
  java:
    args: "-Xmx2G -Xms2G"

service:
  type: LoadBalancer
```

2. **Install the chart**:

```bash
helm install my-app ./java-app-runner-helm -f my-values.yaml
```

3. **Check the status**:

```bash
kubectl get pods
kubectl logs -f <pod-name>
```

## Configuration Examples

### Example 1: Minecraft Server from Git

```yaml
app:
  download:
    type: "GitRepo"
    source: "https://github.com/username/minecraft-server.git"
    git:
      branch: "main"
  
  java:
    version: "21"
    args: "-Xmx4G -Xms4G -XX:+UseG1GC"
  
  jarName: "server.jar"
  jarOptions: "nogui"
  
  server:
    name: "My Minecraft Server"
    port: 25565

service:
  type: LoadBalancer
  port: 25565

persistence:
  enabled: true
  size: 50Gi

resources:
  limits:
    cpu: 4000m
    memory: 6Gi
  requests:
    cpu: 2000m
    memory: 4Gi
```

### Example 2: Private Git Repository

```yaml
app:
  download:
    type: "GitRepo"
    source: "https://github.com/username/private-repo.git"
    git:
      branch: "main"
      username: "your-username"
      password: "ghp_yourpersonalaccesstoken"
  
  jarName: "application.jar"
```

### Example 3: GitHub Release

```yaml
app:
  download:
    type: "GithubRelease"
    source: "PaperMC/Paper"
    github:
      filename: "paper-1.20.4-497.jar"
      version: "1.20.4-497"
  
  jarName: "paper-1.20.4-497.jar"
  jarOptions: "nogui"
```

### Example 4: Direct Download URL

```yaml
app:
  download:
    type: "DownloadURL"
    source: "https://example.com/releases/myapp-v1.0.0.zip"
  
  jarName: "myapp.jar"
```

## Upgrading

To upgrade your release with new values:

```bash
helm upgrade my-app ./java-app-runner-helm -f my-values.yaml
```

## Uninstalling

To remove the application:

```bash
helm uninstall my-app
```

**Note**: This will delete the deployment and service, but the PersistentVolumeClaim will remain. To delete it:

```bash
kubectl delete pvc <pvc-name>
```

## Troubleshooting

### Check pod status
```bash
kubectl get pods
kubectl describe pod <pod-name>
```

### View logs
```bash
kubectl logs <pod-name>
kubectl logs <pod-name> -c download-app  # Init container logs
```

### Access the application locally
```bash
kubectl port-forward svc/<service-name> 25565:25565
```

### Check persistent volume
```bash
kubectl get pvc
kubectl describe pvc <pvc-name>
```

