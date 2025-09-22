# Microsoft Translator Service

This service provides translation functionality using Microsoft Translator API for the Paradox Translator application.

## Setup

### 1. Get Microsoft Translator API Key

1. Go to [Azure Portal](https://portal.azure.com/)
2. Create a new "Translator" resource or use an existing one
3. Get your subscription key from the "Keys and Endpoint" section
4. Note your region (e.g., `eastus`, `westus2`)

### 2. Environment Variables

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Required environment variables:
- `MICROSOFT_TRANSLATOR_KEY`: Your Microsoft Translator subscription key
- `MICROSOFT_TRANSLATOR_REGION`: Your Azure region
- `PORT`: Port for the service (default: 3004)

### 3. Install Dependencies

```bash
npm install
```

### 4. Run the Service

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm run build
npm start
```

## API Endpoints

### POST /translate

Translates text from one language to another.

**Request Body:**
```json
{
  "text": "Hello world",
  "targetLanguage": "l_french"
}
```

**Response:**
```json
{
  "translatedText": "Bonjour le monde"
}
```

## Supported Languages

The service maps Paradox game language codes to Microsoft Translator language codes:

- `l_english` → `en`
- `l_french` → `fr`
- `l_german` → `de`
- `l_spanish` → `es`
- `l_polish` → `pl`
- `l_russian` → `ru`
- `l_turkish` → `tr`
- `l_portuguese` → `pt`
- `l_brazilian` → `pt-br`
- `l_chinese` → `zh-Hans`
- `l_japanese` → `ja`
- `l_korean` → `ko`
- `l_italian` → `it`
- `l_dutch` → `nl`
- `l_finnish` → `fi`
- `l_swedish` → `sv`
- `l_czech` → `cs`
- `l_hungarian` → `hu`
- `l_romanian` → `ro`
- `l_danish` → `da`
- `l_norwegian` → `nb`
- `l_ukrainian` → `uk`
- `l_greek` → `el`
- `l_bulgarian` → `bg`
- `l_estonian` → `et`
- `l_latvian` → `lv`
- `l_lithuanian` → `lt`
- `l_slovak` → `sk`
- `l_slovenian` → `sl`
- `l_indonesian` → `id`
- `l_arabic` → `ar`
- `l_simplified_chinese` → `zh-Hans`
- `l_traditional_chinese` → `zh-Hant`

## Error Handling

The service includes comprehensive error handling:
- Invalid API credentials
- Unsupported language codes
- Network errors
- API rate limiting

## Migration from DeepL

This service replaces the previous DeepL integration. The API interface remains the same, so no changes are needed in client applications.
