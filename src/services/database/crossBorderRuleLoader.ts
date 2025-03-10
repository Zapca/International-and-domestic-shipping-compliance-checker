import { crossBorderRuleRepository } from './crossBorderRuleRepository';
import {
  RequiredField,
  CountryRequirement,
  RestrictedItem,
  RestrictedDestination,
  EnhancedDocumentation
} from './models';
import { v4 as uuidv4 } from 'uuid';

/**
 * Responsible for loading default cross-border compliance rules into the database
 */
class CrossBorderRuleLoader {
  private initialized = false;

  /**
   * Initialize the cross-border compliance rules
   */
  async initializeCrossBorderRules(): Promise<void> {
    if (this.initialized) {
      return;
    }

    console.log('Initializing cross-border compliance rules...');

    try {
      // Check if we already have cross-border rules
      const existingRequirements = await crossBorderRuleRepository.getAllCountryRequirements();
      if (existingRequirements.length > 0) {
        console.log('Cross-border rules already exist in the database, skipping initialization');
        this.initialized = true;
        return;
      }
      
      // Import all default rules
      await crossBorderRuleRepository.importCrossBorderRules({
        requiredFields: this.getDefaultRequiredFields(),
        countryRequirements: this.getDefaultCountryRequirements(),
        restrictedItems: this.getDefaultRestrictedItems(),
        restrictedDestinations: this.getDefaultRestrictedDestinations(),
        enhancedDocumentation: this.getDefaultEnhancedDocumentation()
      });

      console.log('Cross-border compliance rules initialized successfully');
      this.initialized = true;
    } catch (error) {
      console.error('Error initializing cross-border compliance rules:', error);
      // Don't re-throw the error to allow the application to continue even if cross-border rules fail
      // Just mark as initialized to prevent further attempts that would fail
      this.initialized = true;
    }
  }

  /**
   * Get default required fields for different shipping contexts
   */
  private getDefaultRequiredFields(): Partial<RequiredField>[] {
    const now = new Date().toISOString();

    // International shipping required fields
    const internationalFields = [
      'recipientName',
      'recipientAddress',
      'recipientCountry',
      'shipperName',
      'shipperAddress',
      'shipperCountry',
      'packageType',
      'weight',
      'dimensions',
      'packageContents',
      'declaredValue'
    ].map(fieldKey => ({
      id: uuidv4(),
      fieldKey,
      displayName: this.formatDisplayName(fieldKey),
      description: `Required field for international shipping: ${this.formatDisplayName(fieldKey)}`,
      context: 'international' as const,
      isActive: true,
      createdAt: now,
      updatedAt: now
    }));

    // Domestic shipping required fields
    const domesticFields = [
      'recipientName',
      'recipientAddress',
      'shipperName',
      'shipperAddress',
      'weight'
    ].map(fieldKey => ({
      id: uuidv4(),
      fieldKey,
      displayName: this.formatDisplayName(fieldKey),
      description: `Required field for domestic shipping: ${this.formatDisplayName(fieldKey)}`,
      context: 'domestic' as const,
      isActive: true,
      createdAt: now,
      updatedAt: now
    }));

    // Fields required for all shipping contexts
    const universalFields = [
      'trackingNumber',
      'shipmentDate'
    ].map(fieldKey => ({
      id: uuidv4(),
      fieldKey,
      displayName: this.formatDisplayName(fieldKey),
      description: `Required field for all shipments: ${this.formatDisplayName(fieldKey)}`,
      context: 'all' as const,
      isActive: true,
      createdAt: now,
      updatedAt: now
    }));

    return [...internationalFields, ...domesticFields, ...universalFields];
  }

  /**
   * Get default country-specific requirements
   */
  private getDefaultCountryRequirements(): Partial<CountryRequirement>[] {
    const now = new Date().toISOString();

    return [
      {
        id: uuidv4(),
        countryCode: 'US',
        countryName: 'United States',
        requiredFields: ['hsTariffNumber', 'originCountry', 'declaredValue'],
        description: 'US Customs requirements for international shipments',
        documentationNotes: 'Commercial invoice required for shipments over $2500',
        isActive: true,
        createdAt: now,
        updatedAt: now
      },
      {
        id: uuidv4(),
        countryCode: 'CA',
        countryName: 'Canada',
        requiredFields: ['hsTariffNumber', 'originCountry', 'declaredValue', 'naccsCode'],
        description: 'Canadian Customs requirements for international shipments',
        documentationNotes: 'NAFTA certificate may be required for eligible goods',
        isActive: true,
        createdAt: now,
        updatedAt: now
      },
      {
        id: uuidv4(),
        countryCode: 'UK',
        countryName: 'United Kingdom',
        requiredFields: ['eoriNumber', 'hsTariffNumber', 'originCountry', 'declaredValue'],
        description: 'UK Customs requirements for international shipments',
        documentationNotes: 'Post-Brexit requirements include EORI number',
        isActive: true,
        createdAt: now,
        updatedAt: now
      },
      {
        id: uuidv4(),
        countryCode: 'EU',
        countryName: 'European Union',
        requiredFields: ['eoriNumber', 'hsTariffNumber', 'originCountry', 'declaredValue'],
        description: 'EU Customs requirements for international shipments',
        documentationNotes: 'EU EORI number required for commercial shipments',
        isActive: true,
        createdAt: now,
        updatedAt: now
      },
      {
        id: uuidv4(),
        countryCode: 'CN',
        countryName: 'China',
        requiredFields: ['hsTariffNumber', 'originCountry', 'declaredValue', 'chinaCustomsCode'],
        description: 'Chinese Customs requirements for international shipments',
        documentationNotes: 'Strict documentation for electronics and media',
        isActive: true,
        createdAt: now,
        updatedAt: now
      },
      {
        id: uuidv4(),
        countryCode: 'AU',
        countryName: 'Australia',
        requiredFields: ['hsTariffNumber', 'originCountry', 'declaredValue', 'abnNumber'],
        description: 'Australian Customs requirements for international shipments',
        documentationNotes: 'Strict biosecurity screening for all shipments',
        isActive: true,
        createdAt: now,
        updatedAt: now
      }
    ];
  }

  /**
   * Get default restricted items
   */
  private getDefaultRestrictedItems(): Partial<RestrictedItem>[] {
    const now = new Date().toISOString();
    
    return [
      {
        id: uuidv4(),
        category: 'weapons',
        description: 'Firearms, ammunition, and weapons of any kind',
        appliesTo: 'ALL',
        restrictions: 'Prohibited in most countries without special licensing',
        severity: 'prohibited',
        isActive: true,
        createdAt: now,
        updatedAt: now
      },
      {
        id: uuidv4(),
        category: 'narcotics',
        description: 'Illegal drugs, narcotics, and controlled substances',
        appliesTo: 'ALL',
        restrictions: 'Prohibited in all countries without special authorization',
        severity: 'prohibited',
        isActive: true,
        createdAt: now,
        updatedAt: now
      },
      {
        id: uuidv4(),
        category: 'hazardous materials',
        description: 'Flammable, toxic, corrosive, or radioactive materials',
        appliesTo: 'ALL',
        restrictions: 'Requires special handling and documentation',
        severity: 'restricted',
        isActive: true,
        createdAt: now,
        updatedAt: now
      },
      {
        id: uuidv4(),
        category: 'currency',
        description: 'Cash, currency, and monetary instruments',
        appliesTo: 'ALL',
        restrictions: 'Must be declared above certain limits',
        severity: 'controlled',
        isActive: true,
        createdAt: now,
        updatedAt: now
      },
      {
        id: uuidv4(),
        category: 'alcohol',
        description: 'Alcoholic beverages',
        appliesTo: ['US', 'CA', 'SA', 'AE'],
        restrictions: 'Restricted or prohibited depending on destination',
        severity: 'restricted',
        isActive: true,
        createdAt: now,
        updatedAt: now
      },
      {
        id: uuidv4(),
        category: 'tobacco',
        description: 'Tobacco products',
        appliesTo: ['US', 'CA', 'AU', 'SG'],
        restrictions: 'Subject to high duties and taxes',
        severity: 'controlled',
        isActive: true,
        createdAt: now,
        updatedAt: now
      },
      {
        id: uuidv4(),
        category: 'electronics',
        description: 'Certain electronics and technology',
        appliesTo: ['CN', 'RU', 'IR', 'KP'],
        restrictions: 'Subject to export controls to certain countries',
        severity: 'restricted',
        isActive: true,
        createdAt: now,
        updatedAt: now
      },
      {
        id: uuidv4(),
        category: 'food',
        description: 'Food and agricultural products',
        appliesTo: ['AU', 'NZ', 'JP', 'US'],
        restrictions: 'Subject to agricultural inspection and quarantine',
        severity: 'controlled',
        isActive: true,
        createdAt: now,
        updatedAt: now
      },
      {
        id: uuidv4(),
        category: 'religious materials',
        description: 'Religious literature and materials',
        appliesTo: ['SA', 'CN', 'IR'],
        restrictions: 'May be restricted or censored in certain countries',
        severity: 'restricted',
        isActive: true,
        createdAt: now,
        updatedAt: now
      }
    ];
  }

  /**
   * Get default restricted destinations
   */
  private getDefaultRestrictedDestinations(): Partial<RestrictedDestination>[] {
    const now = new Date().toISOString();
    
    return [
      {
        id: uuidv4(),
        countryCode: 'KP',
        countryName: 'North Korea',
        restrictionType: 'embargoed',
        details: 'Comprehensive trade embargo and sanctions',
        isActive: true,
        createdAt: now,
        updatedAt: now
      },
      {
        id: uuidv4(),
        countryCode: 'IR',
        countryName: 'Iran',
        restrictionType: 'sanctions',
        details: 'Subject to comprehensive sanctions',
        isActive: true,
        createdAt: now,
        updatedAt: now
      },
      {
        id: uuidv4(),
        countryCode: 'SY',
        countryName: 'Syria',
        restrictionType: 'sanctions',
        details: 'Subject to comprehensive sanctions',
        isActive: true,
        createdAt: now,
        updatedAt: now
      },
      {
        id: uuidv4(),
        countryCode: 'CU',
        countryName: 'Cuba',
        restrictionType: 'embargoed',
        details: 'Subject to trade embargo',
        isActive: true,
        createdAt: now,
        updatedAt: now
      },
      {
        id: uuidv4(),
        countryCode: 'RU',
        countryName: 'Russia',
        restrictionType: 'sanctions',
        details: 'Subject to various sanctions',
        isActive: true,
        createdAt: now,
        updatedAt: now
      },
      {
        id: uuidv4(),
        countryCode: 'BY',
        countryName: 'Belarus',
        restrictionType: 'sanctions',
        details: 'Subject to various sanctions',
        isActive: true,
        createdAt: now,
        updatedAt: now
      }
    ];
  }

  /**
   * Get default enhanced documentation requirements
   */
  private getDefaultEnhancedDocumentation(): Partial<EnhancedDocumentation>[] {
    const now = new Date().toISOString();
    
    return [
      {
        id: uuidv4(),
        countryCode: 'RU',
        countryName: 'Russia',
        requirements: [
          'Commercial invoice in triplicate',
          'Certificate of origin',
          'Detailed packing list',
          'Export license for certain goods'
        ],
        notes: 'Enhanced scrutiny for technology and dual-use items',
        isActive: true,
        createdAt: now,
        updatedAt: now
      },
      {
        id: uuidv4(),
        countryCode: 'VE',
        countryName: 'Venezuela',
        requirements: [
          'Commercial invoice with consular legalization',
          'Certificate of origin',
          'Import license'
        ],
        notes: 'Additional documentation may be required by local authorities',
        isActive: true,
        createdAt: now,
        updatedAt: now
      },
      {
        id: uuidv4(),
        countryCode: 'MM',
        countryName: 'Myanmar',
        requirements: [
          'Import license',
          'Certificate of origin',
          'Commercial invoice with detailed description'
        ],
        notes: 'Enhanced scrutiny for all shipments',
        isActive: true,
        createdAt: now,
        updatedAt: now
      },
      {
        id: uuidv4(),
        countryCode: 'IQ',
        countryName: 'Iraq',
        requirements: [
          'Certificate of origin',
          'Commercial invoice legalized by Iraqi embassy',
          'Import license'
        ],
        notes: 'Restricted shipping services available',
        isActive: true,
        createdAt: now,
        updatedAt: now
      },
      {
        id: uuidv4(),
        countryCode: 'LY',
        countryName: 'Libya',
        requirements: [
          'Certificate of origin',
          'Commercial invoice certified by chamber of commerce',
          'Import license'
        ],
        notes: 'Limited shipping options available',
        isActive: true,
        createdAt: now,
        updatedAt: now
      },
      {
        id: uuidv4(),
        countryCode: 'ZW',
        countryName: 'Zimbabwe',
        requirements: [
          'Import permit',
          'Detailed commercial invoice',
          'Certificate of origin'
        ],
        notes: 'Additional inspection procedures may apply',
        isActive: true,
        createdAt: now,
        updatedAt: now
      },
      {
        id: uuidv4(),
        countryCode: 'CD',
        countryName: 'Democratic Republic of Congo',
        requirements: [
          'Import license',
          'Pre-shipment inspection certificate',
          'Certificate of origin'
        ],
        notes: 'Complex customs clearance procedures',
        isActive: true,
        createdAt: now,
        updatedAt: now
      }
    ];
  }

  /**
   * Format a field key into a display name
   * @example "recipientName" -> "Recipient Name"
   */
  private formatDisplayName(fieldKey: string): string {
    return fieldKey
      // Insert a space before all uppercase letters
      .replace(/([A-Z])/g, ' $1')
      // Capitalize the first letter
      .replace(/^./, str => str.toUpperCase())
      // Trim any extra spaces
      .trim();
  }
}

export const crossBorderRuleLoader = new CrossBorderRuleLoader(); 