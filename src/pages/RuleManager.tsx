import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  Tabs,
  Tab,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Divider,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Chip
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  ExpandMore,
  Save,
  Refresh,
  Code,
  Category
} from '@mui/icons-material';
import { ruleRepository } from '../services/database/ruleRepository';
import { ruleLoader } from '../services/database/ruleLoader';
import {
  ComplianceRule,
  RuleCategory,
  ValidationConstraint,
  FieldType,
  ValidationLevel
} from '../services/database/models';
import SyncRegulations from '../components/admin/SyncRegulations';
import SyncScheduleConfig from '../components/admin/SyncScheduleConfig';
import ReinitializeRules from '../components/admin/ReinitializeRules';

// Field type options
const fieldTypeOptions: FieldType[] = ['text', 'date', 'number', 'select', 'regex'];

// Validation level options
const validationLevelOptions: ValidationLevel[] = ['error', 'warning', 'info'];

// Interface for tab panel props
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

// Tab panel component
function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`rule-tabpanel-${index}`}
      aria-labelledby={`rule-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

// Rule Manager component
const RuleManager: React.FC = () => {
  // Tab state
  const [tabValue, setTabValue] = useState(0);
  
  // Data state
  const [rules, setRules] = useState<ComplianceRule[]>([]);
  const [categories, setCategories] = useState<RuleCategory[]>([]);
  const [constraints, setConstraints] = useState<Record<string, ValidationConstraint[]>>({});
  
  // Selected item state
  const [selectedRule, setSelectedRule] = useState<ComplianceRule | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<RuleCategory | null>(null);
  const [selectedConstraint, setSelectedConstraint] = useState<ValidationConstraint | null>(null);
  
  // Dialog state
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [constraintDialogOpen, setConstraintDialogOpen] = useState(false);
  const [confirmDeleteDialogOpen, setConfirmDeleteDialogOpen] = useState(false);
  const [deleteItemType, setDeleteItemType] = useState<'rule' | 'category' | 'constraint'>('rule');
  const [deleteItemId, setDeleteItemId] = useState<string>('');
  
  // Loading and error states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // New rule form state
  const [newRule, setNewRule] = useState<Partial<ComplianceRule>>({
    fieldKey: '',
    displayName: '',
    description: '',
    fieldType: 'text',
    isRequired: false,
    validationPattern: '',
    validationMessage: '',
    exampleValue: '',
    transformFunction: '',
    isActive: true,
    priority: 0,
    categoryId: '',
    metadata: {}
  });
  
  // New category form state
  const [newCategory, setNewCategory] = useState<Partial<RuleCategory>>({
    name: '',
    description: '',
    priority: 0,
    isActive: true
  });
  
  // New constraint form state
  const [newConstraint, setNewConstraint] = useState<Partial<ValidationConstraint>>({
    ruleId: '',
    constraintType: 'pattern',
    constraintValue: '',
    validationLevel: 'error',
    errorMessage: '',
    isActive: true,
    type: 'pattern',
    severity: 'non-compliant',
    isEnabled: true,
    metadata: {}
  });
  
  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);
  
  // Handle tab change
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
  // Load data from the database
  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Make sure rules are initialized
      await ruleLoader.initializeRules();
      
      // Load rules and categories
      const rulesData = await ruleRepository.getAllRules();
      const categoriesData = await ruleRepository.getAllCategories();
      
      // Load constraints for each rule
      const constraintsData: Record<string, ValidationConstraint[]> = {};
      for (const rule of rulesData) {
        constraintsData[rule.id] = await ruleRepository.getConstraintsByRuleId(rule.id);
      }
      
      // Sort rules by category and priority
      rulesData.sort((a, b) => {
        if (a.categoryId !== b.categoryId) {
          return a.categoryId.localeCompare(b.categoryId);
        }
        return a.priority - b.priority;
      });
      
      // Sort categories by priority
      categoriesData.sort((a, b) => a.priority - b.priority);
      
      // Update state
      setRules(rulesData);
      setCategories(categoriesData);
      setConstraints(constraintsData);
      
      setIsLoading(false);
      setSuccess('Data loaded successfully');
    } catch (err) {
      console.error('Error loading rules data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error loading data');
      setIsLoading(false);
    }
  };
  
  // Open rule dialog for creating/editing
  const openRuleDialog = (rule?: ComplianceRule) => {
    if (rule) {
      setNewRule({ ...rule });
      setSelectedRule(rule);
    } else {
      setNewRule({
        fieldKey: '',
        displayName: '',
        description: '',
        fieldType: 'text',
        isRequired: false,
        validationPattern: '',
        validationMessage: '',
        exampleValue: '',
        transformFunction: '',
        isActive: true,
        priority: 0,
        categoryId: categories.length > 0 ? categories[0].id : '',
        metadata: {}
      });
      setSelectedRule(null);
    }
    setRuleDialogOpen(true);
  };
  
  // Open category dialog for creating/editing
  const openCategoryDialog = (category?: RuleCategory) => {
    if (category) {
      setNewCategory({ ...category });
      setSelectedCategory(category);
    } else {
      setNewCategory({
        name: '',
        description: '',
        priority: 0,
        isActive: true
      });
      setSelectedCategory(null);
    }
    setCategoryDialogOpen(true);
  };
  
  // Open constraint dialog for creating/editing
  const openConstraintDialog = (ruleId: string, constraint?: ValidationConstraint) => {
    if (constraint) {
      setNewConstraint({ ...constraint });
      setSelectedConstraint(constraint);
    } else {
      setNewConstraint({
        ruleId,
        constraintType: 'pattern',
        constraintValue: '',
        validationLevel: 'error',
        errorMessage: '',
        isActive: true,
        type: 'pattern',
        severity: 'non-compliant',
        isEnabled: true,
        metadata: {}
      });
      setSelectedConstraint(null);
    }
    setConstraintDialogOpen(true);
  };
  
  // Open delete confirmation dialog
  const openDeleteDialog = (type: 'rule' | 'category' | 'constraint', id: string) => {
    setDeleteItemType(type);
    setDeleteItemId(id);
    setConfirmDeleteDialogOpen(true);
  };
  
  // Handle rule form change
  const handleRuleChange = (field: keyof ComplianceRule, value: any) => {
    setNewRule(prev => ({ ...prev, [field]: value }));
  };
  
  // Handle category form change
  const handleCategoryChange = (field: keyof RuleCategory, value: any) => {
    setNewCategory(prev => ({ ...prev, [field]: value }));
  };
  
  // Handle constraint form change
  const handleConstraintChange = (field: keyof ValidationConstraint, value: any) => {
    setNewConstraint(prev => ({ ...prev, [field]: value }));
  };
  
  // Save a rule
  const saveRule = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      if (!newRule.fieldKey || !newRule.displayName || !newRule.categoryId) {
        throw new Error('Field Key, Display Name, and Category are required');
      }
      
      let savedRule: ComplianceRule;
      
      if (selectedRule) {
        // Update existing rule
        savedRule = await ruleRepository.updateRule(selectedRule.id, newRule);
        setSuccess(`Rule "${savedRule.displayName}" updated successfully`);
      } else {
        // Create new rule
        savedRule = await ruleRepository.addRule(newRule);
        setSuccess(`Rule "${savedRule.displayName}" created successfully`);
      }
      
      // Refresh data
      await loadData();
      
      // Close dialog
      setRuleDialogOpen(false);
    } catch (err) {
      console.error('Error saving rule:', err);
      setError(err instanceof Error ? err.message : 'Error saving rule');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Save a category
  const saveCategory = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      if (!newCategory.name) {
        throw new Error('Category Name is required');
      }
      
      let savedCategory: RuleCategory;
      
      if (selectedCategory) {
        // Update existing category
        savedCategory = await ruleRepository.updateCategory(selectedCategory.id, newCategory);
        setSuccess(`Category "${savedCategory.name}" updated successfully`);
      } else {
        // Create new category
        savedCategory = await ruleRepository.addCategory(newCategory);
        setSuccess(`Category "${savedCategory.name}" created successfully`);
      }
      
      // Refresh data
      await loadData();
      
      // Close dialog
      setCategoryDialogOpen(false);
    } catch (err) {
      console.error('Error saving category:', err);
      setError(err instanceof Error ? err.message : 'Error saving category');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Save a constraint
  const saveConstraint = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      if (!newConstraint.ruleId || !newConstraint.constraintType || !newConstraint.constraintValue) {
        throw new Error('Rule ID, constraint type, and constraint value are required');
      }
      
      // Ensure enhanced fields are synced with legacy fields
      const enhancedConstraint = {
        ...newConstraint,
        type: newConstraint.type || newConstraint.constraintType,
        message: newConstraint.message || newConstraint.errorMessage,
        pattern: newConstraint.pattern || (newConstraint.constraintType === 'pattern' ? newConstraint.constraintValue : undefined),
        minValue: newConstraint.constraintType === 'min' ? parseFloat(newConstraint.constraintValue) : newConstraint.minValue,
        maxValue: newConstraint.constraintType === 'max' ? parseFloat(newConstraint.constraintValue) : newConstraint.maxValue,
        severity: newConstraint.severity || (newConstraint.validationLevel === 'error' ? 'non-compliant' : 'warning'),
        isEnabled: newConstraint.isEnabled ?? newConstraint.isActive
      };
      
      let savedConstraint: ValidationConstraint;
      
      if (selectedConstraint) {
        // Update existing constraint
        savedConstraint = await ruleRepository.updateConstraint(selectedConstraint.id, enhancedConstraint);
        setSuccess('Constraint updated successfully');
      } else {
        // Create new constraint
        savedConstraint = await ruleRepository.addConstraint(enhancedConstraint);
        setSuccess('Constraint created successfully');
      }
      
      // Refresh data
      await loadData();
      
      // Close dialog
      setConstraintDialogOpen(false);
    } catch (err) {
      console.error('Error saving constraint:', err);
      setError(err instanceof Error ? err.message : 'Error saving constraint');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Delete an item
  const deleteItem = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      switch (deleteItemType) {
        case 'rule':
          await ruleRepository.deleteRule(deleteItemId);
          setSuccess('Rule deleted successfully');
          break;
        case 'category':
          await ruleRepository.deleteCategory(deleteItemId);
          setSuccess('Category deleted successfully');
          break;
        case 'constraint':
          await ruleRepository.deleteConstraint(deleteItemId);
          setSuccess('Constraint deleted successfully');
          break;
      }
      
      // Refresh data
      await loadData();
      
      // Close dialog
      setConfirmDeleteDialogOpen(false);
    } catch (err) {
      console.error('Error deleting item:', err);
      setError(err instanceof Error ? err.message : 'Error deleting item');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Get category name by ID
  const getCategoryName = (categoryId: string): string => {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.name : 'Unknown Category';
  };
  
  // Handle sync completion
  const handleSyncComplete = () => {
    setSuccess('Synchronization completed successfully');
    // Reload data after sync
    loadData();
  };
  
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Compliance Rules Manager
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage compliance rules, categories, and validation constraints for the format converter.
        </Typography>
      </Box>
      
      {/* Error and success messages */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}
      
      {/* Loading indicator */}
      {isLoading && (
        <Box display="flex" alignItems="center" sx={{ mb: 2 }}>
          <CircularProgress size={24} sx={{ mr: 2 }} />
          <Typography>Processing...</Typography>
        </Box>
      )}
      
      {/* Sync Regulations Component */}
      <SyncRegulations onSyncComplete={handleSyncComplete} />
      
      {/* Schedule Configuration */}
      <Box sx={{ mb: 3 }}>
        <SyncScheduleConfig onConfigUpdate={loadData} />
      </Box>
      
      {/* Rule Database Maintenance */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Rule Database Maintenance
        </Typography>
        <Paper sx={{ p: 2 }}>
          <Typography variant="body1" paragraph>
            If you're experiencing issues with missing rule definitions or need to reset the rules database to its default state, 
            you can use the tool below. This will reset all rules to their default values and create any missing rule definitions.
          </Typography>
          <ReinitializeRules />
        </Paper>
      </Box>
      
      {/* Action buttons */}
      <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
        <Button
          variant="contained"
          startIcon={<Refresh />}
          onClick={loadData}
          disabled={isLoading}
        >
          Refresh Data
        </Button>
      </Box>
      
      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="Rules" id="rule-tab-0" aria-controls="rule-tabpanel-0" />
          <Tab label="Categories" id="rule-tab-1" aria-controls="rule-tabpanel-1" />
        </Tabs>
        
        {/* Rules Tab */}
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<Add />}
              onClick={() => openRuleDialog()}
            >
              Add New Rule
            </Button>
          </Box>
          
          {categories.map(category => (
            <Accordion key={category.id} sx={{ mb: 2 }}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                  <Typography variant="h6">{category.name}</Typography>
                  <Chip 
                    label={category.isActive ? 'Active' : 'Inactive'} 
                    color={category.isActive ? 'success' : 'error'}
                    size="small"
                    sx={{ ml: 2 }}
                  />
                  <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>
                    {rules.filter(r => r.categoryId === category.id).length} rules
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  {rules
                    .filter(rule => rule.categoryId === category.id)
                    .sort((a, b) => a.priority - b.priority)
                    .map(rule => (
                      <Grid item xs={12} key={rule.id}>
                        <Paper elevation={2} sx={{ p: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <Typography variant="h6" sx={{ flexGrow: 1 }}>
                              {rule.displayName}
                              {rule.isRequired && (
                                <Chip 
                                  label="Required" 
                                  color="primary" 
                                  size="small"
                                  sx={{ ml: 1 }}
                                />
                              )}
                            </Typography>
                            
                            <Chip 
                              label={rule.fieldType}
                              variant="outlined" 
                              size="small"
                              sx={{ mr: 1 }}
                            />
                            
                            <Chip 
                              label={rule.isActive ? 'Active' : 'Inactive'} 
                              color={rule.isActive ? 'success' : 'error'}
                              size="small"
                              sx={{ mr: 1 }}
                            />
                            
                            <IconButton 
                              color="primary"
                              onClick={() => openRuleDialog(rule)}
                              size="small"
                            >
                              <Edit />
                            </IconButton>
                            
                            <IconButton 
                              color="error"
                              onClick={() => openDeleteDialog('rule', rule.id)}
                              size="small"
                            >
                              <Delete />
                            </IconButton>
                          </Box>
                          
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            <strong>Field Key:</strong> {rule.fieldKey}
                          </Typography>
                          
                          <Typography variant="body2" sx={{ mb: 1 }}>
                            {rule.description}
                          </Typography>
                          
                          <Divider sx={{ my: 1 }} />
                          
                          <Grid container spacing={2} sx={{ mt: 1 }}>
                            <Grid item xs={12} md={6}>
                              <Typography variant="body2">
                                <strong>Validation Pattern:</strong> {rule.validationPattern}
                              </Typography>
                            </Grid>
                            <Grid item xs={12} md={6}>
                              <Typography variant="body2">
                                <strong>Example:</strong> {rule.exampleValue}
                              </Typography>
                            </Grid>
                          </Grid>
                          
                          <Box sx={{ mt: 2 }}>
                            <Typography variant="subtitle2">Constraints:</Typography>
                            {constraints[rule.id]?.length > 0 ? (
                              <List dense>
                                {constraints[rule.id].map(constraint => (
                                  <ListItem 
                                    key={constraint.id}
                                    secondaryAction={
                                      <>
                                        <IconButton 
                                          edge="end" 
                                          aria-label="edit"
                                          onClick={() => openConstraintDialog(rule.id, constraint)}
                                          size="small"
                                        >
                                          <Edit />
                                        </IconButton>
                                        <IconButton 
                                          edge="end" 
                                          aria-label="delete"
                                          onClick={() => openDeleteDialog('constraint', constraint.id)}
                                          size="small"
                                        >
                                          <Delete />
                                        </IconButton>
                                      </>
                                    }
                                  >
                                    <ListItemText
                                      primary={`${constraint.constraintType}: ${constraint.constraintValue}`}
                                      secondary={constraint.errorMessage}
                                    />
                                    <Chip 
                                      label={constraint.validationLevel} 
                                      color={
                                        constraint.validationLevel === 'error' ? 'error' :
                                        constraint.validationLevel === 'warning' ? 'warning' : 'info'
                                      }
                                      size="small"
                                      sx={{ mr: 2 }}
                                    />
                                  </ListItem>
                                ))}
                              </List>
                            ) : (
                              <Typography variant="body2" color="text.secondary">
                                No constraints defined
                              </Typography>
                            )}
                            <Button
                              startIcon={<Add />}
                              size="small"
                              onClick={() => openConstraintDialog(rule.id)}
                              sx={{ mt: 1 }}
                            >
                              Add Constraint
                            </Button>
                          </Box>
                        </Paper>
                      </Grid>
                    ))}
                </Grid>
                
                {rules.filter(r => r.categoryId === category.id).length === 0 && (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                    No rules in this category
                  </Typography>
                )}
              </AccordionDetails>
            </Accordion>
          ))}
          
          {categories.length === 0 && (
            <Alert severity="info">
              No categories found. Create a category first, then you can add rules.
            </Alert>
          )}
        </TabPanel>
        
        {/* Categories Tab */}
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<Add />}
              onClick={() => openCategoryDialog()}
            >
              Add New Category
            </Button>
          </Box>
          
          <Grid container spacing={2}>
            {categories.map(category => (
              <Grid item xs={12} sm={6} key={category.id}>
                <Paper sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Typography variant="h6" sx={{ flexGrow: 1 }}>
                      {category.name}
                    </Typography>
                    
                    <Chip 
                      label={category.isActive ? 'Active' : 'Inactive'} 
                      color={category.isActive ? 'success' : 'error'}
                      size="small"
                      sx={{ mr: 1 }}
                    />
                    
                    <IconButton 
                      color="primary"
                      onClick={() => openCategoryDialog(category)}
                      size="small"
                    >
                      <Edit />
                    </IconButton>
                    
                    <IconButton 
                      color="error"
                      onClick={() => openDeleteDialog('category', category.id)}
                      size="small"
                      disabled={rules.some(r => r.categoryId === category.id)}
                    >
                      <Delete />
                    </IconButton>
                  </Box>
                  
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    {category.description}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Priority: {category.priority}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>
                      {rules.filter(r => r.categoryId === category.id).length} rules
                    </Typography>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
          
          {categories.length === 0 && (
            <Alert severity="info">
              No categories found. Use the "Add New Category" button to create one.
            </Alert>
          )}
        </TabPanel>
      </Paper>
      
      {/* Rule Dialog */}
      <Dialog open={ruleDialogOpen} onClose={() => setRuleDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedRule ? `Edit Rule: ${selectedRule.displayName}` : 'Create New Rule'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Field Key"
                value={newRule.fieldKey}
                onChange={e => handleRuleChange('fieldKey', e.target.value)}
                fullWidth
                required
                helperText="Used in code (e.g., 'trackingNumber')"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Display Name"
                value={newRule.displayName}
                onChange={e => handleRuleChange('displayName', e.target.value)}
                fullWidth
                required
                helperText="User-friendly name (e.g., 'Tracking Number')"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Description"
                value={newRule.description}
                onChange={e => handleRuleChange('description', e.target.value)}
                fullWidth
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={newRule.categoryId}
                  label="Category"
                  onChange={e => handleRuleChange('categoryId', e.target.value)}
                  required
                >
                  {categories.map(category => (
                    <MenuItem key={category.id} value={category.id}>
                      {category.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Field Type</InputLabel>
                <Select
                  value={newRule.fieldType}
                  label="Field Type"
                  onChange={e => handleRuleChange('fieldType', e.target.value)}
                >
                  {fieldTypeOptions.map(type => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Validation Pattern"
                value={newRule.validationPattern}
                onChange={e => handleRuleChange('validationPattern', e.target.value)}
                fullWidth
                helperText="Regular expression for validation"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Example Value"
                value={newRule.exampleValue}
                onChange={e => handleRuleChange('exampleValue', e.target.value)}
                fullWidth
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Validation Message"
                value={newRule.validationMessage}
                onChange={e => handleRuleChange('validationMessage', e.target.value)}
                fullWidth
                helperText="Message shown when validation fails"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Transform Function"
                value={newRule.transformFunction}
                onChange={e => handleRuleChange('transformFunction', e.target.value)}
                fullWidth
                multiline
                rows={3}
                helperText="JavaScript function body that transforms the input value"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label="Priority"
                type="number"
                value={newRule.priority}
                onChange={e => handleRuleChange('priority', parseInt(e.target.value) || 0)}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={newRule.isRequired}
                    onChange={e => handleRuleChange('isRequired', e.target.checked)}
                  />
                }
                label="Required Field"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={newRule.isActive}
                    onChange={e => handleRuleChange('isActive', e.target.checked)}
                  />
                }
                label="Active"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRuleDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={saveRule} 
            variant="contained" 
            startIcon={<Save />}
            disabled={isLoading}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Category Dialog */}
      <Dialog open={categoryDialogOpen} onClose={() => setCategoryDialogOpen(false)}>
        <DialogTitle>
          {selectedCategory ? `Edit Category: ${selectedCategory.name}` : 'Create New Category'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                label="Name"
                value={newCategory.name}
                onChange={e => handleCategoryChange('name', e.target.value)}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Description"
                value={newCategory.description}
                onChange={e => handleCategoryChange('description', e.target.value)}
                fullWidth
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Priority"
                type="number"
                value={newCategory.priority}
                onChange={e => handleCategoryChange('priority', parseInt(e.target.value) || 0)}
                fullWidth
                helperText="Lower values appear first"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={newCategory.isActive}
                    onChange={e => handleCategoryChange('isActive', e.target.checked)}
                  />
                }
                label="Active"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCategoryDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={saveCategory} 
            variant="contained" 
            startIcon={<Save />}
            disabled={isLoading}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Constraint Dialog */}
      <Dialog open={constraintDialogOpen} onClose={() => setConstraintDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedConstraint ? 'Edit Constraint' : 'Add New Constraint'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Constraint Type</InputLabel>
                <Select
                  value={newConstraint.constraintType}
                  label="Constraint Type"
                  onChange={e => handleConstraintChange('constraintType', e.target.value)}
                  required
                >
                  <MenuItem value="pattern">Pattern</MenuItem>
                  <MenuItem value="min">Minimum Value</MenuItem>
                  <MenuItem value="max">Maximum Value</MenuItem>
                  <MenuItem value="equal">Equal To</MenuItem>
                  <MenuItem value="custom">Custom</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Validation Level</InputLabel>
                <Select
                  value={newConstraint.validationLevel}
                  label="Validation Level"
                  onChange={e => handleConstraintChange('validationLevel', e.target.value)}
                  required
                >
                  {validationLevelOptions.map(level => (
                    <MenuItem key={level} value={level}>
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Severity</InputLabel>
                <Select
                  value={newConstraint.severity || 'warning'}
                  label="Severity"
                  onChange={e => handleConstraintChange('severity', e.target.value)}
                  required
                >
                  <MenuItem value="compliant">Compliant</MenuItem>
                  <MenuItem value="non-compliant">Non-Compliant</MenuItem>
                  <MenuItem value="warning">Warning</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Constraint Value"
                value={newConstraint.constraintValue}
                onChange={e => handleConstraintChange('constraintValue', e.target.value)}
                fullWidth
                required
                helperText={
                  newConstraint.constraintType === 'pattern' ? 'Regular expression pattern' :
                  newConstraint.constraintType === 'min' ? 'Minimum value' :
                  newConstraint.constraintType === 'max' ? 'Maximum value' :
                  newConstraint.constraintType === 'equal' ? 'Value to compare against' :
                  'Custom validation'
                }
              />
            </Grid>
            
            {newConstraint.constraintType === 'min' && (
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Minimum Value"
                  type="number"
                  value={newConstraint.minValue || ''}
                  onChange={e => handleConstraintChange('minValue', parseFloat(e.target.value))}
                  fullWidth
                  helperText="Numeric minimum value (for validation)"
                />
              </Grid>
            )}
            
            {newConstraint.constraintType === 'max' && (
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Maximum Value"
                  type="number"
                  value={newConstraint.maxValue || ''}
                  onChange={e => handleConstraintChange('maxValue', parseFloat(e.target.value))}
                  fullWidth
                  helperText="Numeric maximum value (for validation)"
                />
              </Grid>
            )}
            
            <Grid item xs={12}>
              <TextField
                label="Error Message"
                value={newConstraint.errorMessage}
                onChange={e => handleConstraintChange('errorMessage', e.target.value)}
                fullWidth
                multiline
                rows={2}
                required
                helperText="Message shown when validation fails"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={newConstraint.isActive}
                    onChange={e => handleConstraintChange('isActive', e.target.checked)}
                  />
                }
                label="Active"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConstraintDialogOpen(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={saveConstraint}
            disabled={isLoading}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={confirmDeleteDialogOpen} onClose={() => setConfirmDeleteDialogOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this {deleteItemType}? This action cannot be undone.
          </Typography>
          {deleteItemType === 'category' && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              Categories with rules cannot be deleted. You must first delete or reassign all rules in this category.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDeleteDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={deleteItem} 
            color="error" 
            variant="contained" 
            startIcon={<Delete />}
            disabled={isLoading || (deleteItemType === 'category' && rules.some(r => r.categoryId === deleteItemId))}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default RuleManager; 