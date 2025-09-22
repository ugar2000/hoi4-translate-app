# Azure deployment guide

This folder contains infrastructure-as-code and helper scripts that provision the Azure resources
required to run the HOI4 translation platform on Azure Kubernetes Service (AKS).

## Contents

| File | Purpose |
| --- | --- |
| `main.bicep` | Creates Azure Container Registry (ACR), AKS, PostgreSQL Flexible Server, Azure Cache for Redis, Log Analytics, and a storage account/File share for MinIO. |
| `parameters.example.json` | Sample parameter file used when deploying the Bicep template. |
| `publish-images.sh` | Utility script for building the project containers and pushing them to ACR. |

## Prerequisites

- Azure CLI 2.52 or newer (`az version`)
- Logged into Azure: `az login`
- A subscription selected: `az account set --subscription <subscription-id>`
- Docker installed locally to build container images

## 1. Create a resource group

```bash
az group create --name translator-rg --location eastus
```

## 2. Deploy core infrastructure

Update `parameters.example.json` with your own values (especially the PostgreSQL credentials) and
then run:

```bash
az deployment group create \
  --name translator-infra \
  --resource-group translator-rg \
  --template-file infra/azure/main.bicep \
  --parameters @infra/azure/parameters.example.json
```

The deployment outputs include:

- `acrLoginServer` – container registry URL
- `postgresFqdn` – managed PostgreSQL host
- `redisHost`/`redisPort` – secure Redis endpoint
- `storageAccount`/`storageFileShare` – values for the MinIO persistent volume

You can retrieve them later with:

```bash
az deployment group show -g translator-rg -n translator-infra --query properties.outputs
```

## 3. Push container images to ACR

Log in and use the helper script to build/push the images:

```bash
az acr login --name <acr-name>
./infra/azure/publish-images.sh <acr-login-server> v1
```

> The optional second argument controls the tag applied to the images. If omitted, `latest` is used.

## 4. Connect kubectl to AKS

```bash
az aks get-credentials --name <aks-name> --resource-group translator-rg
```

## 5. Grant your user pull access to ACR (optional)

The Bicep template already grants the AKS kubelet identity `AcrPull`. To push images manually you
may enable the admin account:

```bash
az acr update --name <acr-name> --admin-enabled true
az acr credential show --name <acr-name>
```

## 6. Prepare application configuration

Update the `.env` files under `services/` and the root `.env` as described in
`infra/kubernetes/README.md` so that they point at the managed PostgreSQL/Redis endpoints produced by
the template. Extract sensitive outputs with Azure CLI helpers, for example:

```bash
az redis list-keys --name <redis-name> --resource-group translator-rg
az postgres flexible-server show --name <pg-name> --resource-group translator-rg --query fullyQualifiedDomainName -o tsv
```

## 7. Deploy workloads

Follow `infra/kubernetes/README.md` to install the NGINX ingress controller, create secrets from the
updated `.env` files, and apply the Kubernetes manifests. Once traffic is flowing you can monitor the
cluster and database through the Log Analytics workspace that was provisioned by the template.

## 8. Ongoing operations

- **Monitoring:** Enable Azure Monitor Container Insights (already connected through Log Analytics).
- **Backups:** PostgreSQL Flexible Server ships with point-in-time restore. Adjust retention via the
  `postgresGeoRedundantBackups` parameter if you need cross-region backups.
- **Scaling:** Increase the AKS node count via `az aks scale` or enable the cluster autoscaler in the
  portal.
- **Secrets management:** For production environments consider moving secrets into Azure Key Vault and
  pulling them via CSI Secrets Store driver rather than embedding them in Kubernetes secrets.

With these assets the repository is ready for production deployments on Azure while keeping the
microservices architecture intact.
