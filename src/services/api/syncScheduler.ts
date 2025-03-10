import { complianceApi } from './complianceAPI';
import { SyncConfig, SyncFrequency, SyncResult, SyncNextInfo } from '../../models/compliance';

/**
 * Service to manage scheduled synchronization with compliance APIs
 */
export class SyncSchedulerService {
  private syncConfig: SyncConfig;
  private syncTimer: NodeJS.Timeout | null = null;
  private maxRetries: number = 3;
  private retryDelay: number = 60 * 60 * 1000; // 1 hour
  
  /**
   * Initialize the scheduler with default config
   */
  constructor() {
    // Load config from localStorage if available
    const savedConfig = localStorage.getItem('complianceSyncConfig');
    
    if (savedConfig) {
      try {
        const parsedConfig = JSON.parse(savedConfig);
        // Convert string frequency back to enum if needed
        if (typeof parsedConfig.frequency === 'string') {
          parsedConfig.frequency = parsedConfig.frequency as SyncFrequency;
        }
        
        // Convert date strings back to Date objects
        if (parsedConfig.lastSync && typeof parsedConfig.lastSync === 'string') {
          parsedConfig.lastSync = new Date(parsedConfig.lastSync);
        }
        
        if (parsedConfig.nextSync && typeof parsedConfig.nextSync === 'string') {
          parsedConfig.nextSync = new Date(parsedConfig.nextSync);
        }
        
        this.syncConfig = parsedConfig;
      } catch (err) {
        console.error('Error loading sync config:', err);
        this.syncConfig = this.getDefaultConfig();
      }
    } else {
      this.syncConfig = this.getDefaultConfig();
    }
    
    // Start automatic sync if enabled
    if (this.syncConfig.enabled && this.syncConfig.autoSync) {
      this.scheduleSyncJob();
    }

    // Add window unload event listener to clean up
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', this.cleanup);
    }
  }
  
  /**
   * Clean up resources
   */
  private cleanup = () => {
    this.stopSyncJob();
    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', this.cleanup);
    }
  }
  
  /**
   * Get the default synchronization configuration
   * @returns Default sync config
   */
  private getDefaultConfig(): SyncConfig {
    return {
      enabled: false,
      frequency: SyncFrequency.WEEKLY,
      autoSync: false,
      errorCount: 0
    };
  }
  
  /**
   * Save the current configuration to localStorage
   */
  private saveConfig() {
    try {
      // Ensure dates are serialized properly
      const configToSave = {
        ...this.syncConfig,
        lastSync: this.syncConfig.lastSync ? this.syncConfig.lastSync.toISOString() : undefined,
        nextSync: this.syncConfig.nextSync ? this.syncConfig.nextSync.toISOString() : undefined
      };
      
      localStorage.setItem('complianceSyncConfig', JSON.stringify(configToSave));
    } catch (err) {
      console.error('Error saving sync config to localStorage:', err);
    }
  }
  
  /**
   * Get the current sync configuration
   * @returns Current sync config
   */
  getConfig(): SyncConfig {
    return { ...this.syncConfig };
  }
  
  /**
   * Update the sync configuration
   * @param config New config options
   */
  updateConfig(config: Partial<SyncConfig>) {
    // Update config
    this.syncConfig = {
      ...this.syncConfig,
      ...config
    };
    
    // Save updated config
    this.saveConfig();
    
    // Restart sync job if enabled
    this.stopSyncJob();
    if (this.syncConfig.enabled && this.syncConfig.autoSync) {
      this.scheduleSyncJob();
    }
  }
  
  /**
   * Get frequency in milliseconds
   */
  private getFrequencyMs(frequency: SyncFrequency): number {
    switch (frequency) {
      case SyncFrequency.HOURLY:
        return 60 * 60 * 1000; // 1 hour
      case SyncFrequency.DAILY:
        return 24 * 60 * 60 * 1000; // 1 day
      case SyncFrequency.WEEKLY:
        return 7 * 24 * 60 * 60 * 1000; // 1 week
      case SyncFrequency.MONTHLY:
        return 30 * 24 * 60 * 60 * 1000; // ~1 month
      default:
        return 24 * 60 * 60 * 1000; // Default to daily
    }
  }
  
  /**
   * Schedule the next synchronization job
   */
  private scheduleSyncJob() {
    if (this.syncTimer) {
      clearTimeout(this.syncTimer);
    }
    
    const now = Date.now();
    
    // Ensure nextSync is a Date object if it exists
    if (this.syncConfig.nextSync && !(this.syncConfig.nextSync instanceof Date)) {
      try {
        this.syncConfig.nextSync = new Date(this.syncConfig.nextSync);
      } catch (err) {
        console.error('Error converting nextSync to Date:', err);
        this.syncConfig.nextSync = undefined;
      }
    }
    
    let nextSync = this.syncConfig.nextSync ? this.syncConfig.nextSync.getTime() : undefined;
    
    // Calculate next sync time if not defined or in the past
    if (!nextSync || nextSync < now) {
      // Get frequency in milliseconds
      const frequencyMs = this.getFrequencyMs(this.syncConfig.frequency);
      
      nextSync = now + frequencyMs;
      this.syncConfig.nextSync = new Date(nextSync);
      this.saveConfig();
    }
    
    // Calculate delay until next sync
    const delay = nextSync - now;
    
    // Schedule the sync with a maximum delay to avoid timeout issues
    // Most browsers limit setTimeout to ~24 days (2^31-1 ms)
    const MAX_TIMEOUT = 2147483647;
    const safeDelay = Math.min(delay, MAX_TIMEOUT);
    
    if (delay > MAX_TIMEOUT) {
      // If the desired delay is too long, we'll schedule a shorter delay
      // and then reschedule when that timeout completes
      this.syncTimer = setTimeout(() => {
        this.scheduleSyncJob();
      }, safeDelay);
    } else {
      // Normal scheduling
      this.syncTimer = setTimeout(() => {
        this.performSync();
      }, safeDelay);
    }
    
    console.log(`Scheduled next sync in ${Math.ceil(safeDelay / (1000 * 60 * 60))} hours`);
  }
  
  /**
   * Stop the current sync job if running
   */
  stopSyncJob() {
    if (this.syncTimer) {
      clearTimeout(this.syncTimer);
      this.syncTimer = null;
    }
  }
  
  /**
   * Perform the synchronization with the API
   * @returns Results of the sync operation
   */
  async performSync(): Promise<SyncResult> {
    try {
      console.log('Starting scheduled compliance rules sync...');
      
      // Import regulations
      const result = await complianceApi.importRegulations(
        undefined, // All categories
        this.syncConfig.region
      );
      
      // Update last sync timestamp
      this.syncConfig.lastSync = new Date();
      
      // Reset error count on success
      this.syncConfig.errorCount = 0;
      this.syncConfig.lastErrorMessage = undefined;
      
      // Get frequency in milliseconds
      const frequencyMs = this.getFrequencyMs(this.syncConfig.frequency);
      
      // Schedule next sync
      this.syncConfig.nextSync = new Date(Date.now() + frequencyMs);
      
      // Save updated config
      this.saveConfig();
      
      // Schedule next run
      this.scheduleSyncJob();
      
      console.log('Scheduled sync completed:', result);
      
      return result;
    } catch (error) {
      console.error('Scheduled sync failed:', error);
      
      // Update error count
      this.syncConfig.errorCount = (this.syncConfig.errorCount || 0) + 1;
      this.syncConfig.lastErrorMessage = error instanceof Error ? error.message : String(error);
      
      // Determine next retry time based on error count
      let retryDelay = this.retryDelay;
      if (this.syncConfig.errorCount > this.maxRetries) {
        // If we've exceeded max retries, schedule for the next normal sync time
        retryDelay = this.getFrequencyMs(this.syncConfig.frequency);
        console.warn(`Exceeded maximum retries (${this.maxRetries}), waiting until next scheduled sync`);
      } else {
        console.log(`Scheduling retry attempt ${this.syncConfig.errorCount} in ${retryDelay / (1000 * 60)} minutes`);
      }
      
      // Schedule next attempt
      this.syncConfig.nextSync = new Date(Date.now() + retryDelay);
      this.saveConfig();
      this.scheduleSyncJob();
      
      return {
        total: 0,
        imported: 0,
        updated: 0,
        categories: 0,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Manually trigger a synchronization now
   * @returns Results of the sync operation
   */
  async syncNow(): Promise<SyncResult> {
    this.stopSyncJob();
    
    const result = await this.performSync();
    
    // Ensure nextSync is a Date object
    if (this.syncConfig.nextSync && !(this.syncConfig.nextSync instanceof Date)) {
      this.syncConfig.nextSync = new Date(this.syncConfig.nextSync);
    }
    
    // Schedule next run
    if (this.syncConfig.enabled && this.syncConfig.autoSync) {
      this.scheduleSyncJob();
    }
    
    return result;
  }
  
  /**
   * Get information about the next scheduled sync
   * @returns Next sync information
   */
  getNextSyncInfo(): SyncNextInfo {
    const now = Date.now();
    const nextSync = this.syncConfig.nextSync;
    
    // Calculate time remaining
    let timeRemaining = 'Not scheduled';
    
    if (nextSync) {
      // Ensure nextSync is a proper Date object
      const nextSyncDate = nextSync instanceof Date ? nextSync : new Date(nextSync);
      
      try {
        const timeUntilSync = nextSyncDate.getTime() - now;
        
        if (timeUntilSync <= 0) {
          timeRemaining = 'Due now';
        } else {
          // Format time remaining
          const hours = Math.floor(timeUntilSync / (1000 * 60 * 60));
          const minutes = Math.floor((timeUntilSync % (1000 * 60 * 60)) / (1000 * 60));
          
          if (hours > 24) {
            const days = Math.floor(hours / 24);
            timeRemaining = `${days} day${days !== 1 ? 's' : ''} remaining`;
          } else if (hours > 0) {
            timeRemaining = `${hours} hour${hours !== 1 ? 's' : ''} and ${minutes} minute${minutes !== 1 ? 's' : ''} remaining`;
          } else {
            timeRemaining = `${minutes} minute${minutes !== 1 ? 's' : ''} remaining`;
          }
        }
      } catch (err) {
        console.error('Error calculating time until next sync:', err);
        timeRemaining = 'Unknown';
      }
    }
    
    return {
      enabled: this.syncConfig.enabled && this.syncConfig.autoSync,
      nextSync: nextSync instanceof Date ? nextSync : (nextSync ? new Date(nextSync) : null),
      timeRemaining,
      errorCount: this.syncConfig.errorCount || 0,
      lastErrorMessage: this.syncConfig.lastErrorMessage
    };
  }
}

// Export the SyncFrequency enum for use in other files
export { SyncFrequency };

// Create a singleton instance
export const syncScheduler = new SyncSchedulerService(); 