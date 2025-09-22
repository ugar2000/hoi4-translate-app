# Paradox Game Translation App 🎮🌍

A powerful translation tool designed specifically for Paradox Interactive games (HOI4, EU4, etc.). This app combines the speed and accuracy of DeepL with the context understanding of OpenAI to provide high-quality translations while preserving game-specific formatting and variables.

## 🌟 Features

- **Smart Variable Handling**: Automatically preserves game-specific variables and formatting codes
- **Hybrid Translation**: Uses DeepL for speed and accuracy, with optional OpenAI post-processing
- **Real-time Progress**: Live updates on translation status via WebSocket
- **YAML Support**: Handles Paradox's YAML localization files with proper comment handling
- **Microservices Architecture**: Scalable design with Redis-based queue system
- **Modern UI**: Built with Next.js and TypeScript for a smooth user experience

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Docker and Docker Compose
- DeepL API key
- OpenAI API key (optional)

### Environment Setup

1. Clone the repository:
```bash
git clone https://github.com/ugar2000/hoi4-translate-app.git
cd hoi4-translate-app
```

2. Create `.env` file:
```env
DEEPL_API_KEY=your-deepl-api-key
OPENAI_API_KEY=your-openai-api-key  # Optional
DATABASE_URL=postgresql://user:password@localhost:5432/translator
JWT_SECRET=your-secret
```

3. Start the services:
```bash
docker-compose up --build
```

4. Install frontend dependencies:
```bash
npm install
# or
yarn install
```

5. Run the development server:
```bash
npm run dev
# or
yarn dev
```

## 🏗️ Architecture

The app consists of several microservices:

- **Frontend**: Next.js application with TypeScript and modern UI components
- **WebSocket Service**: Manages real-time communication and job coordination
- **Variable Separator**: Handles game-specific variables and formatting codes
- **DeepL Service**: Integrates with DeepL API for fast translation
- **Translation Service**: Optional OpenAI-powered post-processing
- **Redis**: Message queue and pub/sub for service communication

## 🔧 Services

### Variable Separator Service
- Extracts and hashes game-specific variables
- Preserves special formatting codes (§Y, §G, etc.)
- Restores variables after translation

### DeepL Service
- Fast and accurate baseline translations
- Supports multiple language pairs
- Preserves formatting

### WebSocket Service
- Real-time progress updates
- Queue management
- Error handling and recovery

## 🌐 Supported Languages

Supports all languages available in DeepL:
- English (EN)
- German (DE)
- French (FR)
- Spanish (ES)
- Polish (PL)
- And many more!

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [DeepL API](https://www.deepl.com/docs-api) for high-quality translations
- [OpenAI API](https://platform.openai.com/) for context-aware post-processing
- [Paradox Interactive](https://www.paradoxinteractive.com/) for creating amazing games
- The HOI4 modding community for inspiration

## 📞 Support

If you encounter any issues or have questions, please:
1. Check the [Issues](https://github.com/ugar2000/hoi4-translate-app/issues) page
2. Open a new issue if your problem isn't already reported
3. Provide as much detail as possible about your setup and the problem
