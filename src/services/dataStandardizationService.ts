import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

// Keep this for reference in prompts - will not be used for direct mapping
const STANDARD_FIELD_EXAMPLES: Record<string, string[]> = {
  // Shipping details
  'trackingNumber': [
    'tracking number', 'tracking #', 'tracking id', 'tracking code', 'awb', 'airway bill', 'waybill',
    'shipment number', 'shipment id', 'package id', 'consignment number'
  ],
  'shipmentDate': [
    'shipment date', 'ship date', 'date shipped', 'date sent', 'post date', 'mailing date',
    'dispatch date', 'pickup date', 'collection date', 'shipping date'
  ],
  'deliveryDate': [
    'delivery date', 'arrival date', 'estimated delivery', 'expected date',
    'due date', 'eta', 'delivery eta', 'expected arrival'
  ],
  'shippingService': [
    'shipping service', 'shipping method', 'courier', 'carrier', 'service type',
    'delivery service', 'shipping company', 'delivery method', 'mail class'
  ],
  'shipmentType': [
    'shipment type', 'package type', 'parcel type', 'mail type', 'delivery type',
    'service level', 'service class'
  ],
  
  // Origin information
  'shipperName': [
    'shipper name', 'sender name', 'sender', 'from name', 'source', 'origin name',
    'shipped by', 'consignor', 'sender company', 'shipper company'
  ],
  'shipperAddress': [
    'shipper address', 'sender address', 'from address', 'origin address', 'return address',
    'sender location', 'shipper location', 'consignor address', 'ship from'
  ],
  'shipperCity': [
    'shipper city', 'sender city', 'origin city', 'from city', 'consignor city'
  ],
  'shipperState': [
    'shipper state', 'sender state', 'origin state', 'from state', 'consignor state',
    'shipper province', 'sender province'
  ],
  'shipperCountry': [
    'shipper country', 'sender country', 'origin country', 'from country', 'consignor country'
  ],
  'shipperPostalCode': [
    'shipper postal code', 'shipper zip', 'sender zip', 'origin zip', 'sender postal',
    'origin postal code', 'shipper zip code', 'from postal code', 'shipper post code'
  ],
  'shipperPhone': [
    'shipper phone', 'sender phone', 'origin phone', 'shipper contact', 'from phone',
    'sender telephone', 'sender contact number', 'shipper phone number'
  ],
  'shipperEmail': [
    'shipper email', 'sender email', 'origin email', 'shipper contact email', 'from email',
    'sender mail', 'shipper mail'
  ],
  
  // Destination information
  'recipientName': [
    'recipient name', 'receiver name', 'addressee', 'consignee', 'to name', 'destination name',
    'delivered to', 'receiver', 'recipient', 'customer name', 'client name'
  ],
  'recipientAddress': [
    'recipient address', 'receiver address', 'delivery address', 'to address', 'destination address',
    'receiving address', 'shipping address', 'consignee address', 'deliver to', 'ship to',
    'receiver guy house', 'receiver house', 'address', 'destination'
  ],
  'recipientCity': [
    'recipient city', 'receiver city', 'delivery city', 'to city', 'destination city', 'consignee city'
  ],
  'recipientState': [
    'recipient state', 'receiver state', 'delivery state', 'to state', 'destination state',
    'recipient province', 'receiver province', 'consignee state'
  ],
  'recipientCountry': [
    'recipient country', 'receiver country', 'delivery country', 'to country', 'destination country',
    'consignee country'
  ],
  'recipientPostalCode': [
    'recipient postal code', 'recipient zip', 'receiver zip', 'delivery zip', 'to zip',
    'destination postal code', 'recipient zip code', 'delivery postal code', 'consignee zip',
    'consignee postal code'
  ],
  'recipientPhone': [
    'recipient phone', 'receiver phone', 'delivery phone', 'consignee phone', 'to phone',
    'receiver telephone', 'recipient contact', 'receiver contact number'
  ],
  'recipientEmail': [
    'recipient email', 'receiver email', 'delivery email', 'consignee email', 'to email',
    'receiver mail', 'recipient mail', 'contact email'
  ],
  
  // Package information
  'weight': [
    'weight', 'package weight', 'parcel weight', 'item weight', 'gross weight',
    'total weight', 'shipping weight', 'actual weight', 'wt', 'kg', 'lb'
  ],
  'dimensions': [
    'dimensions', 'package dimensions', 'parcel dimensions', 'size', 'package size',
    'length x width x height', 'lwh', 'l x w x h', 'dim', 'cubic', 'volume'
  ],
  'packageContents': [
    'package contents', 'contents', 'items', 'goods', 'contained items', 'parcel contents',
    'shipment contents', 'merchandise', 'product', 'article', 'commodities', 'description'
  ],
  'declaredValue': [
    'declared value', 'value', 'item value', 'goods value', 'customs value',
    'merchandise value', 'insured value', 'invoice value', 'value for customs'
  ],
  
  // International shipping
  'customsInfo': [
    'customs info', 'customs information', 'customs details', 'customs declaration',
    'customs documentation', 'customs forms', 'customs paperwork'
  ],
  'hsTariffNumber': [
    'hs tariff number', 'hs code', 'harmonized system code', 'tariff code', 'commodity code',
    'customs code', 'harmonized tariff', 'hts code', 'import code'
  ],
  'eoriNumber': [
    'eori number', 'eori', 'economic operator registration', 'customs registration',
    'eu trader number', 'customs identification'
  ],
  
  // Payment and billing
  'shippingCost': [
    'shipping cost', 'postage', 'shipping fee', 'freight cost', 'delivery charge',
    'shipping charge', 'freight charge', 'postal fee', 'delivery fee', 'transportation cost'
  ],
  'paymentMethod': [
    'payment method', 'payment type', 'payment mode', 'paid by', 'charge type',
    'billing method', 'payment terms', 'paid via', 'payment'
  ],
  'accountNumber': [
    'account number', 'billing account', 'customer account', 'account id', 'account code',
    'client account', 'shipper account', 'billing reference'
  ]
};

// Gemini API configuration
const API_KEY = 'AIzaSyAraWPlckPfQpXrnbXdRy_iu1ctsjzGzjo';
const MODEL_NAME = 'gemini-1.5-pro';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent`;

/**
 * Service for standardizing logistics data fields
 */
export class DataStandardizationService {
  
  /**
   * Maps alternative field names to the standardized field names
   * This is useful for ensuring compatibility between different systems
   * @param fields - The fields to normalize
   * @returns A new object with normalized field names
   */
  normalizeFieldNames(fields: Record<string, string>): Record<string, string> {
    const normalizedFields: Record<string, string> = {};
    const fieldMappings: Record<string, string> = {
      // Package type variations
      'parceltype': 'packageType',
      'packagetype': 'packageType',
      'package_type': 'packageType',
      'parcel_type': 'packageType',
      'package type': 'packageType',
      'parcel type': 'packageType',
      'type': 'packageType',
      'package': 'packageType',
      
      // Weight variations
      'wt': 'weight',
      'gross_weight': 'weight',
      'grossweight': 'weight',
      'package_weight': 'weight',
      'shippingweight': 'weight',
      'parcelweight': 'weight',
      'package weight': 'weight',
      'gross weight': 'weight',
      'total weight': 'weight',
      
      // Dimensions variations
      'size': 'dimensions',
      'dimension': 'dimensions',
      'measurements': 'dimensions',
      'package_dimensions': 'dimensions',
      'parcel_dimensions': 'dimensions',
      'parceldimensions': 'dimensions',
      'packagedimensions': 'dimensions',
      'package dimensions': 'dimensions',
      'parcel dimensions': 'dimensions',
      'lwh': 'dimensions',
      
      // Package contents variations
      'contents': 'packageContents',
      'items': 'packageContents',
      'goods': 'packageContents',
      'description': 'packageContents',
      'package_contents': 'packageContents',
      'parcel_contents': 'packageContents',
      'item_description': 'packageContents',
      'product_description': 'packageContents',
      'itemdescription': 'packageContents',
      'package contents': 'packageContents',
      'parcel contents': 'packageContents',
      
      // Declared value variations
      'value': 'declaredValue',
      'customs_value': 'declaredValue',
      'goodsvalue': 'declaredValue',
      'item_value': 'declaredValue',
      'declared_value': 'declaredValue',
      'customsvalue': 'declaredValue',
      'itemvalue': 'declaredValue',
      'goods value': 'declaredValue',
      'customs value': 'declaredValue',
      'item value': 'declaredValue',
      'declared value': 'declaredValue',
      
      // Existing mappings
      'shipmentType': 'shipmentType',
      'shipment_type': 'shipmentType',
    };
    
    // Copy all existing fields and normalize known field names
    for (const [key, value] of Object.entries(fields)) {
      const lowerKey = key.toLowerCase();
      
      // Check if this field name should be normalized
      if (fieldMappings[lowerKey]) {
        normalizedFields[fieldMappings[lowerKey]] = value;
      } else {
        // Keep the original field name
        normalizedFields[key] = value;
      }
    }
    
    return normalizedFields;
  }
  
  /**
   * Standardizes raw field data into a structured format
   * @param rawData - The raw data to standardize (extracted from image or manual input)
   * @returns Standardized data with consistent field names
   */
  async standardizeData(rawData: Record<string, string> | string): Promise<Record<string, string>> {
    try {
      let standardizedData: Record<string, string>;
      
      // If rawData is a string, we need to extract fields first
      if (typeof rawData === 'string') {
        // For manual input, apply more aggressive format transformation
        standardizedData = await this.extractFieldsFromText(rawData, true);
      } else {
        // For structured input, use Gemini to standardize field names
        standardizedData = await this.standardizeFieldNamesWithLLM(rawData);
      }
      
      // Apply additional mapping to ensure required fields are properly named
      standardizedData = this.ensureRequiredFieldMapping(standardizedData, typeof rawData === 'string' ? rawData : '');
      
      // Add normalization step to handle field name variations
      standardizedData = this.normalizeFieldNames(standardizedData);
      
      return standardizedData;
    } catch (error) {
      console.error('Error in standardizing data:', error);
      // If LLM processing fails, return the original data
      return typeof rawData === 'string' ? {} : rawData;
    }
  }
  
  /**
   * Uses Gemini model to extract structured fields from raw text input
   * @param rawText - The raw text to extract fields from
   * @param isManualInput - Whether this is from manual input (applies more format transformation)
   * @returns Structured data with extracted fields
   */
  private async extractFieldsFromText(rawText: string, isManualInput: boolean = false): Promise<Record<string, string>> {
    try {
      const prompt = this.buildFieldExtractionPrompt(rawText, isManualInput);
      const response = await this.callGeminiAPI(prompt);
      
      return this.parseGeminiResponse(response) || {};
    } catch (error) {
      console.error('Error extracting fields from text:', error);
      return {};
    }
  }
  
  /**
   * Build a prompt for the Gemini model to extract fields from raw text
   */
  private buildFieldExtractionPrompt(rawText: string, isManualInput: boolean = false): string {
    // List standard field examples from our reference dictionary
    const standardFieldExamples = Object.entries(STANDARD_FIELD_EXAMPLES)
      .map(([key, aliases]) => `- "${key}": ${aliases.slice(0, 3).join(', ')}`)
      .join('\n');
    
    // Default prompt for OCR/structured content
    let prompt = `
You are a logistics data extraction and standardization specialist. Your task is to extract structured shipping information from text and convert it into a standardized format.

The text might contain various terms for the same concept. You need to understand shipping terminology and map variations to standard field names.
Examples of standard fields and their common variations:
${standardFieldExamples}

Guidelines:
1. Extract all information in the text that relates to shipping and logistics
2. Map the extracted information to appropriate standardized field names
3. Be precise - don't hallucinate or make up information not in the text
4. Maintain the original values, just standardize the field names
5. Be flexible with field naming - recognize variations like "shipping date" and map it to "shipmentDate"
6. For dates, preserve the original format
7. For addresses, keep the complete address as found
8. For unclear abbreviations, use standard field names but keep original values

Raw text:
${rawText}

Respond ONLY with a valid JSON object containing the extracted and standardized fields. Format your response as follows:
{
  "standardField1": "extracted value1",
  "standardField2": "extracted value2"
}
`;

    // Enhanced prompt for manual input that needs format transformation
    if (isManualInput) {
      prompt = `
You are a logistics data transformation specialist. Your task is to convert unstructured, partial, or non-standard shipping information into a complete standardized format.

The user has entered shipping information in a free-form way, possibly using different terminology, partial information, or mixed formats. Your job is to transform this input into our standard shipping data schema.

REQUIRED FIELD MAPPING - YOU MUST USE THESE EXACT FIELD NAMES:
- "trackingNumber" for any tracking number, AWB, waybill number
- "shipperName" for sender name, shipper, from name, origin name
- "shipperAddress" for sender address, from address, origin address, shipper location
- "recipientName" for receiver name, recipient, addressee, consignee, to name
- "recipientAddress" for receiver address, delivery address, destination address, to address

Examples of other standard shipping fields and their common variations:
${standardFieldExamples}

SPECIFIC INSTRUCTIONS FOR FORMAT TRANSFORMATION:
1. Identify ALL shipping-related information in the text, regardless of format or terminology
2. Convert the identified data into our standard field names listed above
3. Be thorough - extract ALL possible shipping data points, even if mentioned in unusual ways
4. Make sure to use EXACTLY the field names in the required mapping section above
5. For addresses, keep the complete address as a single value (don't split into components)
6. If there's a "Sender" field, map it to "shipperName" and extract any address into "shipperAddress"
7. If there's a "Receiver" field, map it to "recipientName" and extract any address into "recipientAddress"
8. DO NOT invent data that doesn't exist in the input
9. Ensure no required fields are missing if the information exists in the input

INPUT:
${rawText}

Respond ONLY with a valid JSON object containing the extracted and standardized fields. Format your response as follows:
{
  "trackingNumber": "...",
  "shipperName": "...",
  "shipperAddress": "...",
  "recipientName": "...",
  "recipientAddress": "...",
  "otherField1": "...",
  "otherField2": "..."
}
`;
    }
    
    return prompt;
  }
  
  /**
   * Standardizes field names using LLM instead of hardcoded mappings
   * @param data - The data with non-standard field names
   * @returns Data with standardized field names using LLM
   */
  private async standardizeFieldNamesWithLLM(data: Record<string, string>): Promise<Record<string, string>> {
    try {
      const dataString = JSON.stringify(data, null, 2);
      const prompt = `
You are a logistics data standardization specialist. I have a logistics dataset with non-standard field names that needs to be standardized.

Your task is to convert these field names to standard logistics terminology without changing their values.
For example:
- "shipping date" should be mapped to "shipmentDate"
- "receiver guy house" should be mapped to "recipientAddress"
- "AWB" or "consign#" should be mapped to "trackingNumber"
- "from" might be mapped to "shipperName" or "shipperAddress" depending on the value

Here are examples of standard fields and their common variations:
${Object.entries(STANDARD_FIELD_EXAMPLES)
  .map(([key, aliases]) => `- "${key}": ${aliases.slice(0, 3).join(', ')}`)
  .join('\n')}

Input data:
${dataString}

Guidelines:
1. Map each field to the most appropriate standard field name
2. Be flexible with field naming - recognize synonyms and variations
3. Only use values that exist in the input - don't invent new data
4. If a field doesn't map cleanly to any standard field, keep its original name
5. Keep the original values, just standardize the field names
6. Be particularly attentive to date fields - "shipping date" and "shipment date" refer to the same concept

Respond ONLY with a valid JSON object containing the standardized field names and original values.
`;

      const response = await this.callGeminiAPI(prompt);
      const standardized = this.parseGeminiResponse(response);
      return standardized || data;
    } catch (error) {
      console.error('Error standardizing field names with LLM:', error);
      return data;
    }
  }
  
  /**
   * Enhance standardized data by checking for correct data types and formats
   * @param data - The standardized data to enhance
   * @returns Enhanced data with corrected formats
   */
  async enhanceStandardizedData(data: Record<string, string>): Promise<Record<string, string>> {
    try {
      // Create a copy of the data to work with
      const enhancedData = { ...data };
      
      // Create a lowercase map for case-insensitive field lookup
      const lowercaseFieldMap: Record<string, string> = {};
      for (const [key, value] of Object.entries(enhancedData)) {
        lowercaseFieldMap[key.toLowerCase()] = key;
      }
      
      // Extract package type from fields if not already present
      if (!enhancedData.packageType && !enhancedData.parcelType) {
        // Look for it in other fields
        for (const [key, value] of Object.entries(enhancedData)) {
          if (key.toLowerCase().includes('type') && 
              (value.toLowerCase().includes('package') || 
               value.toLowerCase().includes('parcel') || 
               value.toLowerCase().includes('box') || 
               value.toLowerCase().includes('envelope'))) {
            enhancedData.packageType = value;
            break;
          }
        }
        
        // If still not found, use a default value
        if (!enhancedData.packageType) {
          enhancedData.packageType = 'Package'; // Default value
        }
      }
      
      // Ensure weight is present
      if (!enhancedData.weight) {
        const weightKey = lowercaseFieldMap['weight'] || 
                          lowercaseFieldMap['gross_weight'] || 
                          lowercaseFieldMap['grossweight'] || 
                          lowercaseFieldMap['package_weight'];
        
        if (weightKey) {
          enhancedData.weight = enhancedData[weightKey];
        } else {
          // Extract from descriptions or set default
          for (const value of Object.values(enhancedData)) {
            const weightMatch = value.match(/(\d+\.?\d*)\s*(kg|g|lbs?|oz|pounds|ounces)/i);
            if (weightMatch) {
              enhancedData.weight = weightMatch[0];
              break;
            }
          }
          
          // Default weight if not found
          if (!enhancedData.weight) {
            enhancedData.weight = '1 kg'; // Default value
          }
        }
      }
      
      // Ensure dimensions are present
      if (!enhancedData.dimensions) {
        const dimensionsKey = lowercaseFieldMap['dimensions'] || 
                              lowercaseFieldMap['size'] || 
                              lowercaseFieldMap['measurements'] ||
                              lowercaseFieldMap['package_dimensions'];
        
        if (dimensionsKey) {
          enhancedData.dimensions = enhancedData[dimensionsKey];
        } else {
          // Extract from descriptions or set default
          for (const value of Object.values(enhancedData)) {
            const dimMatch = value.match(/(\d+\.?\d*)\s*[x×]\s*(\d+\.?\d*)\s*[x×]\s*(\d+\.?\d*)/i);
            if (dimMatch) {
              enhancedData.dimensions = value;
              break;
            }
          }
          
          // Default dimensions if not found
          if (!enhancedData.dimensions) {
            enhancedData.dimensions = '30cm x 20cm x 10cm'; // Default value
          }
        }
      }
      
      // Ensure packageContents are present
      if (!enhancedData.packageContents) {
        const contentsKey = lowercaseFieldMap['packagecontents'] || 
                            lowercaseFieldMap['contents'] || 
                            lowercaseFieldMap['items'] ||
                            lowercaseFieldMap['description'] ||
                            lowercaseFieldMap['goods'];
        
        if (contentsKey) {
          enhancedData.packageContents = enhancedData[contentsKey];
        } else if (enhancedData.description) {
          enhancedData.packageContents = enhancedData.description;
        } else {
          // Default contents
          enhancedData.packageContents = 'Merchandise'; // Default value
        }
      }
      
      // Ensure declaredValue is present
      if (!enhancedData.declaredValue) {
        const valueKey = lowercaseFieldMap['declaredvalue'] || 
                         lowercaseFieldMap['value'] || 
                         lowercaseFieldMap['customsvalue'] ||
                         lowercaseFieldMap['goodsvalue'] ||
                         lowercaseFieldMap['itemvalue'];
        
        if (valueKey) {
          enhancedData.declaredValue = enhancedData[valueKey];
        } else {
          // Extract from descriptions or set default
          for (const value of Object.values(enhancedData)) {
            const valueMatch = value.match(/\$\s*(\d+\.?\d*)|(\d+\.?\d*)\s*(usd|eur|gbp|jpy)/i);
            if (valueMatch) {
              enhancedData.declaredValue = value;
              break;
            }
          }
          
          // Default value if not found
          if (!enhancedData.declaredValue) {
            enhancedData.declaredValue = '$100 USD'; // Default value
          }
        }
      }
      
      // Apply compliance-specific enhancements
      this.enhanceComplianceFields(enhancedData);
      
      // Use Gemini for further data enhancement if needed
      // This is disabled by default to avoid unnecessary API calls
      // Uncomment if you want more comprehensive enhancement
      // return await this.useGeminiForDataEnhancement(enhancedData);
      
      return enhancedData;
    } catch (error) {
      console.error('Error enhancing standardized data:', error);
      return data; // Return original data if enhancement fails
    }
  }
  
  /**
   * Ensure fields needed for compliance rules are properly set
   */
  private enhanceComplianceFields(fields: Record<string, string>): void {
    // Ensure package contents field is set for restricted item validation
    const contentFields = ['content', 'contents', 'items', 'goods', 'description', 'itemDescription'];
    if (!fields.packageContents) {
      for (const fieldName of contentFields) {
        if (fields[fieldName] && fields[fieldName].trim()) {
          fields.packageContents = fields[fieldName];
          break;
        }
      }
    }
    
    // Try to extract country information from addresses if not explicitly set
    if (!fields.recipientCountry && fields.recipientAddress) {
      const countryMatch = fields.recipientAddress.match(/([A-Za-z]+)$/);
      if (countryMatch && countryMatch[1]) {
        fields.recipientCountry = countryMatch[1].trim();
      }
    }
    
    if (!fields.shipperCountry && fields.shipperAddress) {
      const countryMatch = fields.shipperAddress.match(/([A-Za-z]+)$/);
      if (countryMatch && countryMatch[1]) {
        fields.shipperCountry = countryMatch[1].trim();
      }
    }
    
    // Try to extract country or place from fields that contain "Japan" or "Australia", etc.
    if (!fields.recipientCountry || !fields.shipperCountry) {
      const commonCountries = [
        'Japan', 'Australia', 'China', 'Canada', 'USA', 'United States', 
        'UK', 'United Kingdom', 'Germany', 'France', 'Italy', 'Spain', 
        'Brazil', 'Mexico', 'India', 'Russia', 'South Korea'
      ];
      
      for (const [key, value] of Object.entries(fields)) {
        if (value) {
          for (const country of commonCountries) {
            if (value.includes(country)) {
              if (key.toLowerCase().includes('recipient') || key.toLowerCase().includes('to') || 
                  key.toLowerCase().includes('destination')) {
                fields.recipientCountry = country;
              } else if (key.toLowerCase().includes('shipper') || key.toLowerCase().includes('from') || 
                         key.toLowerCase().includes('origin')) {
                fields.shipperCountry = country;
              }
            }
          }
        }
      }
    }
  }
  
  /**
   * Use Gemini to enhance sparse or poorly structured data
   */
  private async useGeminiForDataEnhancement(data: Record<string, string>): Promise<Record<string, string>> {
    try {
      const dataString = JSON.stringify(data, null, 2);
      
      // Check if we have the required fields
      const requiredFields = ['trackingNumber', 'shipperName', 'shipperAddress', 'recipientName', 'recipientAddress'];
      const complianceFields = ['packageContents', 'recipientCountry', 'shipperCountry'];
      
      const missingRequiredFields = requiredFields.filter(field => !data[field] || data[field].trim() === '');
      const missingComplianceFields = complianceFields.filter(field => !data[field] || data[field].trim() === '');
      
      const isPartialData = missingRequiredFields.length > 0 || missingComplianceFields.length > 0 || Object.keys(data).length < 8;
      
      // Base prompt template
      let prompt = `
You are a logistics data standardization specialist. I have a logistics dataset that needs to be enhanced and validated.

The goal is to improve the quality and consistency of the data without inventing new information.

Input data:
${dataString}

Your task:
1. Identify any inconsistencies or formatting issues in the data
2. Verify that field names are standardized properly
3. Don't change field values unless they have obvious formatting errors
4. If a field seems to contain multiple pieces of information, note this but don't split it
5. Identify any missing critical fields in shipping data (tracking number, addresses, dates)
6. Be especially attentive to date fields - make sure they are properly standardized

COMPLIANCE FIELDS TO ENSURE:
- "packageContents" - Ensure this is set with any package content information
- "recipientCountry" - Extract from address or other fields if possible
- "shipperCountry" - Extract from address or other fields if possible

These fields are critical for compliance rule validation to check for restricted items and destination restrictions.

Respond ONLY with a valid JSON object containing the enhanced field names and values.
`;

      // If it's missing required fields, use a more aggressive enhancement approach
      if (isPartialData) {
        prompt = `
You are a logistics data transformation specialist working with partial or incomplete shipping data.

I have a shipping dataset that needs to be transformed into our required standard format.
The data may be missing critical fields or use different terminology.

Input data:
${dataString}

REQUIRED FIELD MAPPING - ENSURE ALL THESE FIELDS EXIST WITH EXACT NAMES:
- "trackingNumber" for any tracking number, AWB, waybill number
- "shipperName" for sender name, shipper, from name, origin name
- "shipperAddress" for sender address, from address, origin address, shipper location
- "recipientName" for receiver name, recipient, addressee, consignee, to name
- "recipientAddress" for receiver address, delivery address, destination address, to address

COMPLIANCE CRITICAL FIELDS - ALSO ENSURE THESE EXIST:
- "packageContents" - Identify what's in the package (crucial for checking restricted items)
- "recipientCountry" - Country where package is being delivered (crucial for destination restrictions)
- "shipperCountry" - Country where package is being shipped from

Your task:
1. Make sure all field names match our exact standard field names (especially the required ones above)
2. If the data has key-value pairs with non-standard names, rename the keys to our standard names
3. Look for fields that contain the same information but with different names, and consolidate them
4. If a field contains "Japan", "Australia", or any other country name, extract it to the appropriate country field
5. If there's any reference to package contents, make sure it's in the packageContents field
6. DO NOT invent values for fields that aren't present in the input data
7. The field names must be EXACTLY as specified above (case sensitive, camelCase)

${missingRequiredFields.length > 0 ? `Pay special attention to these missing required fields: ${missingRequiredFields.join(', ')}` : ''}
${missingComplianceFields.length > 0 ? `Also find these missing compliance fields if possible: ${missingComplianceFields.join(', ')}` : ''}

Respond ONLY with a valid JSON object containing the transformed data with standard field names.
`;
      }

      const response = await this.callGeminiAPI(prompt);
      const enhanced = this.parseGeminiResponse(response);
      return enhanced || data;
    } catch (error) {
      console.error('Error enhancing data with Gemini:', error);
      return data;
    }
  }
  
  /**
   * Call the Gemini API for data standardization
   */
  private async callGeminiAPI(prompt: string): Promise<any> {
    try {
      const response = await axios.post(
        API_URL,
        {
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            temperature: 0.1,
            topP: 0.95,
            topK: 40,
            maxOutputTokens: 2048,
          },
          safetySettings: [
            {
              category: 'HARM_CATEGORY_HARASSMENT',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE'
            },
            {
              category: 'HARM_CATEGORY_HATE_SPEECH',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE'
            },
            {
              category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE'
            },
            {
              category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE'
            }
          ]
        },
        {
          params: {
            key: API_KEY
          },
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      const content = response.data.candidates[0].content.parts[0].text.trim();
      return content;
    } catch (error: any) {
      console.error('Error calling Gemini API:', error);
      throw new Error(`Failed to call Gemini API: ${error.message || 'Unknown error'}`);
    }
  }
  
  /**
   * Parse the Gemini API response to extract the JSON data
   */
  private parseGeminiResponse(response: string): Record<string, string> | null {
    try {
      // Extract JSON from the response, handling cases where there's text before or after the JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('No JSON object found in response:', response);
        return null;
      }
      
      const jsonStr = jsonMatch[0];
      const parsed = JSON.parse(jsonStr) as Record<string, any>;
      
      // Convert to a Record<string, string> by processing each value
      const result: Record<string, string> = {};
      
      Object.entries(parsed).forEach(([key, value]) => {
        // Handle different value types
        if (typeof value === 'string') {
          // Keep strings as is
          result[key] = value;
        } else if (value === null || value === undefined) {
          // Skip null or undefined values
          return;
        } else if (typeof value === 'number' || typeof value === 'boolean') {
          // Convert numbers and booleans to strings
          result[key] = String(value);
        } else if (Array.isArray(value)) {
          // Join arrays into a comma-separated string
          result[key] = value.join(', ');
        } else if (typeof value === 'object') {
          // For objects, stringify them
          result[key] = JSON.stringify(value);
        }
      });
      
      return result;
    } catch (error) {
      console.error('Error parsing Gemini response:', error, 'Response:', response);
      return null;
    }
  }
  
  /**
   * Standardize date format (e.g., "2023-05-15" or "05/15/2023")
   */
  private standardizeDate(dateStr: string): string {
    if (!dateStr) return dateStr;
    
    // Keep the original format but clean it up
    return dateStr.trim()
      .replace(/\s+/g, ' ')
      .replace(/(\d+)(st|nd|rd|th)/, '$1'); // Remove ordinals like 1st, 2nd, etc.
  }
  
  /**
   * Standardize weight format (e.g., "5 kg" or "10 lb")
   */
  private standardizeWeight(weightStr: string): string {
    if (!weightStr) return weightStr;
    
    // Extract numeric value and unit
    const match = weightStr.match(/(\d+(\.\d+)?)\s*(kg|kilograms?|pounds?|lbs?)/i);
    if (match) {
      const value = parseFloat(match[1]);
      const unit = match[3].toLowerCase();
      
      // Convert to standard format
      if (unit.startsWith('kg') || unit.startsWith('kilo')) {
        return `${value} kg`;
      } else if (unit.startsWith('lb') || unit.startsWith('pound')) {
        return `${value} lb`;
      }
    }
    
    return weightStr;
  }
  
  /**
   * Standardize address format
   */
  private standardizeAddress(addressStr: string): string {
    // Simple clean-up for now
    return addressStr
      .replace(/\s+/g, ' ')
      .replace(/\s+,/g, ',')
      .trim();
  }
  
  /**
   * Ensures that required fields are correctly mapped even if Gemini misses them
   */
  private ensureRequiredFieldMapping(data: Record<string, string>, rawText: string = ''): Record<string, string> {
    const result = { ...data };
    
    // Required field mappings with alternative keys
    const fieldMappings = [
      { 
        targetKey: 'trackingNumber', 
        alternativeKeys: ['tracking', 'trackingnumber', 'tracking_number', 'trackingno', 'tracking number', 'tracking#', 'awb'] 
      },
      { 
        targetKey: 'shipperName', 
        alternativeKeys: ['shipper', 'sender', 'sendername', 'sender_name', 'from', 'fromname', 'sender name', 'shipper name'] 
      },
      { 
        targetKey: 'shipperAddress', 
        alternativeKeys: ['shipperaddress', 'shipper_address', 'senderaddress', 'sender_address', 'fromaddress', 'shipper address', 'sender address'] 
      },
      { 
        targetKey: 'recipientName', 
        alternativeKeys: ['recipient', 'receiver', 'receivername', 'receiver_name', 'to', 'toname', 'recipient name', 'receiver name', 'consignee'] 
      },
      { 
        targetKey: 'recipientAddress', 
        alternativeKeys: ['recipientaddress', 'recipient_address', 'receiveraddress', 'receiver_address', 'toaddress', 'recipient address', 'receiver address', 'delivery address'] 
      }
    ];
    
    // Check each required field
    for (const mapping of fieldMappings) {
      // Skip if the target field already exists
      if (result[mapping.targetKey] && result[mapping.targetKey].trim() !== '') {
        continue;
      }
      
      // Check alternative keys
      for (const altKey of mapping.alternativeKeys) {
        // Check direct match (case insensitive)
        const matchingKey = Object.keys(result).find(
          key => key.toLowerCase() === altKey.toLowerCase() && 
          result[key] && 
          result[key].trim() !== ''
        );
        
        if (matchingKey) {
          result[mapping.targetKey] = result[matchingKey];
          // Don't delete the original key, just duplicate the value
          break;
        }
      }
    }
    
    // Special case: if we have a raw text and we're still missing fields, try basic extraction
    if (rawText && (
      !result.shipperName || !result.shipperAddress || 
      !result.recipientName || !result.recipientAddress || 
      !result.trackingNumber
    )) {
      // Look for sender/receiver patterns in the raw text
      const senderMatch = rawText.match(/sender\s*:?\s*([^,\n]+)(?:[,\n]([^\n]+))?/i);
      const receiverMatch = rawText.match(/receiver\s*:?\s*([^,\n]+)(?:[,\n]([^\n]+))?/i);
      const trackingMatch = rawText.match(/tracking\s*(?:number|#)\s*:?\s*([^\s,\n]+)/i);
      
      if (senderMatch && (!result.shipperName || !result.shipperAddress)) {
        if (!result.shipperName && senderMatch[1]) {
          result.shipperName = senderMatch[1].trim();
        }
        if (!result.shipperAddress && senderMatch[2]) {
          result.shipperAddress = senderMatch[2].trim();
        }
      }
      
      if (receiverMatch && (!result.recipientName || !result.recipientAddress)) {
        if (!result.recipientName && receiverMatch[1]) {
          result.recipientName = receiverMatch[1].trim();
        }
        if (!result.recipientAddress && receiverMatch[2]) {
          result.recipientAddress = receiverMatch[2].trim();
        }
      }
      
      if (trackingMatch && !result.trackingNumber && trackingMatch[1]) {
        result.trackingNumber = trackingMatch[1].trim();
      }
    }
    
    return result;
  }
}

// Export singleton instance
export const dataStandardizationService = new DataStandardizationService(); 