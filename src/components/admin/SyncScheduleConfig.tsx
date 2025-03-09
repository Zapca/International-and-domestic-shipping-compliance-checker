import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Switch,
  FormControlLabel,
  Button,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Grid,
  SelectChangeEvent,
  TextField,
  CircularProgress
} from '@mui/material';
import { Schedule, Sync, Settings } from '@mui/icons-material';
import { syncScheduler, SyncFrequency } from '../../services/api/syncScheduler';
import { SyncResult, SyncNextInfo } from '../../models/compliance';

interface SyncScheduleConfigProps {
  onConfigUpdate?: () => void;
}

const SyncScheduleConfig: React.FC<SyncScheduleConfigProps> = ({ onConfigUpdate }) => {
  const [config, setConfig] = useState(syncScheduler.getConfig());
  const [nextSyncInfo, setNextSyncInfo] = useState<SyncNextInfo>(syncScheduler.getNextSyncInfo());
  const [syncInProgress, setSyncInProgress] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [region, setRegion] = useState(config.region || '');

  // Refresh next sync info every minute
  useEffect(() => {
    // Initialize immediately
    updateSyncInfo();
    
    const intervalId = setInterval(() => {
      updateSyncInfo();
    }, 60000); // Update every minute

    return () => clearInterval(intervalId);
  }, []);
  
  // Update sync information
  const updateSyncInfo = () => {
    try {
      setNextSyncInfo(syncScheduler.getNextSyncInfo());
      setConfig(syncScheduler.getConfig());
    } catch (err) {
      console.error('Error updating sync info:', err);
    }
  };

  // Handle enabled toggle
  const handleEnabledChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newConfig = { ...config, enabled: event.target.checked };
    syncScheduler.updateConfig(newConfig);
    setConfig(newConfig);
    
    if (onConfigUpdate) {
      onConfigUpdate();
    }
  };

  // Handle auto sync toggle
  const handleAutoSyncChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newConfig = { ...config, autoSync: event.target.checked };
    syncScheduler.updateConfig(newConfig);
    setConfig(newConfig);
    
    if (onConfigUpdate) {
      onConfigUpdate();
    }
  };

  // Handle frequency change
  const handleFrequencyChange = (event: SelectChangeEvent) => {
    const newConfig = { 
      ...config, 
      frequency: event.target.value as SyncFrequency 
    };
    
    syncScheduler.updateConfig(newConfig);
    setConfig(newConfig);
    
    if (onConfigUpdate) {
      onConfigUpdate();
    }
  };

  // Handle region change
  const handleRegionChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRegion(event.target.value);
  };

  // Save region
  const handleSaveRegion = () => {
    const newConfig = { ...config, region };
    syncScheduler.updateConfig(newConfig);
    setConfig(newConfig);
    setSuccess('Region updated successfully');
    
    if (onConfigUpdate) {
      onConfigUpdate();
    }
  };

  // Trigger immediate sync
  const handleSyncNow = async () => {
    setSyncInProgress(true);
    setError(null);
    setSuccess(null);
    
    try {
      const result = await syncScheduler.syncNow();
      
      if (result.error) {
        setError(`Sync failed: ${result.error}`);
      } else {
        setSuccess(`Manual sync completed. Imported ${result.imported} rules, updated ${result.updated} rules.`);
      }
      
      // Update state
      updateSyncInfo();
      
      if (onConfigUpdate) {
        onConfigUpdate();
      }
    } catch (err: unknown) {
      console.error('Manual sync failed:', err);
      setError(err instanceof Error ? err.message : 'Manual sync failed. Please try again.');
    } finally {
      setSyncInProgress(false);
    }
  };
  
  // Reset error state and configuration
  const handleResetErrors = () => {
    const newConfig = {
      ...config,
      errorCount: 0,
      lastErrorMessage: undefined
    };
    
    syncScheduler.updateConfig(newConfig);
    updateSyncInfo();
    setSuccess('Error state reset successfully');
    
    if (onConfigUpdate) {
      onConfigUpdate();
    }
  };

  return (
    <Card>
      <CardHeader 
        title="Scheduled Synchronization" 
        subheader="Configure automatic updates of compliance regulations"
        avatar={<Schedule color="primary" />}
      />
      <CardContent>
        <Grid container spacing={3}>
          {error && (
            <Grid item xs={12}>
              <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
            </Grid>
          )}
          
          {success && (
            <Grid item xs={12}>
              <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>
            </Grid>
          )}
          
          {nextSyncInfo.errorCount > 0 && (
            <Grid item xs={12}>
              <Alert 
                severity="warning" 
                sx={{ mb: 2 }}
                action={
                  <Button 
                    color="inherit" 
                    size="small" 
                    onClick={handleResetErrors}
                  >
                    Reset
                  </Button>
                }
              >
                <Typography variant="subtitle2">
                  Sync Errors Detected ({nextSyncInfo.errorCount})
                </Typography>
                {nextSyncInfo.lastErrorMessage && (
                  <Typography variant="body2">
                    Last error: {nextSyncInfo.lastErrorMessage}
                  </Typography>
                )}
              </Alert>
            </Grid>
          )}
          
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch 
                  checked={config.enabled} 
                  onChange={handleEnabledChange}
                  color="primary"
                />
              }
              label="Enable Scheduled Synchronization"
            />
          </Grid>
          
          {config.enabled && (
            <>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch 
                      checked={config.autoSync} 
                      onChange={handleAutoSyncChange}
                      color="primary"
                    />
                  }
                  label="Automatic Synchronization"
                />
                <Typography variant="caption" color="text.secondary" display="block">
                  Automatically sync with compliance API based on frequency
                </Typography>
              </Grid>
              
              {config.autoSync && (
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel id="frequency-select-label">Sync Frequency</InputLabel>
                    <Select
                      labelId="frequency-select-label"
                      value={config.frequency}
                      label="Sync Frequency"
                      onChange={handleFrequencyChange}
                    >
                      <MenuItem value={SyncFrequency.HOURLY}>Hourly</MenuItem>
                      <MenuItem value={SyncFrequency.DAILY}>Daily</MenuItem>
                      <MenuItem value={SyncFrequency.WEEKLY}>Weekly</MenuItem>
                      <MenuItem value={SyncFrequency.MONTHLY}>Monthly</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              )}
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Target Region"
                  value={region}
                  onChange={handleRegionChange}
                  placeholder="e.g., US, EU, GLOBAL"
                  helperText="Leave empty for all regions"
                />
                <Button 
                  size="small" 
                  variant="outlined" 
                  sx={{ mt: 1 }}
                  onClick={handleSaveRegion}
                  startIcon={<Settings fontSize="small" />}
                >
                  Save Region
                </Button>
              </Grid>
              
              {nextSyncInfo.enabled && nextSyncInfo.nextSync && (
                <Grid item xs={12}>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    <Typography variant="body2">
                      Next scheduled sync: {nextSyncInfo.nextSync.toLocaleString()}
                    </Typography>
                    <Typography variant="body2">
                      {nextSyncInfo.timeRemaining}
                    </Typography>
                  </Alert>
                </Grid>
              )}
                
              <Grid item xs={12}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleSyncNow}
                  disabled={syncInProgress}
                  startIcon={syncInProgress ? <CircularProgress size={20} color="inherit" /> : <Sync />}
                >
                  {syncInProgress ? 'Syncing...' : 'Sync Now'}
                </Button>
              </Grid>
            </>
          )}
        </Grid>
      </CardContent>
    </Card>
  );
};

export default SyncScheduleConfig; 