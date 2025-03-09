import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Divider,
  Chip,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControlLabel,
  Switch,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  ExpandMore,
  ContentPaste,
  Autorenew,
  Edit,
  Check,
  Warning,
  Error as ErrorIcon,
  Info,
  SaveAlt
} from '@mui/icons-material';
import { ComplianceResult } from '../../services/types';
import { 
  processInputToCompliance, 
  RawInputData, 
  FormattedData,
  FieldSpecification
} from '../../services/formatConverter';

interface FormatConverterProps {
  sourceType: 'vision' | 'csv' | 'manual';
  inputContent: string | Record<string, string>;
  inputMetadata?: {
    confidence?: number;
    filename?: string;
    timestamp?: string;
  };
  onProcessedData?: (results: {
    formattedData: FormattedData;
    complianceResults: ComplianceResult[];
  }) => void;
}

const FormatConverter: React.FC<FormatConverterProps> = ({
  sourceType,
  inputContent,
  inputMetadata,
  onProcessedData
}) => {
  // State for processing and results
  const [isProcessing, setIsProcessing] = useState(false);
  const [formattedData, setFormattedData] = useState<FormattedData | null>(null);
  const [complianceResults, setComplianceResults] = useState<ComplianceResult[]>([]);
  const [showRawData, setShowRawData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editableContent, setEditableContent] = useState('');

  // Process the input when it changes
  useEffect(() => {
    processInput();
  }, [sourceType, inputContent, inputMetadata]);

  // Process the input data
  const processInput = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      // Prepare input data
      const rawInput: RawInputData = {
        source: sourceType,
        content: inputContent,
        metadata: inputMetadata
      };

      // Process the data
      const { formattedData, complianceResults } = processInputToCompliance(rawInput);
      
      // Update state
      setFormattedData(formattedData);
      setComplianceResults(complianceResults);
      
      // Initialize editable content
      if (typeof inputContent === 'string') {
        setEditableContent(inputContent);
      } else {
        setEditableContent(JSON.stringify(inputContent, null, 2));
      }
      
      // Call the callback function if provided
      if (onProcessedData) {
        onProcessedData({ formattedData, complianceResults });
      }
    } catch (err) {
      console.error('Error processing data:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle manual editing of content
  const handleEditableContentChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditableContent(event.target.value);
  };

  // Apply edits and reprocess
  const applyEdits = () => {
    try {
      // Try to parse as JSON first
      try {
        // Check if it's valid JSON
        JSON.parse(editableContent);
        // If it's valid JSON, update as object
        const parsedContent = JSON.parse(editableContent);
        processInputToCompliance({
          source: sourceType,
          content: parsedContent,
          metadata: inputMetadata
        });
      } catch {
        // Not valid JSON, update as string
        processInputToCompliance({
          source: sourceType,
          content: editableContent,
          metadata: inputMetadata
        });
      }
      
      setEditMode(false);
      processInput();
    } catch (err) {
      setError('Failed to apply edits. Please check your input format.');
    }
  };

  // Calculate summary stats
  const getComplianceStats = () => {
    if (!complianceResults.length) return { compliant: 0, warning: 0, nonCompliant: 0, total: 0 };
    
    const compliant = complianceResults.filter(r => r.status === 'compliant').length;
    const warning = complianceResults.filter(r => r.status === 'warning').length;
    const nonCompliant = complianceResults.filter(r => r.status === 'non-compliant').length;
    
    return {
      compliant,
      warning,
      nonCompliant,
      total: complianceResults.length
    };
  };

  const stats = getComplianceStats();

  // Render status icon based on status
  const renderStatusIcon = (status: 'compliant' | 'non-compliant' | 'warning'): React.ReactElement => {
    switch (status) {
      case 'compliant':
        return <Check fontSize="small" color="success" />;
      case 'warning':
        return <Warning fontSize="small" color="warning" />;
      case 'non-compliant':
        return <ErrorIcon fontSize="small" color="error" />;
      default:
        return <ErrorIcon fontSize="small" />;
    }
  };

  // Determine if there are any warnings in the metadata
  const hasWarnings = formattedData?.processingMetadata.warnings.length ?? 0 > 0;

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {isProcessing ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
          <CircularProgress />
          <Typography variant="body1" sx={{ ml: 2 }}>
            Processing and standardizing data...
          </Typography>
        </Box>
      ) : (
        <>
          {/* Input Editing Section */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">
                Input Data ({sourceType.charAt(0).toUpperCase() + sourceType.slice(1)})
              </Typography>
              <Box>
                <Tooltip title={editMode ? "Apply changes" : "Edit input"}>
                  <IconButton 
                    color={editMode ? "primary" : "default"} 
                    onClick={() => editMode ? applyEdits() : setEditMode(true)}
                  >
                    {editMode ? <Check /> : <Edit />}
                  </IconButton>
                </Tooltip>
                <Tooltip title="Reprocess input">
                  <IconButton color="default" onClick={processInput}>
                    <Autorenew />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>

            {editMode ? (
              <TextField
                fullWidth
                multiline
                rows={8}
                variant="outlined"
                value={editableContent}
                onChange={handleEditableContentChange}
                placeholder="Edit your input data here..."
              />
            ) : (
              <Box 
                sx={{ 
                  maxHeight: 200, 
                  overflowY: 'auto', 
                  backgroundColor: '#f5f5f5', 
                  p: 2,
                  borderRadius: 1,
                  fontFamily: 'monospace'
                }}
              >
                {typeof inputContent === 'string' ? (
                  <pre style={{ margin: 0 }}>{inputContent}</pre>
                ) : (
                  <pre style={{ margin: 0 }}>{JSON.stringify(inputContent, null, 2)}</pre>
                )}
              </Box>
            )}
          </Paper>

          {/* Results Summary */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Processing Results
            </Typography>
            
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} md={3}>
                <Box sx={{ textAlign: 'center', p: 1, backgroundColor: '#e8f5e9', borderRadius: 1 }}>
                  <Typography variant="body2">Compliant</Typography>
                  <Typography variant="h5">{stats.compliant}</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={3}>
                <Box sx={{ textAlign: 'center', p: 1, backgroundColor: '#fff3e0', borderRadius: 1 }}>
                  <Typography variant="body2">Warnings</Typography>
                  <Typography variant="h5">{stats.warning}</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={3}>
                <Box sx={{ textAlign: 'center', p: 1, backgroundColor: '#ffebee', borderRadius: 1 }}>
                  <Typography variant="body2">Non-Compliant</Typography>
                  <Typography variant="h5">{stats.nonCompliant}</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={3}>
                <Box sx={{ textAlign: 'center', p: 1, backgroundColor: '#e3f2fd', borderRadius: 1 }}>
                  <Typography variant="body2">Confidence</Typography>
                  <Typography variant="h5">
                    {formattedData ? `${Math.round(formattedData.processingMetadata.confidence * 100)}%` : 'N/A'}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
            
            {hasWarnings && formattedData && (
              <Accordion sx={{ mb: 2 }}>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography>
                    Processing Warnings ({formattedData.processingMetadata.warnings.length})
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box component="ul" sx={{ mt: 0, pl: 2 }}>
                    {formattedData.processingMetadata.warnings.map((warning, index) => (
                      <Typography component="li" key={index} color="warning.main">
                        {warning}
                      </Typography>
                    ))}
                  </Box>
                </AccordionDetails>
              </Accordion>
            )}
            
            <FormControlLabel
              control={
                <Switch 
                  checked={showRawData} 
                  onChange={(e) => setShowRawData(e.target.checked)} 
                />
              }
              label="Show Raw/Standardized Data Comparison"
            />
            
            {showRawData && formattedData && (
              <TableContainer sx={{ mt: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Field</TableCell>
                      <TableCell>Extracted Value</TableCell>
                      <TableCell>Standardized Value</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Object.entries(formattedData.fields).map(([key, value]) => {
                      const result = complianceResults.find(r => r.field === key || r.field === key.charAt(0).toUpperCase() + key.slice(1));
                      return (
                        <TableRow key={key}>
                          <TableCell>{key.charAt(0).toUpperCase() + key.slice(1)}</TableCell>
                          <TableCell>
                            {typeof inputContent === 'object' && inputContent[key] ? 
                              inputContent[key] : 'N/A'}
                          </TableCell>
                          <TableCell>{value}</TableCell>
                          <TableCell>
                            {result ? renderStatusIcon(result.status) : null}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>

          {/* Compliance Results */}
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Compliance Validation Results
            </Typography>
            
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Field</TableCell>
                    <TableCell>Value</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Message</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {complianceResults.map((result) => (
                    <TableRow 
                      key={result.id}
                      sx={{
                        backgroundColor: 
                          result.status === 'non-compliant' ? '#ffebee' :
                          result.status === 'warning' ? '#fff3e0' :
                          '#e8f5e9'
                      }}
                    >
                      <TableCell>{result.field}</TableCell>
                      <TableCell>{result.value}</TableCell>
                      <TableCell>
                        <Chip 
                          icon={renderStatusIcon(result.status)}
                          label={result.status.replace('-', ' ')}
                          color={
                            result.status === 'compliant' ? 'success' :
                            result.status === 'warning' ? 'warning' : 'error'
                          }
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{result.message}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            
            <Box display="flex" justifyContent="flex-end" mt={2}>
              <Button 
                variant="contained" 
                startIcon={<SaveAlt />}
                onClick={() => {
                  // Create a downloadable file with the results
                  const data = {
                    formattedData,
                    complianceResults,
                    timestamp: new Date().toISOString()
                  };
                  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `compliance-report-${new Date().getTime()}.json`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }}
              >
                Save Report
              </Button>
            </Box>
          </Paper>
        </>
      )}
    </Box>
  );
};

export default FormatConverter; 