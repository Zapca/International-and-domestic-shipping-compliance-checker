import { ComplianceResult } from './types';

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

// Definition of field specifications for validation
export interface FieldSpecification {
  name: string;
  required: boolean;
  format: RegExp;
  example: string;
  errorMessage: string;
  transform?: (value: string) => string;
}

// Field specifications for different types of logistics data
const FIELD_SPECIFICATIONS: Record<string, FieldSpecification> = {
  trackingNumber: {
    name: 'Tracking Number',
    required: true,
    format: /^[A-Z0-9]{8,}$/,
    example: 'AB123456789US',
    errorMessage: 'Tracking number must be at least 8 alphanumeric characters',
    transform: (value: string) => value.toUpperCase().replace(/\s/g, '')
  },
  orderNumber: {
    name: 'Order Number',
    required: false,
    format: /^[A-Z0-9-]{5,}$/i,
    example: 'ORD-12345',
    errorMessage: 'Order number must be at least 5 characters (letters, numbers, hyphens)',
    transform: (value: string) => value.toUpperCase().replace(/\s/g, '')
  },
  shipDate: {
    name: 'Ship Date',
    required: true,
    format: /^\d{4}-\d{2}-\d{2}$/,
    example: '2023-04-15',
    errorMessage: 'Ship date must be in YYYY-MM-DD format',
    transform: (value: string) => {
      // Try to convert various date formats to YYYY-MM-DD
      try {
        const dateMatch = value.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
        if (dateMatch) {
          let [, day, month, year] = dateMatch;
          // Handle 2-digit years
          if (year.length === 2) {
            year = `20${year}`;
          }
          // Ensure month and day are two digits
          month = month.padStart(2, '0');
          day = day.padStart(2, '0');
          return `${year}-${month}-${day}`;
        }
        // If no match, try to create a date object and format it
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
        }
      } catch (e) {
        // If parsing fails, return the original value
      }
      return value;
    }
  },
  weight: {
    name: 'Weight',
    required: true,
    format: /^\d+(\.\d+)?\s*(kg|g|lb|lbs|oz)$/i,
    example: '2.5 kg',
    errorMessage: 'Weight must include a number and unit (kg, g, lb, oz)',
    transform: (value: string) => {
      // Normalize weight value
      const match = value.match(/(\d+(?:\.\d+)?)\s*(kg|g|lb|lbs|oz)/i);
      if (match) {
        const [, number, unit] = match;
        // Convert to standard format with single space
        return `${number} ${unit.toLowerCase()}`;
      }
      return value;
    }
  },
  dimensions: {
    name: 'Dimensions',
    required: false,
    format: /^\d+(\.\d+)?\s*x\s*\d+(\.\d+)?\s*x\s*\d+(\.\d+)?\s*(cm|mm|m|in|ft)?$/i,
    example: '20 x 15 x 10 cm',
    errorMessage: 'Dimensions must be in format: [L] x [W] x [H] [unit]',
    transform: (value: string) => {
      // Normalize dimensions format
      const match = value.match(/(\d+(?:\.\d+)?)\s*[x×*]\s*(\d+(?:\.\d+)?)\s*[x×*]\s*(\d+(?:\.\d+)?)\s*(cm|mm|m|in|ft)?/i);
      if (match) {
        const [, length, width, height, unit = ''] = match;
        // Convert to standard format with 'x' between dimensions
        return `${length} x ${width} x ${height}${unit ? ' ' + unit.toLowerCase() : ''}`;
      }
      return value;
    }
  },
  recipientName: {
    name: 'Recipient Name',
    required: true,
    format: /^[A-Za-z\s\-'.]{2,}$/,
    example: 'John Smith',
    errorMessage: 'Recipient name must be at least 2 characters',
    transform: (value: string) => value.trim()
  },
  recipientAddress: {
    name: 'Recipient Address',
    required: true,
    format: /^.{5,}$/,
    example: '123 Main St, Anytown, ST 12345',
    errorMessage: 'Recipient address must be at least 5 characters',
    transform: (value: string) => value.trim()
  },
  shipperName: {
    name: 'Shipper Name',
    required: false,
    format: /^[A-Za-z\s\-'.]{2,}$/,
    example: 'ABC Shipping Co.',
    errorMessage: 'Shipper name must be at least 2 characters',
    transform: (value: string) => value.trim()
  },
  packageType: {
    name: 'Package Type',
    required: false,
    format: /^(box|envelope|tube|pallet|other)$/i,
    example: 'box',
    errorMessage: 'Package type must be one of: box, envelope, tube, pallet, other',
    transform: (value: string) => value.toLowerCase().trim()
  }
};

// Extract structured data from unstructured text using regex patterns
export const extractStructuredData = (text: string): Record<string, string> => {
  const result: Record<string, string> = {};
  
  // Common patterns for logistics data
  const patterns = {
    trackingNumber: /tracking(?:\s+number)?[:\s]+([A-Z0-9]{8,})/i,
    orderNumber: /order(?:\s+number|#|num)?[:\s]+([A-Z0-9-]{5,})/i,
    shipDate: /(?:ship|shipping|sent)?\s*date[:\s]+([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{2,4}|[a-zA-Z]+\s+[0-9]{1,2},?\s+[0-9]{2,4})/i,
    weight: /weight[:\s]+([0-9.]+\s*(?:kg|g|lbs|lb|oz))/i,
    dimensions: /dimensions?[:\s]+([0-9x×*.\s]+(?:cm|mm|m|in|ft)?)/i,
    recipientName: /(?:recipient|to|addressee)[:\s]+([A-Za-z\s\-'.]{2,}?)(?:\r?\n|,)/i,
    recipientAddress: /(?:address|destination)[:\s]+([^,\r\n]+(?:,\s*[^,\r\n]+){2,})/i,
    shipperName: /(?:shipper|from|sender)[:\s]+([A-Za-z\s\-'.]{2,}?)(?:\r?\n|,)/i,
    packageType: /(?:package|parcel)\s+type[:\s]+(\w+)/i,
  };
  
  // Extract data using the patterns
  Object.entries(patterns).forEach(([key, pattern]) => {
    const match = text.match(pattern);
    if (match && match[1]) {
      result[key] = match[1].trim();
    }
  });
  
  return result;
};

// Main function to convert raw input to standard format
export const convertToStandardFormat = (input: RawInputData): FormattedData => {
  const timestamp = new Date().toISOString();
  const warnings: string[] = [];
  let fields: Record<string, string> = {};
  let rawText: string | undefined;
  let confidence = input.metadata?.confidence || 0.5;
  
  switch (input.source) {
    case 'vision':
      // Handle vision model output - could be structured or unstructured
      if (typeof input.content === 'string') {
        rawText = input.content;
        fields = extractStructuredData(input.content);
      } else {
        fields = input.content;
      }
      break;
      
    case 'csv':
      // Handle CSV input - already structured but might need formatting
      if (typeof input.content === 'string') {
        // Parse CSV string into structured data
        const lines = input.content.split('\n');
        if (lines.length > 1) {
          const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
          const values = lines[1].split(',').map(v => v.trim());
          
          headers.forEach((header, index) => {
            if (index < values.length && values[index]) {
              // Map CSV headers to our standardized field names
              const fieldName = Object.keys(FIELD_SPECIFICATIONS).find(
                key => FIELD_SPECIFICATIONS[key].name.toLowerCase() === header
              );
              
              if (fieldName) {
                fields[fieldName] = values[index];
              }
            }
          });
        } else {
          warnings.push('CSV has insufficient data (expected at least header and one data row)');
        }
        rawText = input.content;
      } else {
        fields = input.content;
      }
      break;
      
    case 'manual':
      // Handle manual input - could be free text or JSON
      if (typeof input.content === 'string') {
        // Try to parse as JSON first
        try {
          const jsonData = JSON.parse(input.content);
          fields = jsonData;
        } catch (e) {
          // Not valid JSON, treat as free text
          rawText = input.content;
          fields = extractStructuredData(input.content);
        }
      } else {
        fields = input.content;
      }
      break;
  }
  
  // Apply transformations and standardize field format
  const standardizedFields: Record<string, string> = {};
  
  Object.entries(fields).forEach(([key, value]) => {
    const fieldSpec = FIELD_SPECIFICATIONS[key];
    
    if (fieldSpec) {
      // Apply transformation if available
      let transformedValue = value;
      if (fieldSpec.transform) {
        transformedValue = fieldSpec.transform(value);
      }
      
      standardizedFields[key] = transformedValue;
      
      // Check if the transformed value matches the required format
      if (!fieldSpec.format.test(transformedValue)) {
        warnings.push(`${fieldSpec.name} format may be incorrect: ${fieldSpec.errorMessage}`);
        confidence = Math.max(0.2, confidence - 0.1);
      }
    } else {
      // Keep unknown fields but with a warning
      standardizedFields[key] = value;
      warnings.push(`Unknown field detected: ${key}`);
    }
  });
  
  // Check for required fields
  Object.entries(FIELD_SPECIFICATIONS)
    .filter(([, spec]) => spec.required)
    .forEach(([key, spec]) => {
      if (!standardizedFields[key]) {
        warnings.push(`Required field missing: ${spec.name}`);
        confidence = Math.max(0.2, confidence - 0.2);
      }
    });
  
  return {
    id: `fmt-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    fields: standardizedFields,
    rawText,
    processingMetadata: {
      confidence,
      source: input.source,
      timestamp,
      warnings
    }
  };
};

// Function to validate the formatted data against compliance rules
export const validateCompliance = (formattedData: FormattedData): ComplianceResult[] => {
  const results: ComplianceResult[] = [];
  
  // Validate each field against its specification
  Object.entries(formattedData.fields).forEach(([key, value]) => {
    const fieldSpec = FIELD_SPECIFICATIONS[key];
    
    if (fieldSpec) {
      let status: 'compliant' | 'non-compliant' | 'warning' = 'compliant';
      let message = 'Field validated successfully';
      
      // Check if field matches format
      if (!fieldSpec.format.test(value)) {
        status = 'non-compliant';
        message = fieldSpec.errorMessage;
      }
      
      results.push({
        id: `compliance-${key}-${Date.now()}`,
        field: fieldSpec.name,
        value,
        status,
        message
      });
    } else {
      // For unknown fields, mark as warning
      results.push({
        id: `compliance-unknown-${key}-${Date.now()}`,
        field: key,
        value,
        status: 'warning',
        message: 'Unknown field type, cannot validate format'
      });
    }
  });
  
  // Check for required fields
  Object.entries(FIELD_SPECIFICATIONS)
    .filter(([, spec]) => spec.required)
    .forEach(([key, spec]) => {
      if (!formattedData.fields[key]) {
        results.push({
          id: `compliance-missing-${key}-${Date.now()}`,
          field: spec.name,
          value: 'Missing',
          status: 'non-compliant',
          message: `Required field is missing`
        });
      }
    });
  
  // Add metadata as a result
  results.push({
    id: `compliance-metadata-${Date.now()}`,
    field: 'Processing Confidence',
    value: `${Math.round(formattedData.processingMetadata.confidence * 100)}%`,
    status: formattedData.processingMetadata.confidence > 0.8 ? 'compliant' : 
            formattedData.processingMetadata.confidence > 0.5 ? 'warning' : 'non-compliant',
    message: formattedData.processingMetadata.confidence > 0.8 ? 'High confidence in format conversion' : 
            formattedData.processingMetadata.confidence > 0.5 ? 'Moderate confidence, verify results' : 'Low confidence, manual review required'
  });
  
  return results;
};

// Convenience function to directly process raw input to compliance results
export const processInputToCompliance = (input: RawInputData): {
  formattedData: FormattedData;
  complianceResults: ComplianceResult[];
} => {
  const formattedData = convertToStandardFormat(input);
  const complianceResults = validateCompliance(formattedData);
  
  return {
    formattedData,
    complianceResults
  };
}; 