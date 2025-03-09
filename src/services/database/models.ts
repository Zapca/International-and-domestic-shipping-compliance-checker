import { v4 as uuidv4 } from 'uuid';

/**
 * Database model for storing compliance rules
 */

// Rule field types
export type FieldType = 'text' | 'date' | 'number' | 'select' | 'regex';
export type ValidationLevel = 'error' | 'warning' | 'info';
export type ConstraintType = 'regex' | 'length' | 'required' | 'min' | 'max' | 'equal' | 'pattern' | 'custom';
export type ConstraintSeverity = 'compliant' | 'non-compliant' | 'warning';

// Shipping types
export type ShippingContext = 'domestic' | 'international' | 'all';
export type RuleScope = 'global' | 'country-specific' | 'regional';

// New interfaces for cross-border compliance

/**
 * Required field for a specific shipping context (domestic/international)
 */
export interface RequiredField {
  id: string;
  fieldKey: string;
  displayName: string;
  description: string;
  context: ShippingContext;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Country-specific requirement for cross-border shipping
 */
export interface CountryRequirement {
  id: string;
  countryCode: string;
  countryName: string;
  requiredFields: string[]; // Array of fieldKeys
  description: string;
  documentationNotes: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Restricted item category and its restrictions by country
 */
export interface RestrictedItem {
  id: string;
  category: string;
  description: string;
  appliesTo: 'ALL' | string[]; // ALL or array of country codes
  restrictions: string;
  severity: 'prohibited' | 'restricted' | 'controlled';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Country with shipping restrictions
 */
export interface RestrictedDestination {
  id: string;
  countryCode: string;
  countryName: string;
  restrictionType: 'embargoed' | 'sanctions' | 'limited';
  details: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Country with enhanced documentation requirements
 */
export interface EnhancedDocumentation {
  id: string;
  countryCode: string;
  countryName: string;
  requirements: string[];
  notes: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Rule category for organization
export interface RuleCategory {
  id: string;
  name: string;
  description: string;
  priority: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// The main compliance rule model
export interface ComplianceRule {
  id: string;
  categoryId: string;
  fieldKey: string;        // Key used in code (e.g., 'trackingNumber')
  displayName: string;     // User-friendly name (e.g., 'Tracking Number')
  description: string;
  fieldType: FieldType;
  isRequired: boolean;
  validationPattern: string; // Stored as string to be converted to RegExp when used
  validationMessage: string;
  exampleValue: string;
  transformFunction?: string; // Store as string (function body) to be evaluated
  isActive: boolean;
  priority: number;        // For ordering/importance
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

// Rule-specific validation constraints
export interface ValidationConstraint {
  id: string;
  ruleId: string;
  // Original fields (for backward compatibility)
  constraintType: 'min' | 'max' | 'equal' | 'pattern' | 'custom';
  constraintValue: string;
  validationLevel: ValidationLevel;
  errorMessage: string;
  isActive: boolean;
  // New enhanced validation fields (optional for backward compatibility)
  type?: ConstraintType;
  pattern?: string;
  message?: string;
  severity?: ConstraintSeverity;
  minLength?: number;
  maxLength?: number;
  minValue?: number;
  maxValue?: number;
  isEnabled?: boolean;
  metadata?: Record<string, any>;
}

// Rule dependency (when one rule depends on another)
export interface RuleDependency {
  id: string;
  primaryRuleId: string;
  dependentRuleId: string;
  condition: string; // e.g., "value === 'international'"
  isActive: boolean;
}

// Country/region specific rules
export interface RegionalRule {
  id: string;
  ruleId: string;
  countryCode: string;
  regionCode?: string;
  validationPattern: string;
  validationMessage: string;
  isActive: boolean;
}

// Rule change history for auditing
export interface RuleChangeHistory {
  id: string;
  ruleId: string;
  changedBy: string;
  changeType: 'create' | 'update' | 'delete' | 'activate' | 'deactivate';
  previousValues?: Partial<ComplianceRule>;
  newValues?: Partial<ComplianceRule>;
  changeReason?: string;
  timestamp: string;
}

// Factory functions for creating new records
export const createComplianceRule = (data: Partial<ComplianceRule>): ComplianceRule => {
  const now = new Date().toISOString();
  return {
    id: data.id || uuidv4(),
    categoryId: data.categoryId || '',
    fieldKey: data.fieldKey || '',
    displayName: data.displayName || '',
    description: data.description || '',
    fieldType: data.fieldType || 'text',
    isRequired: data.isRequired ?? false,
    validationPattern: data.validationPattern || '',
    validationMessage: data.validationMessage || '',
    exampleValue: data.exampleValue || '',
    transformFunction: data.transformFunction,
    isActive: data.isActive ?? true,
    priority: data.priority ?? 0,
    metadata: data.metadata || {},
    createdAt: data.createdAt || now,
    updatedAt: data.updatedAt || now,
    createdBy: data.createdBy,
    updatedBy: data.updatedBy,
  };
};

export const createRuleCategory = (data: Partial<RuleCategory>): RuleCategory => {
  const now = new Date().toISOString();
  return {
    id: data.id || uuidv4(),
    name: data.name || '',
    description: data.description || '',
    priority: data.priority ?? 0,
    isActive: data.isActive ?? true,
    createdAt: data.createdAt || now,
    updatedAt: data.updatedAt || now,
  };
};

export const createValidationConstraint = (data: Partial<ValidationConstraint>): ValidationConstraint => {
  return {
    id: data.id || uuidv4(),
    ruleId: data.ruleId || '',
    // Original fields
    constraintType: data.constraintType || 'pattern',
    constraintValue: data.constraintValue || '',
    validationLevel: data.validationLevel || 'error',
    errorMessage: data.errorMessage || '',
    isActive: data.isActive ?? true,
    // New enhanced fields - handle null/undefined for all properties
    type: data.type || data.constraintType || 'regex',
    pattern: data.pattern || data.constraintValue,
    message: data.message || data.errorMessage || '',
    severity: data.severity || (data.validationLevel === 'error' ? 'non-compliant' : 'warning'),
    minLength: data.minLength,
    maxLength: data.maxLength,
    minValue: data.minValue,
    maxValue: data.maxValue,
    isEnabled: data.isEnabled ?? data.isActive ?? true,
    metadata: data.metadata || {}
  };
};

/**
 * Factory function to create a RequiredField
 */
export const createRequiredField = (data: Partial<RequiredField>): RequiredField => {
  const now = new Date().toISOString();
  return {
    id: data.id || uuidv4(),
    fieldKey: data.fieldKey || '',
    displayName: data.displayName || '',
    description: data.description || '',
    context: data.context || 'all',
    isActive: data.isActive ?? true,
    createdAt: data.createdAt || now,
    updatedAt: data.updatedAt || now
  };
};

/**
 * Factory function to create a CountryRequirement
 */
export const createCountryRequirement = (data: Partial<CountryRequirement>): CountryRequirement => {
  const now = new Date().toISOString();
  return {
    id: data.id || uuidv4(),
    countryCode: data.countryCode || '',
    countryName: data.countryName || '',
    requiredFields: data.requiredFields || [],
    description: data.description || '',
    documentationNotes: data.documentationNotes || '',
    isActive: data.isActive ?? true,
    createdAt: data.createdAt || now,
    updatedAt: data.updatedAt || now
  };
};

/**
 * Factory function to create a RestrictedItem
 */
export const createRestrictedItem = (data: Partial<RestrictedItem>): RestrictedItem => {
  const now = new Date().toISOString();
  return {
    id: data.id || uuidv4(),
    category: data.category || '',
    description: data.description || '',
    appliesTo: data.appliesTo || 'ALL',
    restrictions: data.restrictions || '',
    severity: data.severity || 'restricted',
    isActive: data.isActive ?? true,
    createdAt: data.createdAt || now,
    updatedAt: data.updatedAt || now
  };
};

/**
 * Factory function to create a RestrictedDestination
 */
export const createRestrictedDestination = (data: Partial<RestrictedDestination>): RestrictedDestination => {
  const now = new Date().toISOString();
  return {
    id: data.id || uuidv4(),
    countryCode: data.countryCode || '',
    countryName: data.countryName || '',
    restrictionType: data.restrictionType || 'limited',
    details: data.details || '',
    isActive: data.isActive ?? true,
    createdAt: data.createdAt || now,
    updatedAt: data.updatedAt || now
  };
};

/**
 * Factory function to create an EnhancedDocumentation
 */
export const createEnhancedDocumentation = (data: Partial<EnhancedDocumentation>): EnhancedDocumentation => {
  const now = new Date().toISOString();
  return {
    id: data.id || uuidv4(),
    countryCode: data.countryCode || '',
    countryName: data.countryName || '',
    requirements: data.requirements || [],
    notes: data.notes || '',
    isActive: data.isActive ?? true,
    createdAt: data.createdAt || now,
    updatedAt: data.updatedAt || now
  };
}; 