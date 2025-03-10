import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { ComplianceRule, RuleCategory, ValidationConstraint } from '../database/models';
import { ruleRepository } from '../database/ruleRepository';
import { 
  ApiConfig, 
  SyncResult 
} from '../../models/compliance';

/**
 * API configuration interface
 */
interface ComplianceAPIConfig {
  baseUrl: string;
  apiKey: string;
  version?: string;
  region?: string;
  headers?: Record<string, string>;
}

/**
 * External API regulation data structure
 */
interface ExternalRegulation {
  id: string;
  name: string;
  description: string;
  category: string;
  requirements: string[];
  validationRules?: any[];
  effectiveDate: string;
  expirationDate?: string;
  jurisdiction?: string;
  source?: string;
  severity?: 'high' | 'medium' | 'low';
  metadata?: Record<string, any>;
}

/**
 * Service to fetch compliance rules from external APIs
 */
export class ComplianceAPIService {
  private config: ComplianceAPIConfig;
  private httpClient: any;
  
  /**
   * Initialize the service with API configuration
   * @param config API configuration including baseUrl and apiKey
   */
  constructor(config: ComplianceAPIConfig) {
    this.config = config;
    
    this.httpClient = axios.create({
      baseURL: config.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
        ...config.headers
      }
    });
  }
  
  /**
   * Fetch the latest regulations from the API
   * @param category Optional category filter
   * @param region Optional region/jurisdiction filter
   * @returns Array of regulation data
   */
  async fetchLatestRegulations(category?: string, region?: string): Promise<ExternalRegulation[]> {
    try {
      // Build query params
      const params = new URLSearchParams();
      if (category) params.append('category', category);
      if (region) params.append('region', region || this.config.region || '');
      
      // Make API request
      const response = await this.httpClient.get(`/regulations`, { params });
      
      if (response.status !== 200) {
        throw new Error(`API returned error status: ${response.status}`);
      }
      
      return response.data;
    } catch (error) {
      console.error('Error fetching regulations:', error);
      throw error;
    }
  }
  
  /**
   * Import regulations from the API into the local database
   * @param category Optional category to import
   * @param region Optional region filter
   * @returns Summary of imported rules
   */
  async importRegulations(category?: string, region?: string): Promise<{
    total: number;
    imported: number;
    updated: number;
    categories: number;
  }> {
    try {
      // Fetch regulations from API
      const regulations = await this.fetchLatestRegulations(category, region);
      
      if (!regulations || regulations.length === 0) {
        console.log('No regulations found to import');
        return {
          total: 0,
          imported: 0,
          updated: 0,
          categories: 0
        };
      }
      
      console.log(`Found ${regulations.length} regulations to process`);
      
      // Extract unique category names
      const categoriesSet = new Set<string>();
      regulations.forEach(reg => {
        if (reg.category) {
          categoriesSet.add(reg.category);
        }
      });
      
      console.log(`Found ${categoriesSet.size} unique categories`);
      
      // Create categories for these regulations
      const categoryMap: Record<string, RuleCategory> = {};
      
      // Convert Set to Array before iteration to avoid TypeScript issues
      for (const categoryName of Array.from(categoriesSet)) {
        let category = await this.findCategoryByName(categoryName);
        
        if (!category) {
          // Create new category
          category = await ruleRepository.addCategory({
            name: this.capitalizeFirstLetter(categoryName),
            description: `Compliance rules for ${categoryName}`,
            priority: 50,
            isActive: true
          });
          console.log(`Created new category: ${category.name}`);
        }
        
        categoryMap[categoryName] = category;
      }
      
      // Track stats
      const stats = {
        total: regulations.length,
        imported: 0,
        updated: 0,
        categories: 0
      };
      
      // Process each regulation
      for (const regulation of regulations) {
        try {
          // Get category ID
          const categoryId = categoryMap[regulation.category]?.id;
          if (!categoryId) continue;
          
          // Find existing rule by external ID
          const existingRule = await this.findRuleByExternalId(regulation.id);
          
          // Basic rule data
          const ruleData: Partial<ComplianceRule> = {
            categoryId,
            fieldKey: this.generateFieldKey(regulation.name),
            displayName: regulation.name,
            description: regulation.description,
            fieldType: 'text', // Default field type
            isRequired: true,
            validationPattern: '',
            validationMessage: `Must comply with ${regulation.name} regulation`,
            exampleValue: '',
            isActive: true,
            priority: 1,
            metadata: {
              externalId: regulation.id,
              source: regulation.source || 'compliance-api',
              effectiveDate: regulation.effectiveDate,
              expirationDate: regulation.expirationDate,
              jurisdiction: regulation.jurisdiction,
              severity: regulation.severity || 'medium'
            }
          };
          
          // Handle creation or update
          if (existingRule) {
            // Update existing rule
            await ruleRepository.updateRule(existingRule.id, ruleData);
            stats.updated++;
          } else {
            // Create new rule
            await ruleRepository.addRule(ruleData);
            stats.imported++;
          }
          
          // Add validation constraints if available
          if (regulation.validationRules && regulation.validationRules.length > 0) {
            const ruleId = existingRule?.id || (await this.findRuleByExternalId(regulation.id))?.id;
            
            if (ruleId) {
              await this.processValidationRules(ruleId, regulation.validationRules);
            }
          }
        } catch (err) {
          console.error(`Error processing regulation ${regulation.id}:`, err);
          // Continue with next regulation
        }
      }
      
      return stats;
    } catch (error) {
      console.error('Error importing regulations:', error);
      throw error;
    }
  }
  
  /**
   * Process validation rules from the API and convert to our constraint format
   * @param ruleId The rule ID to associate constraints with
   * @param validationRules External validation rules
   */
  private async processValidationRules(ruleId: string, validationRules: any[]): Promise<void> {
    // Get existing constraints
    const existingConstraints = await ruleRepository.getConstraintsByRuleId(ruleId);
    
    for (const validation of validationRules) {
      try {
        // Map external validation to our constraint format
        const constraintData: Partial<ValidationConstraint> = {
          ruleId,
          constraintType: this.mapConstraintType(validation.type),
          constraintValue: String(validation.value || ''),
          validationLevel: this.mapSeverityToLevel(validation.severity || 'medium'),
          errorMessage: validation.message || 'Does not comply with regulation',
          isActive: true,
          metadata: {
            source: 'compliance-api',
            originalRule: validation
          }
        };
        
        // Find existing constraint with similar properties
        const existingConstraint = existingConstraints.find(c => 
          c.constraintType === constraintData.constraintType && 
          c.constraintValue === constraintData.constraintValue
        );
        
        if (existingConstraint) {
          // Update existing constraint
          await ruleRepository.updateConstraint(existingConstraint.id, constraintData);
        } else {
          // Create new constraint
          await ruleRepository.addConstraint(constraintData);
        }
      } catch (err) {
        console.error('Error processing validation rule:', err);
        // Continue with next validation rule
      }
    }
  }
  
  /**
   * Find a rule by its external ID stored in metadata
   * @param externalId External regulation ID
   * @returns Found rule or undefined
   */
  private async findRuleByExternalId(externalId: string): Promise<ComplianceRule | undefined> {
    const allRules = await ruleRepository.getAllRules();
    return allRules.find(rule => 
      rule.metadata?.externalId === externalId
    );
  }
  
  /**
   * Generate a camelCase field key from a rule name
   * @param name Rule name
   * @returns Field key
   */
  private generateFieldKey(name: string): string {
    // Remove special characters, convert to camelCase
    return name
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+(.)/g, (_, letter) => letter.toUpperCase())
      .replace(/\s/g, '');
  }
  
  /**
   * Map external constraint type to our internal format
   * @param externalType External constraint type
   * @returns Internal constraint type
   */
  private mapConstraintType(externalType: string): 'min' | 'max' | 'equal' | 'pattern' | 'custom' {
    const typeMap: Record<string, 'min' | 'max' | 'equal' | 'pattern' | 'custom'> = {
      'minimum': 'min',
      'maximum': 'max',
      'equals': 'equal',
      'regex': 'pattern',
      'format': 'pattern',
      'length': 'custom',
    };
    
    return typeMap[externalType.toLowerCase()] || 'custom';
  }
  
  /**
   * Map severity level to validation level
   * @param severity External severity
   * @returns Internal validation level
   */
  private mapSeverityToLevel(severity: string): 'error' | 'warning' | 'info' {
    const severityMap: Record<string, 'error' | 'warning' | 'info'> = {
      'high': 'error',
      'medium': 'warning',
      'low': 'info'
    };
    
    return severityMap[severity.toLowerCase()] || 'warning';
  }

  /**
   * Fetches and imports regulations from the API with detailed logging
   * @param logCallback Optional callback for logging progress
   * @returns Statistics about the import process
   */
  async fetchAndImportRegulations(
    logCallback?: (message: string) => void
  ): Promise<SyncResult> {
    try {
      if (logCallback) logCallback('Connecting to compliance API...');
      
      // Get all categories
      if (logCallback) logCallback('Fetching available categories...');
      const categories = await this.fetchCategories();
      
      if (categories.length === 0) {
        return {
          total: 0,
          imported: 0,
          updated: 0,
          categories: 0,
          error: 'No categories found in API'
        };
      }
      
      if (logCallback) logCallback(`Found ${categories.length} categories`);
      
      // Track statistics
      let totalRules = 0;
      let importedRules = 0;
      let updatedRules = 0;
      
      // Process each category
      for (const category of categories) {
        if (logCallback) logCallback(`Processing category: ${category}`);
        
        // Fetch rules for this category
        const rules = await this.fetchRulesByCategory(category);
        
        if (logCallback) logCallback(`Found ${rules.length} rules in category ${category}`);
        totalRules += rules.length;
        
        // Import each rule
        for (const rule of rules) {
          const result = await this.importRule(rule);
          
          if (result.isNew) {
            importedRules++;
          } else if (result.updated) {
            updatedRules++;
          }
        }
      }
      
      // Return statistics
      return {
        total: totalRules,
        imported: importedRules,
        updated: updatedRules,
        categories: categories.length
      };
    } catch (error) {
      console.error('Error in fetchAndImportRegulations:', error);
      return {
        total: 0,
        imported: 0,
        updated: 0,
        categories: 0,
        error: error instanceof Error ? error.message : 'Unknown error during synchronization'
      };
    }
  }

  /**
   * Fetches available categories from the API
   * @returns List of category names
   */
  async fetchCategories(): Promise<string[]> {
    try {
      // Mock implementation - in a real app, this would call the API
      // Example: const response = await axios.get(`${this.baseUrl}/categories`, this.getRequestConfig());
      
      // For now, return hardcoded categories
      return [
        'SHIPPING_INFO',
        'PACKAGE_DETAILS', 
        'ADDRESS_INFO',
        'CUSTOMS_INTERNATIONAL'
      ];
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
  }

  /**
   * Fetches rules by category from the API
   * @param category The category to fetch rules for
   * @returns List of compliance rules
   */
  async fetchRulesByCategory(category: string): Promise<any[]> {
    try {
      // Mock implementation - in a real app, this would call the API
      // Example: const response = await axios.get(`${this.baseUrl}/rules?category=${category}`, this.getRequestConfig());
      
      // Generate a few mock rules
      const mockRules = [];
      const prefixes = {
        'SHIPPING_INFO': 'shipping',
        'PACKAGE_DETAILS': 'package',
        'ADDRESS_INFO': 'address',
        'CUSTOMS_INTERNATIONAL': 'customs'
      };
      
      const prefix = prefixes[category as keyof typeof prefixes] || 'general';
      
      // Create 3-5 mock rules per category
      const count = 3 + Math.floor(Math.random() * 3);
      for (let i = 0; i < count; i++) {
        mockRules.push({
          id: `${prefix}-rule-${i}`,
          fieldKey: `${prefix}.field${i}`,
          displayName: `${this.capitalizeFirstLetter(prefix)} Rule ${i}`,
          categoryId: category,
          isRequired: Math.random() > 0.5,
          isActive: true,
          description: `Mock description for ${prefix} rule ${i}`
        });
      }
      
      return mockRules;
    } catch (error) {
      console.error(`Error fetching rules for category ${category}:`, error);
      return [];
    }
  }

  /**
   * Imports a single rule into the database
   * @param rule The rule to import
   * @returns Result of the import operation
   */
  async importRule(rule: any): Promise<{ isNew: boolean; updated: boolean }> {
    try {
      // Check if rule already exists
      const existingRule = await ruleRepository.getRuleById(rule.id);
      
      if (!existingRule) {
        // Create new rule
        await ruleRepository.addRule({
          id: rule.id,
          fieldKey: rule.fieldKey,
          displayName: rule.displayName,
          categoryId: rule.categoryId,
          description: rule.description,
          isRequired: rule.isRequired,
          isActive: rule.isActive
        });
        return { isNew: true, updated: false };
      } else {
        // Update existing rule
        await ruleRepository.updateRule(rule.id, {
          fieldKey: rule.fieldKey,
          displayName: rule.displayName,
          categoryId: rule.categoryId,
          description: rule.description,
          isRequired: rule.isRequired,
          isActive: rule.isActive
        });
        return { isNew: false, updated: true };
      }
    } catch (error) {
      console.error('Error importing rule:', error);
      return { isNew: false, updated: false };
    }
  }

  /**
   * Helper method to capitalize the first letter of a string
   */
  private capitalizeFirstLetter(string: string): string {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  /**
   * Find a category by name
   * @param categoryName Name of the category to find
   * @returns The category if found, undefined otherwise
   */
  private async findCategoryByName(categoryName: string): Promise<RuleCategory | undefined> {
    const allCategories = await ruleRepository.getAllCategories();
    return allCategories.find(c => c.name.toLowerCase() === categoryName.toLowerCase());
  }
}

// Create a default API provider instance
// Replace with actual API credentials when available
export const complianceApi = new ComplianceAPIService({
  baseUrl: process.env.REACT_APP_COMPLIANCE_API_URL || 'https://api.complianceregulations.com',
  apiKey: process.env.REACT_APP_COMPLIANCE_API_KEY || 'your_api_key_here',
  region: process.env.REACT_APP_COMPLIANCE_REGION || 'US'
});

/**
 * Create a singleton instance with default configuration
 * This avoids multiple instances of the API service
 */
export const complianceAPIService = new ComplianceAPIService({
  baseUrl: 'https://api.compliance.example.com/v1',
  apiKey: process.env.REACT_APP_COMPLIANCE_API_KEY || 'your_api_key_here',
  region: 'GLOBAL'
}); 