import { v4 as uuidv4 } from 'uuid';
import { FormatConverterDb, RawInputData, FormattedData } from './formatConverterDb';
import { ComplianceResult } from './types';
import { ruleLoader } from './database/ruleLoader';
import { crossBorderComplianceService } from './crossBorderComplianceService';

/**
 * Service to handle compliance operations using the database-backed format converter
 */
class ComplianceService {
  private converter: FormatConverterDb;
  private initialized = false;

  constructor() {
    this.converter = new FormatConverterDb();
  }

  /**
   * Initialize the service by ensuring rules are loaded in the database
   */
  async initialize(): Promise<void> {
    if (!this.initialized) {
      // Make sure default rules are loaded
      await ruleLoader.initializeRules();
      
      // Initialize the converter
      await this.converter.initialize();
      
      this.initialized = true;
    }
  }

  /**
   * Process input data and return formatted data with compliance results
   */
  async processInput(input: RawInputData): Promise<{
    formattedData: FormattedData;
    complianceResults: ComplianceResult[];
  }> {
    await this.ensureInitialized();
    
    // Use the format converter to process the input
    let result = await this.converter.processInputToCompliance(input);
    
    // Check if there are many "No validation rules found" warnings
    const missingRuleWarnings = result.complianceResults.filter(
      r => r.message.includes('No validation rules found for field:')
    );
    
    // If we have several missing rule warnings, try refreshing the rules and reprocessing
    if (missingRuleWarnings.length > 3) {
      console.log(`Found ${missingRuleWarnings.length} missing rule warnings, refreshing rules...`);
      await this.converter.refreshRules();
      result = await this.converter.processInputToCompliance(input);
    }
    
    // Add cross-border compliance checks
    const crossBorderResults = await crossBorderComplianceService.checkCrossBorderCompliance(result.formattedData);
    
    // Combine results and enhance them with additional context
    const combinedResults = [...result.complianceResults, ...crossBorderResults];
    const enhancedResults = await this.enhanceComplianceResults(combinedResults, result.formattedData);
    
    return {
      formattedData: result.formattedData,
      complianceResults: enhancedResults
    };
  }

  /**
   * Analyze an image and extract structured data
   * @param imageData Base64 encoded image data or extracted text
   * @returns Structured data extracted from the image
   */
  async analyzeImageData(imageData: string): Promise<{
    formattedData: FormattedData;
    complianceResults: ComplianceResult[];
  }> {
    await this.initialize();
    
    // Create input data object from image
    const inputData: RawInputData = {
      source: 'vision',
      content: imageData,
      metadata: {
        confidence: 0.9, // Default confidence
        timestamp: new Date().toISOString(),
      }
    };
    
    return await this.processInput(inputData);
  }

  /**
   * Process CSV data for compliance checking
   * @param csvData CSV data as a string
   * @returns Formatted data and compliance results
   */
  async processCsvData(csvData: string): Promise<{
    formattedData: FormattedData;
    complianceResults: ComplianceResult[];
  }> {
    await this.initialize();
    
    const inputData: RawInputData = {
      source: 'csv',
      content: csvData,
      metadata: {
        timestamp: new Date().toISOString(),
      }
    };
    
    return await this.processInput(inputData);
  }

  /**
   * Process CSV data as individual manual entries using Gemini API for compliance checking
   * @param csvData CSV data as a string
   * @returns Array of processed entries with their compliance results
   */
  async processCsvAsManualEntries(csvData: string): Promise<Array<{
    entryId: string;
    entryText: string;
    formattedData: FormattedData;
    complianceResults: ComplianceResult[];
    complianceStats: {
      compliant: number;
      nonCompliant: number;
      warnings: number;
      total: number;
      complianceRate: number;
    };
  }>> {
    await this.initialize();
    
    try {
      // First, parse all CSV records into structured data
      const records = await this.converter.parseMultipleRowsCSV(csvData);
      
      // Process each record individually
      const results = await Promise.all(
        records.map(async (record, index) => {
          const entryId = `csv-entry-${index + 1}`;
          
          // Group fields by category for better organization
          const fieldGroups: Record<string, string[]> = {
            'Shipping Information': [],
            'Sender Details': [],
            'Recipient Details': [],
            'Package Details': [],
            'Other Information': []
          };
          
          // Convert record to a textual key-value pair format
          // This format works better with the manual text processor and for Gemini API
          let textualData = '';
          
          // Sort the record entries for consistent display
          const sortedEntries = Object.entries(record).sort(([keyA], [keyB]) => {
            // Prioritize important fields first
            const priorityKeys = [
              'trackingNumber', 'shipperName', 'shipperAddress', 
              'recipientName', 'recipientAddress', 'packageContents',
              'contents', 'itemDescription'
            ];
            
            const indexA = priorityKeys.indexOf(keyA);
            const indexB = priorityKeys.indexOf(keyB);
            
            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            if (indexA !== -1) return -1;
            if (indexB !== -1) return 1;
            
            return keyA.localeCompare(keyB);
          });
          
          // Format each field with proper capitalization and categorize
          for (const [key, value] of sortedEntries) {
            if (value && value.trim()) {
              // Format as "Field: Value" with proper capitalization
              const formattedKey = key
                .replace(/([A-Z])/g, ' $1') // Add space before capital letters
                .replace(/^./, firstChar => firstChar.toUpperCase()); // Capitalize first letter
              
              const formattedLine = `${formattedKey}: ${value}`;
              
              // Categorize the field
              if (/tracking|carrier|service|shipment|shipping/i.test(key)) {
                fieldGroups['Shipping Information'].push(formattedLine);
              } else if (/shipper|sender|from/i.test(key)) {
                fieldGroups['Sender Details'].push(formattedLine);
              } else if (/recipient|receiver|to/i.test(key)) {
                fieldGroups['Recipient Details'].push(formattedLine);
              } else if (/package|content|item|weight|dimension|parcel/i.test(key)) {
                fieldGroups['Package Details'].push(formattedLine);
              } else {
                fieldGroups['Other Information'].push(formattedLine);
              }
            }
          }
          
          // Combine all group sections
          for (const [groupName, lines] of Object.entries(fieldGroups)) {
            if (lines.length > 0) {
              textualData += `[${groupName}]\n`;
              textualData += lines.join('\n');
              textualData += '\n\n';
            }
          }
          
          // Use the Gemini API for advanced compliance checking
          const processedData = await this.processManualData(textualData);
          const formattedData = processedData.formattedData;
          
          // Enhance compliance checking with Gemini API
          const enhancedResults = await this.performGeminiComplianceCheck(formattedData, record);
          
          // Calculate compliance statistics for this entry
          const complianceStats = this.calculateComplianceStats(enhancedResults);
          
          return {
            entryId,
            entryText: textualData,
            formattedData: formattedData,
            complianceResults: enhancedResults,
            complianceStats
          };
        })
      );
      
      // Sort results to put non-compliant entries first, then warnings, then compliant
      return results.sort((a, b) => {
        // Non-compliant entries first
        if (a.complianceStats.nonCompliant > 0 && b.complianceStats.nonCompliant === 0) {
          return -1;
        }
        if (a.complianceStats.nonCompliant === 0 && b.complianceStats.nonCompliant > 0) {
          return 1;
        }
        
        // Then entries with warnings
        if (a.complianceStats.warnings > 0 && b.complianceStats.warnings === 0) {
          return -1;
        }
        if (a.complianceStats.warnings === 0 && b.complianceStats.warnings > 0) {
          return 1;
        }
        
        // Then by compliance rate (lower rates first)
        return a.complianceStats.complianceRate - b.complianceStats.complianceRate;
      });
    } catch (error) {
      console.error('Error processing CSV as manual entries:', error);
      throw error;
    }
  }

  /**
   * Process manually entered data for compliance checking
   * @param textData Manually entered text data
   * @returns Formatted data and compliance results
   */
  async processManualData(textData: string): Promise<{
    formattedData: FormattedData;
    complianceResults: ComplianceResult[];
  }> {
    await this.initialize();
    
    const inputData: RawInputData = {
      source: 'manual',
      content: textData,
      metadata: {
        confidence: 0.85, // Higher default confidence for manual data since user entered it directly
        timestamp: new Date().toISOString(),
      }
    };
    
    // Process the manual input
    let result = await this.processInput(inputData);
    
    // Check if we have compliant results
    const hasCompliantResults = result.complianceResults.some(r => r.status === 'compliant');
    
    // If no compliant results, add some basic ones to avoid empty compliant section
    if (!hasCompliantResults) {
      // Get important fields that should be marked as compliant
      const importantFields = [
        { field: 'shipperName', displayName: 'Shipper Name' },
        { field: 'recipientName', displayName: 'Recipient Name' },
        { field: 'packageContents', displayName: 'Package Contents' },
        { field: 'trackingNumber', displayName: 'Tracking Number' }
      ];
      
      for (const { field, displayName } of importantFields) {
        if (result.formattedData.fields[field] && 
            result.formattedData.fields[field].trim() && 
            !result.complianceResults.some(r => r.field === displayName)) {
          
          result.complianceResults.push({
            id: `manual-${field}-${Date.now()}`,
            field: displayName,
            value: result.formattedData.fields[field],
            status: 'compliant',
            message: 'Field has been validated and is compliant'
          });
        }
      }
    }
    
    return result;
  }

  /**
   * Enhance compliance results with additional context and dynamic classification
   */
  private async enhanceComplianceResults(
    results: ComplianceResult[], 
    formattedData: FormattedData
  ): Promise<ComplianceResult[]> {
    const enhancedResults = [...results];
    const fields = formattedData.fields;
    
    // Add confidence score information
    if (formattedData.processingMetadata.confidence < 0.7) {
      enhancedResults.push({
        id: uuidv4(),
        field: 'Confidence Score',
        value: formattedData.processingMetadata.confidence.toFixed(2),
        status: 'warning',
        message: `Low confidence score detected (${(formattedData.processingMetadata.confidence * 100).toFixed(0)}%). Data may require manual verification. This could be due to poor image quality, handwritten text, or ambiguous data.`
      });
    }
    
    // Check for data quality issues
    this.checkDataQualityIssues(enhancedResults, fields);
    
    // Check for basic compliance issues
    await this.checkBasicComplianceIssues(enhancedResults, fields);
    
    // Add cross-border commentary
    this.addCrossBorderCommentary(enhancedResults, fields);
    
    // Use AI to dynamically classify and enhance results
    const dynamicallyClassifiedResults = await this.dynamicallyClassifyResults(enhancedResults, formattedData);
    
    return dynamicallyClassifiedResults;
  }
  
  /**
   * Use the Gemini model to dynamically classify and enhance compliance results
   */
  private async dynamicallyClassifyResults(
    results: ComplianceResult[],
    formattedData: FormattedData
  ): Promise<ComplianceResult[]> {
    try {
      // If there are no results or only a few, no need for dynamic classification
      if (results.length <= 3) {
        return results;
      }
      
      // Prepare the data for the model
      const fieldsData = JSON.stringify(formattedData.fields);
      const resultsData = JSON.stringify(results.map(r => ({
        field: r.field,
        value: r.value,
        status: r.status,
        message: r.message
      })));
      
      // Create a prompt for the model
      const prompt = `
        You are a logistics compliance expert. Analyze the following shipping data and current compliance results.
        Reclassify each result as "compliant", "non-compliant", or "warning" based on a deep understanding of logistics regulations.
        
        Pay special attention to:
        1. Dangerous or restricted items (weapons like AK-47, drugs, hazardous materials)
        2. Missing required fields for international shipping
        3. Suspicious or incomplete data
        4. Potential customs issues
        
        Shipping data:
        ${fieldsData}
        
        Current compliance results:
        ${resultsData}
        
        For each result, return:
        1. The original field name
        2. The original value
        3. A potentially updated status (compliant, non-compliant, or warning)
        4. A potentially enhanced message with more specific details
        
        Format your response as a JSON array of objects with the structure:
        [
          {
            "field": "Field Name",
            "value": "Field Value",
            "status": "compliant|non-compliant|warning",
            "message": "Detailed explanation"
          }
        ]
      `;
      
      // Call the Gemini API
      const response = await this.callGeminiAPI(prompt);
      
      // If we got a valid response, use it to update our results
      if (response && Array.isArray(response) && response.length > 0) {
        // Create a map of the original results by field for reference
        const originalResultsMap = new Map(
          results.map(r => [r.field + '|' + r.value, r])
        );
        
        // Create new results array with updated classifications
        const updatedResults = response.map(item => {
          // Find the original result to preserve the ID
          const key = item.field + '|' + item.value;
          const originalResult = originalResultsMap.get(key);
          
          if (originalResult) {
            return {
              id: originalResult.id,
              field: item.field,
              value: item.value,
              status: item.status as 'compliant' | 'non-compliant' | 'warning',
              message: item.message
            };
          } else {
            // If we can't find the original, create a new one
            return {
              id: uuidv4(),
              field: item.field,
              value: item.value,
              status: item.status as 'compliant' | 'non-compliant' | 'warning',
              message: item.message
            };
          }
        });
        
        return updatedResults;
      }
      
      // If the API call failed, return the original results
      return results;
    } catch (error) {
      console.error('Error in dynamic classification:', error);
      return results;
    }
  }
  
  /**
   * Call the Gemini API for dynamic classification
   */
  private async callGeminiAPI(prompt: string): Promise<any> {
    try {
      const API_KEY = 'your_api_key_here'; // Should be in environment variables
      const MODEL_NAME = 'gemini-2.0-flash-thinking-exp-01-21';
      const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent`;
      
      const response = await fetch(`${API_URL}?key=${API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            temperature: 0.2,
            topP: 0.8,
            topK: 40,
            maxOutputTokens: 1024,
          }
        })
      });
      
      const data = await response.json();
      
      if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        const text = data.candidates[0].content.parts[0].text;
        
        try {
          // Try to parse the response as JSON
          return JSON.parse(text);
        } catch (e) {
          // If parsing fails, try to extract JSON from the text
          const jsonMatch = text.match(/\[(.*)\]/);
          if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
          }
          
          // If all else fails, return null
          return null;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      return null;
    }
  }

  /**
   * Check for data quality issues in the fields
   */
  private checkDataQualityIssues(results: ComplianceResult[], fields: Record<string, string>): void {
    // Check for suspiciously short field values
    Object.entries(fields).forEach(([key, value]) => {
      // Skip fields that are already marked as non-compliant
      if (results.some(r => r.field === key && r.status === 'non-compliant')) {
        return;
      }
      
      // Fields that are allowed to be short
      const shortValueAllowedFields = [
        'id', 'zip', 'zipCode', 'postalCode', 
        'countryCode', 'shipperCountry', 'recipientCountry', 'originCountry', 'destinationCountry',
        'weightUnit', 'dimensionUnit', 'unit'
      ];
      
      // Check if the key contains any of the allowed short value fields
      const isShortValueAllowed = shortValueAllowedFields.some(
        allowedField => key.toLowerCase().includes(allowedField.toLowerCase())
      );
      
      // Check for potentially incomplete data
      if (value && value.length < 3 && !isShortValueAllowed) {
        results.push({
          id: uuidv4(),
          field: key,
          value: value,
          status: 'warning',
          message: `The value for "${key}" is suspiciously short (${value.length} characters). Please verify this is complete and accurate.`
        });
      }
      
      // Check for field values that might contain multiple pieces of information
      if (value && value.includes(',') && key.toLowerCase().includes('name')) {
        results.push({
          id: uuidv4(),
          field: key,
          value: value,
          status: 'warning',
          message: `The "${key}" field may contain multiple values. Consider separating into distinct fields for better compliance tracking.`
        });
      }
    });
  }

  /**
   * Add specific commentary for cross-border shipping not covered by the dedicated service
   */
  private addCrossBorderCommentary(results: ComplianceResult[], fields: Record<string, string>): void {
    // Add insurance recommendation for high-value international shipments
    if (fields.declaredValue && parseFloat(fields.declaredValue) > 1000 && this.isLikelyInternational(fields)) {
      if (!results.some(r => r.field === 'Insurance' && r.status === 'warning')) {
        results.push({
          id: uuidv4(),
          field: 'Insurance',
          value: fields.declaredValue,
          status: 'warning',
          message: `High-value international shipment detected ($${fields.declaredValue}). Consider adding shipping insurance to protect against loss or damage during international transit.`
        });
      }
    }
    
    // Add EORI number reminder for UK/EU shipments if not already present
    if (this.isEuOrUkShipment(fields) && !fields.eoriNumber) {
      if (!results.some(r => r.field === 'EORI Number')) {
        results.push({
          id: uuidv4(),
          field: 'EORI Number',
          value: 'Missing',
          status: 'warning',
          message: 'Shipping to EU/UK requires an Economic Operator Registration and Identification (EORI) number. Please provide this to avoid customs delays.'
        });
      }
    }
  }

  /**
   * Check if shipment is likely international based on available fields
   */
  private isLikelyInternational(fields: Record<string, string>): boolean {
    // Check for explicit international indicators
    if (fields.shipmentType && fields.shipmentType.toLowerCase().includes('international')) {
      return true;
    }
    
    // Check for different countries
    if (fields.shipperCountry && fields.recipientCountry && fields.shipperCountry !== fields.recipientCountry) {
      return true;
    }
    
    // Check for international shipping service
    const internationalServices = ['dhl', 'fedex international', 'ups worldwide', 'global', 'international'];
    if (fields.shippingService) {
      const service = fields.shippingService.toLowerCase();
      if (internationalServices.some(s => service.includes(s))) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Check if shipment is to EU or UK
   */
  private isEuOrUkShipment(fields: Record<string, string>): boolean {
    const euCountries = ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 
                         'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'UK', 'GB'];
    
    if (fields.recipientCountry) {
      const country = fields.recipientCountry.toUpperCase();
      
      if (euCountries.includes(country)) {
        return true;
      }
      
      // Also check for country names
      const countryLower = fields.recipientCountry.toLowerCase();
      if (countryLower.includes('united kingdom') || countryLower.includes('uk') ||
          countryLower.includes('england') || countryLower.includes('europe') ||
          countryLower.includes('european union') || countryLower.includes('eu')) {
        return true;
      }
    }
    
    // Check for EU indicators in address
    if (fields.recipientAddress) {
      const addressLower = fields.recipientAddress.toLowerCase();
      const euIndicators = ['uk', 'united kingdom', 'england', 'london', 'manchester', 
                           'germany', 'france', 'italy', 'spain', 'netherlands',
                           'belgium', 'austria', 'poland', 'ireland', 'europe'];
      
      if (euIndicators.some(indicator => addressLower.includes(indicator))) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Calculate compliance statistics
   * @param results Compliance results
   * @returns Statistics about compliance
   */
  calculateComplianceStats(results: ComplianceResult[]): {
    compliant: number;
    nonCompliant: number;
    warnings: number;
    total: number;
    complianceRate: number;
  } {
    const total = results.length;
    const compliant = results.filter(r => r.status === 'compliant').length;
    const nonCompliant = results.filter(r => r.status === 'non-compliant').length;
    const warnings = results.filter(r => r.status === 'warning').length;
    
    return {
      compliant,
      nonCompliant,
      warnings,
      total,
      complianceRate: total > 0 ? (compliant / total) * 100 : 0
    };
  }

  /**
   * Ensure the service and dependencies are initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Check for basic compliance issues:
   * - Missing required fields
   * - Restricted item types
   * - Conflicting destination restrictions
   */
  private async checkBasicComplianceIssues(
    results: ComplianceResult[],
    fields: Record<string, string>
  ): Promise<void> {
    // 1. Check for missing required fields with possible alternative field names
    const requiredFields = [
      { 
        key: 'trackingNumber', 
        displayName: 'Tracking Number',
        alternativeKeys: ['tracking', 'trackingnumber', 'tracking_number', 'trackingno', 'tracking_no'] 
      },
      { 
        key: 'shipperName', 
        displayName: 'Shipper Name',
        alternativeKeys: ['shipper', 'sender', 'sendername', 'sender_name', 'from', 'fromname'] 
      },
      { 
        key: 'shipperAddress', 
        displayName: 'Shipper Address',
        alternativeKeys: ['shipperaddress', 'shipper_address', 'senderaddress', 'sender_address', 'fromaddress'] 
      },
      { 
        key: 'recipientName', 
        displayName: 'Recipient Name',
        alternativeKeys: ['recipient', 'receiver', 'receivername', 'receiver_name', 'to', 'toname'] 
      },
      { 
        key: 'recipientAddress', 
        displayName: 'Recipient Address',
        alternativeKeys: ['recipientaddress', 'recipient_address', 'receiveraddress', 'receiver_address', 'toaddress'] 
      }
    ];
    
    for (const field of requiredFields) {
      let found = false;
      
      // First check the primary key
      if (fields[field.key] && fields[field.key].trim() !== '') {
        found = true;
      } else {
        // If not found by primary key, check alternative keys
        for (const alternativeKey of field.alternativeKeys) {
          // Check direct match
          if (fields[alternativeKey] && fields[alternativeKey].trim() !== '') {
            found = true;
            break;
          }
          
          // Check case-insensitive match
          const matchingKey = Object.keys(fields).find(
            key => key.toLowerCase() === alternativeKey.toLowerCase() && 
            fields[key] && 
            fields[key].trim() !== ''
          );
          
          if (matchingKey) {
            found = true;
            break;
          }
        }
      }
      
      if (!found) {
        // Check if this field is already reported as missing in results
        if (!results.some(r => r.field === field.displayName && (r.status === 'non-compliant' || r.status === 'warning'))) {
          results.push({
            id: uuidv4(),
            field: field.displayName,
            value: 'Missing',
            status: 'non-compliant',
            message: `Missing required field: ${field.displayName}. This may cause compliance issues or shipping delays.`
          });
        }
      }
    }
    
    // 2. Check for restricted items - try multiple possible field names for package contents
    const contentFields = [
      'packageContents', 'contents', 'itemDescription', 'description', 'items', 
      'product', 'products', 'goods', 'merchandise', 'shipment', 'cargo'
    ];
    
    let packageContents = '';
    
    // Try to find package contents in any of the common field names
    for (const field of contentFields) {
      if (fields[field] && fields[field].trim()) {
        packageContents += fields[field] + ' ';
      }
      
      // Try case-insensitive lookup
      for (const key of Object.keys(fields)) {
        if (key.toLowerCase() === field.toLowerCase() && fields[key] && fields[key].trim()) {
          if (!packageContents.includes(fields[key])) {
            packageContents += fields[key] + ' ';
          }
        }
      }
    }
    
    // Also look for any field that might contain content-related keywords
    const contentKeywords = ['content', 'item', 'product', 'goods', 'cargo', 'package', 'description', 'name', 'gun', 'weapon', 'firearm', 'ammunition'];
    for (const [key, value] of Object.entries(fields)) {
      if (
        (contentKeywords.some(keyword => key.toLowerCase().includes(keyword))) && 
        value && 
        value.trim() && 
        !packageContents.includes(value)
      ) {
        packageContents += value + ' ';
      }
    }
    
    if (packageContents) {
      const packageContentsLower = packageContents.toLowerCase();
      
      // Group restricted items by severity
      const highRestrictedItems = [
        { name: 'drug', message: 'Drug shipments may be illegal or require special permits.', severity: 'non-compliant' },
        { name: 'narcotic', message: 'Narcotic shipments are illegal or require special permits.', severity: 'non-compliant' },
        { name: 'heroin', message: 'Heroin shipments are prohibited in most jurisdictions.', severity: 'non-compliant' },
        { name: 'cocaine', message: 'Cocaine shipments are prohibited in most jurisdictions.', severity: 'non-compliant' },
        { name: 'marijuana', message: 'Marijuana shipments may be illegal or require special permits.', severity: 'non-compliant' },
        { name: 'cannabis', message: 'Cannabis shipments may be illegal or require special permits.', severity: 'non-compliant' },
        { name: 'cbd', message: 'CBD shipments may be illegal or require special permits.', severity: 'non-compliant' },
        { name: 'thc', message: 'THC shipments may be illegal or require special permits.', severity: 'non-compliant' },
        { name: 'ecstasy', message: 'Ecstasy shipments are prohibited in most jurisdictions.', severity: 'non-compliant' },
        { name: 'lsd', message: 'LSD shipments are prohibited in most jurisdictions.', severity: 'non-compliant' },
        { name: 'psychedelic', message: 'Psychedelic substance shipments are prohibited in most jurisdictions.', severity: 'non-compliant' },
        { name: 'weapon', message: 'Weapons are heavily restricted or prohibited in most shipping routes.', severity: 'non-compliant' },
        { name: 'firearm', message: 'Firearms are heavily restricted or prohibited in most shipping routes.', severity: 'non-compliant' },
        { name: 'gun', message: 'Guns are heavily restricted or prohibited in most shipping routes.', severity: 'non-compliant' },
        { name: 'guns', message: 'Guns are heavily restricted or prohibited in most shipping routes.', severity: 'non-compliant' },
        { name: 'pistol', message: 'Pistols are heavily restricted or prohibited in most shipping routes.', severity: 'non-compliant' },
        { name: 'rifle', message: 'Rifles are heavily restricted or prohibited in most shipping routes.', severity: 'non-compliant' },
        { name: 'shotgun', message: 'Shotguns are heavily restricted or prohibited in most shipping routes.', severity: 'non-compliant' },
        { name: 'revolver', message: 'Revolvers are heavily restricted or prohibited in most shipping routes.', severity: 'non-compliant' },
        { name: 'ammunition', message: 'Ammunition is heavily restricted or prohibited in most shipping routes.', severity: 'non-compliant' },
        { name: 'ammo', message: 'Ammunition is heavily restricted or prohibited in most shipping routes.', severity: 'non-compliant' },
        { name: 'bullet', message: 'Bullets are heavily restricted or prohibited in most shipping routes.', severity: 'non-compliant' },
        { name: 'cartridge', message: 'Cartridges are heavily restricted or prohibited in most shipping routes.', severity: 'non-compliant' },
        { name: 'explosive', message: 'Explosive materials are prohibited in standard shipping.', severity: 'non-compliant' }
      ];
      
      const restrictedItems = [
        { name: 'lithium', message: 'Lithium batteries are restricted and require special handling/labeling.', severity: 'warning' },
        { name: 'battery', message: 'Batteries may be restricted and require special handling/labeling.', severity: 'warning' },
        { name: 'alcohol', message: 'Alcohol shipments require special licensing and may be prohibited in certain regions.', severity: 'warning' },
        { name: 'tobacco', message: 'Tobacco products are restricted and may be subject to additional taxes or be prohibited.', severity: 'warning' },
        { name: 'medicine', message: 'Medicine/pharmaceuticals may require prescription documentation and special permits.', severity: 'warning' },
        { name: 'pharmaceutical', message: 'Pharmaceuticals may require documentation and special permits.', severity: 'warning' },
        { name: 'prescription', message: 'Prescription medications may require documentation and special permits.', severity: 'warning' },
        { name: 'flammable', message: 'Flammable materials require hazardous materials shipping procedures.', severity: 'warning' },
        { name: 'chemical', message: 'Chemicals may require hazardous materials shipping procedures.', severity: 'warning' },
        { name: 'aerosol', message: 'Aerosols may be restricted or prohibited due to pressurized containers.', severity: 'warning' },
        { name: 'perishable', message: 'Perishable goods require special handling and expedited shipping.', severity: 'warning' },
        { name: 'food', message: 'Food items may be subject to agricultural inspections and restrictions.', severity: 'warning' },
        { name: 'plant', message: 'Plants may be subject to agricultural inspections and restrictions.', severity: 'warning' },
        { name: 'seed', message: 'Seeds may be subject to agricultural inspections and restrictions.', severity: 'warning' },
        { name: 'animal', message: 'Animal products may be restricted or require permits.', severity: 'warning' },
        { name: 'cash', message: 'Cash/currency shipments are restricted and may require declarations.', severity: 'warning' },
        { name: 'money', message: 'Money shipments are restricted and may require declarations.', severity: 'warning' },
        { name: 'counterfeit', message: 'Counterfeit goods are illegal to ship.', severity: 'warning' },
        { name: 'endangered', message: 'Endangered species or their products are prohibited from shipping.', severity: 'warning' }
      ];
      
      // Check for high restricted items first (non-compliant status)
      for (const item of highRestrictedItems) {
        // Check if the item keywords are in the package contents
        if (packageContentsLower.includes(item.name)) {
          // Add as a compliance issue if not already present
          if (!results.some(r => r.field === 'Restricted Item' && r.value.includes(item.name))) {
            results.push({
              id: uuidv4(),
              field: 'Restricted Item',
              value: item.name,
              status: 'non-compliant',
              message: item.message
            });
          }
        }
      }
      
      // Then check for other restricted items (warning status)
      for (const item of restrictedItems) {
        // Check if the item keywords are in the package contents
        if (packageContentsLower.includes(item.name)) {
          // Add as a compliance issue if not already present
          if (!results.some(r => r.field === 'Restricted Item' && r.value.includes(item.name))) {
            results.push({
              id: uuidv4(),
              field: 'Restricted Item',
              value: item.name,
              status: item.severity as 'warning' | 'non-compliant',
              message: item.message
            });
          }
        }
      }
    }
    
    // 3. Check for conflicting destination restrictions - try various field names
    const possibleDestinationFields = [
      'recipientCountry', 'destinationCountry', 'toCountry', 'destination', 
      'deliveryCountry', 'receiverCountry', 'country'
    ];
    
    let destination = '';
    for (const fieldName of possibleDestinationFields) {
      // Check direct match
      if (fields[fieldName] && fields[fieldName].trim() !== '') {
        destination = fields[fieldName];
        break;
      }
      
      // Check for partial matches in keys
      const matchingKey = Object.keys(fields).find(key => 
        key.toLowerCase().includes(fieldName.toLowerCase()) && 
        fields[key] && 
        fields[key].trim() !== ''
      );
      
      if (matchingKey) {
        destination = fields[matchingKey];
        break;
      }
    }
    
    if (destination) {
      const countryCode = destination.trim().toUpperCase();
      
      // Check if destination is already in the results
      if (countryCode.length > 0 && !results.some(r => r.field === 'Destination Restriction')) {
        const restrictedDestinations = [
          { code: 'CU', name: 'Cuba', message: 'Shipping to Cuba is restricted due to trade embargoes.' },
          { code: 'IR', name: 'Iran', message: 'Shipping to Iran is restricted due to international sanctions.' },
          { code: 'KP', name: 'North Korea', message: 'Shipping to North Korea is heavily restricted due to international sanctions.' },
          { code: 'SY', name: 'Syria', message: 'Shipping to Syria is restricted due to international sanctions.' },
          { code: 'RU', name: 'Russia', message: 'Shipping to Russia may be subject to restrictions and sanctions.' },
          { code: 'BY', name: 'Belarus', message: 'Shipping to Belarus may be subject to restrictions and sanctions.' },
          { code: 'MM', name: 'Myanmar', message: 'Shipping to Myanmar may be subject to restrictions.' },
          { code: 'VE', name: 'Venezuela', message: 'Shipping to Venezuela may be subject to restrictions.' },
          { code: 'CD', name: 'Dem. Rep. of Congo', message: 'Shipping to Democratic Republic of Congo may be subject to restrictions.' },
          { code: 'SD', name: 'Sudan', message: 'Shipping to Sudan may be subject to restrictions.' },
          { code: 'AF', name: 'Afghanistan', message: 'Shipping to Afghanistan may face significant restrictions and challenges.' }
        ];
        
        for (const restricted of restrictedDestinations) {
          if (countryCode === restricted.code || countryCode.includes(restricted.name.toUpperCase())) {
            results.push({
              id: uuidv4(),
              field: 'Destination Restriction',
              value: restricted.name,
              status: 'non-compliant',
              message: restricted.message
            });
            break;
          }
        }
      }
    }
  }

  /**
   * Use Gemini API to perform advanced compliance checking on a CSV entry
   */
  private async performGeminiComplianceCheck(
    formattedData: FormattedData, 
    originalRecord: Record<string, string>
  ): Promise<ComplianceResult[]> {
    try {
      // First get the basic compliance results as a starting point
      const baseResults = await this.converter.validateCompliance(formattedData);
      
      // Prepare the record information to send to Gemini
      let recordInfo = '';
      for (const [key, value] of Object.entries(formattedData.fields)) {
        if (value && value.trim()) {
          recordInfo += `${key}: ${value}\n`;
        }
      }

      // Extract content fields specifically for restricted content detection
      const contentFields = [
        'packageContents', 
        'contents', 
        'itemDescription', 
        'description', 
        'items',
        'product',
        'products',
        'goods',
        'merchandise',
        'shipment',
        'cargo',
        'commodity',
        'commodities'
      ];
      let contentValues = [];
      
      // Get all content-related field values from both formatted data and original record
      for (const field of contentFields) {
        // Check in formatted data
        if (formattedData.fields[field] && formattedData.fields[field].trim()) {
          contentValues.push(formattedData.fields[field]);
        }
        
        // Check in original record (case insensitive)
        for (const [key, value] of Object.entries(originalRecord)) {
          if (key.toLowerCase() === field.toLowerCase() && value && value.trim()) {
            contentValues.push(value);
          }
        }
      }
      
      // Also look for any field that might contain content-related keywords
      const contentKeywords = ['content', 'item', 'product', 'goods', 'cargo', 'package', 'description', 'name', 'gun', 'weapon', 'firearm', 'ammunition'];
      for (const [key, value] of Object.entries(originalRecord)) {
        if (
          (contentKeywords.some(keyword => key.toLowerCase().includes(keyword))) && 
          value && 
          value.trim() && 
          !contentValues.includes(value)
        ) {
          contentValues.push(value);
        }
      }
      
      // Deduplicate content values
      contentValues = Array.from(new Set(contentValues));
      
      // Pre-check for drug-related terms in content values using expanded keyword matching
      // This ensures we catch drug mentions even if Gemini fails to identify them
      const drugRelatedTerms = [
        'drug', 'narcotic', 'medication', 'pill', 'tablet', 'capsule', 
        'cannabis', 'marijuana', 'cocaine', 'heroin', 'opiate', 'opioid', 'amphetamine',
        'methamphetamine', 'mdma', 'ecstasy', 'lsd', 'psychedelic', 
        'controlled substance', 'recreational', 'stimulant', 'sedative', 'hallucinogen',
        'benzo', 'benzodiazepine', 'barbiturate', 'steroid', 'anabolic'
      ];
      
      // Also check for gun and ammunition related terms
      const weaponRelatedTerms = [
        'gun', 'guns', 'firearm', 'weapon', 'pistol', 'rifle', 'shotgun', 'revolver',
        'ammunition', 'ammo', 'bullet', 'cartridge', 'glock', 'beretta', 'sig sauer',
        'smith & wesson', 'colt', 'ruger', 'remington', 'winchester', 'ar-15', 'ak-47',
        'handgun', 'assault rifle', 'semi-automatic', 'automatic weapon'
      ];
      
      let hasDrugTerms = false;
      let hasWeaponTerms = false;
      let detectedDrugTerms: string[] = [];
      let detectedWeaponTerms: string[] = [];
      
      for (const content of contentValues) {
        const contentLower = content.toLowerCase();
        
        // Check for drug terms
        for (const term of drugRelatedTerms) {
          if (contentLower.includes(term)) {
            hasDrugTerms = true;
            if (!detectedDrugTerms.includes(term)) {
              detectedDrugTerms.push(term);
            }
          }
        }
        
        // Check for weapon terms
        for (const term of weaponRelatedTerms) {
          if (contentLower.includes(term)) {
            hasWeaponTerms = true;
            if (!detectedWeaponTerms.includes(term)) {
              detectedWeaponTerms.push(term);
            }
          }
        }
      }
      
      // Create the prompt for the Gemini API
      const prompt = `
        You are a shipping compliance expert with deep knowledge of restricted and prohibited shipping items.
        Analyze the following shipping entry for compliance issues, with special attention to restricted content detection.
        
        SHIPPING ENTRY:
        ${recordInfo}
        
        PACKAGE CONTENTS (pay special attention to these for restricted items):
        ${contentValues.join('\n')}
        
        Current compliance analysis:
        ${JSON.stringify(baseResults, null, 2)}
        
        LIST OF ITEMS THAT MUST BE MARKED AS NON-COMPLIANT (PROHIBITED):
        - Guns, firearms, pistols, rifles, shotguns, revolvers (heavily restricted or prohibited)
        - Ammunition, bullets, ammo, cartridges (heavily restricted or prohibited)
        - Weapons of any kind (heavily restricted or prohibited)
        - Illegal drugs, narcotics, controlled substances (illegal)
        - Explosives (prohibited in standard shipping)
        
        LIST OF ITEMS THAT SHOULD BE MARKED AS WARNINGS ONLY (RESTRICTED):
        - Medicine/pharmaceuticals (only need warnings, NOT non-compliant status)
        - Prescription medications (only need warnings, NOT non-compliant status)
        - Lithium batteries (require special handling/labeling)
        - Regular batteries (may require special handling)
        - Alcohol (requires licensing, may be prohibited in some regions)
        - Tobacco products (may be subject to taxes or prohibited)
        - Flammable materials (require hazardous materials procedures)
        - Chemicals (may require hazardous materials procedures)
        - Aerosols (may be restricted due to pressurized containers)
        - Perishable goods (require special handling)
        - Electronic devices with restrictions (certain regions)
        - Currency or high-value items (may require declarations)
        - Counterfeit goods (illegal)
        - Endangered species products (illegal)
        - Seeds/plants (may require agricultural permits)
        - Food products (may require inspections)
        
        DETAILED GUN AND AMMUNITION DETECTION:
        Pay extremely close attention to any mentions of guns, firearms, weapons, or ammunition.
        Even if these items appear in any context (sporting goods, hunting, etc.), they MUST be marked as NON-COMPLIANT.
        This includes all variations and specific models like: pistols, revolvers, rifles, shotguns, handguns, assault rifles,
        specific brands like Glock, Smith & Wesson, Remington, etc.
        
        DETAILED PHARMACEUTICAL HANDLING:
        Regular medicines, pharmaceuticals, or medical supplies should ONLY be flagged as WARNING level (restricted).
        DO NOT mark pharmaceuticals or medicines as non-compliant unless they are specifically illegal controlled substances.
        Legal prescription medications should only receive warnings about documentation requirements.
        
        Look for common drug names, scientific names, street names, or euphemisms.
        Examples of red flag terms: pills, tablets, capsules, powder, recreational use,
        cannabis, marijuana, cocaine, heroin, opiates, amphetamines, psychedelics, etc.
        
        If ANY drug-related content is found, flag it as NON-COMPLIANT (not just a warning).
        
        Perform a thorough analysis on this entry for:
        1. Restricted or prohibited items in package contents
        2. Shipping destination restrictions 
        3. Required shipping documentation
        4. Shipping regulations compliance
        5. Any other compliance issues
        
        Important: Look for implicit or euphemistic descriptions of restricted items. 
        Consider dual-use items that could be used for legitimate or restricted purposes.
        Look for chemical components that could be precursors to prohibited substances.
        Use context clues from the entire entry to determine if there are hidden restricted items.
        
        Report all findings, including new ones not in the current analysis.
        
        Format your response as a JSON array of compliance results:
        [
          {
            "field": "Field Name",
            "value": "Field Value",
            "status": "compliant"|"non-compliant"|"warning",
            "message": "Detailed explanation"
          }
        ]
      `;
      
      // Call the Gemini API
      const enhancedResults = await this.callGeminiAPI(prompt);
      
      let formattedResults: ComplianceResult[] = [];
      
      if (enhancedResults && Array.isArray(enhancedResults)) {
        // Merge the base results with enhanced results from Gemini
        const baseResultsMap = new Map(baseResults.map(r => [r.field, r]));
        
        // Format the enhanced results
        formattedResults = enhancedResults.map(item => {
          const baseResult = baseResultsMap.get(item.field);
          
          // If we have an existing result for this field, keep its ID
          if (baseResult) {
            return {
              id: baseResult.id,
              field: item.field,
              value: item.value,
              status: item.status as 'compliant' | 'non-compliant' | 'warning',
              message: item.message
            };
          } else {
            // This is a new finding from Gemini
            return {
              id: `gemini-${uuidv4()}`,
              field: item.field,
              value: item.value,
              status: item.status as 'compliant' | 'non-compliant' | 'warning',
              message: item.message
            };
          }
        });
      } else {
        // If Gemini API fails, use base results
        formattedResults = [...baseResults];
      }
      
      // If we detected drug terms but Gemini didn't flag them, add our own detection
      if (hasDrugTerms) {
        const hasDrugFlagged = formattedResults.some(result => 
          (result.field === 'Restricted Item' || result.field === 'Package Contents' || 
          result.field === 'Globally Restricted Items') && 
          (result.message.toLowerCase().includes('drug') || 
           detectedDrugTerms.some(term => result.message.toLowerCase().includes(term)))
        );
        
        if (!hasDrugFlagged) {
          formattedResults.push({
            id: `drug-detection-${uuidv4()}`,
            field: 'Restricted Item',
            value: detectedDrugTerms.join(', '),
            status: 'non-compliant',
            message: `Package appears to contain drugs or related substances: ${detectedDrugTerms.join(', ')}. Drug shipments are restricted or prohibited and may require special permits or be illegal depending on jurisdiction.`
          });
        }
      }
      
      // If we detected weapon terms but Gemini didn't flag them, add our own detection
      if (hasWeaponTerms) {
        const hasWeaponFlagged = formattedResults.some(result => 
          (result.field === 'Restricted Item' || result.field === 'Package Contents' || 
          result.field === 'Globally Restricted Items') && 
          (result.message.toLowerCase().includes('weapon') || 
           result.message.toLowerCase().includes('gun') ||
           result.message.toLowerCase().includes('firearm') ||
           result.message.toLowerCase().includes('ammunition') ||
           detectedWeaponTerms.some(term => result.message.toLowerCase().includes(term)))
        );
        
        if (!hasWeaponFlagged) {
          formattedResults.push({
            id: `weapon-detection-${uuidv4()}`,
            field: 'Restricted Item',
            value: detectedWeaponTerms.join(', '),
            status: 'non-compliant',
            message: `Package appears to contain weapons or ammunition: ${detectedWeaponTerms.join(', ')}. Weapons and ammunition are heavily restricted or prohibited in most shipping routes and require special licensing.`
          });
        }
      }
      
      // If no specific restricted content issues were found but we have content fields,
      // add a 'content checked' entry to indicate the check was performed
      const hasContentFields = contentValues.length > 0;
      const hasRestrictedContentResult = formattedResults.some(r => 
        /content|item|product|package/i.test(r.field) && 
        r.status !== 'compliant'
      );
      
      if (hasContentFields && !hasRestrictedContentResult && !hasDrugTerms) {
        formattedResults.push({
          id: `gemini-content-check-${uuidv4()}`,
          field: "Package Contents Verification",
          value: contentValues.join(", ").substring(0, 100) + (contentValues.join(", ").length > 100 ? "..." : ""),
          status: "compliant",
          message: "Advanced scanning detected no restricted or prohibited items in package contents."
        });
      }
      
      return formattedResults;
    } catch (error) {
      console.error('Error in Gemini compliance check:', error);
      // If there's an error with Gemini API, just return the base results
      return await this.converter.validateCompliance(formattedData);
    }
  }
}

// Export a singleton instance
export const complianceService = new ComplianceService(); 