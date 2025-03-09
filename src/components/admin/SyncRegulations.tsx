import React, { useState, useCallback } from 'react';
import {
  Box, Button, Typography, CircularProgress, 
  Alert, Paper, Divider, LinearProgress,
  List, ListItem, ListItemText, ListItemIcon
} from '@mui/material';
import { Sync, CheckCircle, Error, Info } from '@mui/icons-material';
import { complianceAPIService } from '../../services/api/complianceAPI';
import { ruleRepository } from '../../services/database/ruleRepository';
import { SyncResult } from '../../models/compliance';

interface SyncRegulationsProps {
  onSyncComplete?: () => void;
}

// Use the singleton instance exported from the service
const SyncRegulations: React.FC<SyncRegulationsProps> = ({ onSyncComplete }) => {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lastSyncDate, setLastSyncDate] = useState<Date | null>(null);
  const [logs, setLogs] = useState<Array<{message: string, type: 'info' | 'success' | 'error'}>>([]);

  const addLog = useCallback((message: string, type: 'info' | 'success' | 'error' = 'info') => {
    setLogs(prev => [...prev, { message, type }]);
  }, []);

  const clearState = useCallback(() => {
    setResult(null);
    setError(null);
    setSuccess(null);
    setLogs([]);
  }, []);

  const handleSync = async () => {
    clearState();
    setSyncing(true);
    addLog('Starting synchronization with compliance API...', 'info');
    
    try {
      // Fetch regulations from API
      addLog('Fetching latest compliance regulations...', 'info');
      const syncResult = await complianceAPIService.fetchAndImportRegulations(
        (message: string) => addLog(message, 'info')
      );
      
      if (syncResult.error) {
        setError(syncResult.error);
        addLog(`Synchronization failed: ${syncResult.error}`, 'error');
      } else {
        setResult(syncResult);
        setLastSyncDate(new Date());
        setSuccess(`Successfully imported ${syncResult.imported} new rules, updated ${syncResult.updated} existing rules.`);
        addLog(`Successfully imported ${syncResult.imported} new rules`, 'success');
        addLog(`Updated ${syncResult.updated} existing rules`, 'success');
        addLog(`Processed ${syncResult.categories} categories`, 'success');
        
        if (onSyncComplete) {
          onSyncComplete();
        }
      }
    } catch (err) {
      console.error('Error during sync:', err);
      
      // Just use a catch-all approach for error handling
      setError('Error during synchronization. Please check console for details.');
      addLog(`Error during synchronization. Please try again later.`, 'error');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        <Sync sx={{ mr: 1, verticalAlign: 'middle' }} />
        Manual Synchronization
      </Typography>
      
      <Typography variant="body2" color="text.secondary" paragraph>
        Import the latest compliance regulations from the external API service.
        This process will update your local database with the most current rules.
      </Typography>
      
      <Divider sx={{ my: 2 }} />
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}
      
      {result && !error && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Synchronization completed successfully.
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2">
              • Imported {result.imported} new rules
            </Typography>
            <Typography variant="body2">
              • Updated {result.updated} existing rules
            </Typography>
            <Typography variant="body2">
              • Processed {result.categories} categories
            </Typography>
          </Box>
        </Alert>
      )}
      
      {lastSyncDate && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Last synchronized: {lastSyncDate.toLocaleString()}
          </Typography>
        </Box>
      )}
      
      {logs.length > 0 && (
        <Box sx={{ mt: 2, mb: 2, maxHeight: '200px', overflow: 'auto', bgcolor: '#f5f5f5', borderRadius: 1 }}>
          <List dense>
            {logs.map((log, index) => (
              <ListItem key={index}>
                <ListItemIcon sx={{ minWidth: '30px' }}>
                  {log.type === 'success' && <CheckCircle fontSize="small" color="success" />}
                  {log.type === 'error' && <Error fontSize="small" color="error" />}
                  {log.type === 'info' && <Info fontSize="small" color="info" />}
                </ListItemIcon>
                <ListItemText 
                  primary={log.message} 
                  primaryTypographyProps={{ 
                    variant: 'body2',
                    color: log.type === 'error' ? 'error' : 'textPrimary'
                  }} 
                />
              </ListItem>
            ))}
          </List>
        </Box>
      )}
      
      {syncing && <LinearProgress sx={{ mt: 2, mb: 2 }} />}
      
      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={handleSync} 
          disabled={syncing}
          startIcon={syncing ? <CircularProgress size={20} color="inherit" /> : <Sync />}
        >
          {syncing ? 'Synchronizing...' : 'Sync Now'}
        </Button>
      </Box>
    </Paper>
  );
};

export default SyncRegulations; 