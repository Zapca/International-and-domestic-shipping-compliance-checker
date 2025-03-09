import { dbService } from './dbService';
import { 
  ComplianceRule, 
  RuleCategory,
  ValidationConstraint,
  RuleDependency,
  RegionalRule,
  createComplianceRule,
  createRuleCategory,
  createValidationConstraint
} from './models';

/**
 * Repository for accessing and managing compliance rules
 */
export class RuleRepository {
  /**
   * Get all compliance rules
   */
  async getAllRules(): Promise<ComplianceRule[]> {
    const db = await dbService.getDb();
    return db.getAll('rules');
  }

  /**
   * Get active compliance rules
   */
  async getActiveRules(): Promise<ComplianceRule[]> {
    const db = await dbService.getDb();
    return db.getAllFromIndex('rules', 'by-active', 1);
  }

  /**
   * Get a rule by ID
   */
  async getRuleById(id: string): Promise<ComplianceRule | undefined> {
    const db = await dbService.getDb();
    return db.get('rules', id);
  }

  /**
   * Get rules by category
   */
  async getRulesByCategory(categoryId: string): Promise<ComplianceRule[]> {
    const db = await dbService.getDb();
    return db.getAllFromIndex('rules', 'by-category', categoryId);
  }

  /**
   * Get rule by field key
   */
  async getRuleByFieldKey(fieldKey: string): Promise<ComplianceRule | undefined> {
    const db = await dbService.getDb();
    const rules = await db.getAllFromIndex('rules', 'by-field-key', fieldKey);
    return rules.length > 0 ? rules[0] : undefined;
  }

  /**
   * Add a new compliance rule
   */
  async addRule(rule: Partial<ComplianceRule>): Promise<ComplianceRule> {
    const db = await dbService.getDb();
    const newRule = createComplianceRule(rule);
    
    // Convert boolean values to numbers for indexing
    const ruleToStore = {
      ...newRule,
      // For indexing: convert boolean to number (0 or 1)
      __isActive: newRule.isActive ? 1 : 0
    };
    
    await db.put('rules', ruleToStore);
    return newRule;
  }

  /**
   * Update an existing rule
   */
  async updateRule(id: string, updates: Partial<ComplianceRule>): Promise<ComplianceRule> {
    const db = await dbService.getDb();
    const existingRule = await this.getRuleById(id);
    
    if (!existingRule) {
      throw new Error(`Rule with ID ${id} not found`);
    }
    
    const updatedRule = {
      ...existingRule,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    // Convert boolean values to numbers for indexing
    const ruleToStore = {
      ...updatedRule,
      // For indexing: convert boolean to number (0 or 1)
      __isActive: updatedRule.isActive ? 1 : 0
    };
    
    await db.put('rules', ruleToStore);
    return updatedRule;
  }

  /**
   * Delete a rule
   */
  async deleteRule(id: string): Promise<void> {
    const db = await dbService.getDb();
    await db.delete('rules', id);
  }

  /**
   * Get all categories
   */
  async getAllCategories(): Promise<RuleCategory[]> {
    const db = await dbService.getDb();
    return db.getAll('categories');
  }

  /**
   * Get active categories
   */
  async getActiveCategories(): Promise<RuleCategory[]> {
    const db = await dbService.getDb();
    return db.getAllFromIndex('categories', 'by-active', 1);
  }

  /**
   * Get a category by ID
   */
  async getCategoryById(id: string): Promise<RuleCategory | undefined> {
    const db = await dbService.getDb();
    return db.get('categories', id);
  }

  /**
   * Add a new category
   */
  async addCategory(category: Partial<RuleCategory>): Promise<RuleCategory> {
    const db = await dbService.getDb();
    const newCategory = createRuleCategory(category);
    
    // Convert boolean values to numbers for indexing
    const categoryToStore = {
      ...newCategory,
      // For indexing: convert boolean to number (0 or 1)
      __isActive: newCategory.isActive ? 1 : 0
    };
    
    await db.put('categories', categoryToStore);
    return newCategory;
  }

  /**
   * Update an existing category
   */
  async updateCategory(id: string, updates: Partial<RuleCategory>): Promise<RuleCategory> {
    const db = await dbService.getDb();
    const existingCategory = await this.getCategoryById(id);
    
    if (!existingCategory) {
      throw new Error(`Category with ID ${id} not found`);
    }
    
    const updatedCategory = {
      ...existingCategory,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    // Convert boolean values to numbers for indexing
    const categoryToStore = {
      ...updatedCategory,
      // For indexing: convert boolean to number (0 or 1)
      __isActive: updatedCategory.isActive ? 1 : 0
    };
    
    await db.put('categories', categoryToStore);
    return updatedCategory;
  }

  /**
   * Delete a category
   */
  async deleteCategory(id: string): Promise<void> {
    const db = await dbService.getDb();
    await db.delete('categories', id);
  }

  /**
   * Get constraints for a rule
   */
  async getConstraintsByRuleId(ruleId: string): Promise<ValidationConstraint[]> {
    const db = await dbService.getDb();
    return db.getAllFromIndex('constraints', 'by-rule', ruleId);
  }

  /**
   * Add a new constraint
   */
  async addConstraint(constraint: Partial<ValidationConstraint>): Promise<ValidationConstraint> {
    const db = await dbService.getDb();
    const newConstraint = createValidationConstraint(constraint);
    await db.add('constraints', newConstraint);
    return newConstraint;
  }

  /**
   * Update a constraint
   */
  async updateConstraint(id: string, updates: Partial<ValidationConstraint>): Promise<ValidationConstraint> {
    const db = await dbService.getDb();
    const existingConstraint = await db.get('constraints', id);
    
    if (!existingConstraint) {
      throw new Error(`Constraint with ID ${id} not found`);
    }
    
    const updatedConstraint = {
      ...existingConstraint,
      ...updates
    };
    
    await db.put('constraints', updatedConstraint);
    return updatedConstraint;
  }

  /**
   * Delete a constraint
   */
  async deleteConstraint(id: string): Promise<void> {
    const db = await dbService.getDb();
    await db.delete('constraints', id);
  }

  /**
   * Get rule dependencies
   */
  async getDependenciesByRuleId(ruleId: string): Promise<RuleDependency[]> {
    const db = await dbService.getDb();
    return db.getAllFromIndex('dependencies', 'by-primary-rule', ruleId);
  }

  /**
   * Get regional rules for a rule
   */
  async getRegionalRulesByRuleId(ruleId: string): Promise<RegionalRule[]> {
    const db = await dbService.getDb();
    return db.getAllFromIndex('regionalRules', 'by-rule', ruleId);
  }

  /**
   * Import rules (batch operation)
   */
  async importRules(rules: ComplianceRule[]): Promise<void> {
    const db = await dbService.getDb();
    const tx = db.transaction('rules', 'readwrite');
    
    for (const rule of rules) {
      await tx.store.put(rule);
    }
    
    await tx.done;
  }

  /**
   * Import categories (batch operation)
   */
  async importCategories(categories: RuleCategory[]): Promise<void> {
    const db = await dbService.getDb();
    const tx = db.transaction('categories', 'readwrite');
    
    for (const category of categories) {
      await tx.store.put(category);
    }
    
    await tx.done;
  }

  /**
   * Clear all rules, categories, constraints, and related data
   * This is used to completely reset the rules database
   */
  async clearAll(): Promise<void> {
    const db = await dbService.getDb();
    
    try {
      console.log('Clearing all rules and related data...');
      
      // Delete all rules
      const rulesTx = db.transaction('rules', 'readwrite');
      await rulesTx.objectStore('rules').clear();
      await rulesTx.done;
      
      // Delete all categories
      const categoriesTx = db.transaction('categories', 'readwrite');
      await categoriesTx.objectStore('categories').clear();
      await categoriesTx.done;
      
      // Delete all constraints
      const constraintsTx = db.transaction('constraints', 'readwrite');
      await constraintsTx.objectStore('constraints').clear();
      await constraintsTx.done;
      
      // Delete all dependencies
      const dependenciesTx = db.transaction('dependencies', 'readwrite');
      await dependenciesTx.objectStore('dependencies').clear();
      await dependenciesTx.done;
      
      // Delete all regional rules
      const regionalRulesTx = db.transaction('regionalRules', 'readwrite');
      await regionalRulesTx.objectStore('regionalRules').clear();
      await regionalRulesTx.done;
      
      console.log('All rules and related data cleared successfully');
    } catch (error) {
      console.error('Failed to clear rules database:', error);
      throw error;
    }
  }
}

// Create and export a singleton instance
export const ruleRepository = new RuleRepository(); 