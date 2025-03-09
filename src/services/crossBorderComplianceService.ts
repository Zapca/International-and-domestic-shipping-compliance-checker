import { FormattedData } from './formatConverterDb';
import { ComplianceResult } from './types';
import { crossBorderRuleRepository } from './database/crossBorderRuleRepository';
import { v4 as uuidv4 } from 'uuid';

/**
 * Service for validating cross-border shipment compliance
 */
export class CrossBorderComplianceService {
  private initialized = false;
  
  // These properties will be populated from the database
  private internationalRequiredFields: string[] = [];
  private countrySpecificRequirements: Record<string, string[]> = {};
  private restrictedItems: Record<string, string[]> = {};
  private restrictedDestinations: string[] = [];
  private enhancedDocumentationCountries: string[] = [];
  private countryRequirementDescriptions: Record<string, string> = {};

  constructor() {
    // Initialize when first created
    this.initialize();
  }

  /**
   * Initialize the service by loading rules from the database
   */
  private async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      console.log('Initializing cross-border compliance service...');
      
      // Load required fields for international shipping
      await this.loadRequiredFields();
      
      // Load country-specific requirements
      await this.loadCountryRequirements();
      
      // Load restricted items
      await this.loadRestrictedItems();
      
      // Load restricted destinations
      await this.loadRestrictedDestinations();
      
      // Load countries with enhanced documentation requirements
      await this.loadEnhancedDocumentation();
      
      this.initialized = true;
      console.log('Cross-border compliance service initialized successfully');
    } catch (error) {
      console.error('Error initializing cross-border compliance service:', error);
      // Even if there's an error, we'll use the default values
    }
  }

  /**
   * Load required fields for international shipping from the database
   */
  private async loadRequiredFields(): Promise<void> {
    try {
      const fields = await crossBorderRuleRepository.getInternationalRequiredFields();
      
      // Remove duplicates using a simple filter approach
      const fieldKeys = fields.map(field => field.fieldKey);
      const uniqueFields = fieldKeys.filter((value, index, self) => 
        self.indexOf(value) === index
      );
      
      this.internationalRequiredFields = uniqueFields;
      
      // If no fields found, use defaults
      if (this.internationalRequiredFields.length === 0) {
        this.internationalRequiredFields = [
          'recipientName', 'recipientAddress', 'recipientCountry',
          'shipperName', 'shipperAddress', 'shipperCountry',
          'packageType', 'weight', 'dimensions', 'packageContents', 'declaredValue'
        ];
      }
    } catch (error) {
      console.error('Error loading required fields:', error);
      // Use default values if there's an error
    }
  }

  /**
   * Load country-specific requirements from the database
   */
  private async loadCountryRequirements(): Promise<void> {
    try {
      const requirements = await crossBorderRuleRepository.getAllCountryRequirements();
      
      // Reset the requirements
      this.countrySpecificRequirements = {};
      this.countryRequirementDescriptions = {};
      
      // Populate from database
      for (const requirement of requirements) {
        this.countrySpecificRequirements[requirement.countryCode] = requirement.requiredFields;
        this.countryRequirementDescriptions[requirement.countryCode] = requirement.description;
      }
      
      // If no requirements found, use defaults
      if (Object.keys(this.countrySpecificRequirements).length === 0) {
        this.countrySpecificRequirements = {
          'US': ['hsTariffNumber', 'originCountry', 'declaredValue'],
          'CA': ['hsTariffNumber', 'originCountry', 'declaredValue', 'naccsCode'],
          'UK': ['eoriNumber', 'hsTariffNumber', 'originCountry', 'declaredValue'],
          'EU': ['eoriNumber', 'hsTariffNumber', 'originCountry', 'declaredValue'],
          'CN': ['hsTariffNumber', 'originCountry', 'declaredValue', 'chinaCustomsCode'],
          'AU': ['hsTariffNumber', 'originCountry', 'declaredValue', 'abnNumber']
        };
      }
    } catch (error) {
      console.error('Error loading country requirements:', error);
      // Use default values if there's an error
    }
  }

  /**
   * Load restricted items from the database
   */
  private async loadRestrictedItems(): Promise<void> {
    try {
      const items = await crossBorderRuleRepository.getRestrictedItems();
      
      // Reset the restricted items
      this.restrictedItems = {};
      
      // Start with the ALL category
      this.restrictedItems['ALL'] = [];
      
      // Populate from database
      for (const item of items) {
        if (item.appliesTo === 'ALL') {
          this.restrictedItems['ALL'].push(item.category);
        } else if (Array.isArray(item.appliesTo)) {
          for (const country of item.appliesTo) {
            if (!this.restrictedItems[country]) {
              this.restrictedItems[country] = [];
            }
            this.restrictedItems[country].push(item.category);
          }
        }
      }
      
      // If no items found, use defaults
      if (Object.keys(this.restrictedItems).length === 1 && this.restrictedItems['ALL'].length === 0) {
        this.restrictedItems = {
          'ALL': [
            'weapons', 'firearms', 'guns', 'explosives', 'drugs', 'narcotics', 'hazardous materials',
            'flammable', 'toxic', 'radioactive', 'currency', 'ivory', 'endangered species'
          ],
          'US': ['alcohol', 'tobacco', 'certain electronics', 'food', 'plants', 'seeds'],
          'CN': ['political materials', 'religious materials', 'books', 'media', 'electronics'],
          'AU': ['food', 'plants', 'seeds', 'biological materials', 'soil'],
          'JP': ['prescription medication', 'cosmetics', 'leather goods']
        };
      }
    } catch (error) {
      console.error('Error loading restricted items:', error);
      // Use default values if there's an error
    }
  }

  /**
   * Load restricted destinations from the database
   */
  private async loadRestrictedDestinations(): Promise<void> {
    try {
      const destinations = await crossBorderRuleRepository.getRestrictedDestinations();
      this.restrictedDestinations = destinations.map(dest => dest.countryCode);
      
      // If no destinations found, use defaults
      if (this.restrictedDestinations.length === 0) {
        this.restrictedDestinations = ['CU', 'IR', 'KP', 'SY', 'SD', 'BY'];
      }
    } catch (error) {
      console.error('Error loading restricted destinations:', error);
      // Use default values if there's an error
    }
  }

  /**
   * Load countries with enhanced documentation requirements from the database
   */
  private async loadEnhancedDocumentation(): Promise<void> {
    try {
      const documentation = await crossBorderRuleRepository.getEnhancedDocumentationCountries();
      this.enhancedDocumentationCountries = documentation.map(doc => doc.countryCode);
      
      // If no countries found, use defaults
      if (this.enhancedDocumentationCountries.length === 0) {
        this.enhancedDocumentationCountries = ['RU', 'VE', 'MM', 'IQ', 'LY', 'ZW', 'CD'];
      }
    } catch (error) {
      console.error('Error loading enhanced documentation countries:', error);
      // Use default values if there's an error
    }
  }

  /**
   * Ensure the service is initialized before use
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Perform cross-border compliance check
   * @param formattedData The formatted shipment data
   * @returns Array of compliance results
   */
  public async checkCrossBorderCompliance(formattedData: FormattedData): Promise<ComplianceResult[]> {
    await this.ensureInitialized();
    
    const fields = formattedData.fields;
    const rawText = formattedData.rawText || '';
    const results: ComplianceResult[] = [];
    
    // Debug log the fields to help troubleshoot
    this.debugLogFields(fields);
    
    // Determine if it's an international shipment
    const isInternational = this.isInternationalShipment(fields) || 
                            this.hasInternationalIndicators(rawText);
    
    if (!isInternational) {
      return results; // Not an international shipment, no cross-border rules apply
    }
    
    // Check required international fields
    const missingFieldResults = this.checkRequiredInternationalFields(fields);
    results.push(...missingFieldResults);
    
    // Get destination country
    const destinationCountry = fields.recipientCountry || '';
    
    if (destinationCountry) {
      // Check if destination is restricted
      const restrictedResults = this.checkRestrictedDestination(destinationCountry);
      results.push(...restrictedResults);
      
      // Check country-specific requirements
      const countryRequirementResults = this.checkCountrySpecificRequirements(fields, destinationCountry);
      results.push(...countryRequirementResults);
    }
    
    // Check package contents for restricted items
    if (fields.packageContents) {
      const restrictedItemResults = await this.checkRestrictedItems(
        fields.packageContents, 
        destinationCountry
      );
      results.push(...restrictedItemResults);
    }
    
    return results;
  }

  /**
   * Check if this appears to be an international shipment
   */
  private isInternationalShipment(fields: Record<string, string>): boolean {
    // If we have explicit countries and they differ, it's international
    if (fields.shipperCountry && fields.recipientCountry && 
        fields.shipperCountry !== fields.recipientCountry) {
      return true;
    }
    
    // Look for international indicators in addresses
    if (fields.recipientAddress && this.hasInternationalIndicators(fields.recipientAddress)) {
      return true;
    }
    
    // Check for customs-related fields which suggest international shipping
    const customsFields = ['customsInfo', 'hsTariffNumber', 'eoriNumber', 'declaredValue'];
    for (const field of customsFields) {
      if (fields[field]) {
        return true;
      }
    }
    
    // Check for international service types
    if (fields.shippingService && this.isInternationalService(fields.shippingService)) {
      return true;
    }
    
    return false;
  }

  /**
   * Check for indicators of international shipping in text
   */
  private hasInternationalIndicators(text: string): boolean {
    const internationalWords = [
      'international', 'global', 'customs', 'duty', 'import', 'export',
      'overseas', 'foreign', 'VAT', 'tariff'
    ];
    
    // Common non-US/non-local country names or abbreviations
    const countryIndicators = [
      'UK', 'GB', 'EU', 'CN', 'JP', 'DE', 'FR', 'IT', 'ES', 'CA', 'MX',
      'germany', 'france', 'spain', 'china', 'japan', 'canada', 'england',
      'united kingdom', 'mexico', 'australia', 'india', 'brazil'
    ];
    
    const lowerText = text.toLowerCase();
    
    for (const word of [...internationalWords, ...countryIndicators]) {
      if (lowerText.includes(word.toLowerCase())) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Check if the shipping service is for international delivery
   */
  private isInternationalService(service: string): boolean {
    const internationalServices = [
      'international', 'global', 'worldwide', 'priority international',
      'express international', 'dhl', 'fedex international', 'ups worldwide'
    ];
    
    const lowerService = service.toLowerCase();
    
    for (const intService of internationalServices) {
      if (lowerService.includes(intService.toLowerCase())) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Check for required international shipping fields
   */
  private checkRequiredInternationalFields(fields: Record<string, string>): ComplianceResult[] {
    const results: ComplianceResult[] = [];
    const missingFields: string[] = [];
    
    // Create a lowercase map of fields for case-insensitive matching
    const lowercaseFieldMap: Record<string, string> = {};
    for (const [key, value] of Object.entries(fields)) {
      lowercaseFieldMap[key.toLowerCase()] = value;
    }
    
    // Define field mappings for common variations
    const fieldVariations: Record<string, string[]> = {
      'packageType': ['parceltype', 'package_type', 'parcel_type', 'packagetype', 'type', 'package'],
      'weight': ['gross_weight', 'grossweight', 'parcelweight', 'shippingweight', 'total_weight', 'wt'],
      'dimensions': ['size', 'measurements', 'dimension', 'package_dimensions', 'parceldimensions', 'lwh'],
      'packageContents': ['contents', 'items', 'goods', 'description', 'itemdescription', 'product'],
      'declaredValue': ['value', 'customsvalue', 'goodsvalue', 'itemvalue', 'declared_value', 'price']
    };
    
    for (const field of this.internationalRequiredFields) {
      // First check the exact field name
      let fieldExists = !!fields[field] && fields[field].trim() !== '';
      
      if (!fieldExists) {
        // Try lowercase version
        const fieldLower = field.toLowerCase();
        fieldExists = !!lowercaseFieldMap[fieldLower] && lowercaseFieldMap[fieldLower].trim() !== '';
        
        // If still not found, try known variations
        if (!fieldExists && fieldVariations[field]) {
          for (const variation of fieldVariations[field]) {
            if (!!lowercaseFieldMap[variation] && lowercaseFieldMap[variation].trim() !== '') {
              fieldExists = true;
              break;
            }
          }
        }
      }
      
      if (!fieldExists) {
        missingFields.push(field);
      }
    }
    
    if (missingFields.length > 0) {
      results.push({
        id: `missing-intl-fields-${Date.now()}`,
        field: 'International Shipping Requirements',
        value: missingFields.join(', '),
        status: 'non-compliant',
        message: `Missing required fields for international shipping: ${missingFields.map(f => 
          f.charAt(0).toUpperCase() + f.slice(1).replace(/([A-Z])/g, ' $1').trim()
        ).join(', ')}. These fields are mandatory for customs clearance.`
      });
    }
    
    return results;
  }

  /**
   * Check for country-specific requirements
   */
  private checkCountrySpecificRequirements(fields: Record<string, string>, country: string): ComplianceResult[] {
    const results: ComplianceResult[] = [];
    
    // Normalize country code to 2-letter format
    const countryCode = this.normalizeCountryCode(country);
    
    // Check if we have specific requirements for this country
    if (this.countrySpecificRequirements[countryCode]) {
      const requiredFields = this.countrySpecificRequirements[countryCode];
      const missingFields: string[] = [];
      
      for (const field of requiredFields) {
        if (!fields[field] || fields[field].trim() === '') {
          missingFields.push(field);
        }
      }
      
      if (missingFields.length > 0) {
        results.push({
          id: `country-specific-${Date.now()}`,
          field: `${countryCode} Specific Requirements`,
          value: missingFields.join(', '),
          status: 'non-compliant',
          message: `Missing country-specific required fields for shipping to ${countryCode}: ${missingFields.map(f => 
            f.charAt(0).toUpperCase() + f.slice(1).replace(/([A-Z])/g, ' $1').trim()
          ).join(', ')}. These fields are required for customs clearance in this country.`
        });
      }
    }
    
    // Check for enhanced documentation countries
    if (this.enhancedDocumentationCountries.includes(countryCode)) {
      results.push({
        id: `enhanced-docs-${Date.now()}`,
        field: 'Enhanced Documentation',
        value: countryCode,
        status: 'warning',
        message: `Shipping to ${countryCode} requires enhanced documentation and may be subject to additional scrutiny. Consider including commercial invoice, certificate of origin, and detailed packing list.`
      });
    }
    
    return results;
  }

  /**
   * Check for restricted destinations
   */
  private checkRestrictedDestination(country: string): ComplianceResult[] {
    const results: ComplianceResult[] = [];
    
    // Normalize country code to 2-letter format
    const countryCode = this.normalizeCountryCode(country);
    
    if (this.restrictedDestinations.includes(countryCode)) {
      results.push({
        id: `restricted-dest-${Date.now()}`,
        field: 'Restricted Destination',
        value: countryCode,
        status: 'non-compliant',
        message: `Shipping to ${countryCode} is restricted or prohibited. This country may be subject to trade sanctions or embargoes. Shipment cannot proceed without special authorization.`
      });
    }
    
    return results;
  }

  /**
   * Check for restricted items using semantic analysis
   */
  private async checkRestrictedItems(packageContents: string, country?: string): Promise<ComplianceResult[]> {
    const results: ComplianceResult[] = [];
    const packageLower = packageContents.toLowerCase();
    
    // First, perform basic keyword matching
    const globalRestrictedItems = this.restrictedItems['ALL'];
    const foundGlobalRestrictions: string[] = [];
    
    for (const item of globalRestrictedItems) {
      if (packageLower.includes(item.toLowerCase())) {
        foundGlobalRestrictions.push(item);
      }
    }
    
    // Then, perform semantic analysis for weapons, drugs, and other dangerous items
    const dangerousItemsDetected = await this.detectDangerousItems(packageContents);
    
    // Combine the results from both approaches
    if (foundGlobalRestrictions.length > 0 || dangerousItemsDetected.length > 0) {
      // Combine arrays and remove duplicates
      const allRestrictions = Array.from(new Set([...foundGlobalRestrictions, ...dangerousItemsDetected]));
      
      results.push({
        id: `global-restricted-${Date.now()}`,
        field: 'Globally Restricted Items',
        value: allRestrictions.join(', '),
        status: 'non-compliant',
        message: `Package contains globally restricted items: ${allRestrictions.join(', ')}. These items are generally prohibited for international shipping and may result in seizure, fines, or legal penalties.`
      });
    }
    
    // If we have a country, check country-specific restrictions
    if (country) {
      const countryCode = this.normalizeCountryCode(country);
      
      if (this.restrictedItems[countryCode]) {
        const countryRestrictedItems = this.restrictedItems[countryCode];
        const foundCountryRestrictions: string[] = [];
        
        for (const item of countryRestrictedItems) {
          if (packageLower.includes(item.toLowerCase())) {
            foundCountryRestrictions.push(item);
          }
        }
        
        // Also check for country-specific semantic matches
        const countrySpecificDangerousItems = await this.detectCountrySpecificRestrictions(packageContents, countryCode);
        
        if (foundCountryRestrictions.length > 0 || countrySpecificDangerousItems.length > 0) {
          // Combine arrays and remove duplicates
          const allCountryRestrictions = Array.from(new Set([...foundCountryRestrictions, ...countrySpecificDangerousItems]));
          
          results.push({
            id: `country-restricted-${Date.now()}`,
            field: `${countryCode} Restricted Items`,
            value: allCountryRestrictions.join(', '),
            status: 'non-compliant',
            message: `Package contains items restricted in ${countryCode}: ${allCountryRestrictions.join(', ')}. These items may be prohibited or require special permits for import into this country.`
          });
        }
      }
    }
    
    return results;
  }
  
  /**
   * Use semantic analysis to detect dangerous or restricted items
   * This can identify specific weapons (like "AK-47"), drugs, or other dangerous items
   * that might not be explicitly listed in our restricted items database
   */
  private async detectDangerousItems(packageContents: string): Promise<string[]> {
    try {
      // Use the Gemini API to analyze the package contents
      const prompt = `
        Analyze the following package contents description and identify any potentially restricted or dangerous items for international shipping.
        Focus on identifying:
        
        1. Weapons and firearms (including but not limited to):
           - Guns, pistols, rifles, shotguns, revolvers
           - Ammunition, bullets, cartridges, ammo
           - Any specific firearm models or brands
           - Weapon parts or accessories
        
        2. Drugs and controlled substances (including but not limited to):
           - Narcotics, illegal drugs
           - Controlled prescription medications that are often abused
        
        3. Other dangerous or highly restricted items:
           - Explosives
           - Hazardous materials
           - Flammable items
           - Toxic substances
           - Radioactive materials
           - Currency (large amounts)
           - Ivory, endangered species products
        
        DO NOT flag as dangerous:
        - Regular medicines or pharmaceuticals (these only need warnings, not prohibition)
        - Common household items
        - Standard consumer electronics
        
        If you identify any restricted items, list them specifically. If nothing dangerous is detected, return an empty list.
        
        Package contents: "${packageContents}"
        
        Format your response as a JSON array of strings, each representing a detected dangerous item.
        Example: ["AK-47", "explosives"]
      `;
      
      const response = await this.callGeminiAPI(prompt);
      
      if (response && Array.isArray(response)) {
        return response;
      }
      
      return [];
    } catch (error) {
      console.error('Error detecting dangerous items:', error);
      return [];
    }
  }
  
  /**
   * Detect country-specific restricted items using semantic analysis
   */
  private async detectCountrySpecificRestrictions(packageContents: string, countryCode: string): Promise<string[]> {
    try {
      // Get country-specific context
      let countryContext = '';
      
      if (countryCode === 'US') {
        countryContext = 'For the United States, pay special attention to alcohol, tobacco, certain electronics, food, plants, seeds, and agricultural products.';
      } else if (countryCode === 'CN') {
        countryContext = 'For China, pay special attention to political materials, religious materials, books, media, and electronics.';
      } else if (countryCode === 'AU') {
        countryContext = 'For Australia, pay special attention to food, plants, seeds, biological materials, and soil.';
      } else if (countryCode === 'JP') {
        countryContext = 'For Japan, pay special attention to prescription medication, cosmetics, and leather goods.';
      }
      
      // Use the Gemini API to analyze the package contents with country-specific context
      const prompt = `
        Analyze the following package contents description and identify any items that would be restricted or require special permits for import into ${countryCode}.
        ${countryContext}
        
        Package contents: "${packageContents}"
        
        Format your response as a JSON array of strings, each representing a detected restricted item.
        Example: ["alcohol", "seeds"]
        
        If nothing restricted is detected, return an empty array.
      `;
      
      const response = await this.callGeminiAPI(prompt);
      
      if (response && Array.isArray(response)) {
        return response;
      }
      
      return [];
    } catch (error) {
      console.error(`Error detecting ${countryCode}-specific restrictions:`, error);
      return [];
    }
  }
  
  /**
   * Call the Gemini API for semantic analysis
   */
  private async callGeminiAPI(prompt: string): Promise<any> {
    try {
      const API_KEY = 'AIzaSyAraWPlckPfQpXrnbXdRy_iu1ctsjzGzjo'; // Should be in environment variables
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
          
          // If all else fails, return an empty array
          return [];
        }
      }
      
      return [];
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      return [];
    }
  }

  /**
   * Normalize a country name or code to a 2-letter code
   */
  private normalizeCountryCode(country: string): string {
    // Map of common country names and variations to their 2-letter codes
    const countryMap: Record<string, string> = {
      'united states': 'US', 'usa': 'US', 'u.s.a.': 'US', 'u.s.': 'US', 'america': 'US',
      'canada': 'CA',
      'united kingdom': 'UK', 'great britain': 'UK', 'england': 'UK', 'britain': 'UK',
      'australia': 'AU', 
      'china': 'CN', 
      'japan': 'JP',
      'european union': 'EU', 'europe': 'EU',
      'germany': 'DE', 'france': 'FR', 'italy': 'IT', 'spain': 'ES',
      'mexico': 'MX', 'brazil': 'BR', 'india': 'IN'
    };
    
    // If it's already a 2-letter code (likely), return it uppercase
    if (country.length === 2) {
      return country.toUpperCase();
    }
    
    // Try to match it to a known country name
    const lowerCountry = country.toLowerCase();
    if (countryMap[lowerCountry]) {
      return countryMap[lowerCountry];
    }
    
    // For longer strings, look for the country name within the text
    for (const [name, code] of Object.entries(countryMap)) {
      if (lowerCountry.includes(name)) {
        return code;
      }
    }
    
    // If we can't determine the country code, return the original (uppercase)
    return country.toUpperCase();
  }

  /**
   * Debug helper to log all available fields for troubleshooting
   * This helps identify why fields might not be detected properly
   */
  private debugLogFields(fields: Record<string, string>): void {
    console.log('===== CROSS-BORDER COMPLIANCE FIELDS =====');
    console.log('Fields available for validation:');
    Object.entries(fields).forEach(([key, value]) => {
      console.log(`- ${key}: ${value}`);
    });
    console.log('Required international fields:', this.internationalRequiredFields);
    console.log('==========================================');
  }
}

// Export singleton instance
export const crossBorderComplianceService = new CrossBorderComplianceService(); 