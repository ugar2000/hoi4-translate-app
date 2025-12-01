# Paradox Game Translation App 🎮🌍

A powerful translation tool designed specifically for Paradox Interactive games (HOI4, EU4, etc.). This app combines the speed and accuracy of Microsoft Translator with the context understanding of OpenAI to provide high-quality translations while preserving game-specific formatting and variables.

## 🌟 Features

- **Redis Streams Pipeline**: End-to-end ingestion → translate → post-edit → special characters → aggregate → upload, entirely powered by Redis Streams with consumer groups.
- **Micro-batched Post-editing**: Batches up to 32 lines per request to OpenAI for efficient, consistent polishing of translations.
- **Fairness & Idempotency**: Sharded processing with per-file semaphores, token buckets, deduplication keys, and DLQs keep throughput predictable and resilient.
- **Streaming Control Plane**: A gRPC coordinator handles job lifecycle (start, status, cancel, retry) while data flows over Redis.
- **Object Storage First**: All large payloads are stored in MinIO; Streams only carry metadata references, keeping messages lightweight.
- **Real-time UI**: Next.js frontend with WebSocket updates for ongoing jobs and history downloads when aggregations finish.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Docker and Docker Compose
- Microsoft Translator key
- OpenAI API key (optional)

### Environment Setup

1. Clone the repository:
```bash
git clone https://github.com/ugar2000/hoi4-translate-app.git
cd hoi4-translate-app
```

2. Configure environment variables:
   - Copy the root example file and update any secrets:
     ```bash
     cp .env.example .env
     ```
   - Each backend service ships with a checked-in `.env` file (generated from its `.env.example`). Replace the placeholder secrets/API keys in the following files before running the stack:
     - `services/api-service/.env`
     - `services/websocket-service/.env`
     - `services/minio/.env`
   - The Redis Stream workers (coordinator, translate, postedit, special-chars, aggregate, uploader) read their configuration from Docker Compose environment variables. Update the values in `docker-compose.yml` or export the corresponding variables before `make up`.

3. Build the containers:
```bash
make build
```

4. Start the Docker stack (foreground mode):
```bash
make up
```

5. Install frontend dependencies:
```bash
npm install
# or
yarn install
```

6. Run the development server:
```bash
npm run dev
# or
yarn dev
```

## 🏗️ Architecture

The app consists of several microservices:

- **Frontend**: Next.js application with TypeScript and modern UI components.
- **API Service**: NestJS REST API that delegates job control to the coordinator via gRPC and pushes row-level updates through Socket.IO.
- **Coordinator Service**: gRPC control plane that ingests jobs, maintains Redis metadata, exposes status, and manages cancel/retry flows.
- **Translate Worker**: Consumes `lines:in:{shard}`, reads line payloads from MinIO, and produces the first-pass translation artefacts.
- **Postedit Service**: Micro-batches lines (≤32) for OpenAI, writes the postedited output, and forwards metadata to the next stage.
- **Special Characters Service**: Normalises typographic characters while honouring Paradox formatting codes and placeholders.
- **Aggregate Service**: Tracks per-file progress, marks completion in Redis, assembles the final file, and emits `file:ready` notifications.
- **Uploader Service**: Copies aggregated files to the export prefix and marks jobs as `completed`.
- **Redis**: Durable Streams backbone (AOF enabled) with per-stage consumer groups and DLQs.
- **MinIO Object Storage**: Holds originals, per-stage artefacts, and final deliverables for history downloads.

## 🔧 Services

### Coordinator Service
- gRPC API: `StartJob`, `GetStatus`, `CancelJob`, `RetryFailed`.
- Splits input payloads, writes to MinIO, and publishes metadata to `lines:in:{shard}`.
- Aggregates metrics by shard (stream lengths, XPENDING, DLQ sizes).

### Translate / Postedit / Special-chars Workers
- Share a reusable Redis worker harness (Streams, semaphores, rate limits, deduplication).
- Use MinIO references stored inside Stream messages; payloads never touch Redis.
- Postedit stage batches up to 32 lines and calls OpenAI once per flush.

### Aggregate & Uploader Workers
- Aggregate maintains per-file bitmaps and emits final files when every line is completed.
- Uploader copies the assembled file to the export location and marks jobs complete for the UI/history views.

### API Service (NestJS)
- Centralized authentication and Prisma-backed REST APIs.
- Creates translation jobs via gRPC, waits for completion, and streams updates over WebSockets.
- Surfaces history downloads using the MinIO export prefix populated by the uploader service.

## 🔐 Environment Variables

The project uses a combination of root-level and service-specific environment files. The table below summarises the most important variables:

| Variable | Location | Purpose |
| --- | --- | --- |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_PORT` | `.env` | Credentials for the Postgres container |
| `DATABASE_URL` | `.env`, `services/api-service/.env` | Prisma connection string used by the API and web app |
| `JWT_SECRET`, `NEXTAUTH_SECRET` | `.env`, `services/api-service/.env` | Secrets for issuing/verifying auth tokens |
| `COORDINATOR_ADDRESS` | `services/api-service/.env`, `docker-compose.yml` | Host/port for the gRPC coordinator used by the API |
| `OPENAI_API_KEY`, `OPENAI_MODEL` | `.env`, `docker-compose.yml` | Credentials/models consumed by the translate and postedit workers |
| `REDIS_HOST`, `REDIS_SHARDS`, `STREAM_READ_COUNT`, `STREAM_BLOCK_MS`, `MAX_ATTEMPTS`, `WINDOW_PER_FILE` | `docker-compose.yml` | Global Redis Streams configuration shared by every worker |
| `POSTEDIT_BATCH_SIZE`, `POSTEDIT_FLUSH_MS` | `docker-compose.yml` | Micro-batching settings for the postedit worker |
| `OUTPUT_PREFIX`, `EXPORT_PREFIX` | `docker-compose.yml`, `services/api-service/.env` | Final artefact destinations in MinIO |
| `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET` | `.env`, `services/api-service/.env`, `services/minio/.env`, `docker-compose.yml` | Object storage configuration for saving translation files |
| `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_API_WS_URL` | `.env` | URLs consumed by the Next.js frontend |

> **Tip:** To iterate quickly with hot reloading, use `make dev` to start the Docker Compose stack with the development overrides from `docker-compose.dev.yml`.

## ☁️ Deploying to Azure

Ready to move beyond Docker Compose? The repository now includes an Azure-focused toolchain that builds the infrastructure and Kubernetes manifests required for production deployments:

- `infra/azure/main.bicep` provisions Azure Container Registry, Azure Kubernetes Service, PostgreSQL Flexible Server, Azure Cache for Redis, a storage account, and Log Analytics in one command.
- `infra/azure/publish-images.sh` builds every microservice image and publishes it to your registry so AKS can pull them.
- `infra/kubernetes/*.yaml` describes the workloads, ingress, and persistent storage that run on AKS.

Follow the step-by-step guides in `infra/azure/README.md` and `infra/kubernetes/README.md` to push images, create secrets from your `.env` files, deploy the manifests, and run Prisma migrations on the managed PostgreSQL instance. The result is a fully managed Azure deployment with scaling, monitoring, and persistent history storage through Azure-native services.

## 🌐 Supported Languages

Supports all languages available through Microsoft Translator, including but not limited to English, German, French, Spanish, Polish, and many more.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

## 🧪 Testing

- Unit tests for shared stream utilities live alongside the translate worker:

  ```bash
  cd services/translate-worker
  npm run test
  ```

- Integration smoke tests can be run by bringing the stack up with Docker Compose and submitting a job via the API (`POST /translate`). The gRPC coordinator exposes `StartJob`, `GetStatus`, and `RetryFailed` for automated end-to-end scenarios.

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Azure AI Translator](https://learn.microsoft.com/azure/ai-services/translator/) for high-quality translations
- [OpenAI API](https://platform.openai.com/) for context-aware post-processing
- [Paradox Interactive](https://www.paradoxinteractive.com/) for creating amazing games
- The HOI4 modding community for inspiration

## 📞 Support

If you encounter any issues or have questions, please:
1. Check the [Issues](https://github.com/ugar2000/hoi4-translate-app/issues) page
2. Open a new issue if your problem isn't already reported
3. Provide as much detail as possible about your setup and the problem
