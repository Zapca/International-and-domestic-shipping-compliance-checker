import React, { useState } from 'react';
import { 
  Button, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogContentText, 
  DialogActions,
  Alert,
  CircularProgress
} from '@mui/material';
import { Refresh, Warning } from '@mui/icons-material';
import { reinitializeRules } from '../../services/reinitializeRules';

/**
 * Component to reset and reinitialize the rules database
 * This is useful when there are issues with the rules, such as missing definitions
 */
const ReinitializeRules: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{success: boolean; message: string} | null>(null);

  const handleOpen = () => {
    setOpen(true);
    setResult(null);
  };

  const handleClose = () => {
    setOpen(false);
    setTimeout(() => setResult(null), 500); // Clear result after dialog closes
  };

  const handleReinitialize = async () => {
    setIsProcessing(true);
    setResult(null);
    
    try {
      await reinitializeRules();
      setResult({
        success: true,
        message: 'Rules database successfully reinitialized. All rules have been reset to defaults.'
      });
    } catch (error) {
      console.error('Failed to reinitialize rules:', error);
      setResult({
        success: false,
        message: `Failed to reinitialize rules: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <Button 
        variant="outlined" 
        color="warning" 
        startIcon={<Refresh />}
        onClick={handleOpen}
        sx={{ mt: 2 }}
      >
        Reinitialize Rules Database
      </Button>
      
      <Dialog
        open={open}
        onClose={handleClose}
        aria-labelledby="reinitialize-rules-dialog-title"
      >
        <DialogTitle id="reinitialize-rules-dialog-title" sx={{ display: 'flex', alignItems: 'center' }}>
          <Warning color="warning" sx={{ mr: 1 }} />
          Reset Rules Database
        </DialogTitle>
        
        <DialogContent>
          <DialogContentText>
            This will delete all existing rule definitions and recreate them from defaults.
            This process cannot be undone. Any customized rules will be lost.
          </DialogContentText>
          
          {result && (
            <Alert 
              severity={result.success ? 'success' : 'error'} 
              sx={{ mt: 2 }}
            >
              {result.message}
            </Alert>
          )}
          
          {isProcessing && (
            <div style={{ display: 'flex', justifyContent: 'center', margin: '20px 0' }}>
              <CircularProgress />
            </div>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleClose} color="primary" disabled={isProcessing}>
            Cancel
          </Button>
          <Button 
            onClick={handleReinitialize} 
            color="warning" 
            disabled={isProcessing}
            startIcon={isProcessing ? <CircularProgress size={20} /> : <Refresh />}
          >
            Reset & Reinitialize
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ReinitializeRules; 