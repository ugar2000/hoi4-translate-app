# Paradox Game Translation App 🎮🌍

A powerful translation tool designed specifically for Paradox Interactive games (HOI4, EU4, etc.). This app combines the speed and accuracy of Microsoft Translator with the context understanding of OpenAI to provide high-quality translations while preserving game-specific formatting and variables.

## 🌟 Features

- **Smart Variable Handling**: Automatically preserves game-specific variables and formatting codes
- **Hybrid Translation**: Uses Microsoft Translator for speed and accuracy, with optional OpenAI post-processing
- **Real-time Progress**: Live updates on translation status via WebSocket
- **YAML Support**: Handles Paradox's YAML localization files with proper comment handling
- **Microservices Architecture**: Scalable design with Redis-based queue system
- **Modern UI**: Built with Next.js and TypeScript for a smooth user experience
- **Personal History**: Save original and translated files for each run with an in-app download archive

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
    - `services/deepl-service/.env`
     - `services/translation-service/.env`
     - `services/websocket-service/.env`
     - `services/variable-separator/.env`
     - `services/minio/.env`

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

- **Frontend**: Next.js application with TypeScript and modern UI components
- **API Service**: NestJS-based REST API handling authentication, translation requests, and the row-level WebSocket gateway
- **Translation Service**: Optional OpenAI-powered post-processing
- **Microsoft Translator Service**: Integrates with Azure AI Translator for fast translation
- **Variable Separator**: Handles game-specific variables and formatting codes
- **Redis**: Message queue and pub/sub for service communication
- **MinIO Object Storage**: Stores original and translated files for user history downloads

## 🔧 Services

### Variable Separator Service
- Extracts and hashes game-specific variables
- Preserves special formatting codes (§Y, §G, etc.)
- Restores variables after translation

### Microsoft Translator Service
- Fast and accurate baseline translations
- Supports dozens of language pairs provided by Azure AI Translator
- Preserves formatting

### API Service (NestJS)
- Centralized authentication (login/register)
- Delegates OpenAI requests to the translation microservice via Nest microservices
- Provides REST endpoints consumed by the Next.js frontend
- Hosts the Socket.IO gateway that streams per-row translation status updates to the UI

### MinIO Object Storage
- Stores every uploaded source file and its generated translation output
- Powers the translation history page with persistent download links
- Automatically initialised by the API service if the configured bucket is missing

## 🔐 Environment Variables

The project uses a combination of root-level and service-specific environment files. The table below summarises the most important variables:

| Variable | Location | Purpose |
| --- | --- | --- |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_PORT` | `.env` | Credentials for the Postgres container |
| `DATABASE_URL` | `.env`, `services/api-service/.env` | Prisma connection string used by the API and web app |
| `JWT_SECRET`, `NEXTAUTH_SECRET` | `.env`, `services/api-service/.env` | Secrets for issuing/verifying auth tokens |
| `OPENAI_API_KEY`, `OPENAI_MODEL` | `.env`, `services/translation-service/.env` | Configuration for the OpenAI translation microservice |
| `MICROSOFT_TRANSLATOR_KEY`, `MICROSOFT_TRANSLATOR_REGION` | `.env`, `services/deepl-service/.env` | Credentials for the Microsoft Translator integration |
| `REDIS_URL` | `.env`, `services/websocket-service/.env`, `services/variable-separator/.env` | Location of the Redis instance used by background queues |
| `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET` | `.env`, `services/api-service/.env`, `services/minio/.env` | Object storage configuration for saving translation files |
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
