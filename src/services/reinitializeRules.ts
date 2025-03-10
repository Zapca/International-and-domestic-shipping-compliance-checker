import { ruleRepository } from './database/ruleRepository';
import { ruleLoader } from './database/ruleLoader';

/**
 * Utility function to force reinitialization of the rules database
 * This can be used to update rule definitions when changes are made
 */
export async function reinitializeRules(): Promise<void> {
  console.log('Clearing existing rules database...');
  
  try {
    // First clear all existing rules and categories
    await ruleRepository.clearAll();
    
    console.log('Database cleared. Reinitializing with updated rule definitions...');
    
    // Then reinitialize with updated definitions
    await ruleLoader.initializeRules();
    
    console.log('Rules database successfully reinitialized!');
    return Promise.resolve();
  } catch (error) {
    console.error('Failed to reinitialize rules database:', error);
    return Promise.reject(error);
  }
} 