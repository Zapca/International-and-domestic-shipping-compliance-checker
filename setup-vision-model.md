# Setting up Gemini Flash Vision Integration

This document provides step-by-step instructions to set up and configure the Gemini Flash Vision AI integration for the LogiTrack application.

## Prerequisites

Before proceeding, ensure you have:
- Node.js 14+ installed
- npm or yarn package manager
- Google Cloud account with access to Vertex AI (for production use)

## Installation Steps

1. **Install required dependencies**

   ```bash
   cd logistics-app
   npm install
   ```

   This will install all required dependencies including the newly added ones:
   - tesseract.js (for OCR capabilities)
   - axios (for API communication)

2. **Configure Gemini API (for production use)**

   The application currently uses a mock implementation for demonstration purposes. To use the actual Gemini Flash Vision API in production:

   a. Create a `.env` file in the root directory:

   ```
   REACT_APP_GEMINI_API_KEY=your_gemini_api_key
   REACT_APP_GEMINI_API_URL=https://api.vertex.ai/v1/models/gemini-vision:generateContent
   ```

   b. Update the `visionService.ts` file:
   - Uncomment the actual implementation
   - Comment out the mock implementation
   - Ensure API keys are properly loaded from environment variables

3. **Configure Local OCR Fallback (Optional)**

   For local processing without API calls, the app can use tesseract.js:

   ```javascript
   // In visionService.ts
   import Tesseract from 'tesseract.js';

   export const performLocalOCR = async (imageFile: File): Promise<string> => {
     const result = await Tesseract.recognize(
       imageFile,
       'eng',
       { logger: m => console.log(m) }
     );
     return result.data.text;
   };
   ```

## Usage

The Vision model integration provides three main functionalities:

1. **Document Text Extraction**
   - Extracts text from shipping labels and logistics documents
   - Identifies and categorizes fields like tracking numbers, addresses, etc.

2. **Parcel Analysis**  
   - Identifies package type (box, envelope, etc.)
   - Estimates dimensions and weight
   - Assesses package condition

3. **Compliance Checking**
   - Validates extracted data against compliance rules
   - Generates comprehensive compliance reports

## Troubleshooting

If you encounter issues with the Gemini Vision integration:

1. Check your API key and quota limits
2. Ensure image files are in supported formats (JPG, PNG, etc.)
3. Verify network connectivity to the API endpoint
4. Try the local OCR fallback option for basic text extraction

## Resources

- [Gemini API Documentation](https://cloud.google.com/vertex-ai/docs/generative-ai/multimodal/overview)
- [Tesseract.js Documentation](https://github.com/naptha/tesseract.js)
- [LogiTrack Developer Guide](./README.md) 