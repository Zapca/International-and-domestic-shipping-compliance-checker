import { v4 as uuidv4 } from 'uuid';
import { ruleRepository } from './ruleRepository';
import { 
  ComplianceRule,
  RuleCategory,
  ValidationConstraint,
  createComplianceRule,
  createRuleCategory,
  createValidationConstraint
} from './models';
import { crossBorderRuleLoader } from './crossBorderRuleLoader';

/**
 * Converts our existing hardcoded field specifications into database rules
 */
export class RuleLoader {
  private initialized = false;

  /**
   * Initialize the database with default rules if empty
   */
  async initializeRules(): Promise<void> {
    if (this.initialized) return;
    
    console.log('Initializing compliance rules...');

    try {
      // Check if we already have rules
      const existingRules = await ruleRepository.getAllRules();
      if (existingRules.length > 0) {
        console.log('Rules already exist in the database, skipping initialization');
        this.initialized = true;
        return;
      }
      
      // Create default categories
      const categories = await this.createDefaultCategories();
      
      // Create default rules
      await this.createDefaultRules(categories);
      
      // Initialize cross-border compliance rules
      await crossBorderRuleLoader.initializeCrossBorderRules();
      
      // Mark as initialized
      this.initialized = true;
      console.log('Successfully initialized rules database');
    } catch (error) {
      console.error('Failed to initialize rules database:', error);
      throw error;
    }
  }

  /**
   * Create default categories
   */
  private async createDefaultCategories(): Promise<Record<string, RuleCategory>> {
    const categories: Record<string, RuleCategory> = {};
    
    // Shipping Information category
    categories.shipping = await ruleRepository.addCategory({
      name: 'Shipping Information',
      description: 'Basic shipping and tracking details',
      priority: 100,
      isActive: true
    });
    
    // Package Details category
    const packageCategory = await ruleRepository.addCategory({
      name: 'Package Details',
      description: 'Rules for validating package characteristics and dimensions',
      priority: 20
    });
    categories.package = packageCategory;
    
    // Address Information category
    const addressCategory = await ruleRepository.addCategory({
      name: 'Address Information',
      description: 'Rules for validating sender and recipient addresses',
      priority: 30
    });
    categories.address = addressCategory;
    
    // Customs & International category
    const customsCategory = await ruleRepository.addCategory({
      name: 'Customs & International',
      description: 'Rules for validating international shipping and customs information',
      priority: 40
    });
    categories.customs = customsCategory;
    
    return categories;
  }

  /**
   * Create default rules
   */
  private async createDefaultRules(categories: Record<string, RuleCategory>): Promise<void> {
    // Tracking Number rule
    await ruleRepository.addRule({
      categoryId: categories.shipping.id,
      fieldKey: 'trackingNumber',
      displayName: 'Tracking Number',
      description: 'Validates tracking number format across major carriers',
      fieldType: 'text',
      isRequired: true,
      isActive: true,
      validationPattern: '^[A-Z0-9]{8,}$',
      validationMessage: 'Tracking number must be at least 8 alphanumeric characters',
      exampleValue: 'AB123456789US',
      transformFunction: 'return value.toUpperCase().replace(/\\s/g, "")',
      priority: 100
    });
    
    // Order Number rule
    const orderRule = await ruleRepository.addRule({
      categoryId: categories.shipping.id,
      fieldKey: 'orderNumber',
      displayName: 'Order Number',
      description: 'Validates format of order reference numbers',
      fieldType: 'regex',
      isRequired: false,
      validationPattern: '^[A-Z0-9-]{5,}$',
      validationMessage: 'Order number must be at least 5 characters (letters, numbers, hyphens)',
      exampleValue: 'ORD-12345',
      transformFunction: 'return value.toUpperCase().replace(/\\s/g, "")',
      priority: 20
    });
    
    // Ship Date rule
    const shipDateRule = await ruleRepository.addRule({
      categoryId: categories.shipping.id,
      fieldKey: 'shipDate',
      displayName: 'Ship Date',
      description: 'Validates shipment date format',
      fieldType: 'date',
      isRequired: true,
      validationPattern: '^\\d{4}-\\d{2}-\\d{2}$',
      validationMessage: 'Ship date must be in YYYY-MM-DD format',
      exampleValue: '2023-04-15',
      transformFunction: `
        try {
          const dateMatch = value.match(/(\\d{1,2})[\\/\\-](\\d{1,2})[\\/\\-](\\d{2,4})/);
          if (dateMatch) {
            let [, day, month, year] = dateMatch;
            if (year.length === 2) {
              year = \`20\${year}\`;
            }
            month = month.padStart(2, '0');
            day = day.padStart(2, '0');
            return \`\${year}-\${month}-\${day}\`;
          }
          const date = new Date(value);
          if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0];
          }
        } catch (e) {}
        return value;
      `,
      priority: 30
    });
    
    // Weight rule
    const weightRule = await ruleRepository.addRule({
      categoryId: categories.package.id,
      fieldKey: 'weight',
      displayName: 'Weight',
      description: 'Validates package weight format and value',
      fieldType: 'text',
      isRequired: true,
      validationPattern: '^\\d+(\\.\\d+)?\\s*(kg|g|lb|lbs|oz)$',
      validationMessage: 'Weight must include a number and unit (kg, g, lb, oz)',
      exampleValue: '2.5 kg',
      transformFunction: `
        const match = value.match(/(\\d+(?:\\.\\d+)?)\\s*(kg|g|lb|lbs|oz)/i);
        if (match) {
          const [, number, unit] = match;
          return \`\${number} \${unit.toLowerCase()}\`;
        }
        return value;
      `,
      priority: 10
    });
    
    // Dimensions rule
    const dimensionsRule = await ruleRepository.addRule({
      categoryId: categories.package.id,
      fieldKey: 'dimensions',
      displayName: 'Dimensions',
      description: 'Validates package dimensions format',
      fieldType: 'text',
      isRequired: false,
      validationPattern: '^\\d+(\\.\\d+)?\\s*x\\s*\\d+(\\.\\d+)?\\s*x\\s*\\d+(\\.\\d+)?\\s*(cm|mm|m|in|ft)?$',
      validationMessage: 'Dimensions must be in format: [L] x [W] x [H] [unit]',
      exampleValue: '20 x 15 x 10 cm',
      transformFunction: `
        const match = value.match(/(\\d+(?:\\.\\d+)?)\\s*[x×*]\\s*(\\d+(?:\\.\\d+)?)\\s*[x×*]\\s*(\\d+(?:\\.\\d+)?)\\s*(cm|mm|m|in|ft)?/i);
        if (match) {
          const [, length, width, height, unit = ''] = match;
          return \`\${length} x \${width} x \${height}\${unit ? ' ' + unit.toLowerCase() : ''}\`;
        }
        return value;
      `,
      priority: 20
    });
    
    // Recipient Name rule
    const recipientNameRule = await ruleRepository.addRule({
      categoryId: categories.address.id,
      fieldKey: 'recipientName',
      displayName: 'Recipient Name',
      description: 'Validates recipient name format',
      fieldType: 'text',
      isRequired: true,
      validationPattern: '^[A-Za-z\\s\\-\\\'\\.]{2,}$',
      validationMessage: 'Recipient name must be at least 2 characters',
      exampleValue: 'John Smith',
      transformFunction: 'return value.trim()',
      priority: 10
    });
    
    // Recipient Address rule
    const recipientAddressRule = await ruleRepository.addRule({
      categoryId: categories.address.id,
      fieldKey: 'recipientAddress',
      displayName: 'Recipient Address',
      description: 'Validates recipient address format',
      fieldType: 'text',
      isRequired: true,
      validationPattern: '^.{5,}$',
      validationMessage: 'Recipient address must be at least 5 characters',
      exampleValue: '123 Main St, Anytown, ST 12345',
      transformFunction: 'return value.trim()',
      priority: 20
    });
    
    // Shipper Name rule
    const shipperNameRule = await ruleRepository.addRule({
      categoryId: categories.address.id,
      fieldKey: 'shipperName',
      displayName: 'Shipper Name',
      description: 'Validates shipper name format',
      fieldType: 'text',
      isRequired: false,
      validationPattern: '^[A-Za-z\\s\\-\\\'\\.]{2,}$',
      validationMessage: 'Shipper name must be at least 2 characters',
      exampleValue: 'ABC Shipping Co.',
      transformFunction: 'return value.trim()',
      priority: 30
    });
    
    // Shipper Address rule
    const shipperAddressRule = await ruleRepository.addRule({
      categoryId: categories.address.id,
      fieldKey: 'shipperAddress',
      displayName: 'Shipper Address',
      description: 'Validates shipper address format',
      fieldType: 'text',
      isRequired: false,
      validationPattern: '^.{5,}$',
      validationMessage: 'Shipper address must be at least 5 characters',
      exampleValue: '456 Business Ave, Cityville, ST 67890',
      transformFunction: 'return value.trim()',
      priority: 35
    });
    
    // Shipper City rule
    await ruleRepository.addRule({
      categoryId: categories.address.id,
      fieldKey: 'shipperCity',
      displayName: 'Shipper City',
      description: 'Validates shipper city name',
      fieldType: 'text',
      isRequired: false,
      validationPattern: '^[A-Za-z\\s\\-\\.]{2,}$',
      validationMessage: 'Shipper city must be at least 2 characters',
      exampleValue: 'New York',
      transformFunction: 'return value.trim()',
      priority: 36
    });
    
    // Shipper Country rule
    await ruleRepository.addRule({
      categoryId: categories.address.id,
      fieldKey: 'shipperCountry',
      displayName: 'Shipper Country',
      description: 'Validates shipper country code or name',
      fieldType: 'text',
      isRequired: false,
      validationPattern: '^([A-Z]{2}|[A-Za-z\\s\\-\\.]{3,})$',
      validationMessage: 'Shipper country must be a valid country code (2 letters) or full country name',
      exampleValue: 'US',
      transformFunction: `
        // Convert to uppercase if it's a 2-letter country code
        if (/^[A-Za-z]{2}$/.test(value)) {
          return value.toUpperCase().trim();
        }
        return value.trim();
      `,
      priority: 37
    });
    
    // Recipient City rule
    await ruleRepository.addRule({
      categoryId: categories.address.id,
      fieldKey: 'recipientCity',
      displayName: 'Recipient City',
      description: 'Validates recipient city name',
      fieldType: 'text',
      isRequired: false,
      validationPattern: '^[A-Za-z\\s\\-\\.]{2,}$',
      validationMessage: 'Recipient city must be at least 2 characters',
      exampleValue: 'Los Angeles',
      transformFunction: 'return value.trim()',
      priority: 22
    });
    
    // Recipient Country rule
    await ruleRepository.addRule({
      categoryId: categories.address.id,
      fieldKey: 'recipientCountry',
      displayName: 'Recipient Country',
      description: 'Validates recipient country code or name',
      fieldType: 'text',
      isRequired: false,
      validationPattern: '^([A-Z]{2}|[A-Za-z\\s\\-\\.]{3,})$',
      validationMessage: 'Recipient country must be a valid country code (2 letters) or full country name',
      exampleValue: 'US',
      transformFunction: `
        // Convert to uppercase if it's a 2-letter country code
        if (/^[A-Za-z]{2}$/.test(value)) {
          return value.toUpperCase().trim();
        }
        return value.trim();
      `,
      priority: 23
    });
    
    // Weight Unit rule
    await ruleRepository.addRule({
      categoryId: categories.package.id,
      fieldKey: 'weightUnit',
      displayName: 'Weight Unit',
      description: 'Validates weight unit format',
      fieldType: 'select',
      isRequired: false,
      validationPattern: '^(kg|g|lb|lbs|oz)$',
      validationMessage: 'Weight unit must be one of: kg, g, lb, lbs, oz',
      exampleValue: 'kg',
      transformFunction: 'return value.toLowerCase().trim()',
      priority: 11
    });
    
    // Shipping Service rule
    await ruleRepository.addRule({
      categoryId: categories.shipping.id,
      fieldKey: 'shippingService',
      displayName: 'Shipping Service',
      description: 'Validates shipping service type',
      fieldType: 'text',
      isRequired: false,
      validationPattern: '^.{3,}$',
      validationMessage: 'Shipping service must be at least 3 characters',
      exampleValue: 'Priority Mail',
      transformFunction: 'return value.trim()',
      priority: 40
    });
    
    // Shipment Date rule (alias for shipDate)
    await ruleRepository.addRule({
      categoryId: categories.shipping.id,
      fieldKey: 'shipmentDate',
      displayName: 'Shipment Date',
      description: 'Validates shipment date format',
      fieldType: 'date',
      isRequired: true,
      isActive: true,
      validationPattern: '^\\d{4}-\\d{2}-\\d{2}$',
      validationMessage: 'Shipment date must be in YYYY-MM-DD format',
      exampleValue: '2023-04-15',
      transformFunction: `
        try {
          const dateMatch = value.match(/(\\d{1,2})[\\/\\-](\\d{1,2})[\\/\\-](\\d{2,4})/);
          if (dateMatch) {
            let [, day, month, year] = dateMatch;
            if (year.length === 2) {
              year = \`20\${year}\`;
            }
            month = month.padStart(2, '0');
            day = day.padStart(2, '0');
            return \`\${year}-\${month}-\${day}\`;
          }
          const date = new Date(value);
          if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0];
          }
        } catch (e) {}
        return value;
      `,
      priority: 31
    });
    
    // Shipment ID rule
    await ruleRepository.addRule({
      categoryId: categories.shipping.id,
      fieldKey: 'shipmentId',
      displayName: 'Shipment ID',
      description: 'Validates shipment identifier format',
      fieldType: 'text',
      isRequired: true,
      isActive: true,
      validationPattern: '^[A-Za-z0-9-_]{3,}$',
      validationMessage: 'Shipment ID must be at least 3 alphanumeric characters',
      exampleValue: 'SHIP-12345',
      transformFunction: 'return value.trim()',
      priority: 35
    });

    // Shipper rule
    await ruleRepository.addRule({
      categoryId: categories.address.id,
      fieldKey: 'shipper',
      displayName: 'Shipper',
      description: 'Validates shipper information',
      fieldType: 'text',
      isRequired: true,
      isActive: true,
      validationPattern: '^.{2,}$',
      validationMessage: 'Shipper must be at least 2 characters',
      exampleValue: 'ABC Shipping Company',
      transformFunction: 'return value.trim()',
      priority: 25
    });

    // Item rule
    await ruleRepository.addRule({
      categoryId: categories.package.id,
      fieldKey: 'item',
      displayName: 'Item',
      description: 'Validates item description',
      fieldType: 'text',
      isRequired: true,
      isActive: true,
      validationPattern: '^.{3,}$',
      validationMessage: 'Item description must be at least 3 characters',
      exampleValue: 'Electronics',
      transformFunction: 'return value.trim()',
      priority: 25
    });

    // Commodity Code rule
    await ruleRepository.addRule({
      categoryId: categories.customs.id,
      fieldKey: 'commodityCode',
      displayName: 'Commodity Code',
      description: 'Validates HS (Harmonized System) commodity code format',
      fieldType: 'text',
      isRequired: true,
      isActive: true,
      validationPattern: '^\\d{6,10}$',
      validationMessage: 'Commodity code must be 6-10 digits',
      exampleValue: '8471300000',
      transformFunction: 'return value.replace(/\\s/g, "")',
      priority: 20
    });
    
    // Delivery Date rule
    await ruleRepository.addRule({
      categoryId: categories.shipping.id,
      fieldKey: 'deliveryDate',
      displayName: 'Delivery Date',
      description: 'Validates delivery date format',
      fieldType: 'date',
      isRequired: false,
      validationPattern: '^\\d{4}-\\d{2}-\\d{2}$',
      validationMessage: 'Delivery date must be in YYYY-MM-DD format',
      exampleValue: '2023-04-20',
      transformFunction: `
        try {
          const dateMatch = value.match(/(\\d{1,2})[\\/\\-](\\d{1,2})[\\/\\-](\\d{2,4})/);
          if (dateMatch) {
            let [, day, month, year] = dateMatch;
            if (year.length === 2) {
              year = \`20\${year}\`;
            }
            month = month.padStart(2, '0');
            day = day.padStart(2, '0');
            return \`\${year}-\${month}-\${day}\`;
          }
          const date = new Date(value);
          if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0];
          }
        } catch (e) {}
        return value;
      `,
      priority: 32
    });
    
    // Declared Value rule
    await ruleRepository.addRule({
      categoryId: categories.customs.id,
      fieldKey: 'declaredValue',
      displayName: 'Declared Value',
      description: 'Validates declared value format',
      fieldType: 'number',
      isRequired: true,
      isActive: true,
      validationPattern: '^\\d+(\\.\\d{1,2})?$',
      validationMessage: 'Declared value must be a number with up to 2 decimal places',
      exampleValue: '100.50',
      transformFunction: `
        // Extract only digits and decimal point
        const clean = value.replace(/[^\\d.]/g, '');
        // Convert to number and format with 2 decimal places
        const num = parseFloat(clean);
        if (!isNaN(num)) {
          return num.toString();
        }
        return value;
      `,
      priority: 15
    });
    
    // Declared Value Currency rule
    await ruleRepository.addRule({
      categoryId: categories.customs.id,
      fieldKey: 'declaredValueCurrency',
      displayName: 'Declared Value Currency',
      description: 'Validates currency code format',
      fieldType: 'text',
      isRequired: false,
      validationPattern: '^[A-Z]{3}$',
      validationMessage: 'Currency code must be a 3-letter ISO currency code',
      exampleValue: 'USD',
      transformFunction: `
        // Handle different currency formats
        const currencyMap = {
          '$': 'USD',
          '£': 'GBP',
          '€': 'EUR',
          '¥': 'JPY',
          '₹': 'INR',
          '₩': 'KRW',
          '₽': 'RUB',
          'usd': 'USD',
          'eur': 'EUR',
          'gbp': 'GBP',
          'jpy': 'JPY',
          'cny': 'CNY',
          'yen': 'JPY',
          'dollar': 'USD',
          'dollars': 'USD',
          'euro': 'EUR',
          'euros': 'EUR',
          'pound': 'GBP',
          'pounds': 'GBP'
        };
        
        // Convert currency symbols or names to standard codes
        const cleanValue = value.toLowerCase().trim();
        if (currencyMap[cleanValue]) {
          return currencyMap[cleanValue];
        }
        
        // If it's already a 3-letter code, convert to uppercase
        if (/^[A-Za-z]{3}$/.test(value)) {
          return value.toUpperCase();
        }
        
        return value;
      `,
      priority: 16
    });
    
    // Destination Country rule
    await ruleRepository.addRule({
      categoryId: categories.address.id,
      fieldKey: 'destinationCountry',
      displayName: 'Destination Country',
      description: 'Validates destination country code or name',
      fieldType: 'text',
      isRequired: true,
      isActive: true,
      validationPattern: '^([A-Z]{2}|[A-Za-z\\s\\-\\.]{3,})$',
      validationMessage: 'Destination country must be a valid country code (2 letters) or full country name',
      exampleValue: 'US',
      transformFunction: `
        // Convert to uppercase if it's a 2-letter country code
        if (/^[A-Za-z]{2}$/.test(value)) {
          return value.toUpperCase().trim();
        }
        return value.trim();
      `,
      priority: 24
    });
    
    // Package Type rule
    const packageTypeRule = await ruleRepository.addRule({
      categoryId: categories.package.id,
      fieldKey: 'packageType',
      displayName: 'Package Type',
      description: 'Validates the package type to ensure it is a recognized value',
      fieldType: 'select',
      isRequired: false,
      validationPattern: '^(box|envelope|tube|pallet|other)$',
      validationMessage: 'Package type must be one of: box, envelope, tube, pallet, other',
      exampleValue: 'box',
      transformFunction: 'return value.toLowerCase().trim()',
      priority: 5
    });
    
    // Add weight validation constraints
    await ruleRepository.addConstraint({
      ruleId: weightRule.id,
      constraintType: 'min',
      constraintValue: '0.1',
      validationLevel: 'error',
      errorMessage: 'Weight must be greater than 0.1',
      type: 'min',
      minValue: 0.1,
      severity: 'non-compliant',
      isActive: true
    });
    
    await ruleRepository.addConstraint({
      ruleId: weightRule.id,
      constraintType: 'max',
      constraintValue: '1000',
      validationLevel: 'warning',
      errorMessage: 'Weight exceeds typical maximum, please verify',
      type: 'max',
      maxValue: 1000,
      severity: 'warning',
      isActive: true
    });
  }

  /**
   * Convert a regular expression to a string representation
   */
  convertRegexToString(regex: RegExp): string {
    // Remove the leading / and trailing / with optional flags
    return regex.toString().replace(/^\/(.*)\/[gimsuy]*$/, '$1');
  }

  /**
   * Convert a function to a string
   */
  convertFunctionToString(fn: Function): string {
    const fnStr = fn.toString();
    // Extract just the function body
    const bodyMatch = fnStr.match(/(?:=>|{)\s*([\s\S]*?)(?:}|\s*$)/);
    if (bodyMatch && bodyMatch[1]) {
      return bodyMatch[1].trim();
    }
    return fnStr;
  }
}

// Create and export a singleton instance
export const ruleLoader = new RuleLoader(); 