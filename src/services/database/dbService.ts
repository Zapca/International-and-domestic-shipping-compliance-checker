import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { 
  ComplianceRule,
  RuleCategory,
  ValidationConstraint,
  RuleDependency,
  RegionalRule,
  RuleChangeHistory as RuleHistory,
  // New cross-border models
  RequiredField,
  CountryRequirement,
  RestrictedItem,
  RestrictedDestination,
  EnhancedDocumentation
} from './models';

/**
 * Database schema for IndexedDB
 * Each store has specific key type, value type, and index configurations
 */
interface ComplianceDB extends DBSchema {
  // Rules store
  'rules': {
    key: string; // Primary key is the rule ID
    value: ComplianceRule; // Value is the entire rule object
    // Define indexes and their key types
    indexes: {
      'by-category': string; // Index on categoryId field
      'by-field-key': string; // Index on fieldKey field 
      'by-active': number; // Index on isActive field (0 or 1)
    };
  };
  // Categories store
  'categories': {
    key: string; // Primary key is the category ID
    value: RuleCategory; // Value is the entire category object
    // Define indexes and their key types
    indexes: {
      'by-active': number; // Index on isActive field (0 or 1)
    };
  };
  // Constraints store
  'constraints': {
    key: string; // Primary key is the constraint ID
    value: ValidationConstraint; // Value is the entire constraint object
    // Define indexes and their key types
    indexes: {
      'by-rule': string; // Index on ruleId field
    };
  };
  // Dependencies store
  'dependencies': {
    key: string; // Primary key is the dependency ID
    value: RuleDependency; // Value is the entire dependency object
    // Define indexes and their key types
    indexes: {
      'by-primary-rule': string; // Index on primaryRuleId field
      'by-dependent-rule': string; // Index on dependentRuleId field
    };
  };
  // Regional rules store
  'regionalRules': {
    key: string; // Primary key is the regional rule ID
    value: RegionalRule; // Value is the entire regional rule object
    // Define indexes and their key types
    indexes: {
      'by-rule': string; // Index on ruleId field
      'by-country': string; // Index on countryCode field
    };
  };
  // History store
  'history': {
    key: string; // Primary key is the history entry ID
    value: RuleHistory; // Value is the entire history object
    // Define indexes and their key types
    indexes: {
      'by-rule': string; // Index on ruleId field
      'by-timestamp': string; // Index on timestamp field
    };
  };
  
  // New stores for cross-border compliance
  
  // Required fields for different shipping contexts
  'requiredFields': {
    key: string; // Primary key is the required field ID
    value: RequiredField; // Value is the entire required field object
    // Define indexes and their key types
    indexes: {
      'by-context': string; // Index on context field
      'by-active': number; // Index on isActive field (0 or 1)
      'by-field-key': string; // Index on fieldKey field
    };
  };
  
  // Country-specific requirements
  'countryRequirements': {
    key: string; // Primary key is the country requirement ID
    value: CountryRequirement; // Value is the entire country requirement object
    // Define indexes and their key types
    indexes: {
      'by-country': string; // Index on countryCode field
      'by-active': number; // Index on isActive field (0 or 1)
    };
  };
  
  // Restricted items
  'restrictedItems': {
    key: string; // Primary key is the restricted item ID
    value: RestrictedItem; // Value is the entire restricted item object
    // Define indexes and their key types
    indexes: {
      'by-category': string; // Index on category field
      'by-active': number; // Index on isActive field (0 or 1)
      'by-severity': string; // Index on severity field
    };
  };
  
  // Restricted destinations
  'restrictedDestinations': {
    key: string; // Primary key is the restricted destination ID
    value: RestrictedDestination; // Value is the entire restricted destination object
    // Define indexes and their key types
    indexes: {
      'by-country': string; // Index on countryCode field
      'by-restriction-type': string; // Index on restrictionType field
      'by-active': number; // Index on isActive field (0 or 1)
    };
  };
  
  // Enhanced documentation requirements
  'enhancedDocumentation': {
    key: string; // Primary key is the enhanced documentation ID
    value: EnhancedDocumentation; // Value is the entire enhanced documentation object
    // Define indexes and their key types
    indexes: {
      'by-country': string; // Index on countryCode field
      'by-active': number; // Index on isActive field (0 or 1)
    };
  };
}

// Database name and version
const DB_NAME = 'compliance-rules-db';
const DB_VERSION = 3;

/**
 * Database service for compliance rules
 */
class ComplianceDBService {
  private db: IDBPDatabase<ComplianceDB> | null = null;
  private initializing: Promise<IDBPDatabase<ComplianceDB>> | null = null;

  /**
   * Initialize the database connection
   */
  async initialize(): Promise<IDBPDatabase<ComplianceDB>> {
    if (this.db) return this.db;
    
    if (this.initializing) return this.initializing;
    
    this.initializing = this.initDb();
    const db = await this.initializing;
    this.db = db;
    this.initializing = null;
    return db;
  }

  /**
   * Initialize the database and create object stores
   */
  private async initDb(): Promise<IDBPDatabase<ComplianceDB>> {
    if (this.initializing) {
      return this.initializing;
    }

    try {
      const dbName = 'compliance-rules-db';
      const version = 3; // Increment version to trigger database upgrade

      const db = await openDB<ComplianceDB>(dbName, version, {
        upgrade(db, oldVersion, newVersion, transaction) {
          // Create stores if they don't exist already
          
          // Create original stores (if upgrading from no database)
          if (oldVersion < 1) {
            // Rules store
            const rulesStore = db.createObjectStore('rules', { keyPath: 'id' });
            rulesStore.createIndex('by-category', 'categoryId');
            rulesStore.createIndex('by-field-key', 'fieldKey');
            rulesStore.createIndex('by-active', 'isActive');

            // Categories store
            const categoriesStore = db.createObjectStore('categories', { keyPath: 'id' });
            categoriesStore.createIndex('by-active', 'isActive');

            // Constraints store
            const constraintsStore = db.createObjectStore('constraints', { keyPath: 'id' });
            constraintsStore.createIndex('by-rule', 'ruleId');

            // Dependencies store
            const dependenciesStore = db.createObjectStore('dependencies', { keyPath: 'id' });
            dependenciesStore.createIndex('by-primary-rule', 'primaryRuleId');
            dependenciesStore.createIndex('by-dependent-rule', 'dependentRuleId');

            // Regional rules store
            const regionalRulesStore = db.createObjectStore('regionalRules', { keyPath: 'id' });
            regionalRulesStore.createIndex('by-rule', 'ruleId');
            regionalRulesStore.createIndex('by-country', 'countryCode');

            // History store
            const historyStore = db.createObjectStore('history', { keyPath: 'id' });
            historyStore.createIndex('by-rule', 'ruleId');
            historyStore.createIndex('by-timestamp', 'timestamp');
          }
          
          // Create new cross-border stores (if upgrading from version 1)
          if (oldVersion < 2) {
            // Required fields store
            const requiredFieldsStore = db.createObjectStore('requiredFields', { keyPath: 'id' });
            requiredFieldsStore.createIndex('by-context', 'context');
            requiredFieldsStore.createIndex('by-active', 'isActive');
            requiredFieldsStore.createIndex('by-field-key', 'fieldKey');
            
            // Country requirements store
            const countryRequirementsStore = db.createObjectStore('countryRequirements', { keyPath: 'id' });
            countryRequirementsStore.createIndex('by-country', 'countryCode');
            countryRequirementsStore.createIndex('by-active', 'isActive');
            
            // Restricted items store
            const restrictedItemsStore = db.createObjectStore('restrictedItems', { keyPath: 'id' });
            restrictedItemsStore.createIndex('by-category', 'category');
            restrictedItemsStore.createIndex('by-active', 'isActive');
            restrictedItemsStore.createIndex('by-severity', 'severity');
            
            // Restricted destinations store
            const restrictedDestinationsStore = db.createObjectStore('restrictedDestinations', { keyPath: 'id' });
            restrictedDestinationsStore.createIndex('by-country', 'countryCode');
            restrictedDestinationsStore.createIndex('by-restriction-type', 'restrictionType');
            restrictedDestinationsStore.createIndex('by-active', 'isActive');
            
            // Enhanced documentation store
            const enhancedDocumentationStore = db.createObjectStore('enhancedDocumentation', { keyPath: 'id' });
            enhancedDocumentationStore.createIndex('by-country', 'countryCode');
            enhancedDocumentationStore.createIndex('by-active', 'isActive');
          }
        }
      });

      console.log('Database initialized successfully');
      return db;
    } catch (error) {
      console.error('Error initializing database:', error);
      throw error;
    }
  }

  /**
   * Get the database instance
   */
  async getDb(): Promise<IDBPDatabase<ComplianceDB>> {
    if (!this.db) {
      await this.initialize();
    }
    return this.db!;
  }

  /**
   * Close the database connection
   */
  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
  
  /**
   * Utility method to handle transactions and errors
   */
  private async withDb<T>(
    operation: (db: IDBPDatabase<ComplianceDB>) => Promise<T>
  ): Promise<T> {
    try {
      const db = await this.getDb();
      return await operation(db);
    } catch (error) {
      console.error('Database operation failed:', error);
      throw error;
    }
  }
}

// Create and export a singleton instance
export const dbService = new ComplianceDBService(); 