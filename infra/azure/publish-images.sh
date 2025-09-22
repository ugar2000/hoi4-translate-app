#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  cat <<USAGE >&2
Usage: $0 <registry>.azurecr.io [tag]

Builds the project container images and pushes them to the supplied Azure Container Registry.
The Azure CLI must be authenticated (`az login`) and the current subscription must have permission
to push to the registry. Run `az acr login --name <registry>` before executing this script.
USAGE
  exit 1
fi

REGISTRY="$1"
TAG="${2:-latest}"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required to build and push images." >&2
  exit 1
fi

declare -a images=(
  "web-app dockerfiles/web-app.Dockerfile ."
  "api-service dockerfiles/api-service.Dockerfile services/api-service"
  "translation-service services/translation-service/Dockerfile services/translation-service"
  "deepl-service dockerfiles/translator-service.Dockerfile services/deepl-service"
  "websocket-service dockerfiles/websocket-service.Dockerfile services/websocket-service"
  "variable-separator dockerfiles/variable-separator.Dockerfile services/variable-separator"
)

for entry in "${images[@]}"; do
  read -r name dockerfile context <<<"$entry"
  fullTag="$REGISTRY/$name:$TAG"
  echo "\nBuilding $fullTag"
  docker build -f "$dockerfile" -t "$fullTag" "$context"
  echo "Pushing $fullTag"
  docker push "$fullTag"
done

cat <<SUMMARY
\nSuccessfully pushed the following images to $REGISTRY with tag $TAG:
$(for entry in "${images[@]}"; do read -r name _ <<<"$entry"; echo "- $REGISTRY/$name:$TAG"; done)
SUMMARY
