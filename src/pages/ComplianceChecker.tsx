import React, { useState, useEffect, useRef } from 'react';
import {
  Container,
  Typography,
  Box,
  Tabs,
  Tab,
  TextField,
  Button,
  Alert,
  AlertTitle,
  CircularProgress,
  Chip,
  styled,
  FormControlLabel,
  Switch,
  Grid,
  Paper,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Divider,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Menu,
  MenuItem
} from '@mui/material';
import { 
  CloudUpload as UploadFile,
  Delete,
  Assessment,
  BarChart,
  Info,
  WarningAmber, 
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  ExpandMore,
  Block,
  Language,
  LocalShipping,
  Public,
  PhotoCamera,
  Edit,
  Send,
  GetApp,
  PictureAsPdf,
  Psychology,
  Info as InfoIcon
} from '@mui/icons-material';
import { analyzeImage, convertToComplianceResults } from '../services/visionService';
import FormatConverter from '../components/common/FormatConverter';
import { FormattedData } from '../services/formatConverterDb';
import { complianceService } from '../services/complianceService';
import { dataStandardizationService } from '../services/dataStandardizationService';
import { RawInputData } from '../services/types';
import ComplianceChat from '../components/ComplianceChat';
import { pdfReportGenerator } from '../services/pdfReportGenerator';

// Define the type for compliance results
interface ComplianceResult {
  id: string;
  field: string;
  value: string;
  status: 'compliant' | 'non-compliant' | 'warning';
  message: string;
}

// Styled components for enhanced UI
const StyledTabPanel = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[1]
}));

const UploadBox = styled(Box)(({ theme }) => ({
  border: '2px dashed',
  borderColor: theme.palette.primary.main,
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(4),
  textAlign: 'center',
  cursor: 'pointer',
  backgroundColor: theme.palette.background.paper,
  transition: 'background-color 0.3s',
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  }
}));

const ResultCard = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'status'
})<{ status: 'compliant' | 'non-compliant' | 'warning' }>(({ theme, status }) => ({
  padding: theme.spacing(2),
  marginBottom: theme.spacing(2),
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[1],
  backgroundColor: theme.palette.background.paper,
  borderLeft: `4px solid ${
    status === 'compliant' 
      ? theme.palette.success.main 
      : status === 'warning'
      ? theme.palette.warning.main
      : theme.palette.error.main
  }`
}));

const ImagePreviewBox = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(2),
  marginBottom: theme.spacing(2),
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  '& img': {
    maxWidth: '100%',
    maxHeight: '300px',
    objectFit: 'contain',
    borderRadius: theme.shape.borderRadius,
    boxShadow: theme.shadows[2]
  }
}));

const StatsCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  marginBottom: theme.spacing(3),
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[1]
}));

// TabPanel component
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`compliance-tabpanel-${index}`}
      aria-labelledby={`compliance-tab-${index}`}
      {...other}
    >
      {value === index && (
        <StyledTabPanel>{children}</StyledTabPanel>
      )}
    </div>
  );
}

// Tab props
function a11yProps(index: number) {
  return {
    id: `compliance-tab-${index}`,
    'aria-controls': `compliance-tabpanel-${index}`,
  };
}

// Check compliance based on field
function checkFieldCompliance(field: string, value: string): { status: 'compliant' | 'non-compliant' | 'warning'; message: string } {
  const trackingNumberRegex = /^[A-Z0-9]{8,}$/;
  const dateRegex = /^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/;
  const weightRegex = /^\d+(\.\d+)?\s*(kg|g|lb|lbs|oz)$/i;

  if (field.toLowerCase().includes('tracking') && !trackingNumberRegex.test(value)) {
    return { 
      status: 'non-compliant', 
      message: 'Tracking number format is invalid' 
    };
  }
  
  if (field.toLowerCase().includes('date') && !dateRegex.test(value)) {
    return { 
      status: 'warning', 
      message: 'Date format may not be standard' 
    };
  }
  
  if (field.toLowerCase().includes('weight')) {
    if (!value.match(/\d+/)) {
      return { 
        status: 'non-compliant', 
        message: 'Weight value missing numeric component' 
      };
    } 
    if (!weightRegex.test(value)) {
      return { 
        status: 'warning', 
        message: 'Weight unit not specified or recognized' 
      };
    }
  }
  
  return { 
    status: 'compliant', 
    message: 'Field validated successfully' 
  };
}

// ComplianceChecker component
const ComplianceChecker: React.FC = () => {
  // State for tab value
  const [tabValue, setTabValue] = useState(0);
  
  // State for file uploads
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  // State for manual data input
  const [manualData, setManualData] = useState('');
  
  // State for results and processing
  const [results, setResults] = useState<ComplianceResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [processingStage, setProcessingStage] = useState('');
  const [useVisionModel, setUseVisionModel] = useState(true);
  
  // State for messages
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  // State for image data
  const [imageData, setImageData] = useState<{
    text?: string;
    fields?: Record<string, string>;
    parcelInfo?: {
      type?: string;
      dimensions?: string;
      weight?: string;
      condition?: string;
      features?: string[];
    };
    confidence?: number;
  }>({});

  // Add new state for formatted data
  const [formattedData, setFormattedData] = useState<FormattedData | null>(null);
  const [selectedConverter, setSelectedConverter] = useState<'vision' | 'csv' | 'manual' | null>(null);

  // Add a state to store raw extracted text for reference
  const [rawTextExtracted, setRawTextExtracted] = useState<string>('');

  // Add a new state for CSV entries
  const [csvEntries, setCsvEntries] = useState<Array<{
    entryId: string;
    entryText: string;
    formattedData: FormattedData;
    complianceResults: ComplianceResult[];
    complianceStats: {
      compliant: number;
      nonCompliant: number;
      warnings: number;
      total: number;
      complianceRate: number;
    };
    isExpanded: boolean;
  }>>([]);

  // Add state for PDF generation
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // For PDF export menu
  const [pdfMenuAnchor, setPdfMenuAnchor] = useState<null | HTMLElement>(null);
  const handlePdfMenuOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setPdfMenuAnchor(event.currentTarget);
  };
  const handlePdfMenuClose = () => {
    setPdfMenuAnchor(null);
  };

  // For storing the selected entry temporarily while the PDF menu is open
  const [tempSelectedEntry, setTempSelectedEntry] = useState<typeof csvEntries[0] | null>(null);

  // Generate PDF report
  const generatePdfReport = async (results: ComplianceResult[], formattedData: FormattedData | null, format: 'full' | 'simple' = 'full') => {
    setIsGeneratingPDF(true);
    setErrorMessage(''); // Clear previous errors
    setSuccessMessage(''); // Clear previous success messages
    
    try {
      if (!results || results.length === 0) {
        throw new Error('No results to export to PDF');
      }
      
      // Log data being sent to PDF generator (helps with debugging)
      console.log('Generating PDF with data:', {
        format,
        resultsCount: results.length,
        hasFormattedData: !!formattedData,
        metadataPresent: formattedData ? !!formattedData.processingMetadata : false
      });
      
      if (format === 'simple') {
        await pdfReportGenerator.generateSimpleReport(results, formattedData);
      } else {
        await pdfReportGenerator.generateReport(results, formattedData);
      }
      
      setSuccessMessage('PDF report generated successfully!');
    } catch (error) {
      console.error('Error generating PDF report:', error);
      
      // More detailed error message depending on the type of error
      if (error instanceof Error) {
        setErrorMessage(`Failed to generate PDF report: ${error.message}`);
      } else {
        setErrorMessage('Failed to generate PDF report. Please try again.');
      }
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Initialize compliance service
  useEffect(() => {
    const initService = async () => {
      try {
        await complianceService.initialize();
        console.log('Compliance service initialized');
      } catch (error) {
        console.error('Failed to initialize compliance service:', error);
        setErrorMessage('Failed to initialize compliance checking. Please try refreshing the page.');
      }
    };
    
    initService();
  }, []);

  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    handleClearResults();
  };

  // Process image with vision service then format converters
  const processImageFile = async () => {
    try {
    if (!imageFile) {
        setErrorMessage('Please select an image file first');
      return;
    }

    setIsLoading(true);
      
      // Step 1: Extract text from image using Vision API
      const extractedData = await analyzeImage(imageFile);
      console.log('Extracted data:', extractedData);
      
      if (!extractedData.text) {
        throw new Error('No text could be extracted from the image');
      }
      
      // Show the extracted raw text to the user for reference
      setRawTextExtracted(extractedData.text);
      
      // Now, standardize the extracted text using our dedicated LLM-based service
      const standardizedFields = await dataStandardizationService.standardizeData(extractedData.text);
      
      // Further enhance the standardized data
      const enhancedData = await dataStandardizationService.enhanceStandardizedData(standardizedFields);
      console.log('Enhanced standardized data:', enhancedData);
      
      // Create an input object for the compliance service
      // Pass the enhanced structured data as content instead of raw text
      const input: RawInputData = {
        source: 'vision',
        content: enhancedData, // Use the structured data instead of raw text
        metadata: {
          confidence: extractedData.confidence,
          filename: imageFile.name,
          timestamp: new Date().toISOString()
        }
      };
      
      // Pass to compliance service
      const result = await complianceService.processInput(input);
      
      // Update state with the formatted data and compliance results
      handleFormattedData(result);
      
    } catch (error) {
      console.error('Error processing image:', error);
      setErrorMessage('Error processing image: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsLoading(false);
    }
  };

  // Handle image upload
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {    
    const file = event.target.files?.[0];
    if (file) {
      // Store file info for display
      setImageFile(file);
      
      // Create image preview
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setImagePreview(e.target.result as string);
        }
      };
      reader.readAsDataURL(file);
      
      // Clear previous results
      setResults([]);
      setFormattedData(null);
      setImageData({});
      setSuccessMessage('');
      setErrorMessage('');
    }
  };

  // Process CSV file
  const handleCsvUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setCsvFile(file);
      
      // Clear previous results
      setResults([]);
      setFormattedData(null);
      setImageData({});
      setSuccessMessage('');
      setErrorMessage('');
      
      // Process the CSV file
      await processCsvFile(file);
    }
  };

  // Process CSV data
  const processCsvFile = async (file: File) => {
    try {
      setIsLoading(true);
      setProcessingStage('Reading CSV file...');
      
      const csvText = await readFileAsText(file);
      
      setProcessingStage('Processing CSV entries...');
      
      // Process CSV as multiple manual entries
      const entries = await complianceService.processCsvAsManualEntries(csvText);
      
      // Add isExpanded property to each entry (initially collapsed)
      const entriesWithExpandState = entries.map(entry => ({
        ...entry,
        isExpanded: false
      }));
      
      // Update state with processed entries
      setCsvEntries(entriesWithExpandState);
      
      // Also set the first entry as the currently displayed result for compatibility
      if (entries.length > 0) {
        handleFormattedData({
          formattedData: entries[0].formattedData,
          complianceResults: entries[0].complianceResults
        });
        setSuccessMessage(`Successfully processed ${entries.length} entries from CSV file.`);
      } else {
        setErrorMessage('No valid entries found in the CSV file.');
      }
    } catch (error) {
      console.error('Error processing CSV:', error);
      setErrorMessage(`Error processing CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
      setProcessingStage('');
    }
  };

  // Read file as text
  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to read file as text'));
        }
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  // Handle manual data change
  const handleManualDataChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setManualData(event.target.value);
  };

  // Submit manual data for processing
  const handleManualSubmit = async () => {
    if (!manualData.trim()) {
      setErrorMessage('Please enter some data before submitting');
      return;
    }
    
    try {
      setIsLoading(true);
      setSuccessMessage('');
      setErrorMessage('');
      
      // First, send the manual input to Gemini for format transformation
      const standardizedData = await dataStandardizationService.standardizeData(manualData);
      console.log('Standardized data from Gemini:', standardizedData);
      
      // Track detected fields for user feedback
      const detectedFields = Object.keys(standardizedData);
      
      // Further enhance the standardized data with additional context and inferences
      const enhancedData = await dataStandardizationService.enhanceStandardizedData(standardizedData);
      console.log('Enhanced standardized data:', enhancedData);
      
      // Track newly added or modified fields
      const enhancedFields = Object.keys(enhancedData).filter(k => !standardizedData[k] || standardizedData[k] !== enhancedData[k]);
      
      // Create an input object for the compliance service
      const input: RawInputData = {
        source: 'manual',
        content: enhancedData, // Use the structured data instead of raw text
        metadata: {
          timestamp: new Date().toISOString(),
          confidence: 0.9 // Higher confidence since we're using Gemini
        }
      };
      
      // Pass to compliance service - this will perform full validation including restricted items and destinations
      const result = await complianceService.processInput(input);
      
      // Additionally check for specific compliance issues
      ensureComplianceValidation(result);
      
      // Update state with the formatted data and compliance results
      handleFormattedData(result);
      
      // Provide detailed feedback about what Gemini did
      const fieldCountMessage = `Gemini identified ${detectedFields.length} shipping fields in your input.`;
      const enhancedFieldsMessage = enhancedFields.length > 0 ? 
        `Enhanced ${enhancedFields.length} fields to improve compliance.` : 
        'No additional field enhancements were needed.';
      
      const successMessage = `
        Input successfully processed with Gemini. ${fieldCountMessage} ${enhancedFieldsMessage}
        Data transformed to standard format for compliance checking.
      `;
      
      setSuccessMessage(successMessage.trim());
      
    } catch (error) {
      console.error('Error processing manual data with Gemini:', error);
      setErrorMessage('Error transforming data format with Gemini: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsLoading(false);
    }
  };

  // Ensure compliance validation for restricted items and destinations
  const ensureComplianceValidation = (result: { formattedData: FormattedData, complianceResults: ComplianceResult[] }) => {
    const fields = result.formattedData.fields;
    
    // Check if we need to add validation for restricted items
    if (fields.packageContents && !result.complianceResults.some(r => r.field === 'Restricted Item')) {
      const contentsLower = fields.packageContents.toLowerCase();
      
      // List of potentially restricted items to check
      const restrictedItems = [
        { keyword: 'lithium', message: 'Lithium batteries are restricted and require special handling/labeling.', severity: 'warning' as 'warning' },
        { keyword: 'battery', message: 'Batteries may be restricted and require special handling/labeling.', severity: 'warning' as 'warning' },
        { keyword: 'alcohol', message: 'Alcohol shipments require special licensing.', severity: 'warning' as 'warning' },
        { keyword: 'electronic', message: 'Electronics may require special declaration.', severity: 'warning' as 'warning' },
        { keyword: 'gadget', message: 'Electronic devices may have specific shipping requirements.', severity: 'warning' as 'warning' },
        { keyword: 'drug', message: 'Drug shipments may be illegal or require special permits.', severity: 'non-compliant' as 'non-compliant' },
        { keyword: 'weapon', message: 'Weapons are heavily restricted or prohibited.', severity: 'non-compliant' as 'non-compliant' }
      ];
      
      // Check for matches
      for (const item of restrictedItems) {
        if (contentsLower.includes(item.keyword)) {
          result.complianceResults.push({
            id: `manual-restricted-${item.keyword}-${Date.now()}`,
            field: 'Restricted Item',
            value: item.keyword,
            status: item.severity,
            message: item.message
          });
          break; // Only add one warning for simplicity
        }
      }
    }
    
    // Check for destination restrictions
    const destination = fields.recipientCountry || '';
    if (destination && !result.complianceResults.some(r => r.field === 'Destination Restriction')) {
      const restrictedCountries = ['Cuba', 'Iran', 'North Korea', 'Syria', 'Russia','Israel'];
      
      for (const country of restrictedCountries) {
        if (destination.toLowerCase().includes(country.toLowerCase())) {
          result.complianceResults.push({
            id: `manual-destination-${country}-${Date.now()}`,
            field: 'Destination Restriction',
            value: country,
            status: 'non-compliant',
            message: `Shipping to ${country} is restricted due to international sanctions.`
          });
          break;
        }
      }
    }
    
    // Check for international shipping that might need customs documentation
    if (fields.shipperCountry && fields.recipientCountry && 
        fields.shipperCountry !== fields.recipientCountry &&
        !result.complianceResults.some(r => r.field.includes('Customs'))) {
      
      result.complianceResults.push({
        id: `manual-customs-${Date.now()}`,
        field: 'Customs Documentation',
        value: `${fields.shipperCountry} to ${fields.recipientCountry}`,
        status: 'warning',
        message: 'International shipment may require customs documentation. Ensure proper declarations are included.'
      });
    }
  };

  // Handle expansion/collapse of an entry
  const toggleEntryExpansion = (entryId: string) => {
    setCsvEntries(prevEntries => 
      prevEntries.map(entry => 
        entry.entryId === entryId 
          ? { ...entry, isExpanded: !entry.isExpanded } 
          : entry
      )
    );
  };

  // Display details for a specific CSV entry
  const showEntryDetails = (entry: typeof csvEntries[0]) => {
    setFormattedData(entry.formattedData);
    setResults(entry.complianceResults);
    setRawTextExtracted(entry.entryText);
    setSelectedConverter('csv');
    setTabValue(1); // Stay on CSV tab
    
    // Scroll to results
    setTimeout(() => {
      const resultsElement = document.getElementById('results-section');
      if (resultsElement) {
        resultsElement.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  // Override clear results to also clear CSV entries
  const handleClearResults = () => {
    setResults([]);
    setFormattedData(null);
    setImageData({});
    setCsvFile(null);
    setImageFile(null);
    setImagePreview(null);
    setManualData('');
    setSuccessMessage('');
    setErrorMessage('');
    setCsvEntries([]);
  };

  // Toggle vision model usage
  const handleToggleVision = () => {
    setUseVisionModel(!useVisionModel);
  };

  // Handle formatted data from converter
  const handleFormattedData = (data: { formattedData: FormattedData, complianceResults: ComplianceResult[] }) => {
    setFormattedData(data.formattedData);
    setResults(data.complianceResults);
    setIsLoading(false);
  };

  // Calculate compliance statistics
  const calculateComplianceStats = () => {
    if (!results.length) {
      return { 
        compliant: 0, 
        nonCompliant: 0, 
        warnings: 0, 
        total: 0, 
        complianceRate: 0,
        confidenceScore: 0
      };
    }
    
    const total = results.length;
    const compliant = results.filter(r => r.status === 'compliant').length;
    const nonCompliant = results.filter(r => r.status === 'non-compliant').length;
    const warnings = results.filter(r => r.status === 'warning').length;
    
    // Extract confidence score if present
    const confidenceResult = results.find(r => r.field === 'AI Confidence Score' || r.field === 'Confidence Score');
    const confidenceScore = confidenceResult
      ? parseInt(confidenceResult.value.replace('%', ''))
      : (formattedData?.processingMetadata.confidence || 0) * 100;
    
    return {
      compliant,
      nonCompliant,
      warnings,
      total,
      complianceRate: total > 0 ? Math.round((compliant / total) * 100) : 0,
      confidenceScore
    };
  };
  
  // Get stats for display
  const stats = calculateComplianceStats();

  /**
   * Group results into categories including cross-border specific issues
   */
  const categorizeResults = () => {
    const categories = {
      crossBorder: {
        issues: [] as ComplianceResult[],
        title: 'Cross-Border Issues',
        icon: <Public />,
        description: 'Issues related to international shipping requirements, restrictions, and regulations.'
      },
      restrictedItems: {
        issues: [] as ComplianceResult[],
        title: 'Restricted Items',
        icon: <Block />,
        description: 'Items that may be restricted or prohibited for shipping to certain destinations.'
      },
      destinationRestrictions: {
        issues: [] as ComplianceResult[],
        title: 'Destination Restrictions',
        icon: <Language />,
        description: 'Issues related to shipping restrictions for specific destinations.'
      },
      missingRequiredFields: {
        issues: [] as ComplianceResult[],
        title: 'Missing Required Fields',
        icon: <WarningAmber />,
        description: 'Required fields that are missing from the shipping data.'
      },
      documentationIssues: {
        issues: [] as ComplianceResult[],
        title: 'Documentation Issues',
        icon: <LocalShipping />,
        description: 'Issues related to required shipping and customs documentation.'
      },
      otherIssues: {
        issues: [] as ComplianceResult[],
        title: 'Other Issues',
        icon: <Info />,
        description: 'Other compliance issues not categorized elsewhere.'
      }
    };

    // Group the results into categories
    results.forEach(result => {
      if (result.status !== 'compliant') {
        const field = result.field.toLowerCase();
        const message = result.message.toLowerCase();
        
        // Cross-border related issues
        if (
          field.includes('cross-border') || 
          field.includes('international') || 
          message.includes('international') ||
          message.includes('cross-border')
        ) {
          categories.crossBorder.issues.push(result);
        } 
        // Restricted items
        else if (
          field.includes('restricted item') || 
          field.includes('prohibited item') ||
          message.includes('restricted item') ||
          message.includes('prohibited')
        ) {
          categories.restrictedItems.issues.push(result);
        } 
        // Destination restrictions
        else if (
          field.includes('destination') ||
          field.includes('country') ||
          message.includes('destination') ||
          field.includes('country restriction')
        ) {
          categories.destinationRestrictions.issues.push(result);
        } 
        // Missing required fields
        else if (
          message.includes('missing') ||
          message.includes('required field')
        ) {
          categories.missingRequiredFields.issues.push(result);
        } 
        // Documentation issues
        else if (
          field.includes('documentation') ||
          field.includes('customs') ||
          field.includes('invoice') ||
          field.includes('declaration') ||
          message.includes('documentation') ||
          message.includes('customs')
        ) {
          categories.documentationIssues.issues.push(result);
        } 
        // Everything else
        else {
          categories.otherIssues.issues.push(result);
        }
      }
    });

    return categories;
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom align="center">
        Logistics Compliance Checker
      </Typography>
      <Typography variant="subtitle1" gutterBottom align="center" color="text.secondary">
        Upload an image, CSV, or manually enter data to check compliance
      </Typography>

      <Box sx={{ mb: 4 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="compliance checker tabs"
          centered
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab 
            icon={<PhotoCamera />} 
            label="Image Input" 
            {...a11yProps(0)} 
            sx={{ textTransform: 'none' }} 
          />
          <Tab 
            icon={<UploadFile />} 
            label="CSV Upload" 
            {...a11yProps(1)} 
            sx={{ textTransform: 'none' }} 
          />
          <Tab 
            icon={<Edit />} 
            label="Manual Entry" 
            {...a11yProps(2)} 
            sx={{ textTransform: 'none' }} 
          />
      </Tabs>
      </Box>

      {/* Image Input Panel */}
      <TabPanel value={tabValue} index={0}>
        <Typography variant="h6" gutterBottom>
          Upload Shipping Label or Package Image
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Upload an image of a shipping label, package, or logistics document to extract and validate information
        </Typography>
        
          <input
            accept="image/*"
            style={{ display: 'none' }}
          id="image-upload"
          type="file"
            onChange={handleImageUpload}
          />
        <label htmlFor="image-upload">
          <UploadBox>
            <PhotoCamera fontSize="large" color="primary" />
            <Typography variant="body1" sx={{ mt: 2 }}>
              Click to upload an image
              </Typography>
            <Typography variant="caption" color="text.secondary">
              Supports JPG, PNG, and other image formats
              </Typography>
        </UploadBox>
        </label>
        
        {imagePreview && (
          <ImagePreviewBox>
            <img src={imagePreview} alt="Upload preview" />
          </ImagePreviewBox>
        )}
        
        {imageFile && (
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
              <Button
                variant="contained"
              color="primary"
                onClick={processImageFile}
              disabled={isLoading}
              startIcon={<Assessment />}
              sx={{ mr: 2 }}
            >
              Analyze with Gemini Vision
            </Button>
            <Button
              variant="outlined"
              color="secondary"
              onClick={handleClearResults}
              disabled={isLoading}
              startIcon={<Delete />}
            >
              Clear
              </Button>
          </Box>
        )}
        
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
          <FormControlLabel
            control={
              <Switch
                checked={useVisionModel}
                onChange={handleToggleVision}
                name="useVisionModel"
                color="primary"
              />
            }
            label="Use Gemini Vision for enhanced image analysis"
          />
          </Box>
      </TabPanel>

      {/* CSV Upload Panel */}
      <TabPanel value={tabValue} index={1}>
        <Typography variant="h6" gutterBottom>
          Upload CSV Data
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Upload a CSV file with logistics data for compliance validation
        </Typography>
        
          <input
            accept=".csv"
            style={{ display: 'none' }}
          id="csv-upload"
          type="file"
            onChange={handleCsvUpload}
          />
        <label htmlFor="csv-upload">
          <UploadBox>
            <UploadFile fontSize="large" color="primary" />
            <Typography variant="body1" sx={{ mt: 2 }}>
              Click to upload a CSV file
            </Typography>
            <Typography variant="caption" color="text.secondary">
              File should have headers in the first row
            </Typography>
          </UploadBox>
        </label>

        {csvFile && (
          <Box sx={{ mt: 3 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              Uploaded: {csvFile.name} ({(csvFile.size / 1024).toFixed(1)} KB)
            </Alert>
            
            {isLoading ? (
              <Box sx={{ width: '100%', mt: 2, mb: 2 }}>
                <LinearProgress />
                <Typography variant="body2" sx={{ mt: 1, textAlign: 'center' }}>
                  {processingStage || 'Processing...'}
                </Typography>
              </Box>
            ) : (
              csvEntries.length > 0 && (
                <>
                  <Alert severity="success" sx={{ mb: 2 }}>
                    <AlertTitle>CSV Processing Complete</AlertTitle>
                    Successfully processed {csvEntries.length} entries.
                  </Alert>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" gutterBottom>
                      Batch Processing Results ({csvEntries.length} entries)
                    </Typography>
                    <Button
                      variant="outlined"
                      color="primary"
                      startIcon={isGeneratingPDF ? <CircularProgress size={20} color="inherit" /> : <PictureAsPdf />}
                      onClick={() => {
                        // Find the entry with the most issues to generate a report for
                        const entryWithMostIssues = [...csvEntries].sort((a, b) => {
                          const aIssues = a.complianceResults.filter(r => r.status !== 'compliant').length;
                          const bIssues = b.complianceResults.filter(r => r.status !== 'compliant').length;
                          return bIssues - aIssues;
                        })[0];
                        
                        if (entryWithMostIssues) {
                          setTempSelectedEntry(entryWithMostIssues);
                          setPdfMenuAnchor(document.getElementById('critical-entry-button'));
                        }
                      }}
                      disabled={csvEntries.length === 0 || isGeneratingPDF}
                      id="critical-entry-button"
                    >
                      {isGeneratingPDF ? 'Generating...' : 'Export Most Critical Entry'}
                    </Button>
                  </Box>
                  
                  <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', mt: 2 }}>
                    CSV Entries (Non-compliant First)
                  </Typography>
                  
                  <Box sx={{ mb: 3 }}>
                    {csvEntries.map((entry) => {
                      let severity: 'error' | 'warning' | 'success' = 'success';
                      if (entry.complianceStats.nonCompliant > 0) {
                        severity = 'error';
                      } else if (entry.complianceStats.warnings > 0) {
                        severity = 'warning';
                      }
                      
                      return (
                        <Accordion 
                          key={entry.entryId}
                          expanded={entry.isExpanded}
                          onChange={() => toggleEntryExpansion(entry.entryId)}
                          sx={{ 
                            mb: 1,
                            border: '1px solid',
                            borderColor: 
                              severity === 'error' 
                                ? 'error.main' 
                                : severity === 'warning' 
                                  ? 'warning.main' 
                                  : 'success.main',
                            '&::before': {
                              backgroundColor: 
                                severity === 'error' 
                                  ? 'error.main' 
                                  : severity === 'warning' 
                                    ? 'warning.main' 
                                    : 'success.main',
                            }
                          }}
                        >
                          <AccordionSummary expandIcon={<ExpandMore />}>
                            <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                              {severity === 'error' ? (
                                <ErrorIcon color="error" sx={{ mr: 1 }} />
                              ) : severity === 'warning' ? (
                                <WarningIcon color="warning" sx={{ mr: 1 }} />
                              ) : (
                                <CheckCircleIcon color="success" sx={{ mr: 1 }} />
                              )}
                              
                              <Typography sx={{ width: '40%', flexShrink: 0 }}>
                                Entry {entry.entryId.split('-').pop()}
                              </Typography>
                              
                              <Typography sx={{ color: 'text.secondary' }}>
                                {entry.complianceStats.nonCompliant > 0 
                                  ? `${entry.complianceStats.nonCompliant} non-compliant fields` 
                                  : entry.complianceStats.warnings > 0 
                                    ? `${entry.complianceStats.warnings} warnings` 
                                    : '100% compliant'}
                              </Typography>
                            </Box>
                          </AccordionSummary>
                          
                          <AccordionDetails>
                            <Box sx={{ mb: 2 }}>
                              <Typography variant="subtitle2" gutterBottom>
                                Entry Data:
                              </Typography>
                              <Paper 
                                sx={{ 
                                  p: 2, 
                                  maxHeight: '200px', 
                                  overflow: 'auto', 
                                  backgroundColor: 'grey.100',
                                  fontFamily: 'monospace'
                                }}
                              >
                                <pre style={{ margin: 0 }}>
                                  {entry.entryText}
                                </pre>
                              </Paper>
                            </Box>
                            
                            <Typography variant="subtitle2" gutterBottom>
                              Compliance Issues:
                            </Typography>
                            <Box sx={{ maxHeight: '300px', overflow: 'auto' }}>
                              {entry.complianceResults.filter(r => r.status !== 'compliant').map((result) => (
                                <ResultCard key={result.id} status={result.status}>
                                  <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                                    {result.status === 'non-compliant' ? (
                                      <ErrorIcon color="error" sx={{ mr: 1, mt: 0.5 }} />
                                    ) : (
                                      <WarningIcon color="warning" sx={{ mr: 1, mt: 0.5 }} />
                                    )}
                                    <Box>
                                      <Typography variant="subtitle2">
                                        {result.field}
                                      </Typography>
                                      <Typography variant="body2" color="text.secondary">
                                        Value: {result.value}
                                      </Typography>
                                      <Typography variant="body2">
                                        {result.message}
                                      </Typography>
                                    </Box>
                                  </Box>
                                </ResultCard>
                              ))}
                              
                              {entry.complianceResults.filter(r => r.status !== 'compliant').length === 0 && (
                                <Alert severity="success">
                                  No compliance issues found in this entry.
                                </Alert>
                              )}
                            </Box>
                            
                            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', gap: 2 }}>
                              <Button 
                                variant="outlined" 
                                onClick={() => showEntryDetails(entry)}
                                startIcon={<Assessment />}
                              >
                                View Detailed Results
                              </Button>
                              <Button
                                variant="outlined"
                                color="primary"
                                startIcon={isGeneratingPDF ? <CircularProgress size={20} color="inherit" /> : <PictureAsPdf />}
                                onClick={(e) => {
                                  e.stopPropagation(); // Prevent accordion from toggling
                                  setPdfMenuAnchor(e.currentTarget);
                                  // Store the current entry to use when a menu item is selected
                                  setTempSelectedEntry(entry);
                                }}
                                disabled={isGeneratingPDF}
                              >
                                {isGeneratingPDF ? 'Generating...' : 'Export PDF'}
                              </Button>
                            </Box>
                          </AccordionDetails>
                        </Accordion>
                      );
                    })}
                  </Box>
                </>
              )
            )}
            
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <Button
                variant="outlined"
                color="secondary"
                onClick={handleClearResults}
                disabled={isLoading}
                startIcon={<Delete />}
              >
                Clear
              </Button>
            </Box>
          </Box>
        )}
      </TabPanel>

      {/* Manual Entry Panel */}
      <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" gutterBottom>
          Manual Data Entry with Gen AI
          </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Enter logistics data in any format - GenAI will intelligently transform it to a standardized format.
          <Box component="span" sx={{ display: 'block', mt: 1 }}>
            You can enter: free text, partial data, different terminology, mixed formats, or JSON.
          </Box>
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, mt: 1 }}>
          <InfoIcon color="info" fontSize="small" sx={{ mr: 1 }} />
          <Typography variant="body2" color="info.main">
            Gemini will identify shipping terms even if they're in non-standard formats or use different terminology.
          </Typography>
        </Box>
        
          <TextField
          label="Enter shipping or logistics data"
            multiline
            rows={8}
            value={manualData}
            onChange={handleManualDataChange}
          fullWidth
            variant="outlined"
          placeholder="Enter any shipping details like: 'Send package from John Doe (123 Main St) to Jane Smith at 456 Oak Ave on May 5th via USPS. Package weighs 2kg and contains books.'"
            sx={{ mb: 2 }}
          />
          
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleManualSubmit}
            disabled={isLoading || !manualData.trim()}
            startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <Psychology />}
            sx={{ mr: 2 }}
          >
            {isLoading ? 'Processing...' : 'Process with Gemini AI'}
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            onClick={handleClearResults}
            disabled={isLoading}
            startIcon={<Delete />}
          >
            Clear
          </Button>
        </Box>
        
        {successMessage && (
          <Alert severity="success" sx={{ mt: 2 }}>
            {successMessage}
          </Alert>
        )}
      </TabPanel>

      {/* Results Section */}
      {results.length > 0 && (
        <Box sx={{ mt: 4 }} id="results-section">
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h5">
              Compliance Results
            </Typography>
            <Box>
              <Button
                variant="contained"
                color="primary"
                onClick={handlePdfMenuOpen}
                startIcon={isGeneratingPDF ? <CircularProgress size={20} color="inherit" /> : <PictureAsPdf />}
                disabled={isGeneratingPDF}
              >
                {isGeneratingPDF ? 'Generating PDF...' : 'Export as PDF'}
              </Button>
              <Menu
                anchorEl={pdfMenuAnchor}
                open={Boolean(pdfMenuAnchor)}
                onClose={handlePdfMenuClose}
              >
                <MenuItem onClick={() => {
                  handlePdfMenuClose();
                  if (tempSelectedEntry) {
                    generatePdfReport(tempSelectedEntry.complianceResults, tempSelectedEntry.formattedData, 'full');
                    setTempSelectedEntry(null);
                  } else {
                    generatePdfReport(results, formattedData, 'full');
                  }
                }}>
                  Full Report (Detailed)
                </MenuItem>
                <MenuItem onClick={() => {
                  handlePdfMenuClose();
                  if (tempSelectedEntry) {
                    generatePdfReport(tempSelectedEntry.complianceResults, tempSelectedEntry.formattedData, 'simple');
                    setTempSelectedEntry(null);
                  } else {
                    generatePdfReport(results, formattedData, 'simple');
                  }
                }}>
                  Simple Report (Better Compatibility)
                </MenuItem>
              </Menu>
            </Box>
          </Box>
          
          {/* Compliance stats */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h6">{stats.total}</Typography>
                  <Typography variant="body2">Total Fields</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Box sx={{ textAlign: 'center', color: 'success.main' }}>
                  <Typography variant="h6">{stats.compliant}</Typography>
                  <Typography variant="body2">Compliant</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Box sx={{ textAlign: 'center', color: 'warning.main' }}>
                  <Typography variant="h6">{stats.warnings}</Typography>
                  <Typography variant="body2">Warnings</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Box sx={{ textAlign: 'center', color: 'error.main' }}>
                  <Typography variant="h6">{stats.nonCompliant}</Typography>
                  <Typography variant="body2">Non-Compliant</Typography>
                </Box>
              </Grid>
              <Grid item xs={12}>
                <LinearProgress 
                  variant="determinate" 
                  value={stats.complianceRate * 100} 
                  color={stats.complianceRate > 0.8 ? "success" : stats.complianceRate > 0.6 ? "warning" : "error"}
                  sx={{ height: 10, borderRadius: 5 }}
                />
                <Typography variant="body2" sx={{ mt: 1, textAlign: 'center' }}>
                  Compliance Rate: {(stats.complianceRate * 100).toFixed(0)}%
                </Typography>
              </Grid>
            </Grid>
          </Paper>
          
          {/* Confidence score alert if low */}
          {formattedData?.processingMetadata?.confidence !== undefined && 
            formattedData.processingMetadata.confidence < 0.8 && (
            <Alert severity="warning" sx={{ mb: 3 }}>
              <AlertTitle>Low Confidence Score: {(formattedData.processingMetadata.confidence * 100).toFixed(0)}%</AlertTitle>
              <Typography variant="body2">
                The system has low confidence in some of the extracted data. This could be due to:
              </Typography>
              <ul>
                <li>Poor image quality or resolution</li>
                <li>Handwritten or unclear text</li>
                <li>Non-standard document format</li>
                <li>Missing or ambiguous information</li>
              </ul>
              <Typography variant="body2">
                <strong>Recommended Action:</strong> Verify the data manually or upload a clearer image.
              </Typography>
            </Alert>
          )}
          
          {/* Cross-border specific issues */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              Cross-Border Compliance Issues
            </Typography>
            
            {Object.values(categorizeResults()).some(category => category.issues.length > 0) ? (
          <Grid container spacing={3}>
                {Object.entries(categorizeResults()).map(([key, category]) => (
                  category.issues.length > 0 && (
                    <Grid item xs={12} md={6} key={key}>
                      <Paper 
                        elevation={3} 
                  sx={{ 
                          p: 2, 
                          height: '100%',
                          border: '1px solid',
                          borderColor: key === 'crossBorder' || key === 'restrictedItems' || key === 'destinationRestrictions' 
                            ? 'error.main' 
                            : 'warning.main',
                          borderLeft: '5px solid',
                          borderLeftColor: key === 'crossBorder' || key === 'restrictedItems' || key === 'destinationRestrictions' 
                            ? 'error.main' 
                            : 'warning.main'
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <Box sx={{ mr: 1, color: key === 'crossBorder' || key === 'restrictedItems' || key === 'destinationRestrictions'  
                            ? 'error.main' 
                            : 'warning.main' }}>
                            {category.icon}
                          </Box>
                          <Typography variant="h6">{category.title} ({category.issues.length})</Typography>
                        </Box>
                        
                        <Typography variant="body2" color="text.secondary" paragraph>
                          {category.description}
                        </Typography>
                        
                        <List dense>
                          {category.issues.map((issue, index) => (
                            <ListItem key={index}>
                              <ListItemIcon>
                                {issue.status === 'non-compliant' ? 
                                  <ErrorIcon color="error" /> : 
                                  <WarningIcon color="warning" />
                                }
                              </ListItemIcon>
                              <ListItemText 
                                primary={issue.field}
                                secondary={issue.message}
                              />
                            </ListItem>
                          ))}
                        </List>
                      </Paper>
                    </Grid>
                  )
                ))}
              </Grid>
            ) : (
              <Alert severity="success">
                <AlertTitle>No Cross-Border Issues Detected</AlertTitle>
                No cross-border compliance issues were detected. This shipment appears to meet international shipping requirements.
              </Alert>
            )}
          </Box>
          
          {/* Detailed Results */}
          <Typography variant="h6" gutterBottom>
            Detailed Results
          </Typography>
          <Grid container spacing={2}>
            {results.filter(result => result.status === 'non-compliant').map((result, index) => (
              <Grid item xs={12} key={`non-compliant-${index}`}>
                <ResultCard status={result.status} sx={{ mb: 2 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Typography variant="h6">{result.field}</Typography>
                    <Chip 
                        label="Non-Compliant" 
                        color="error" 
                      size="small"
                        icon={<ErrorIcon />} 
                    />
                  </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Value: <strong>{result.value || 'Missing'}</strong>
                  </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      {result.message}
                    </Typography>
                  </CardContent>
                </ResultCard>
              </Grid>
            ))}
            
            {results.filter(result => result.status === 'warning').map((result, index) => (
              <Grid item xs={12} md={6} key={`warning-${index}`}>
                <ResultCard status={result.status} sx={{ mb: 2 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Typography variant="h6">{result.field}</Typography>
                      <Chip 
                        label="Warning" 
                        color="warning" 
                        size="small" 
                        icon={<WarningIcon />}
                      />
                    </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Value: <strong>{result.value || 'Missing'}</strong>
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                    {result.message}
                  </Typography>
                  </CardContent>
                </ResultCard>
              </Grid>
            ))}
            
            {results.filter(result => result.status === 'compliant').length > 0 && (
              <Grid item xs={12}>
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography>
                      <CheckCircleIcon color="success" sx={{ verticalAlign: 'middle', mr: 1 }} />
                      Compliant Fields ({results.filter(result => result.status === 'compliant').length})
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={2}>
                      {results.filter(result => result.status === 'compliant').map((result, index) => (
                        <Grid item xs={12} md={6} key={`compliant-${index}`}>
                          <ResultCard status={result.status} sx={{ mb: 2 }}>
                            <CardContent>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <Typography variant="h6">{result.field}</Typography>
                                <Chip 
                                  label="Compliant" 
                                  color="success" 
                                  size="small" 
                                  icon={<CheckCircleIcon />}
                                />
                              </Box>
                              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                Value: <strong>{result.value}</strong>
                              </Typography>
                            </CardContent>
                          </ResultCard>
                        </Grid>
                      ))}
                    </Grid>
                  </AccordionDetails>
                </Accordion>
              </Grid>
            )}
          </Grid>
        </Box>
      )}

      {/* Error and Success messages */}
      {errorMessage && (
        <Alert severity="error" sx={{ mt: 3 }}>
          {errorMessage}
        </Alert>
      )}
      
      {successMessage && (
        <Alert severity="success" sx={{ mt: 3 }}>
          {successMessage}
        </Alert>
      )}
      
      {isLoading && (
        <Box display="flex" alignItems="center" sx={{ mt: 3 }}>
          <CircularProgress size={24} sx={{ mr: 2 }} />
          <Typography>{processingStage}</Typography>
        </Box>
      )}

      {/* Raw extracted text for debugging */}
      {rawTextExtracted && (
        <Accordion sx={{ mb: 3 }}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography>
              <Info sx={{ verticalAlign: 'middle', mr: 1 }} />
              Raw Extracted Text
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Paper sx={{ p: 2, whiteSpace: 'pre-wrap', maxHeight: '300px', overflow: 'auto' }}>
              <Typography variant="body2" component="pre">
                {rawTextExtracted}
              </Typography>
            </Paper>
          </AccordionDetails>
        </Accordion>
      )}

      {/* Compliance Chat - only shown when there are results */}
      {formattedData && results.length > 0 && (
        <ComplianceChat 
          formattedData={formattedData}
          complianceResults={results}
          nonCompliantCount={results.filter(r => r.status === 'non-compliant').length}
          warningCount={results.filter(r => r.status === 'warning').length}
        />
      )}
    </Container>
  );
};

export default ComplianceChecker;