{{/*
Expand the name of the chart.
*/}}
{{- define "java-app-runner.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "java-app-runner.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create a fully qualified app name with instance suffix.
*/}}
{{- define "java-app-runner.fullname.instance" -}}
{{- $base := include "java-app-runner.fullname" .root }}
{{- printf "%s-%s" $base .instance.name | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "java-app-runner.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "java-app-runner.labels" -}}
helm.sh/chart: {{ include "java-app-runner.chart" . }}
{{ include "java-app-runner.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Common labels for instances
*/}}
{{- define "java-app-runner.labels.instance" -}}
helm.sh/chart: {{ include "java-app-runner.chart" .root }}
{{ include "java-app-runner.selectorLabels.instance" . }}
{{- if .root.Chart.AppVersion }}
app.kubernetes.io/version: {{ .root.Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .root.Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "java-app-runner.selectorLabels" -}}
app.kubernetes.io/name: {{ include "java-app-runner.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Selector labels for instances
*/}}
{{- define "java-app-runner.selectorLabels.instance" -}}
app.kubernetes.io/name: {{ include "java-app-runner.name" .root }}
app.kubernetes.io/instance: {{ .root.Release.Name }}
app.kubernetes.io/component: {{ .instance.name }}
{{- end }}

{{/*
Merge instance configuration with base configuration
*/}}
{{- define "java-app-runner.mergeConfig" -}}
{{- $base := .base }}
{{- $override := .override }}
{{- $result := deepCopy $base }}
{{- range $key, $value := $override }}
  {{- if kindIs "map" $value }}
    {{- if hasKey $base $key }}
      {{- $_ := set $result $key (merge $value (index $base $key)) }}
    {{- else }}
      {{- $_ := set $result $key $value }}
    {{- end }}
  {{- else }}
    {{- $_ := set $result $key $value }}
  {{- end }}
{{- end }}
{{- toYaml $result }}
{{- end }}

