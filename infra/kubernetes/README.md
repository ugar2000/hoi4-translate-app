# Kubernetes deployment on Azure AKS

The manifests in this directory complement the Azure infrastructure defined in `../azure/main.bicep`.
They describe how to run the translator microservices on an Azure Kubernetes Service (AKS) cluster that
pulls container images from an Azure Container Registry (ACR) and depends on Azure Database for PostgreSQL,
Azure Cache for Redis, and a dynamically provisioned Azure File share for MinIO persistence.

## Prerequisites

- An AKS cluster created by the Bicep template (or equivalent) and `kubectl` configured via
  `az aks get-credentials -n <aks-name> -g <resource-group>`.
- Container images for each service pushed to your ACR (see `infra/azure/publish-images.sh`).
- The NGINX Ingress Controller installed in the cluster, e.g.
  ```bash
  helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
  helm repo update
  helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
    --namespace ingress-nginx --create-namespace
  ```
- Azure CLI 2.52+ for fetching connection strings and storage keys.

## 1. Prepare environment files

Update the service `.env` files to point at the managed services provisioned by Azure. The most
important values are:

| Service | Key | Suggested value |
| --- | --- | --- |
| `services/api-service/.env` | `DATABASE_URL` | `postgresql://<admin>:<password>@<postgres-fqdn>:5432/translator?sslmode=require` |
| `services/api-service/.env` | `MINIO_ENDPOINT` | `http://minio.hoi4-translate.svc.cluster.local:9000` |
| `services/api-service/.env` | `TRANSLATION_HOST` / `TRANSLATION_PORT` | `translation-service` / `4001` |
| `services/minio/.env` | `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD` | Use strong credentials |
| `services/translation-service/.env` | `TRANSLATION_HOST` | `0.0.0.0` (no change) |
| `services/websocket-service/.env` | `REDIS_URL` | `rediss://:<password>@<redis-hostname>:6380/0?ssl=true` |
| `services/websocket-service/.env` | `TRANSLATION_SERVICE_URL` | `http://translation-service:4001` |
| `services/websocket-service/.env` | `VARIABLE_SEPARATOR_URL` | `http://variable-separator:3003` |
| `services/deepl-service/.env` | Translator credentials from Azure AI or DeepL |
| Root `.env` | `NEXT_PUBLIC_API_URL` | `https://api.<your-domain>` |
| Root `.env` | `NEXT_PUBLIC_API_WS_URL` | `wss://api.<your-domain>` |

> Tip: the Redis connection string can be obtained with `az redis list-keys --name <redis-name> --resource-group <rg>`.

## 2. Create the namespace

```bash
kubectl apply -f infra/kubernetes/namespace.yaml
```

## 3. Generate Kubernetes secrets

Create one secret per service so the Deployments can project the `.env` files. The `--dry-run=client`
flag lets you verify the manifest before applying it.

```bash
kubectl -n hoi4-translate create secret generic api-service-env \
  --from-env-file=services/api-service/.env --dry-run=client -o yaml | kubectl apply -f -

kubectl -n hoi4-translate create secret generic translation-service-env \
  --from-env-file=services/translation-service/.env --dry-run=client -o yaml | kubectl apply -f -

kubectl -n hoi4-translate create secret generic deepl-service-env \
  --from-env-file=services/deepl-service/.env --dry-run=client -o yaml | kubectl apply -f -

kubectl -n hoi4-translate create secret generic websocket-service-env \
  --from-env-file=services/websocket-service/.env --dry-run=client -o yaml | kubectl apply -f -

kubectl -n hoi4-translate create secret generic variable-separator-env \
  --from-env-file=services/variable-separator/.env --dry-run=client -o yaml | kubectl apply -f -

kubectl -n hoi4-translate create secret generic web-app-env \
  --from-env-file=.env --dry-run=client -o yaml | kubectl apply -f -

kubectl -n hoi4-translate create secret generic minio-env \
  --from-env-file=services/minio/.env --dry-run=client -o yaml | kubectl apply -f -
```

> **Note:** the root `.env` should include only the `NEXT_PUBLIC_*` values needed by the runtime
> Next.js container. Remove any keys that are not required in production.

## 4. Point the manifests at your registry

Replace every occurrence of `<REGISTRY>` inside `infra/kubernetes/*.yaml` with the login server of
your ACR (e.g. `translatoracr.azurecr.io`). On macOS/Linux you can run:

```bash
sed -i "" "s#<REGISTRY>#translatoracr.azurecr.io#g" infra/kubernetes/*.yaml
```

Adjust the hostnames in `infra/kubernetes/ingress.yaml` to match the DNS names you will map to the
Ingress controller.

## 5. Deploy the workloads

Apply the manifests in the following order:

```bash
kubectl apply -f infra/kubernetes/minio.yaml
kubectl apply -f infra/kubernetes/translation-service.yaml
kubectl apply -f infra/kubernetes/deepl-service.yaml
kubectl apply -f infra/kubernetes/variable-separator.yaml
kubectl apply -f infra/kubernetes/websocket-service.yaml
kubectl apply -f infra/kubernetes/api-service.yaml
kubectl apply -f infra/kubernetes/web-app.yaml
kubectl apply -f infra/kubernetes/ingress.yaml
```

## 6. Run database migrations

Run Prisma migrations once the API secret is in place:

```bash
kubectl apply -f infra/kubernetes/prisma-migrate-job.yaml
kubectl -n hoi4-translate logs job/prisma-migrate
kubectl -n hoi4-translate delete job/prisma-migrate
```

## 7. Configure DNS and TLS

Point your public DNS records at the external IP of the NGINX Ingress controller and configure TLS
(cert-manager or Azure Front Door) to secure both the API and the frontend hosts. Update
`NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_API_WS_URL` if you terminate TLS elsewhere.

## 8. Verification checklist

- `kubectl get pods -n hoi4-translate` shows all deployments in `Running` state.
- Visiting `https://app.<your-domain>` loads the Next.js UI.
- Uploading a file stores history entries in MinIO and rows update live through the Socket.IO gateway.
- `kubectl logs deploy/api-service` contains no `ECONNREFUSED` errors when saving history, indicating
  that PostgreSQL and MinIO credentials are correct.

With these steps the stack is ready to run in Azure with managed dependencies and Kubernetes-based scaling.
