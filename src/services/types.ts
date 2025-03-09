/**
 * Result of a compliance check for a specific field
 */
export interface ComplianceResult {
  /**
   * Unique identifier for the result
   */
  id: string;
  
  /**
   * The field name being checked
   */
  field: string;
  
  /**
   * The value of the field
   */
  value: string;
  
  /**
   * The compliance status
   */
  status: 'compliant' | 'non-compliant' | 'warning';
  
  /**
   * Message explaining the compliance result
   */
  message: string;
}

/**
 * Formatted data from a shipment document
 */
export interface FormattedData {
  /**
   * Document type (e.g., airwaybill, invoice, etc.)
   */
  documentType: string;
  
  /**
   * Extracted fields from the document
   */
  fields: Record<string, string>;
  
  /**
   * Metadata about the processing
   */
  processingMetadata: {
    /**
     * Confidence score for the extraction (0-1)
     */
    confidence: number;
    
    /**
     * Processing time in milliseconds
     */
    processingTime: number;
    
    /**
     * Any warnings during processing
     */
    warnings: string[];
    
    /**
     * Model used for extraction
     */
    model?: string;
  };
}

/**
 * Raw input data for compliance checking
 */
export interface RawInputData {
  /**
   * Type of input
   */
  source: 'vision' | 'csv' | 'manual';
  
  /**
   * Content of the input based on type
   */
  content: string | Record<string, string>;
  
  /**
   * Optional metadata for the input
   */
  metadata?: {
    confidence?: number;
    filename?: string;
    timestamp?: string;
    userId?: string;
  };
}

/**
 * Statistics about compliance results
 */
export interface ComplianceStats {
  /**
   * Number of compliant fields
   */
  compliant: number;
  
  /**
   * Number of non-compliant fields
   */
  nonCompliant: number;
  
  /**
   * Number of warnings
   */
  warnings: number;
  
  /**
   * Total number of fields checked
   */
  total: number;
  
  /**
   * Compliance rate as a decimal (0-1)
   */
  complianceRate: number;
}

// Define additional common types here as needed 