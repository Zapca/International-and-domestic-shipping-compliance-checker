import { v4 as uuidv4 } from 'uuid';
import { ComplianceResult } from './types';
import { ruleRepository } from './database/ruleRepository';
import { ruleLoader } from './database/ruleLoader';
import { 
  ComplianceRule, 
  ValidationConstraint,
  FieldType 
} from './database/models';
import axios from 'axios';
import { dataStandardizationService } from './dataStandardizationService';

// Interface for the input data that can come from various sources
export interface RawInputData {
  source: 'vision' | 'csv' | 'manual';
  content: string | Record<string, string>;
  metadata?: {
    confidence?: number;
    filename?: string;
    timestamp?: string;
    userId?: string;
  };
}

// Standard format for fields after processing
export interface FormattedData {
  id: string;
  fields: Record<string, string>;
  rawText?: string;
  processingMetadata: {
    confidence: number;
    source: string;
    timestamp: string;
    warnings: string[];
  };
}

// Gemini API configuration for text processing
const API_KEY = 'your_api_key_here'; // Replace with environment variable in production
const MODEL_NAME = 'gemini-2.0-flash-thinking-exp-01-21';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent`;

/**
 * Database-enabled version of the format converter
 * Uses rules from the rules database and Gemini LLM for formatting
 */
export class FormatConverterDb {
  private rules: ComplianceRule[] = [];
  private rulesByFieldKey: Record<string, ComplianceRule> = {};
  private constraints: Record<string, ValidationConstraint[]> = {};
  private initialized = false;

  /**
   * Initialize the converter by loading rules from the database
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      // Make sure the rules database is initialized
      await ruleLoader.initializeRules();
      
      // Get active rules from the database
      this.rules = await ruleRepository.getActiveRules();
      
      // Index rules by field key for faster access
      this.rulesByFieldKey = {};
      for (const rule of this.rules) {
        this.rulesByFieldKey[rule.fieldKey] = rule;
        
        // Load constraints for this rule
        this.constraints[rule.id] = await ruleRepository.getConstraintsByRuleId(rule.id);
      }
      
      this.initialized = true;
      console.log(`Initialized format converter with ${this.rules.length} rules`);
    } catch (error) {
      console.error('Failed to initialize format converter:', error);
      throw error;
    }
  }

  /**
   * Get an active rule by field key
   */
  async getRuleByFieldKey(fieldKey: string): Promise<ComplianceRule | undefined> {
    await this.ensureInitialized();
    return this.rulesByFieldKey[fieldKey];
  }

  /**
   * Ensure we have rules for common fields by creating temporary rules if needed
   */
  private ensureCommonFieldRules(): void {
    // Common logistics fields that should always have rules
    const commonFields = [
      // Core shipping fields
      { 
        fieldKey: 'trackingNumber', 
        displayName: 'Tracking Number',
        category: 'shipping',
        pattern: '^[A-Z0-9]{8,}$'
      },
      { 
        fieldKey: 'orderNumber', 
        displayName: 'Order Number',
        category: 'shipping',
        pattern: '^[A-Z0-9-]{5,}$'
      },
      { 
        fieldKey: 'shipDate', 
        displayName: 'Ship Date',
        category: 'shipping',
        pattern: '^\\d{4}-\\d{2}-\\d{2}$'
      },
      // Address fields
      { 
        fieldKey: 'shipperName', 
        displayName: 'Shipper Name',
        category: 'address',
        pattern: '^[A-Za-z\\s\\-\\\'\\.]{2,}$'
      },
      { 
        fieldKey: 'shipperAddress', 
        displayName: 'Shipper Address',
        category: 'address',
        pattern: '^.{5,}$'
      },
      { 
        fieldKey: 'shipperCity', 
        displayName: 'Shipper City',
        category: 'address',
        pattern: '^[A-Za-z\\s\\-\\.]{2,}$'
      },
      { 
        fieldKey: 'shipperCountry', 
        displayName: 'Shipper Country',
        category: 'address',
        pattern: '^([A-Z]{2}|[A-Za-z\\s\\-\\.]{3,})$'
      },
      { 
        fieldKey: 'recipientName', 
        displayName: 'Recipient Name',
        category: 'address',
        pattern: '^[A-Za-z\\s\\-\\\'\\.]{2,}$'
      },
      { 
        fieldKey: 'recipientAddress', 
        displayName: 'Recipient Address',
        category: 'address',
        pattern: '^.{5,}$'
      },
      { 
        fieldKey: 'recipientCity', 
        displayName: 'Recipient City',
        category: 'address',
        pattern: '^[A-Za-z\\s\\-\\.]{2,}$'
      },
      { 
        fieldKey: 'recipientCountry', 
        displayName: 'Recipient Country',
        category: 'address',
        pattern: '^([A-Z]{2}|[A-Za-z\\s\\-\\.]{3,})$'
      },
      // Package fields
      { 
        fieldKey: 'weight', 
        displayName: 'Weight',
        category: 'package',
        pattern: '^\\d+(\\.\\d+)?\\s*(kg|g|lb|lbs|oz)?$'
      },
      { 
        fieldKey: 'weightUnit', 
        displayName: 'Weight Unit',
        category: 'package',
        pattern: '^(kg|g|lb|lbs|oz)$'
      },
      { 
        fieldKey: 'dimensions', 
        displayName: 'Dimensions',
        category: 'package',
        pattern: '^\\d+(\\.\\d+)?\\s*x\\s*\\d+(\\.\\d+)?\\s*x\\s*\\d+(\\.\\d+)?\\s*(cm|mm|m|in|ft)?$'
      },
      { 
        fieldKey: 'packageType', 
        displayName: 'Package Type',
        category: 'package',
        pattern: '^(box|envelope|tube|pallet|other)$'
      },
      { 
        fieldKey: 'packageContents', 
        displayName: 'Package Contents',
        category: 'package',
        pattern: '^.{3,}$'
      },
      // Service fields
      { 
        fieldKey: 'shippingService', 
        displayName: 'Shipping Service',
        category: 'shipping',
        pattern: '^.{3,}$'
      },
      { 
        fieldKey: 'shipmentDate', 
        displayName: 'Shipment Date',
        category: 'shipping',
        pattern: '^\\d{4}-\\d{2}-\\d{2}$'
      },
      { 
        fieldKey: 'deliveryDate', 
        displayName: 'Delivery Date',
        category: 'shipping',
        pattern: '^\\d{4}-\\d{2}-\\d{2}$'
      },
      { 
        fieldKey: 'shipmentType', 
        displayName: 'Shipment Type',
        category: 'shipping',
        pattern: '^[A-Za-z\\s-]{3,}$'
      },
      // Customs fields
      { 
        fieldKey: 'declaredValue', 
        displayName: 'Declared Value',
        category: 'customs',
        pattern: '^\\d+(\\.\\d{1,2})?$'
      },
      { 
        fieldKey: 'declaredValueCurrency', 
        displayName: 'Declared Value Currency',
        category: 'customs',
        pattern: '^[A-Z]{3}$'
      },
      { 
        fieldKey: 'hsTariffNumber', 
        displayName: 'HS Tariff Number',
        category: 'customs',
        pattern: '^\\d{6,10}$'
      },
      // Account fields
      { 
        fieldKey: 'accountNumber', 
        displayName: 'Account Number',
        category: 'shipping',
        pattern: '^[A-Z0-9-]{4,}$'
      }
    ];
    
    // Check each common field and add a temporary rule if it's missing
    for (const field of commonFields) {
      if (!this.rulesByFieldKey[field.fieldKey]) {
        console.log(`Creating temporary rule for missing field: ${field.fieldKey}`);
        
        // Create a unique ID for this temporary rule
        const tempId = `temp-${field.fieldKey}-${Date.now()}`;
        
        // Create a temporary rule
        const tempRule = {
          id: tempId,
          categoryId: field.category,
          fieldKey: field.fieldKey,
          displayName: field.displayName,
          description: `Temporary validation rule for ${field.displayName}`,
          fieldType: this.determineFieldType(field.fieldKey),
          isRequired: false,
          validationPattern: field.pattern,
          validationMessage: `${field.displayName} format validation`,
          exampleValue: '',
          isActive: true,
          priority: 1,
          metadata: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        } as ComplianceRule;
        
        // Add to our in-memory rules collection
        this.rules.push(tempRule);
        this.rulesByFieldKey[field.fieldKey] = tempRule;
        this.constraints[tempId] = [];
      }
    }
  }

  /**
   * Ensure the format converter is initialized before use
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
    // Always ensure we have rules for common fields
    this.ensureCommonFieldRules();
  }

  /**
   * Use Gemini LLM to transform unstructured text to structured data
   */
  async transformTextWithGemini(text: string): Promise<Record<string, string>> {
    try {
      // Create the list of field specs for the prompt
      const fieldSpecList = this.rules.map(rule => 
        `- ${rule.fieldKey}: ${rule.description || rule.displayName}`
      ).join('\n');
      
      // Prepare the request body for Gemini API
      const requestBody = {
        contents: [
          {
            parts: [
              { 
                text: `
                Extract structured information from the following logistics document text.
                Return ONLY a JSON object with the following fields where available:
                
                ${fieldSpecList}
                
                Text to analyze:
                """
                ${text}
                """
                
                Respond ONLY with the JSON object containing extracted fields. Do not include explanations.
                `
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.1,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 1024
        }
      };

      // Make the API request
      const response = await axios.post(
        API_URL, 
        requestBody, 
        { params: { key: API_KEY } }
      );

      // Extract JSON from response
      const generatedText = response.data.candidates[0].content.parts[0].text || '';
      const jsonMatch = generatedText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/) || 
                        generatedText.match(/\{[\s\S]*?\}/);
      
      if (jsonMatch && jsonMatch[1]) {
        return JSON.parse(jsonMatch[1]);
      }
      
      // Try parsing the entire text as JSON
      try {
        return JSON.parse(generatedText);
      } catch (e) {
        console.warn('Failed to parse Gemini response as JSON, falling back to regex extraction');
        return this.extractStructuredData(text);
      }
    } catch (error) {
      console.error('Error transforming text with Gemini:', error);
      // Fallback to regex extraction
      return this.extractStructuredData(text);
    }
  }

  /**
   * Extract structured data from text, handling multiple formats
   */
  async extractStructuredData(text: string): Promise<Record<string, string>> {
    await this.ensureInitialized();
    const result: Record<string, string> = {};
    
    // Try to parse as JSON first
    try {
      // Check if the text looks like a JSON object
      if ((text.trim().startsWith('{') && text.trim().endsWith('}')) ||
          (text.trim().startsWith('[') && text.trim().endsWith(']'))) {
        
        const parsedData = JSON.parse(text);
        
        // Handle array of objects (take the first one)
        if (Array.isArray(parsedData) && parsedData.length > 0 && typeof parsedData[0] === 'object') {
          Object.entries(parsedData[0]).forEach(([key, value]) => {
            // Convert key to camelCase if needed
            const normalizedKey = this.standardizeFieldKey(key);
            result[normalizedKey] = typeof value === 'string' ? value : String(value);
          });
          
          // If we parsed data successfully, return it
          if (Object.keys(result).length > 0) {
            // Apply field mapping and data extraction before returning
            this.normalizeFieldNames(result);
            this.extractNameAndAddressComponents(result);
            return result;
          }
        } 
        // Handle regular object
        else if (!Array.isArray(parsedData) && typeof parsedData === 'object') {
          Object.entries(parsedData).forEach(([key, value]) => {
            // Convert key to camelCase if needed
            const normalizedKey = this.standardizeFieldKey(key);
            result[normalizedKey] = typeof value === 'string' ? value : String(value);
          });
          
          // If we parsed data successfully, return it
          if (Object.keys(result).length > 0) {
            // Apply field mapping and data extraction before returning
            this.normalizeFieldNames(result);
            this.extractNameAndAddressComponents(result);
            return result;
          }
        }
      }
    } catch (error) {
      // Not valid JSON, continue with other approaches
      console.log("Not valid JSON, trying other approaches:", error);
    }
    
    // Check for address blocks first (they might span multiple lines)
    this.extractAddressBlocks(text, result);
    
    // Try to handle key-value pair formats (like "key: value" on each line)
    const keyValueLines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
    let foundKeyValuePairs = false;
    
    for (const line of keyValueLines) {
      // Look for patterns like "key: value", "key - value", "key = value"
      const keyValueMatch = line.match(/^([^:=\-]+)[:=\-]\s*(.+)$/);
      
      if (keyValueMatch) {
        foundKeyValuePairs = true;
        const key = keyValueMatch[1].trim();
        const value = keyValueMatch[2].trim();
        
        // Standardize the key to ensure consistent format
        const normalizedKey = this.standardizeFieldKey(key);
        
        if (normalizedKey && value) {
          result[normalizedKey] = value;
        }
      }
    }
    
    // If we didn't find any key-value pairs, try to handle unstructured text with regex patterns
    if (!foundKeyValuePairs || Object.keys(result).length === 0) {
      this.extractStructuredDataWithRegex(text, result);
    }
    
    // Extract name and address components when mixed
    this.extractNameAndAddressComponents(result);
    
    // Look for any obvious field values that might not be labeled properly
    this.extractUnlabeledFields(text, result);
    
    // Normalize all field names to standard format
    this.normalizeFieldNames(result);
    
    return result;
  }
  
  /**
   * Extract structured data using regex patterns for common fields
   */
  private extractStructuredDataWithRegex(text: string, result: Record<string, string>): void {
    // Common field patterns to extract
    const patterns: Array<{ fieldKey: string, pattern: RegExp }> = [
      // Tracking number patterns
      { fieldKey: 'trackingNumber', pattern: /\b(?:tracking|tracking\s*number|track|track\s*no|track\s*\#)[\s:#]*([A-Z0-9]{8,})\b/i },
      { fieldKey: 'trackingNumber', pattern: /\b([A-Z0-9]{9,20})\b/i }, // Generic tracking number pattern
      
      // Order number patterns
      { fieldKey: 'orderNumber', pattern: /\b(?:order|order\s*number|order\s*\#|order\s*no)[\s:#]*([A-Z0-9-]{5,})\b/i },
      
      // Date patterns
      { fieldKey: 'shipDate', pattern: /\b(?:ship|ship\s*date|sent|sent\s*date|date)[\s:]*(\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{1,2}-\d{1,2}|[A-Za-z]+\s+\d{1,2},?\s+\d{4})\b/i },
      
      // Weight patterns
      { fieldKey: 'weight', pattern: /\b(?:weight|wt)[\s:]*(\d+(?:\.\d+)?\s*(?:kg|g|lbs?|oz))\b/i },
      
      // Dimensions patterns
      { fieldKey: 'dimensions', pattern: /\b(?:dimensions?|dims?|size)[\s:]*(\d+(?:\.\d+)?\s*x\s*\d+(?:\.\d+)?\s*x\s*\d+(?:\.\d+)?\s*(?:cm|mm|m|in|ft)?)\b/i },
      
      // Shipper patterns
      { fieldKey: 'shipperName', pattern: /\b(?:shipper|sender|from|return\s*to)[\s:]+([A-Za-z0-9\s&'.,-]{3,}?)(?:,|\n|$)/i },
      
      // Recipient patterns
      { fieldKey: 'recipientName', pattern: /\b(?:recipient|to|deliver\s*to|consignee|receiver)[\s:]+([A-Za-z0-9\s&'.,-]{3,}?)(?:,|\n|$)/i },
      
      // Address patterns
      { fieldKey: 'shipperAddress', pattern: /\b(?:shipper\s*address|sender\s*address|from\s*address|return\s*address)[\s:]+([^,\n]+(?:,\s*[^,\n]+){1,})/i },
      { fieldKey: 'recipientAddress', pattern: /\b(?:recipient\s*address|to\s*address|delivery\s*address|ship\s*to\s*address|destination\s*address)[\s:]+([^,\n]+(?:,\s*[^,\n]+){1,})/i },
      
      // Package content patterns
      { fieldKey: 'packageContents', pattern: /\b(?:contents?|items?|goods|merchandise|products?|cargo|description|details)[\s:]+([^,\n]+(?:,\s*[^,\n]+)*)/i },
      
      // Service/carrier patterns
      { fieldKey: 'shippingCarrier', pattern: /\b(?:carrier|shipping\s*carrier|shipping\s*company)[\s:]+([A-Za-z0-9\s&'.,-]{2,}?)(?:,|\n|$)/i },
      { fieldKey: 'shippingService', pattern: /\b(?:service|shipping\s*service|shipping\s*method|delivery\s*method|service\s*type)[\s:]+([A-Za-z0-9\s&'.,-]{2,}?)(?:,|\n|$)/i }
    ];
    
    // Apply each pattern
    for (const { fieldKey, pattern } of patterns) {
      const match = text.match(pattern);
      if (match && match[1] && match[1].trim()) {
        if (!result[fieldKey]) { // Only set if not already present
          result[fieldKey] = match[1].trim();
        }
      }
    }
  }
  
  /**
   * Extract address blocks that might appear as a section rather than a labeled field
   */
  private extractAddressBlocks(text: string, result: Record<string, string>): void {
    // Extract recipient block (commonly appears after "To:" or "Ship To:")
    const recipientBlockMatch = text.match(/(?:To|Ship\s+To|Deliver\s+To):\s*\n((?:.+\n){2,6})/i);
    if (recipientBlockMatch && recipientBlockMatch[1]) {
      const recipientBlock = recipientBlockMatch[1].trim();
      const lines = recipientBlock.split(/\n/).map(line => line.trim()).filter(line => line);
      
      if (lines.length > 0 && !result.recipientName) {
        // First line is usually the name
        result.recipientName = lines[0];
      }
      
      if (lines.length > 1 && !result.recipientAddress) {
        // Remaining lines typically form the address
        result.recipientAddress = lines.slice(1).join(', ');
      }
    }
    
    // Extract shipper block (commonly appears after "From:" or "Ship From:")
    const shipperBlockMatch = text.match(/(?:From|Ship\s+From|Return\s+To):\s*\n((?:.+\n){2,6})/i);
    if (shipperBlockMatch && shipperBlockMatch[1]) {
      const shipperBlock = shipperBlockMatch[1].trim();
      const lines = shipperBlock.split(/\n/).map(line => line.trim()).filter(line => line);
      
      if (lines.length > 0 && !result.shipperName) {
        // First line is usually the name
        result.shipperName = lines[0];
      }
      
      if (lines.length > 1 && !result.shipperAddress) {
        // Remaining lines typically form the address
        result.shipperAddress = lines.slice(1).join(', ');
      }
    }
  }
  
  /**
   * Normalize field names to a standard format
   * This converts various field name formats (sender, from, etc.) to the standard field names
   */
  private normalizeFieldNames(fields: Record<string, string>): void {
    // Field name mappings - map various input field names to standardized field names
    const fieldMappings: Record<string, string> = {
      // Shipper/Sender mappings
      'sender': 'shipperName',
      'senderName': 'shipperName',
      'from': 'shipperName',
      'fromName': 'shipperName',
      'returnTo': 'shipperName',
      'returnToName': 'shipperName',
      'senderAddress': 'shipperAddress',
      'fromAddress': 'shipperAddress',
      'returnAddress': 'shipperAddress',
      'returnToAddress': 'shipperAddress',
      'shipFrom': 'shipperAddress',
      'shipFromAddress': 'shipperAddress',
      'originAddress': 'shipperAddress',
      'senderCountry': 'shipperCountry',
      'fromCountry': 'shipperCountry',
      'originCountry': 'shipperCountry',
      
      // Recipient mappings
      'to': 'recipientName',
      'toName': 'recipientName',
      'receiver': 'recipientName',
      'receiverName': 'recipientName',
      'consignee': 'recipientName',
      'consigneeName': 'recipientName',
      'deliverTo': 'recipientName',
      'shipTo': 'recipientName',
      'toAddress': 'recipientAddress',
      'receiverAddress': 'recipientAddress',
      'consigneeAddress': 'recipientAddress',
      'deliveryAddress': 'recipientAddress',
      'shipToAddress': 'recipientAddress',
      'destinationAddress': 'recipientAddress',
      'deliveryLocation': 'recipientAddress',
      'toCountry': 'recipientCountry',
      'deliveryCountry': 'recipientCountry',
      'destinationCountry': 'recipientCountry',
      
      // Package/shipment mappings
      'contents': 'packageContents',
      'shipmentContents': 'packageContents',
      'goodsDescription': 'packageContents',
      'itemDescription': 'packageContents',
      'items': 'packageContents',
      'goods': 'packageContents',
      'merchandise': 'packageContents',
      'commodity': 'packageContents',
      'product': 'packageContents',
      'products': 'packageContents',
      'cargo': 'packageContents',
      
      // Tracking/reference mappings
      'trackingNo': 'trackingNumber',
      'trackNo': 'trackingNumber',
      'tracking': 'trackingNumber',
      'track': 'trackingNumber',
      'referenceNumber': 'referenceNo',
      'reference': 'referenceNo',
      'ref': 'referenceNo',
      'orderNo': 'orderNumber',
      
      // Shipping details mappings
      'carrier': 'shippingCarrier',
      'shippingCompany': 'shippingCarrier',
      'shippingMethod': 'shippingService',
      'service': 'shippingService',
      'serviceType': 'shippingService',
      'shippingType': 'shippingService',
      'shipmentType': 'parcelType',
      'parcel': 'parcelType',
      'shippingWeight': 'weight',
      'grossWeight': 'weight',
      'netWeight': 'weight',
      'parcelWeight': 'weight',
      'parcelDimensions': 'dimensions',
      'packageDimensions': 'dimensions',
      'size': 'dimensions',
      'measurements': 'dimensions'
    };
    
    // Copy fields to avoid modification during iteration
    const originalKeys = Object.keys(fields);
    
    // Apply field name mappings
    for (const key of originalKeys) {
      const lowerKey = key.toLowerCase();
      
      // If a mapping exists for this field name
      if (fieldMappings[key] || fieldMappings[lowerKey]) {
        const standardKey = fieldMappings[key] || fieldMappings[lowerKey];
        
        // Only map if the standard field doesn't already exist
        if (!fields[standardKey] && fields[key]) {
          fields[standardKey] = fields[key];
          
          // Remove the original field if it's different from the standard field
          if (key !== standardKey) {
            delete fields[key];
          }
        }
      }
    }
  }
  
  /**
   * Extract name and address components when they're combined in a single field
   */
  private extractNameAndAddressComponents(fields: Record<string, string>): void {
    // Handle combined sender information (extract name and address)
    if (fields.shipperName && !fields.shipperAddress) {
      const parts = this.extractNameAndAddressParts(fields.shipperName);
      if (parts.name && parts.address) {
        fields.shipperName = parts.name;
        fields.shipperAddress = parts.address;
      }
    }
    
    // Handle combined recipient information (extract name and address)
    if (fields.recipientName && !fields.recipientAddress) {
      const parts = this.extractNameAndAddressParts(fields.recipientName);
      if (parts.name && parts.address) {
        fields.recipientName = parts.name;
        fields.recipientAddress = parts.address;
      }
    }
    
    // If we have sender or recipient fields without shipper/recipient fields, map them
    if (fields.sender && !fields.shipperName) {
      const parts = this.extractNameAndAddressParts(fields.sender);
      if (parts.name) {
        fields.shipperName = parts.name;
        if (parts.address) {
          fields.shipperAddress = parts.address;
        }
      } else {
        fields.shipperName = fields.sender;
      }
      delete fields.sender;
    }
    
    if (fields.recipient && !fields.recipientName) {
      const parts = this.extractNameAndAddressParts(fields.recipient);
      if (parts.name) {
        fields.recipientName = parts.name;
        if (parts.address) {
          fields.recipientAddress = parts.address;
        }
      } else {
        fields.recipientName = fields.recipient;
      }
      delete fields.recipient;
    }
  }
  
  /**
   * Extract name and address parts from a combined string
   * This handles formats like "John Doe, 123 Main St, City, State ZIP"
   */
  private extractNameAndAddressParts(combined: string): { name: string, address: string | null } {
    // Check if the string contains commas, which typically separate name from address
    if (combined.includes(',')) {
      const parts = combined.split(',').map(part => part.trim());
      
      // Simple case: name followed by address components
      if (parts.length >= 2) {
        // Check if first part is likely a name (no numbers)
        if (!/\d/.test(parts[0])) {
          return {
            name: parts[0],
            address: parts.slice(1).join(', ')
          };
        }
      }
    }
    
    // Check for common address patterns (street number, etc.)
    const addressMatch = combined.match(/(.+?)(\d+\s+[A-Za-z\s]+(?:street|st|avenue|ave|road|rd|boulevard|blvd|lane|ln|drive|dr|court|ct|plaza|pza|square|sq|highway|hwy|parkway|pkwy))/i);
    
    if (addressMatch) {
      return {
        name: addressMatch[1].trim(),
        address: addressMatch[2].trim() + (combined.substring(addressMatch[0].length) || '')
      };
    }
    
    // Check for name followed by newline and address
    const newlineMatch = combined.match(/(.+?)\n([\s\S]+)/);
    if (newlineMatch) {
      return {
        name: newlineMatch[1].trim(),
        address: newlineMatch[2].trim().replace(/\n/g, ', ')
      };
    }
    
    // If we can't clearly separate, return just the name
    return {
      name: combined,
      address: null
    };
  }

  /**
   * Extract fields from text that may not be properly labeled
   */
  private extractUnlabeledFields(text: string, result: Record<string, string>): void {
    // Look for tracking numbers not already found
    if (!result.trackingNumber) {
      const trackingMatch = text.match(/\b([A-Z0-9]{10,20})\b/);
      if (trackingMatch) {
        result.trackingNumber = trackingMatch[1];
      }
    }
    
    // Look for dates not already found
    if (!result.shipDate) {
      const dateMatch = text.match(/\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\b/);
      if (dateMatch) {
        result.shipDate = dateMatch[1];
      }
    }
    
    // Look for weights not already found
    if (!result.weight) {
      const weightMatch = text.match(/\b(\d+(?:\.\d+)?\s*(?:kg|g|lbs|lb|oz))\b/i);
      if (weightMatch) {
        result.weight = weightMatch[1];
      }
    }
    
    // Look for postal/zip codes not already identified
    if (!result.postalCode && !result.zipCode) {
      // US zip code pattern
      const zipMatch = text.match(/\b(\d{5}(?:-\d{4})?)\b/);
      if (zipMatch) {
        result.postalCode = zipMatch[1];
      }
      
      // UK/Canada postal code pattern
      const postalCodeMatch = text.match(/\b([A-Z]\d[A-Z]\s*\d[A-Z]\d|[A-Z]{1,2}\d{1,2}\s*\d[A-Z]{2})\b/i);
      if (postalCodeMatch) {
        result.postalCode = postalCodeMatch[1];
      }
    }
  }

  /**
   * Apply a transformation function to a value
   */
  private applyTransform(value: string, transformFunction?: string): string {
    if (!transformFunction) return value;
    
    try {
      // Create a function from the string representation
      // eslint-disable-next-line no-new-func
      const transform = new Function('value', transformFunction);
      return transform(value);
    } catch (error) {
      console.warn('Error applying transform function:', error);
      return value;
    }
  }

  /**
   * Convert raw input to standard format using Gemini for text processing
   */
  async convertToStandardFormat(input: RawInputData): Promise<FormattedData> {
    await this.ensureInitialized();
    
    const timestamp = new Date().toISOString();
    const warnings: string[] = [];
    let fields: Record<string, string> = {};
    let rawText: string | undefined;
    let confidence = input.metadata?.confidence || 0.75; // Higher default confidence
    
    switch (input.source) {
      case 'vision':
        // Handle vision model output - could be structured or unstructured
        if (typeof input.content === 'string') {
          rawText = input.content;
          // Use Gemini LLM to transform unstructured text to structured data
          fields = await this.transformTextWithGemini(input.content);
          
          // Adjust confidence based on the quality of the extracted data
          confidence = this.calculateConfidenceScore(fields, rawText);
        } else {
          fields = input.content;
        }
        break;
        
      case 'csv':
        // Handle CSV input - already structured but might need formatting
        if (typeof input.content === 'string') {
          rawText = input.content;
          try {
            // Process only the first row data - each row should be treated as a separate record
            fields = this.parseCSV(input.content);
            
            // If CSV parsing returned empty object, try text-based extraction
            if (Object.keys(fields).length === 0) {
              console.log('CSV parsing returned empty results, trying text extraction');
              
              // Treat the CSV content as plain text and try to extract structured data
              fields = await this.extractStructuredData(input.content);
              
              // Add a warning that we had to use alternative extraction
              warnings.push('CSV format was not recognized, used text extraction as fallback');
              
              // Adjust confidence for alternative extraction
              confidence = 0.6;
            } else {
              // Add a note to the warnings if there are multiple data rows
              const lineCount = input.content.split(/\r?\n/).filter(line => line.trim().length > 0).length;
              if (lineCount > 2) {
                warnings.push(`Found ${lineCount - 1} data rows in CSV. Only the first data row has been processed. For multi-record processing, please upload records separately.`);
              }
              
              // Calculate confidence based on CSV data quality
              const totalFields = Object.keys(fields).length;
              const nonEmptyFields = Object.values(fields).filter(v => v.trim().length > 0).length;
              
              // Start with a base confidence that's higher for structured data
              confidence = 0.7;
              
              // Higher confidence if we have more fields (better coverage)
              if (totalFields >= 8) {
                confidence += 0.1;
              } else if (totalFields >= 5) {
                confidence += 0.05;
              }
              
              // Higher confidence if most fields have values
              if (totalFields > 0) {
                const fillRate = nonEmptyFields / totalFields;
                if (fillRate > 0.8) {
                  confidence += 0.15;
                } else if (fillRate > 0.6) {
                  confidence += 0.1;
                }
              }
              
              // Check for required fields
              const hasRequiredFields = this.rules
                .filter(rule => rule.isRequired)
                .every(rule => {
                  return Object.keys(fields).includes(rule.fieldKey) && 
                         fields[rule.fieldKey].trim().length > 0;
                });
                
              if (hasRequiredFields) {
                confidence += 0.1;
              } else {
                confidence -= 0.2;
                warnings.push('Missing required fields in CSV data');
              }
              
              // Cap confidence at 0.95 for CSV data
              confidence = Math.min(0.95, confidence);
            }
          } catch (error) {
            console.error('Error parsing CSV:', error);
            warnings.push(`Failed to parse CSV data: ${error}`);
            
            // Try text-based extraction as a fallback
            try {
              console.log('Trying text extraction as fallback after CSV parse failure');
              fields = await this.extractStructuredData(input.content);
              warnings.push('Used text extraction as fallback after CSV parsing failed');
              confidence = 0.4; // Lower confidence for fallback extraction
            } catch (fallbackError) {
              console.error('Fallback extraction also failed:', fallbackError);
              confidence = 0.3; // Very low confidence
            }
          }
        } else {
          fields = input.content;
        }
        break;
        
      case 'manual':
        // Handle manually entered data
        if (typeof input.content === 'string') {
          rawText = input.content;
          
          // Normalize the input text for better parsing
          const normalizedText = this.normalizeManualInput(input.content);
          
          // First, try to parse as JSON if it looks like JSON
          try {
            if ((normalizedText.trim().startsWith('{') && normalizedText.trim().endsWith('}')) ||
                (normalizedText.trim().startsWith('[') && normalizedText.trim().endsWith(']'))) {
              
              const parsedData = JSON.parse(normalizedText);
              
              // If it's an array, take the first object
              if (Array.isArray(parsedData) && parsedData.length > 0 && typeof parsedData[0] === 'object') {
                Object.entries(parsedData[0]).forEach(([key, value]) => {
                  // Convert key to camelCase if needed
                  const normalizedKey = this.standardizeFieldKey(key);
                  fields[normalizedKey] = typeof value === 'string' ? value : String(value);
                });
                
                // JSON parsing was successful, higher confidence
                confidence = Math.max(confidence, 0.9);
              } 
              // If it's a regular object
              else if (!Array.isArray(parsedData) && typeof parsedData === 'object') {
                Object.entries(parsedData).forEach(([key, value]) => {
                  // Convert key to camelCase if needed
                  const normalizedKey = this.standardizeFieldKey(key);
                  fields[normalizedKey] = typeof value === 'string' ? value : String(value);
                });
                
                // JSON parsing was successful, higher confidence
                confidence = Math.max(confidence, 0.9);
              } else {
                // It's JSON but not in the expected format
                warnings.push('JSON data is not in expected object or array format');
                // Fall back to text processing using the normalized text
                fields = await this.extractStructuredData(normalizedText);
              }
            } else {
              // Not in JSON format, use text processing on the normalized text
              fields = await this.extractStructuredData(normalizedText);
            }
          } catch (error) {
            console.log('Error parsing as JSON, falling back to text processing:', error);
            // Not valid JSON, try regular extraction on the normalized text
            fields = await this.extractStructuredData(normalizedText);
          }
          
          // Apply additional field transformations specific to manual entries to ensure
          // we have a consistent format for compliance checking
          this.applyManualEntryTransformations(fields);
          
          // Manual data typically has good confidence since user entered it directly
          confidence = Math.max(confidence, 0.85);
        } else {
          // Handle case when content is already structured
          fields = input.content;
          this.applyManualEntryTransformations(fields);
        }
        break;
        
      default:
        warnings.push(`Unknown input source: ${input.source}`);
        break;
    }
    
    // Apply transformations and standardize field format
    const standardizedFields: Record<string, string> = {};
    
    for (const [key, value] of Object.entries(fields)) {
      const rule = this.rulesByFieldKey[key];
      
      if (rule) {
        // Apply transformation if available
        let transformedValue = value;
        if (rule.transformFunction) {
          transformedValue = this.applyTransform(value, rule.transformFunction);
        }
        
        standardizedFields[key] = transformedValue;
      } else {
        // Keep fields that don't have matching rules
        standardizedFields[key] = value;
        warnings.push(`No rule definition found for field: ${key}`);
      }
    }
    
    return {
      id: uuidv4(),
      fields: standardizedFields,
      rawText,
      processingMetadata: {
        confidence,
        source: input.source,
        timestamp: input.metadata?.timestamp || timestamp,
        warnings
      }
    };
  }

  /**
   * Force refresh rules from database
   */
  async refreshRules(): Promise<void> {
    try {
      // Get active rules from the database
      this.rules = await ruleRepository.getActiveRules();
      
      // Index rules by field key for faster access
      this.rulesByFieldKey = {};
      for (const rule of this.rules) {
        this.rulesByFieldKey[rule.fieldKey] = rule;
        
        // Load constraints for this rule
        this.constraints[rule.id] = await ruleRepository.getConstraintsByRuleId(rule.id);
      }
      
      console.log(`Refreshed rules: ${this.rules.length} rules loaded`);
    } catch (error) {
      console.error('Failed to refresh rules:', error);
    }
  }

  /**
   * Validate a field against its constraints
   */
  private validateField(fieldKey: string, value: string): { 
    status: 'compliant' | 'non-compliant' | 'warning'; 
    message: string;
  } {
    // Try to find a rule for this field key (case insensitive if needed)
    let rule = this.rulesByFieldKey[fieldKey];
    
    // If no direct match, try case-insensitive matching
    if (!rule) {
      const lowerFieldKey = fieldKey.toLowerCase();
      const matchingKey = Object.keys(this.rulesByFieldKey).find(
        key => key.toLowerCase() === lowerFieldKey
      );
      
      if (matchingKey) {
        rule = this.rulesByFieldKey[matchingKey];
      }
    }
    
    // If still no rule, try to create a temporary one for common field
    if (!rule) {
      console.log(`No rule found for field: ${fieldKey}, creating temporary rule`);
      
      // Create a unique ID for this temporary rule
      const tempId = `temp-${fieldKey}-${Date.now()}`;
      
      // Create a temporary rule
      const tempRule = {
        id: tempId,
        categoryId: this.determineCategoryForField(fieldKey),
        fieldKey: fieldKey,
        displayName: this.formatDisplayName(fieldKey),
        description: `Temporary validation rule for ${this.formatDisplayName(fieldKey)}`,
        fieldType: this.determineFieldType(fieldKey),
        isRequired: false,
        validationPattern: this.getDefaultPatternForField(fieldKey),
        validationMessage: `${this.formatDisplayName(fieldKey)} format validation`,
        exampleValue: '',
        isActive: true,
        priority: 1,
        metadata: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as ComplianceRule;
      
      // Add to our in-memory rules collection
      this.rules.push(tempRule);
      this.rulesByFieldKey[fieldKey] = tempRule;
      this.constraints[tempId] = [];
      
      rule = tempRule;
    }
    
    if (!rule) {
      return { 
        status: 'warning', 
        message: `No validation rules found for field: ${fieldKey}` 
      };
    }
    
    const ruleConstraints = this.constraints[rule.id] || [];
    
    // No constraints means the field is automatically compliant
    if (ruleConstraints.length === 0) {
      return { 
        status: 'compliant', 
        message: 'Field complies with basic requirements' 
      };
    }
    
    // Check each constraint
    for (const constraint of ruleConstraints) {
      // Skip disabled constraints
      if (!constraint.isEnabled) continue;
      
      switch (constraint.type) {
        case 'regex':
          if (constraint.pattern) {
            const regex = new RegExp(constraint.pattern);
            if (!regex.test(value)) {
              return { 
                status: constraint.severity as 'non-compliant' | 'warning', 
                message: constraint.message || `Value does not match required pattern: ${constraint.pattern}` 
              };
            }
          }
          break;
          
        case 'length':
          if (constraint.minLength !== undefined && value.length < constraint.minLength) {
            return { 
              status: constraint.severity as 'non-compliant' | 'warning', 
              message: constraint.message || `Value length (${value.length}) is less than minimum required (${constraint.minLength})` 
            };
          }
          if (constraint.maxLength !== undefined && value.length > constraint.maxLength) {
            return { 
              status: constraint.severity as 'non-compliant' | 'warning', 
              message: constraint.message || `Value length (${value.length}) exceeds maximum allowed (${constraint.maxLength})` 
            };
          }
          break;
          
        case 'required':
          if (!value || value.trim() === '') {
            return { 
              status: constraint.severity as 'non-compliant' | 'warning', 
              message: constraint.message || 'Value is required but missing' 
            };
          }
          break;
          
        // Add more constraint types as needed
      }
    }
    
    // If all constraints pass, the field is compliant
    return { 
      status: 'compliant', 
      message: 'Field validated successfully against all constraints' 
    };
  }

  /**
   * Convert formatted data to compliance results
   */
  async validateCompliance(formattedData: FormattedData): Promise<ComplianceResult[]> {
    await this.ensureInitialized();
    
    const results: ComplianceResult[] = [];
    const fields = formattedData.fields;
    
    // Track validated fields to ensure we include compliant results
    const validatedFields = new Set<string>();
    
    // Validate each field against its constraints
    for (const [key, value] of Object.entries(fields)) {
      const validation = this.validateField(key, value);
      
      results.push({
        id: `${formattedData.id}-${key}`,
        field: this.rulesByFieldKey[key]?.displayName || this.formatDisplayName(key),
        value,
        status: validation.status,
        message: validation.message
      });
      
      validatedFields.add(key);
    }
    
    // For manual entries, ensure we have at least some compliant fields
    if (formattedData.processingMetadata.source === 'manual' && 
        !results.some(r => r.status === 'compliant')) {
      
      // Add compliant status for fields that have values but weren't explicitly validated
      const importantFields = [
        'shipperName', 'shipperAddress', 'recipientName', 'recipientAddress',
        'trackingNumber', 'packageContents', 'weight', 'dimensions'
      ];
      
      // Check for fields with values that should be marked as compliant
      for (const fieldKey of importantFields) {
        if (fields[fieldKey] && fields[fieldKey].trim() && !validatedFields.has(fieldKey)) {
          results.push({
            id: `${formattedData.id}-${fieldKey}-default`,
            field: this.formatDisplayName(fieldKey),
            value: fields[fieldKey],
            status: 'compliant',
            message: 'Field has valid content'
          });
        }
      }
    }
    
    // Check for shipping-specific compliance issues
    this.checkShippingComplianceIssues(formattedData, results);
    
    // Add processing metadata as a compliance result
    results.push({
      id: `${formattedData.id}-confidence`,
      field: 'AI Confidence Score',
      value: `${Math.round(formattedData.processingMetadata.confidence * 100)}%`,
      status: formattedData.processingMetadata.confidence > 0.8 ? 'compliant' : 
              formattedData.processingMetadata.confidence > 0.5 ? 'warning' : 'non-compliant',
      message: formattedData.processingMetadata.confidence > 0.8 ? 'High confidence in analysis' : 
              formattedData.processingMetadata.confidence > 0.5 ? 'Moderate confidence, verify results' : 'Low confidence, manual review required'
    });
    
    // Check for warnings in metadata
    if (formattedData.processingMetadata.warnings.length > 0) {
      results.push({
        id: `${formattedData.id}-warnings`,
        field: 'Processing Warnings',
        value: formattedData.processingMetadata.warnings.join('; '),
        status: 'warning',
        message: 'There were issues during data processing that may affect results'
      });
    }
    
    return results;
  }

  /**
   * Check for shipping-specific compliance issues
   * This will be called from validateCompliance to add additional shipping-specific compliance results
   */
  private checkShippingComplianceIssues(formattedData: FormattedData, results: ComplianceResult[]): void {
    const fields = formattedData.fields;
    
    // 1. Check for critical missing fields for shipping
    const criticalFields = [
      { key: 'trackingNumber', displayName: 'Tracking Number' },
      { key: 'shipperName', displayName: 'Shipper Name' },
      { key: 'recipientName', displayName: 'Recipient Name' },
      { key: 'recipientAddress', displayName: 'Recipient Address' }
    ];
    
    for (const field of criticalFields) {
      if (!fields[field.key] || fields[field.key].trim() === '') {
        // Check if this field is already reported as missing in results
        if (!results.some(r => r.field === field.displayName && (r.status === 'non-compliant' || r.status === 'warning'))) {
          results.push({
            id: `${formattedData.id}-missing-${field.key}`,
            field: field.displayName,
            value: 'Missing',
            status: 'non-compliant',
            message: `Required field "${field.displayName}" is missing. This may cause delivery issues or delays.`
          });
        }
      }
    }
    
    // 2. Check for restricted item types in package contents
    // Look for content in various field names, both standard and alternative formats
    const contentFields = ['packageContents', 'contents', 'itemDescription', 'description', 'items', 'goods'];
    let contentValue = '';
    
    // Find the first available content field
    for (const fieldKey of contentFields) {
      // Use case-insensitive access by checking lowercased keys
      const lowercaseKey = fieldKey.toLowerCase();
      
      for (const key of Object.keys(fields)) {
        if (key.toLowerCase() === lowercaseKey && fields[key] && fields[key].trim() !== '') {
          contentValue = fields[key];
          break;
        }
      }
      
      if (contentValue) break;
    }
    
    // If we found content, check for restricted items
    if (contentValue) {
      const contentsLower = contentValue.toLowerCase();
      
      const restrictedItems: Array<{
        keyword: string;
        message: string;
        severity: 'warning' | 'non-compliant';
      }> = [
        // Warning level items
        { keyword: 'lithium', message: 'Lithium batteries are restricted and require special handling/labeling.', severity: 'warning' },
        { keyword: 'battery', message: 'Batteries may be restricted and require special handling/labeling.', severity: 'warning' },
        { keyword: 'alcohol', message: 'Alcohol shipments require special licensing and may be prohibited in certain regions.', severity: 'warning' },
        { keyword: 'tobacco', message: 'Tobacco products are restricted and may be subject to additional taxes or be prohibited.', severity: 'warning' },
        { keyword: 'medicine', message: 'Medicine/pharmaceuticals may require prescription documentation and special permits.', severity: 'warning' },
        { keyword: 'pharmaceutical', message: 'Pharmaceuticals may require documentation and special permits.', severity: 'warning' },
        { keyword: 'prescription', message: 'Prescription medications may require documentation and special permits.', severity: 'warning' },
        { keyword: 'flammable', message: 'Flammable materials require hazardous materials shipping procedures.', severity: 'warning' },
        { keyword: 'chemical', message: 'Chemicals may require hazardous materials shipping procedures.', severity: 'warning' },
        { keyword: 'aerosol', message: 'Aerosols may be restricted or prohibited due to pressurized containers.', severity: 'warning' },
        { keyword: 'perishable', message: 'Perishable goods require special handling and expedited shipping.', severity: 'warning' },
        
        // Non-compliant level items
        { keyword: 'drug', message: 'Drug shipments may be illegal or require special permits.', severity: 'non-compliant' },
        { keyword: 'weapon', message: 'Weapons are heavily restricted or prohibited in most shipping routes.', severity: 'non-compliant' },
        { keyword: 'firearm', message: 'Firearms are heavily restricted or prohibited in most shipping routes.', severity: 'non-compliant' },
        { keyword: 'gun', message: 'Guns are heavily restricted or prohibited in most shipping routes.', severity: 'non-compliant' },
        { keyword: 'guns', message: 'Guns are heavily restricted or prohibited in most shipping routes.', severity: 'non-compliant' },
        { keyword: 'pistol', message: 'Pistols are heavily restricted or prohibited in most shipping routes.', severity: 'non-compliant' },
        { keyword: 'rifle', message: 'Rifles are heavily restricted or prohibited in most shipping routes.', severity: 'non-compliant' },
        { keyword: 'shotgun', message: 'Shotguns are heavily restricted or prohibited in most shipping routes.', severity: 'non-compliant' },
        { keyword: 'revolver', message: 'Revolvers are heavily restricted or prohibited in most shipping routes.', severity: 'non-compliant' },
        { keyword: 'ammunition', message: 'Ammunition is heavily restricted or prohibited in most shipping routes.', severity: 'non-compliant' },
        { keyword: 'ammo', message: 'Ammunition is heavily restricted or prohibited in most shipping routes.', severity: 'non-compliant' },
        { keyword: 'bullet', message: 'Bullets are heavily restricted or prohibited in most shipping routes.', severity: 'non-compliant' },
        { keyword: 'cartridge', message: 'Cartridges are heavily restricted or prohibited in most shipping routes.', severity: 'non-compliant' },
        { keyword: 'explosive', message: 'Explosive materials are prohibited in standard shipping.', severity: 'non-compliant' }
      ];
      
      for (const item of restrictedItems) {
        if (contentsLower.includes(item.keyword)) {
          if (!results.some(r => r.field === 'Restricted Item' && r.value.includes(item.keyword))) {
            results.push({
              id: `${formattedData.id}-restricted-${item.keyword}`,
              field: 'Restricted Item',
              value: item.keyword,
              status: item.severity, // Use the severity from each item
              message: item.message
            });
          }
        }
      }
    }
    
    // 3. Check for destination restrictions
    const destination = fields.recipientCountry || fields.destinationCountry || '';
    const origin = fields.shipperCountry || fields.originCountry || '';
    
    if (destination) {
      const destinationUpper = destination.toUpperCase();
      
      const restrictedDestinations = [
        { code: 'CU', name: 'Cuba', message: 'Shipping to Cuba is restricted due to trade embargoes.' },
        { code: 'IR', name: 'Iran', message: 'Shipping to Iran is restricted due to international sanctions.' },
        { code: 'KP', name: 'North Korea', message: 'Shipping to North Korea is heavily restricted due to international sanctions.' },
        { code: 'SY', name: 'Syria', message: 'Shipping to Syria is restricted due to international sanctions.' },
        { code: 'RU', name: 'Russia', message: 'Shipping to Russia may be subject to restrictions and sanctions.' }
      ];
      
      for (const restricted of restrictedDestinations) {
        if (destinationUpper.includes(restricted.code) || destinationUpper.includes(restricted.name.toUpperCase())) {
          if (!results.some(r => r.field === 'Destination Restriction')) {
            results.push({
              id: `${formattedData.id}-destination-${restricted.code}`,
              field: 'Destination Restriction',
              value: restricted.name,
              status: 'non-compliant',
              message: restricted.message
            });
            break;
          }
        }
      }
      
      // Check for route-specific restrictions
      if (origin) {
        const originUpper = origin.toUpperCase();
        
        // US embargo checks
        if ((originUpper === 'US' || originUpper === 'USA' || originUpper.includes('UNITED STATES')) && 
            (destinationUpper === 'CU' || destinationUpper === 'CUBA' || 
             destinationUpper === 'IR' || destinationUpper === 'IRAN' || 
             destinationUpper === 'KP' || destinationUpper.includes('KOREA') || 
             destinationUpper === 'SY' || destinationUpper === 'SYRIA')) {
          results.push({
            id: `${formattedData.id}-usembargo-${destinationUpper}`,
            field: 'US Export Restriction',
            value: `${originUpper} to ${destinationUpper}`,
            status: 'non-compliant',
            message: `Shipping from the United States to ${destinationUpper} is prohibited due to trade embargoes and sanctions.`
          });
        }
      }
    }
    
    // 4. Check for international shipping without required customs documentation
    if (this.isLikelyInternational(fields)) {
      const customsFields = [
        { key: 'declaredValue', displayName: 'Declared Value' },
        { key: 'harmonizedCode', displayName: 'Harmonized Code (HS)' },
        { key: 'customsContents', displayName: 'Customs Contents Description' }
      ];
      
      for (const field of customsFields) {
        if (!fields[field.key] && !fields[field.key.toLowerCase()] && 
            !results.some(r => r.field === field.displayName)) {
          results.push({
            id: `${formattedData.id}-customs-${field.key}`,
            field: field.displayName,
            value: 'Missing',
            status: 'warning',
            message: `International shipment missing "${field.displayName}" which may cause customs delays.`
          });
        }
      }
    }
  }
  
  /**
   * Check if a shipment is likely international based on the fields
   */
  private isLikelyInternational(fields: Record<string, string>): boolean {
    // Check for different country codes in origin and destination
    if (fields.shipperCountry && fields.recipientCountry && 
        fields.shipperCountry.toUpperCase() !== fields.recipientCountry.toUpperCase()) {
      return true;
    }
    
    // Check for international service indicators
    if (fields.serviceType && 
        (fields.serviceType.toLowerCase().includes('international') || 
         fields.serviceType.toLowerCase().includes('global') ||
         fields.serviceType.toLowerCase().includes('worldwide'))) {
      return true;
    }
    
    // Check for common international carriers when domestic isn't specified
    if (fields.carrier && 
        (fields.carrier.toLowerCase().includes('dhl') || 
         fields.carrier.toLowerCase().includes('fedex international'))) {
      return true;
    }
    
    return false;
  }

  /**
   * Process input data to compliance results
   */
  async processInputToCompliance(input: RawInputData): Promise<{
    formattedData: FormattedData;
    complianceResults: ComplianceResult[];
  }> {
    const formattedData = await this.convertToStandardFormat(input);
    const complianceResults = await this.validateCompliance(formattedData);
    
    return {
      formattedData,
      complianceResults
    };
  }

  /**
   * Determine the appropriate field type based on the field key
   */
  private determineFieldType(fieldKey: string): FieldType {
    const fieldKeyLower = fieldKey.toLowerCase();
    
    // Date fields
    if (fieldKeyLower.includes('date') || 
        fieldKeyLower.includes('time') || 
        fieldKeyLower === 'shipdate' || 
        fieldKeyLower === 'deliverydate' || 
        fieldKeyLower === 'shipmentdate') {
      return 'date';
    }
    
    // Number fields
    if (fieldKeyLower.includes('weight') && !fieldKeyLower.includes('unit') ||
        fieldKeyLower.includes('value') ||
        fieldKeyLower.includes('price') ||
        fieldKeyLower.includes('cost') ||
        fieldKeyLower.includes('number') && !fieldKeyLower.includes('account') ||
        fieldKeyLower.includes('quantity') ||
        fieldKeyLower.includes('amount')) {
      return 'number';
    }
    
    // Select fields
    if (fieldKeyLower.includes('type') ||
        fieldKeyLower.includes('status') ||
        fieldKeyLower.includes('category') ||
        fieldKeyLower.includes('unit') ||
        fieldKeyLower === 'packagingtype' ||
        fieldKeyLower === 'packagetype' ||
        fieldKeyLower === 'servicelevel' ||
        fieldKeyLower === 'priority') {
      return 'select';
    }
    
    // Regex fields
    if (fieldKeyLower.includes('trackingn') ||
        fieldKeyLower.includes('tariffn') ||
        fieldKeyLower.includes('hsn') ||
        fieldKeyLower.includes('eori')) {
      return 'regex';
    }
    
    // Default to text for everything else
    return 'text';
  }

  /**
   * Determine the appropriate category for a field based on its name
   */
  private determineCategoryForField(fieldKey: string): string {
    const fieldKeyLower = fieldKey.toLowerCase();
    
    // Address category
    if (fieldKeyLower.includes('address') || 
        fieldKeyLower.includes('name') ||
        fieldKeyLower.includes('recipient') ||
        fieldKeyLower.includes('shipper') ||
        fieldKeyLower.includes('city') ||
        fieldKeyLower.includes('country') ||
        fieldKeyLower.includes('state') ||
        fieldKeyLower.includes('zip') ||
        fieldKeyLower.includes('postal')) {
      return 'address';
    }
    
    // Package category
    if (fieldKeyLower.includes('package') ||
        fieldKeyLower.includes('weight') ||
        fieldKeyLower.includes('dimensions') ||
        fieldKeyLower.includes('content') ||
        fieldKeyLower.includes('item') ||
        fieldKeyLower.includes('goods')) {
      return 'package';
    }
    
    // Customs category
    if (fieldKeyLower.includes('customs') ||
        fieldKeyLower.includes('tariff') ||
        fieldKeyLower.includes('duty') ||
        fieldKeyLower.includes('tax') ||
        fieldKeyLower.includes('declared') ||
        fieldKeyLower.includes('hs') ||
        fieldKeyLower.includes('eori') ||
        fieldKeyLower.includes('origin') ||
        fieldKeyLower.includes('harmonized')) {
      return 'customs';
    }
    
    // Default to shipping category
    return 'shipping';
  }
  
  /**
   * Format a field key into a user-friendly display name
   */
  private formatDisplayName(fieldKey: string): string {
    // Common display name overrides
    const displayNameOverrides: Record<string, string> = {
      'trackingNumber': 'Tracking Number',
      'orderNumber': 'Order Number',
      'referenceNo': 'Reference Number',
      'shipperName': 'Shipper Name',
      'shipperAddress': 'Shipper Address',
      'shipperCity': 'Shipper City',
      'shipperState': 'Shipper State',
      'shipperPostalCode': 'Shipper Postal Code',
      'shipperCountry': 'Shipper Country',
      'shipperPhone': 'Shipper Phone',
      'recipientName': 'Recipient Name',
      'recipientAddress': 'Recipient Address',
      'recipientCity': 'Recipient City',
      'recipientState': 'Recipient State',
      'recipientPostalCode': 'Recipient Postal Code',
      'recipientCountry': 'Recipient Country',
      'recipientPhone': 'Recipient Phone',
      'packageContents': 'Package Contents',
      'packageType': 'Package Type',
      'weight': 'Weight',
      'dimensions': 'Dimensions',
      'shipDate': 'Ship Date',
      'deliveryDate': 'Delivery Date',
      'shippingCarrier': 'Shipping Carrier',
      'shippingService': 'Shipping Service',
      'shippingCost': 'Shipping Cost',
      'insuranceAmount': 'Insurance Amount',
      'declaredValue': 'Declared Value',
      'customsInfo': 'Customs Information',
      'dangerousGoods': 'Dangerous Goods',
      'specialInstructions': 'Special Instructions'
    };
    
    // Use override if available
    if (displayNameOverrides[fieldKey]) {
      return displayNameOverrides[fieldKey];
    }
    
    // Otherwise format the field key
    return fieldKey
      // Add spaces before capital letters
      .replace(/([A-Z])/g, ' $1')
      // Capitalize first letter
      .replace(/^./, str => str.toUpperCase())
      // Handle specific acronyms
      .replace(/\bId\b/g, 'ID')
      .replace(/\bUrl\b/g, 'URL')
      .replace(/\bHtml\b/g, 'HTML')
      .replace(/\bXml\b/g, 'XML')
      .replace(/\bJson\b/g, 'JSON')
      .replace(/\bPo\b/g, 'PO')
      .replace(/\bCsv\b/g, 'CSV')
      .replace(/\bPdf\b/g, 'PDF')
      .trim();
  }
  
  /**
   * Get a default validation pattern for a field based on its key
   */
  private getDefaultPatternForField(fieldKey: string): string {
    const fieldKeyLower = fieldKey.toLowerCase();
    
    // Tracking numbers
    if (fieldKeyLower.includes('tracking')) {
      return '^[A-Z0-9]{8,}$';
    }
    
    // Dates
    if (fieldKeyLower.includes('date') || fieldKeyLower.includes('time')) {
      return '^\\d{4}-\\d{2}-\\d{2}$';
    }
    
    // Numbers and numeric values
    if (fieldKeyLower.includes('number') || 
        fieldKeyLower.includes('id') || 
        fieldKeyLower.includes('code')) {
      return '^[A-Z0-9-]{4,}$';
    }
    
    // Weights
    if (fieldKeyLower.includes('weight')) {
      return '^\\d+(\\.\\d+)?\\s*(kg|g|lb|lbs|oz)?$';
    }
    
    // Dimensions
    if (fieldKeyLower.includes('dimension')) {
      return '^\\d+(\\.\\d+)?\\s*x\\s*\\d+(\\.\\d+)?\\s*x\\s*\\d+(\\.\\d+)?\\s*(cm|mm|m|in|ft)?$';
    }
    
    // Addresses
    if (fieldKeyLower.includes('address')) {
      return '^.{5,}$';
    }
    
    // Names
    if (fieldKeyLower.includes('name')) {
      return '^[A-Za-z\\s\\-\\\'\\.]{2,}$';
    }
    
    // Countries
    if (fieldKeyLower.includes('country')) {
      return '^([A-Z]{2}|[A-Za-z\\s\\-\\.]{3,})$';
    }
    
    // Cities, states
    if (fieldKeyLower.includes('city') || fieldKeyLower.includes('state')) {
      return '^[A-Za-z\\s\\-\\.]{2,}$';
    }
    
    // Default pattern - any text with at least 2 characters
    return '^.{2,}$';
  }

  /**
   * Calculate a confidence score based on the quality of the extracted data
   */
  private calculateConfidenceScore(fields: Record<string, string>, rawText?: string): number {
    // Start with a base confidence score
    let score = 0.75;
    
    // If we don't have any fields or raw text, return a low confidence
    if (!fields || Object.keys(fields).length === 0 || !rawText) {
      return 0.5;
    }
    
    // Adjust score based on number of fields extracted
    const fieldCount = Object.keys(fields).length;
    if (fieldCount > 10) {
      score += 0.1; // Good field extraction
    } else if (fieldCount < 5) {
      score -= 0.1; // Poor field extraction
    }
    
    // Check for critical shipping fields
    const criticalFields = [
      'trackingNumber', 'shipperName', 'shipperAddress', 
      'recipientName', 'recipientAddress', 'weight'
    ];
    
    const criticalFieldsFound = criticalFields.filter(f => !!fields[f]);
    const criticalFieldsRatio = criticalFieldsFound.length / criticalFields.length;
    
    // Adjust score based on critical fields found
    if (criticalFieldsRatio > 0.8) {
      score += 0.1; // Most critical fields found
    } else if (criticalFieldsRatio < 0.5) {
      score -= 0.1; // Less than half of critical fields found
    }
    
    // Check data quality
    let qualityIssues = 0;
    
    // Check for suspiciously short values
    for (const [key, value] of Object.entries(fields)) {
      if (value && value.length < 3 && !['id', 'zip'].includes(key.toLowerCase())) {
        qualityIssues++;
      }
    }
    
    // Adjust score based on quality issues
    if (qualityIssues === 0) {
      score += 0.05; // No quality issues
    } else if (qualityIssues > 3) {
      score -= 0.15; // Multiple quality issues
    }
    
    // Ensure score is within valid range
    return Math.max(0.1, Math.min(0.95, score));
  }

  /**
   * Parse CSV data into structured format, handling various formats
   */
  private parseCSV(csv: string): Record<string, string> {
    const result: Record<string, string> = {};
    
    // Handle different line endings (Windows, Unix, Mac)
    const lines = csv.split(/\r?\n/).filter(line => line.trim().length > 0);
    
    if (lines.length < 2) {
      throw new Error('CSV has insufficient data (expected at least header and one data row)');
    }
    
    // Parse headers - handling quoted values properly
    const headers = this.parseCSVLine(lines[0]).map(h => h.trim().toLowerCase()).filter(h => h);
    
    if (headers.length === 0) {
      throw new Error('CSV has no valid headers');
    }
    
    // Parse values from the first data row
    const values = this.parseCSVLine(lines[1]);
    
    // Handle case where we have more headers than values
    if (values.length < headers.length) {
      const missingCount = headers.length - values.length;
      for (let i = 0; i < missingCount; i++) {
        values.push('');
      }
    }
    
    // Standard field name mappings for content-related fields to support restricted content detection
    const contentFieldMappings: Record<string, string> = {
      'contents': 'packageContents',
      'package contents': 'packageContents',
      'shipment contents': 'packageContents',
      'item contents': 'packageContents',
      'items': 'packageContents',
      'goods': 'packageContents', 
      'merchandise': 'packageContents',
      'product': 'packageContents',
      'products': 'packageContents',
      'item description': 'itemDescription',
      'items description': 'itemDescription',
      'description': 'itemDescription',
      'goods description': 'itemDescription',
      'product description': 'itemDescription'
    };
    
    // Try to identify if the CSV is not properly formatted
    let isMixedFormat = false;
    
    // Check if the first value looks like a header rather than a value
    if (values[0] && values[0].trim().length > 0 && /^[a-zA-Z_]+$/.test(values[0].trim())) {
      const possibleValues = this.parseCSVLine(values[0]);
      
      // If the first field matches this pattern, we might have a mixed format CSV
      if (possibleValues.length > 1) {
        isMixedFormat = true;
      }
    }
    
    // Normal CSV processing
    if (!isMixedFormat) {
      // Map headers to values
      headers.forEach((header, index) => {
        // Include empty values as well to maintain proper field mapping
        if (index < values.length) {
          const value = values[index] ? values[index].trim() : '';
          
          // Find a rule matching this header
          const matchingRule = this.rules.find(
            rule => rule.displayName.toLowerCase() === header
          );
          
          if (matchingRule) {
            result[matchingRule.fieldKey] = value;
          } else {
            // Check for content-related field mapping
            if (contentFieldMappings[header]) {
              result[contentFieldMappings[header]] = value;
            } else {
              // Use a standardized field key based on the header
              const fieldKey = this.standardizeFieldKey(header);
              result[fieldKey] = value;
            }
          }
        }
      });
    }
    // Handle mixed format where data is more like key-value pairs
    else {
      // Try to interpret each line as a key-value pair
      for (const line of lines) {
        // Skip the header row
        if (line === lines[0]) continue;
        
        const rowParts = this.parseCSVLine(line);
        
        if (rowParts.length >= 2) {
          const key = rowParts[0].trim().toLowerCase();
          const value = rowParts[1].trim();
          
          if (key && value) {
            // Find a rule matching this key
            const matchingRule = this.rules.find(
              rule => rule.displayName.toLowerCase() === key
            );
            
            if (matchingRule) {
              result[matchingRule.fieldKey] = value;
            } else {
              // Check for content-related field mapping
              if (contentFieldMappings[key]) {
                result[contentFieldMappings[key]] = value;
              } else {
                // Use a standardized field key
                const fieldKey = this.standardizeFieldKey(key);
                result[fieldKey] = value;
              }
            }
          }
        }
      }
    }
    
    // If the result is empty, try a more flexible approach
    if (Object.keys(result).length === 0) {
      // Try to extract structured data from the raw CSV as if it were text
      // We can't directly return the async result here, so just leave result empty
      // and let the caller handle it - the manual data pathway will pick up the slack
      return result;
    }
    
    return result;
  }
  
  /**
   * Parse a single CSV line, properly handling quoted values
   */
  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"' && (i === 0 || line[i-1] !== '\\')) {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    // Add the last field
    result.push(current);
    
    // Clean up quotes on individual values
    return result.map(value => {
      // Remove surrounding quotes if present
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.substring(1, value.length - 1);
      }
      
      // Replace escaped quotes with regular quotes
      return value.replace(/\\"/g, '"');
    });
  }
  
  /**
   * Standardize a field key based on a header
   */
  private standardizeFieldKey(header: string): string {
    // Common field name mappings for direct conversion
    const directMappings: Record<string, string> = {
      'sender': 'shipperName',
      'shipper': 'shipperName',
      'from': 'shipperName',
      'recipient': 'recipientName',
      'receiver': 'recipientName',
      'to': 'recipientName',
      'addressee': 'recipientName',
      'consignee': 'recipientName',
      'deliver to': 'recipientName',
      'ship to': 'recipientName',
      'return to': 'shipperName',
      'ship from': 'shipperAddress',
      'sender address': 'shipperAddress',
      'shipper address': 'shipperAddress',
      'from address': 'shipperAddress',
      'recipient address': 'recipientAddress',
      'delivery address': 'recipientAddress',
      'destination address': 'recipientAddress',
      'shipping address': 'recipientAddress',
      'contents': 'packageContents',
      'items': 'packageContents',
      'goods': 'packageContents',
      'package contents': 'packageContents',
      'shipment contents': 'packageContents',
      'shipping contents': 'packageContents',
      'product description': 'packageContents',
      'item description': 'packageContents',
      'description of goods': 'packageContents',
      'tracking': 'trackingNumber',
      'tracking number': 'trackingNumber',
      'tracking #': 'trackingNumber',
      'track #': 'trackingNumber',
      'tracking no': 'trackingNumber',
      'order': 'orderNumber',
      'order #': 'orderNumber',
      'order number': 'orderNumber',
      'order no': 'orderNumber',
      'reference': 'referenceNo',
      'reference #': 'referenceNo',
      'reference number': 'referenceNo',
      'ref': 'referenceNo',
      'ref #': 'referenceNo',
      'ref no': 'referenceNo',
      'shipment date': 'shipDate',
      'ship date': 'shipDate',
      'date shipped': 'shipDate',
      'shipping date': 'shipDate',
      'package type': 'parcelType',
      'parcel type': 'parcelType',
      'shipping method': 'shippingService',
      'service': 'shippingService',
      'shipping service': 'shippingService',
      'service type': 'shippingService',
      'delivery method': 'shippingService',
      'carrier': 'shippingCarrier',
      'shipping carrier': 'shippingCarrier',
      'shipping company': 'shippingCarrier'
    };
    
    // First try direct mapping if it exists (case insensitive)
    const headerLower = header.toLowerCase();
    if (directMappings[headerLower]) {
      return directMappings[headerLower];
    }
    
    // Convert spaces and special characters to camelCase
    let fieldKey = header
      .replace(/[^a-zA-Z0-9 ]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Convert to camelCase
    fieldKey = fieldKey
      .split(' ')
      .map((word, index) => 
        index === 0 
          ? word.toLowerCase() 
          : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      )
      .join('');
    
    return fieldKey;
  }

  /**
   * Parse multiple rows from CSV data into an array of structured records
   * This method can be used for batch processing
   */
  public async parseMultipleRowsCSV(csv: string): Promise<Record<string, string>[]> {
    await this.ensureInitialized();
    
    const results: Record<string, string>[] = [];
    
    // Handle different line endings (Windows, Unix, Mac)
    const lines = csv.split(/\r?\n/).filter(line => line.trim().length > 0);
    
    if (lines.length < 2) {
      throw new Error('CSV has insufficient data (expected at least header and one data row)');
    }
    
    // Parse headers - handling quoted values properly
    const headers = this.parseCSVLine(lines[0]).map(h => h.trim().toLowerCase()).filter(h => h);
    
    if (headers.length === 0) {
      throw new Error('CSV has no valid headers');
    }
    
    // Standard field name mappings for content-related fields to support restricted content detection
    const contentFieldMappings: Record<string, string> = {
      'contents': 'packageContents',
      'package contents': 'packageContents',
      'shipment contents': 'packageContents',
      'item contents': 'packageContents',
      'items': 'packageContents',
      'goods': 'packageContents', 
      'merchandise': 'packageContents',
      'product': 'packageContents',
      'products': 'packageContents',
      'item description': 'itemDescription',
      'items description': 'itemDescription',
      'description': 'itemDescription',
      'goods description': 'itemDescription',
      'product description': 'itemDescription'
    };
    
    // Process each data row separately
    for (let i = 1; i < lines.length; i++) {
      const result: Record<string, string> = {};
      const values = this.parseCSVLine(lines[i]);
      
      // Map headers to values for this row
      headers.forEach((header, index) => {
        if (index < values.length) {
          const value = values[index] ? values[index].trim() : '';
          
          // Find a rule matching this header
          const matchingRule = this.rules.find(
            rule => rule.displayName.toLowerCase() === header
          );
          
          if (matchingRule) {
            result[matchingRule.fieldKey] = value;
          } else {
            // Check for content-related field mapping
            if (contentFieldMappings[header]) {
              result[contentFieldMappings[header]] = value;
            } else {
              // Use a standardized field key
              const fieldKey = this.standardizeFieldKey(header);
              result[fieldKey] = value;
            }
          }
        }
      });
      
      results.push(result);
    }
    
    return results;
  }

  /**
   * Normalize and clean manual input text to improve parsing
   */
  private normalizeManualInput(text: string): string {
    // Skip if it appears to be JSON
    if ((text.trim().startsWith('{') && text.trim().endsWith('}')) ||
        (text.trim().startsWith('[') && text.trim().endsWith(']'))) {
      return text;
    }
    
    let normalized = text;
    
    // Replace common delimiters with standardized format
    normalized = normalized
      // Replace various dividers with newlines
      .replace(/[\n\r]+[-_=]{3,}[\n\r]+/g, '\n\n')
      
      // Standardize field separators for better detection
      .replace(/([A-Za-z]+)\s*[-–:]\s*/g, '$1: ')
      
      // Fix common format issues with dates
      .replace(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/g, 'Date: $1/$2/$3\n')
      
      // Handle common tracking number formats
      .replace(/\b(tracking|track|tracking number|track no|tracking #)[\s#:]*([A-Z0-9]{8,})\b/i, 'Tracking Number: $2\n')
      
      // Handle weight formats
      .replace(/\b(weight|wt)[\s:]*(\d+\.?\d*)\s*(kg|g|lbs?|oz)\b/i, 'Weight: $2 $3\n')
      
      // Handle dimensions formats
      .replace(/\b(dimensions|size|dim|measurements)[\s:]*(\d+\.?\d*)\s*[x×]\s*(\d+\.?\d*)\s*[x×]\s*(\d+\.?\d*)\s*(cm|mm|in|inch)?\b/i, 'Dimensions: $2 x $3 x $4 $5\n')
      
      // Handle package type
      .replace(/\b(package type|parcel type|type)[\s:]*(\w+)\b/i, 'Package Type: $2\n')
      
      // Handle package contents
      .replace(/\b(contents|items|description|goods)[\s:]*([^\n]+)/i, 'Package Contents: $2\n')
      
      // Handle declared value
      .replace(/\b(value|declared value|customs value|item value)[\s:]*\$?\s*(\d+\.?\d*)\s*(usd|eur|gbp)?\b/i, 'Declared Value: $$$2 $3\n')
      
      // Add more field pattern recognizers
      .replace(/\b(international)\b/i, 'Shipment Type: International\n')
      .replace(/\b(domestic)\b/i, 'Shipment Type: Domestic\n');
    
    return normalized;
  }

  /**
   * Apply additional transformations to manual entry fields to ensure consistent format
   */
  private applyManualEntryTransformations(fields: Record<string, string>): void {
    // Ensure field normalization has been applied
    this.normalizeFieldNames(fields);
    
    // Extract name and address components from combined fields
    this.extractNameAndAddressComponents(fields);
    
    // Add missing fields based on existing data
    this.inferMissingFields(fields);
    
    // Format standard fields consistently
    this.formatStandardFields(fields);
  }
  
  /**
   * Infer missing fields from other fields when possible
   */
  private inferMissingFields(fields: Record<string, string>): void {
    // Try to infer package contents from descriptions or item fields
    if (!fields.packageContents) {
      const contentFieldCandidates = ['description', 'itemDescription', 'items', 'goods', 'product'];
      for (const candidate of contentFieldCandidates) {
        if (fields[candidate] && fields[candidate].trim()) {
          fields.packageContents = fields[candidate];
          break;
        }
      }
    }
    
    // Try to infer shipping carrier
    if (!fields.shippingCarrier && fields.trackingNumber) {
      // Look for carrier patterns in tracking numbers
      if (/^1Z[0-9A-Z]{16}$/i.test(fields.trackingNumber)) {
        fields.shippingCarrier = 'UPS';
      } else if (/^(\d{12}|\d{15}|\d{20})$/.test(fields.trackingNumber)) {
        fields.shippingCarrier = 'FedEx';
      } else if (/^9\d{15,21}$/.test(fields.trackingNumber)) {
        fields.shippingCarrier = 'USPS';
      } else if (/^\d{10}$/.test(fields.trackingNumber)) {
        fields.shippingCarrier = 'DHL';
      }
    }
    
    // Try to infer country from address if not specified
    if (!fields.shipperCountry && fields.shipperAddress) {
      // Check for common country patterns at end of address
      const countryMatch = fields.shipperAddress.match(/,\s*([A-Za-z\s]{2,})$/);
      if (countryMatch && countryMatch[1]) {
        fields.shipperCountry = countryMatch[1].trim();
      }
    }
    
    if (!fields.recipientCountry && fields.recipientAddress) {
      // Check for common country patterns at end of address
      const countryMatch = fields.recipientAddress.match(/,\s*([A-Za-z\s]{2,})$/);
      if (countryMatch && countryMatch[1]) {
        fields.recipientCountry = countryMatch[1].trim();
      }
    }
  }
  
  /**
   * Format standard fields in a consistent way
   */
  private formatStandardFields(fields: Record<string, string>): void {
    // Format date fields
    if (fields.shipDate) {
      // Attempt to standardize date format (yyyy-mm-dd)
      const dateMatch = fields.shipDate.match(/(\d{1,4})[/-](\d{1,2})[/-](\d{1,4})/);
      if (dateMatch) {
        let year = dateMatch[1];
        const month = dateMatch[2].padStart(2, '0');
        let day = dateMatch[3];
        
        // Swap if the order looks reversed
        if (parseInt(year) <= 31 && parseInt(day) > 31) {
          [year, day] = [day, year];
        }
        
        // Ensure 4-digit year
        if (year.length === 2) {
          year = parseInt(year) > 50 ? `19${year}` : `20${year}`;
        }
        
        fields.shipDate = `${year}-${month}-${day.padStart(2, '0')}`;
      }
    }
    
    // Format postal/zip codes consistently
    if (fields.postalCode) {
      // US format: 12345-6789 or 12345
      if (/^\d{5}(-\d{4})?$/.test(fields.postalCode)) {
        // Already in correct format
      } 
      // Canadian format: A1A 1A1
      else if (/^[A-Z]\d[A-Z]\s*\d[A-Z]\d$/i.test(fields.postalCode)) {
        fields.postalCode = fields.postalCode.toUpperCase().replace(/\s+/g, ' ');
      }
    }
    
    // Format phone numbers consistently
    if (fields.phoneNumber) {
      // Strip non-digit characters and format as needed
      const digits = fields.phoneNumber.replace(/\D/g, '');
      if (digits.length === 10) {
        fields.phoneNumber = `(${digits.substring(0, 3)}) ${digits.substring(3, 6)}-${digits.substring(6)}`;
      } else if (digits.length === 11 && digits[0] === '1') {
        fields.phoneNumber = `1-${digits.substring(1, 4)}-${digits.substring(4, 7)}-${digits.substring(7)}`;
      }
    }
    
    // Ensure all field keys use standard formats
    const fieldEntries = Object.entries(fields);
    for (const [key, value] of fieldEntries) {
      if (key !== key.trimStart()) {
        fields[key.trimStart()] = value;
        delete fields[key];
      }
    }
  }
}

// Create and export a singleton instance
export const formatConverterDb = new FormatConverterDb(); 
