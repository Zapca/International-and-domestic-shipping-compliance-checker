import { dbService } from './dbService';
import { 
  RequiredField,
  CountryRequirement,
  RestrictedItem,
  RestrictedDestination,
  EnhancedDocumentation,
  createRequiredField,
  createCountryRequirement,
  createRestrictedItem,
  createRestrictedDestination,
  createEnhancedDocumentation,
  ShippingContext
} from './models';

/**
 * Repository for accessing and managing cross-border compliance rules
 */
export class CrossBorderRuleRepository {
  /**
   * Get all required fields for a specific shipping context
   * @param context - The shipping context (domestic, international, or all)
   */
  async getRequiredFieldsByContext(context: ShippingContext): Promise<RequiredField[]> {
    const db = await dbService.getDb();
    return db.getAllFromIndex('requiredFields', 'by-context', context);
  }

  /**
   * Get all active required fields for international shipping
   */
  async getInternationalRequiredFields(): Promise<RequiredField[]> {
    const db = await dbService.getDb();
    const fields = await db.getAllFromIndex('requiredFields', 'by-context', 'international');
    return fields.filter(field => field.isActive);
  }

  /**
   * Get country-specific requirements for a particular country
   * @param countryCode - The ISO country code
   */
  async getCountryRequirements(countryCode: string): Promise<CountryRequirement | undefined> {
    const db = await dbService.getDb();
    const requirements = await db.getAllFromIndex('countryRequirements', 'by-country', countryCode);
    return requirements.find(req => req.isActive);
  }

  /**
   * Get all active country requirements
   */
  async getAllCountryRequirements(): Promise<CountryRequirement[]> {
    const db = await dbService.getDb();
    const allRequirements = await db.getAll('countryRequirements');
    return allRequirements.filter(req => req.isActive);
  }

  /**
   * Get restricted items for all countries or a specific country
   * @param countryCode - Optional country code to filter by
   */
  async getRestrictedItems(countryCode?: string): Promise<RestrictedItem[]> {
    const db = await dbService.getDb();
    const allItems = await db.getAllFromIndex('restrictedItems', 'by-active', 1);
    
    // Filter items that apply to ALL countries or the specific country
    return allItems.filter(item => {
      if (!countryCode) return true;
      
      // Check if this restriction applies to all countries
      if (item.appliesTo === 'ALL') return true;
      
      // Check if this restriction applies to the specific country
      if (Array.isArray(item.appliesTo)) {
        return item.appliesTo.includes(countryCode);
      }
      
      return false;
    });
  }

  /**
   * Get all restricted destinations
   */
  async getRestrictedDestinations(): Promise<RestrictedDestination[]> {
    const db = await dbService.getDb();
    return db.getAllFromIndex('restrictedDestinations', 'by-active', 1);
  }

  /**
   * Check if a country is a restricted destination
   * @param countryCode - The ISO country code to check
   */
  async isRestrictedDestination(countryCode: string): Promise<RestrictedDestination | undefined> {
    const db = await dbService.getDb();
    const destinations = await db.getAllFromIndex('restrictedDestinations', 'by-country', countryCode);
    return destinations.find(dest => dest.isActive);
  }

  /**
   * Get countries with enhanced documentation requirements
   */
  async getEnhancedDocumentationCountries(): Promise<EnhancedDocumentation[]> {
    const db = await dbService.getDb();
    return db.getAllFromIndex('enhancedDocumentation', 'by-active', 1);
  }

  /**
   * Get enhanced documentation requirements for a specific country
   * @param countryCode - The ISO country code
   */
  async getEnhancedDocumentationForCountry(countryCode: string): Promise<EnhancedDocumentation | undefined> {
    const db = await dbService.getDb();
    const docRequirements = await db.getAllFromIndex('enhancedDocumentation', 'by-country', countryCode);
    return docRequirements.find(doc => doc.isActive);
  }

  // CRUD methods for RequiredField

  /**
   * Add a new required field
   */
  async addRequiredField(field: Partial<RequiredField>): Promise<RequiredField> {
    const db = await dbService.getDb();
    const newField = createRequiredField(field);
    await db.add('requiredFields', newField);
    return newField;
  }

  /**
   * Update an existing required field
   */
  async updateRequiredField(id: string, updates: Partial<RequiredField>): Promise<RequiredField> {
    const db = await dbService.getDb();
    const field = await db.get('requiredFields', id);
    if (!field) {
      throw new Error(`Required field with id ${id} not found`);
    }
    
    const updatedField = {
      ...field,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    await db.put('requiredFields', updatedField);
    return updatedField;
  }

  /**
   * Delete a required field
   */
  async deleteRequiredField(id: string): Promise<void> {
    const db = await dbService.getDb();
    await db.delete('requiredFields', id);
  }

  // CRUD methods for CountryRequirement

  /**
   * Add a new country requirement
   */
  async addCountryRequirement(requirement: Partial<CountryRequirement>): Promise<CountryRequirement> {
    const db = await dbService.getDb();
    const newRequirement = createCountryRequirement(requirement);
    await db.add('countryRequirements', newRequirement);
    return newRequirement;
  }

  /**
   * Update an existing country requirement
   */
  async updateCountryRequirement(id: string, updates: Partial<CountryRequirement>): Promise<CountryRequirement> {
    const db = await dbService.getDb();
    const requirement = await db.get('countryRequirements', id);
    if (!requirement) {
      throw new Error(`Country requirement with id ${id} not found`);
    }
    
    const updatedRequirement = {
      ...requirement,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    await db.put('countryRequirements', updatedRequirement);
    return updatedRequirement;
  }

  /**
   * Delete a country requirement
   */
  async deleteCountryRequirement(id: string): Promise<void> {
    const db = await dbService.getDb();
    await db.delete('countryRequirements', id);
  }

  // CRUD methods for RestrictedItem

  /**
   * Add a new restricted item
   */
  async addRestrictedItem(item: Partial<RestrictedItem>): Promise<RestrictedItem> {
    const db = await dbService.getDb();
    const newItem = createRestrictedItem(item);
    await db.add('restrictedItems', newItem);
    return newItem;
  }

  /**
   * Update an existing restricted item
   */
  async updateRestrictedItem(id: string, updates: Partial<RestrictedItem>): Promise<RestrictedItem> {
    const db = await dbService.getDb();
    const item = await db.get('restrictedItems', id);
    if (!item) {
      throw new Error(`Restricted item with id ${id} not found`);
    }
    
    const updatedItem = {
      ...item,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    await db.put('restrictedItems', updatedItem);
    return updatedItem;
  }

  /**
   * Delete a restricted item
   */
  async deleteRestrictedItem(id: string): Promise<void> {
    const db = await dbService.getDb();
    await db.delete('restrictedItems', id);
  }

  // CRUD methods for RestrictedDestination

  /**
   * Add a new restricted destination
   */
  async addRestrictedDestination(destination: Partial<RestrictedDestination>): Promise<RestrictedDestination> {
    const db = await dbService.getDb();
    const newDestination = createRestrictedDestination(destination);
    await db.add('restrictedDestinations', newDestination);
    return newDestination;
  }

  /**
   * Update an existing restricted destination
   */
  async updateRestrictedDestination(id: string, updates: Partial<RestrictedDestination>): Promise<RestrictedDestination> {
    const db = await dbService.getDb();
    const destination = await db.get('restrictedDestinations', id);
    if (!destination) {
      throw new Error(`Restricted destination with id ${id} not found`);
    }
    
    const updatedDestination = {
      ...destination,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    await db.put('restrictedDestinations', updatedDestination);
    return updatedDestination;
  }

  /**
   * Delete a restricted destination
   */
  async deleteRestrictedDestination(id: string): Promise<void> {
    const db = await dbService.getDb();
    await db.delete('restrictedDestinations', id);
  }

  // CRUD methods for EnhancedDocumentation

  /**
   * Add a new enhanced documentation requirement
   */
  async addEnhancedDocumentation(documentation: Partial<EnhancedDocumentation>): Promise<EnhancedDocumentation> {
    const db = await dbService.getDb();
    const newDocumentation = createEnhancedDocumentation(documentation);
    await db.add('enhancedDocumentation', newDocumentation);
    return newDocumentation;
  }

  /**
   * Update an existing enhanced documentation requirement
   */
  async updateEnhancedDocumentation(id: string, updates: Partial<EnhancedDocumentation>): Promise<EnhancedDocumentation> {
    const db = await dbService.getDb();
    const documentation = await db.get('enhancedDocumentation', id);
    if (!documentation) {
      throw new Error(`Enhanced documentation with id ${id} not found`);
    }
    
    const updatedDocumentation = {
      ...documentation,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    await db.put('enhancedDocumentation', updatedDocumentation);
    return updatedDocumentation;
  }

  /**
   * Delete an enhanced documentation requirement
   */
  async deleteEnhancedDocumentation(id: string): Promise<void> {
    const db = await dbService.getDb();
    await db.delete('enhancedDocumentation', id);
  }

  /**
   * Bulk import cross-border compliance rules (for initialization)
   */
  async importCrossBorderRules({
    requiredFields = [],
    countryRequirements = [],
    restrictedItems = [],
    restrictedDestinations = [],
    enhancedDocumentation = []
  }: {
    requiredFields?: Partial<RequiredField>[];
    countryRequirements?: Partial<CountryRequirement>[];
    restrictedItems?: Partial<RestrictedItem>[];
    restrictedDestinations?: Partial<RestrictedDestination>[];
    enhancedDocumentation?: Partial<EnhancedDocumentation>[];
  }): Promise<void> {
    const db = await dbService.getDb();
    const tx = db.transaction([
      'requiredFields', 
      'countryRequirements', 
      'restrictedItems',
      'restrictedDestinations',
      'enhancedDocumentation'
    ], 'readwrite');

    // Import each type of rule
    const promises: Promise<any>[] = [];
    
    // Required fields
    for (const field of requiredFields) {
      const newField = createRequiredField(field);
      promises.push(tx.objectStore('requiredFields').put(newField));
    }
    
    // Country requirements
    for (const requirement of countryRequirements) {
      const newRequirement = createCountryRequirement(requirement);
      promises.push(tx.objectStore('countryRequirements').put(newRequirement));
    }
    
    // Restricted items
    for (const item of restrictedItems) {
      const newItem = createRestrictedItem(item);
      promises.push(tx.objectStore('restrictedItems').put(newItem));
    }
    
    // Restricted destinations
    for (const destination of restrictedDestinations) {
      const newDestination = createRestrictedDestination(destination);
      promises.push(tx.objectStore('restrictedDestinations').put(newDestination));
    }
    
    // Enhanced documentation
    for (const doc of enhancedDocumentation) {
      const newDoc = createEnhancedDocumentation(doc);
      promises.push(tx.objectStore('enhancedDocumentation').put(newDoc));
    }
    
    // Wait for all operations to complete
    await Promise.all(promises);
    await tx.done;
    
    console.log('Cross-border compliance rules imported successfully');
  }
}

export const crossBorderRuleRepository = new CrossBorderRuleRepository(); 