import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

// Basic rule definition
export interface ComplianceRule {
  id: string;
  fieldKey: string; // Unique identifier for the field (e.g., "shipping.trackingNumber")
  displayName: string; // Human-readable name
  description?: string; // Description of the rule
  categoryId: string; // Reference to category
  fieldType?: string; // e.g., "text", "number", "date", "select"
  isRequired: boolean; // Whether the field is required
  isActive: boolean; // Whether the rule is active
  validationPattern?: string; // Regex pattern for validation
  validationMessage?: string; // Message to show when validation fails
  priority?: number; // Priority for this rule (higher = more important)
  exampleValue?: string; // Example of valid data
  transformFunction?: string; // String representation of function to transform input
  createdAt?: Date;
  updatedAt?: Date;
}

// Category definition
export interface RuleCategory {
  id: string;
  name: string;
  description?: string;
  priority?: number;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// Validation constraint
export interface ValidationConstraint {
  id: string;
  ruleId: string; // Reference to rule
  constraintType: string; // e.g., "min", "max", "length", "pattern"
  constraintValue: string; // The actual constraint value
  errorMessage?: string; // Custom error message
  priority?: number;
  isActive: boolean;
}

// Rule dependency
export interface RuleDependency {
  id: string;
  primaryRuleId: string; // Reference to the rule that depends on another
  dependsOnRuleId: string; // Reference to the rule it depends on
  dependencyType: string; // e.g., "requires", "conditionalOn", "conflicts"
  dependencyValue?: string; // Value that triggers the dependency
  isActive: boolean;
}

// Regional rule variation
export interface RegionalRule {
  id: string;
  baseRuleId: string; // Reference to the base rule
  region: string; // e.g., "US", "EU", "APAC"
  isRequired?: boolean;
  validationPattern?: string;
  validationMessage?: string;
  isActive: boolean;
}

// History of rule changes
export interface RuleHistory {
  id: string;
  ruleId: string;
  timestamp: Date;
  changeType: string; // e.g., "create", "update", "delete"
  userId?: string; // Who made the change
  changes: string; // JSON string of changes
}

// API specific types
export interface ApiConfig {
  baseUrl: string;
  apiKey: string;
  region?: string;
  timeout?: number;
}

export interface SyncConfig {
  enabled: boolean;
  autoSync: boolean;
  frequency: SyncFrequency;
  region?: string;
  lastSync?: Date;
  nextSync?: Date;
  errorCount: number;
  lastErrorMessage?: string;
}

export enum SyncFrequency {
  HOURLY = 'hourly',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly'
}

export interface SyncResult {
  total: number;
  imported: number;
  updated: number;
  categories: number;
  error?: string;
}

export interface SyncNextInfo {
  enabled: boolean;
  nextSync: Date | null;
  timeRemaining: string;
  errorCount: number;
  lastErrorMessage?: string;
}

// Create empty rules with default values
export function createEmptyRule(): ComplianceRule {
  return {
    id: uuidv4(),
    fieldKey: '',
    displayName: '',
    categoryId: '',
    isRequired: false,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

export function createEmptyCategory(): RuleCategory {
  return {
    id: uuidv4(),
    name: '',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

// Zod schemas for validation
export const RuleCategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Category name is required"),
  description: z.string().optional(),
  priority: z.number().optional(),
  isActive: z.boolean(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});

export const ComplianceRuleSchema = z.object({
  id: z.string().uuid(),
  fieldKey: z.string().min(1, "Field key is required"),
  displayName: z.string().min(1, "Display name is required"),
  description: z.string().optional(),
  categoryId: z.string().uuid("Category ID must be a valid UUID"),
  fieldType: z.string().optional(),
  isRequired: z.boolean(),
  isActive: z.boolean(),
  validationPattern: z.string().optional(),
  validationMessage: z.string().optional(),
  priority: z.number().optional(),
  exampleValue: z.string().optional(),
  transformFunction: z.string().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});

export type RuleCategoryInput = z.infer<typeof RuleCategorySchema>;
export type ComplianceRuleInput = z.infer<typeof ComplianceRuleSchema>; 