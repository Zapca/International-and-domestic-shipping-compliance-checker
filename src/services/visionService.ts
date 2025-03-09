import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { dataStandardizationService } from './dataStandardizationService';

// Result type that matches the ComplianceResult type
interface ComplianceResult {
  id: string;
  field: string;
  value: string;
  status: 'compliant' | 'non-compliant' | 'warning';
  message: string;
}

interface ExtractedData {
  text?: string;
  fields?: {
    [key: string]: string;
  };
  parcelInfo?: {
    type?: string;
    dimensions?: string;
    weight?: string;
    condition?: string;
    features?: string[];
  };
  confidence: number;
}

// Gemini API configuration for image analysis ONLY
const API_KEY = 'AIzaSyAraWPlckPfQpXrnbXdRy_iu1ctsjzGzjo';
const MODEL_NAME = 'gemini-2.0-flash-thinking-exp-01-21'; // Vision-enabled model
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent`;

// Helper function to convert File to base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      // Extract the base64 part from the data URL
      const base64String = reader.result as string;
      const base64Content = base64String.split(',')[1];
      resolve(base64Content);
    };
    reader.onerror = error => {
      reject(error);
    };
  });
};

/**
 * Analyze an image using the Gemini Vision model
 * Focus ONLY on extracting raw text and information from the image
 * Standardization will happen in a separate step
 */
export const analyzeImage = async (imageFile: File): Promise<ExtractedData> => {
  try {
    const base64Image = await fileToBase64(imageFile);
    
    // Prepare the request payload for the vision model
    const data = {
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `You are an expert logistics document analyzer. Extract ALL text and information from this shipping document image. Include ALL numbers, dates, addresses, tracking numbers, weights, dimensions, sender and receiver information, package details, and any other relevant data.

DO NOT try to guess or make assumptions about what fields mean - just extract the raw text.
DO NOT skip any information, even if it seems minor.
DO NOT summarize - extract EVERYTHING visible.

Respond with the following:
1. Raw Text: A complete transcription of ALL text visible in the image, preserving the original layout as much as possible.
2. Confidence: Your estimated confidence level (0-100%) in the text extraction.`
            },
            {
              inline_data: {
                mime_type: 'image/jpeg',
                data: base64Image
              }
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.1,
        topP: 0.95,
        topK: 64,
        maxOutputTokens: 4096,
      }
    };
    
    // Call the Gemini Vision API
    const response = await axios.post(API_URL, data, {
      params: { key: API_KEY },
      headers: { 'Content-Type': 'application/json' }
    });
    
    // Process the response
    return processApiResponse(response.data);
    
  } catch (error) {
    console.error("Error analyzing image:", error);
    
    // Return a minimal result with error information
    return {
      text: `Error analyzing image: ${error}`,
      confidence: 0,
    };
  }
};

/**
 * Process the API response to extract structured data
 */
const processApiResponse = (apiResponse: any): ExtractedData => {
  if (!apiResponse.candidates || !apiResponse.candidates[0] || !apiResponse.candidates[0].content) {
    throw new Error("Invalid API response format");
  }
  
  const content = apiResponse.candidates[0].content;
  const responseText = content.parts?.[0]?.text || '';
  
  // Extract raw text from the response
  const extractedText = responseText;
  
  // Extract confidence score if available
  let confidence = 0.75; // Better default confidence
  
  // Try to find an explicit confidence score in the response
  const confidenceMatch = responseText.match(/confidence:?\s*(\d+)/i);
  if (confidenceMatch && confidenceMatch[1]) {
    confidence = parseInt(confidenceMatch[1], 10) / 100; // Convert from 0-100 to 0-1
  } else {
    // Calculate a confidence score based on response quality
    
    // Check for known indicators of high confidence
    if (responseText.includes('clearly visible') || 
        responseText.includes('high confidence') || 
        responseText.includes('easily readable')) {
      confidence = 0.85;
    }
    
    // Check for known indicators of low confidence
    if (responseText.includes('partially visible') || 
        responseText.includes('hard to read') || 
        responseText.includes('unclear') ||
        responseText.includes('may be')) {
      confidence = 0.65;
    }
    
    // Check for very low confidence indicators
    if (responseText.includes('cannot determine') || 
        responseText.includes('not visible') || 
        responseText.includes('illegible')) {
      confidence = 0.45;
    }
    
    // Adjust confidence based on length of response (longer responses often have more detail)
    if (responseText.length > 500) {
      confidence = Math.min(0.9, confidence + 0.05);
    } else if (responseText.length < 200) {
      confidence = Math.max(0.4, confidence - 0.05);
    }
  }
  
  // Create a basic extracted data structure
  const result: ExtractedData = {
    text: extractedText,
    confidence: confidence,
  };
  
  return result;
};

/**
 * Extract structured data from raw text
 * This now uses the dataStandardizationService instead of a hard-coded approach
 */
export const extractStructuredData = async (text: string): Promise<Record<string, string>> => {
  try {
    // Use the new standardization service for this step
    const standardizedData = await dataStandardizationService.standardizeData(text);
    
    // Further enhance the standardized data
    const enhancedData = await dataStandardizationService.enhanceStandardizedData(standardizedData);
    
    return enhancedData;
  } catch (error) {
    console.error("Error extracting structured data:", error);
    return {};
  }
};

/**
 * Convert extracted data to compliance results
 * This is a placeholder that should be updated to use actual compliance rules
 */
export const convertToComplianceResults = (extractedData: ExtractedData): ComplianceResult[] => {
  const results: ComplianceResult[] = [];
  
  // Add a compliance result for the confidence score
  results.push({
    id: uuidv4(),
    field: 'AI Confidence Score',
    value: `${Math.round(extractedData.confidence * 100)}%`,
    status: extractedData.confidence < 0.6 ? 'warning' : 'compliant',
    message: extractedData.confidence < 0.6
      ? 'Low confidence in extracted data. Consider reviewing manually.'
      : 'Acceptable confidence in extracted data.'
  });
  
  // Add compliance results for fields if available
  if (extractedData.fields) {
    Object.entries(extractedData.fields).forEach(([key, value]) => {
      // Skip empty values
      if (!value || value.trim() === '') return;
      
      // Basic compliance check based on value length
      // This should be replaced with actual compliance rules later
      const isCompliant = value.length > 2;
      
      results.push({
        id: uuidv4(),
        field: key,
        value: value,
        status: isCompliant ? 'compliant' : 'warning',
        message: isCompliant
          ? `Field ${key} is present.`
          : `Field ${key} is unusually short - please verify.`
      });
    });
  }
  
  return results;
}; 