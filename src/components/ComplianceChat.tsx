import React, { useState, useRef, useEffect } from 'react';
import { 
  Box, 
  Paper, 
  TextField, 
  Button, 
  Typography, 
  List, 
  ListItem, 
  IconButton,
  Divider,
  Avatar,
  Chip,
  Tooltip,
  CircularProgress,
  Fab,
  Collapse,
  Zoom,
  Card,
  CardContent,
  CardActions,
  Alert,
  Badge,
  AppBar,
  Toolbar,
  Container,
  Grid,
  Drawer,
  useTheme,
  useMediaQuery,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon
} from '@mui/material';
import { 
  Send as SendIcon, 
  Chat as ChatIcon, 
  Close as CloseIcon,
  QuestionAnswer as QuestionIcon,
  SmartToy as BotIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  ReportProblem as ReportIcon,
  Build as BuildIcon,
  Lightbulb as LightbulbIcon,
  ContentCopy as CopyIcon,
  ArrowBack as ArrowBackIcon,
  Menu as MenuIcon,
  MoreVert as MoreVertIcon,
  Help as HelpIcon,
  Settings as SettingsIcon,
  Delete as DeleteIcon,
  RestartAlt as RestartAltIcon
} from '@mui/icons-material';
import { ChatMessage, complianceChatService, ResolutionSuggestion } from '../services/complianceChatService';
import { ComplianceResult } from '../services/types';
import { FormattedData } from '../services/formatConverterDb';

interface ComplianceChatProps {
  formattedData?: FormattedData;
  complianceResults?: ComplianceResult[];
  nonCompliantCount?: number;
  warningCount?: number;
}

const ComplianceChat: React.FC<ComplianceChatProps> = ({ 
  formattedData, 
  complianceResults,
  nonCompliantCount = 0,
  warningCount = 0
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [resolutionSuggestions, setResolutionSuggestions] = useState<ResolutionSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [fullscreenMode, setFullscreenMode] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [speedDialOpen, setSpeedDialOpen] = useState(false);
  const [initialSuggestions] = useState([
    "How do I fix all the compliance issues?",
    "Why was my shipment flagged?",
    "What's wrong with the commodity code?",
    "Help me fix the destination country issue",
    "What documents do I need for this shipment?"
  ]);
  
  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const inputRef = useRef<null | HTMLInputElement>(null);
  
  // Initialize chat service when data is available
  useEffect(() => {
    if (formattedData && complianceResults) {
      complianceChatService.setComplianceContext(formattedData, complianceResults);
      
      // Add a slight delay to get resolution suggestions
      setTimeout(() => {
        try {
          const suggestions = complianceChatService.getResolutionSuggestions();
          setResolutionSuggestions(suggestions || []);
        } catch (error) {
          console.error('Error getting resolution suggestions:', error);
          setResolutionSuggestions([]);
        }
      }, 500);
    }
  }, [formattedData, complianceResults]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
    
    // Focus input when chat is opened
    if ((isOpen || fullscreenMode) && inputRef.current) {
      inputRef.current.focus();
    }
  }, [messages, isOpen, fullscreenMode]);
  
  // Clear copy success message after timeout
  useEffect(() => {
    if (copySuccess) {
      const timer = setTimeout(() => {
        setCopySuccess(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [copySuccess]);

  // Reset chat session
  const handleResetChat = () => {
    if (window.confirm('Are you sure you want to clear the current conversation?')) {
      complianceChatService.clearChatHistory();
      setMessages([]);
      handleToggleChat();
    }
  };
  
  const handleSendMessage = async () => {
    if (!message.trim()) return;
    
    setIsLoading(true);
    try {
      // Send message and get response
      const response = await complianceChatService.sendMessage(message);
      
      // Update messages from service
      setMessages(complianceChatService.getChatHistory());
      setMessage('');
      
      // Never hide suggestions - per requirement
      // if (showSuggestions) {
      //   setShowSuggestions(false);
      // }
    } catch (error) {
      console.error('Error sending message:', error);
      // Add error message
      setMessages([
        ...messages,
        {
          id: 'error-' + new Date().getTime(),
          role: 'assistant',
          content: 'Sorry, I encountered an error processing your request. Please try again.',
          timestamp: new Date()
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  const handleSuggestionClick = (suggestion: string) => {
    setMessage(suggestion);
    setTimeout(() => {
      handleSendMessage();
    }, 100);
  };
  
  const handleToggleChat = () => {
    setIsOpen(!isOpen);
    
    // If opening for the first time and no messages, add welcome message
    if ((!isOpen && messages.length === 0) || (!fullscreenMode && messages.length === 0)) {
      const welcomeMessage: ChatMessage = {
        id: 'welcome',
        role: 'assistant',
        content: `Hello! I'm your compliance assistant powered by Gemini AI.

I can help you resolve the ${nonCompliantCount + warningCount} compliance issues detected in your shipment. I can provide:
- Step-by-step instructions to fix each issue
- Explanations of regulatory requirements
- Guidance on correct formats and values
- Help with cross-border shipping regulations

What specific issue would you like help with first?`,
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
    }
  };

  const toggleFullscreenMode = () => {
    setFullscreenMode(!fullscreenMode);
    setIsOpen(false);
    
    // If opening fullscreen mode for the first time and no messages, add welcome message
    if (!fullscreenMode && messages.length === 0) {
      handleToggleChat();
    }
  };

  const toggleDrawer = () => {
    setIsDrawerOpen(!isDrawerOpen);
  };
  
  const renderMessageContent = (content: string) => {
    if (!content) return null;
    
    // Split content by line breaks and apply formatting
    return content.split('\n').map((line, i) => (
      <React.Fragment key={`line-${i}`}>
        {line}
        {i < content.split('\n').length - 1 && <br />}
      </React.Fragment>
    ));
  };
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopySuccess(text);
      console.log('Copied to clipboard:', text);
    }).catch(err => {
      console.error('Failed to copy:', err);
    });
  };
  
  const getStatusIcon = (status: 'compliant' | 'non-compliant' | 'warning') => {
    switch (status) {
      case 'compliant':
        return <CheckCircleIcon color="success" />;
      case 'non-compliant':
        return <ErrorIcon color="error" />;
      case 'warning':
        return <WarningIcon color="warning" />;
      default:
        return <InfoIcon />;
    }
  };

  // Render the resolution suggestions cards
  const renderResolutionSuggestions = () => (
    <Box sx={{ mb: 3 }}>
      <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
        <LightbulbIcon fontSize="small" sx={{ mr: 0.5, color: 'warning.main' }} />
        Recommended Fixes:
      </Typography>
      {resolutionSuggestions.map((suggestion, index) => (
        <Card key={`suggestion-${index}-${suggestion.field}`} variant="outlined" sx={{ mb: 1, bgcolor: 'rgba(255, 236, 179, 0.2)' }}>
          <CardContent sx={{ py: 1, px: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle2" color="error.main">
                {suggestion.field || 'Unknown Field'}
              </Typography>
              <Chip 
                size="small" 
                color="error" 
                label="Fix Required"
                icon={<BuildIcon fontSize="small" />}
              />
            </Box>
            <Typography variant="caption" component="div" color="text.secondary" sx={{ mb: 1 }}>
              Current: {suggestion.currentValue || 'Missing'}
            </Typography>
            <Typography variant="body2" component="div" color="success.main" sx={{ 
              display: 'flex', 
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span><strong>Suggested:</strong> {suggestion.suggestedValue || 'Proper value needed'}</span>
              <Tooltip 
                title={copySuccess === suggestion.suggestedValue ? "Copied!" : "Copy to clipboard"} 
                arrow
              >
                <IconButton 
                  size="small" 
                  onClick={() => copyToClipboard(suggestion.suggestedValue || '')}
                  aria-label="copy suggestion"
                  color={copySuccess === suggestion.suggestedValue ? "success" : "default"}
                >
                  <CopyIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Typography>
          </CardContent>
          <CardActions sx={{ p: 0 }}>
            <Button 
              size="small" 
              fullWidth
              onClick={() => handleSuggestionClick(`How do I fix the ${suggestion.field} issue?`)}
              sx={{ textTransform: 'none' }}
            >
              Get detailed instructions
            </Button>
          </CardActions>
        </Card>
      ))}
    </Box>
  );

  // Render quick suggestion chips
  const renderQuickSuggestions = () => (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, my: 2 }}>
      {initialSuggestions.map((suggestion, index) => (
        <Chip 
          key={`initial-suggestion-${index}`}
          label={suggestion}
          onClick={() => handleSuggestionClick(suggestion)}
          color="primary"
          variant="outlined"
          sx={{ mb: 1 }}
        />
      ))}
    </Box>
  );

  // Render the chat messages
  const renderChatMessages = () => (
    <List sx={{ width: '100%', padding: 0 }}>
      {messages.map((msg) => (
        <ListItem
          key={`message-${msg.id}`}
          sx={{
            display: 'block',
            py: 2,
            px: 0,
            backgroundColor: msg.role === 'assistant' ? 'rgba(0, 0, 0, 0.02)' : 'transparent',
            borderBottom: '1px solid',
            borderColor: 'divider'
          }}
        >
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'flex-start',
            px: { xs: 2, md: 3 },
            maxWidth: '900px',
            mx: 'auto'
          }}>
            <Avatar 
              sx={{ 
                bgcolor: msg.role === 'assistant' ? 'primary.main' : 'grey.400',
                width: 36, 
                height: 36,
                mr: 2,
                mt: 0.5
              }}
            >
              {msg.role === 'assistant' ? <BotIcon /> : <QuestionIcon />}
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography 
                variant="subtitle2" 
                color="text.secondary" 
                sx={{ mb: 0.5 }}
              >
                {msg.role === 'assistant' ? 'Gemini Compliance Assistant' : 'You'}
              </Typography>
              <Typography 
                variant="body1" 
                sx={{ 
                  whiteSpace: 'pre-wrap',
                  '& code': {
                    backgroundColor: 'grey.100',
                    px: 1,
                    py: 0.5,
                    borderRadius: 1,
                    fontFamily: 'monospace'
                  }
                }}
              >
                {renderMessageContent(msg.content)}
              </Typography>
              {msg.role === 'assistant' && (
                <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>
                  Powered by Gemini AI
                </Typography>
              )}
            </Box>
          </Box>
        </ListItem>
      ))}
      <div ref={messagesEndRef} />
    </List>
  );

  // Render the fullscreen chat interface
  const renderFullscreenInterface = () => (
    <Box sx={{ 
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      bgcolor: 'background.default',
      zIndex: 1300,
      display: 'flex',
      flexDirection: 'column',
      height: '100vh'
    }}>
      <AppBar position="static" color="primary" elevation={0}>
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={toggleFullscreenMode}
            aria-label="back"
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1, ml: 2 }}>
            Gemini Compliance Assistant
          </Typography>
          <IconButton 
            color="inherit" 
            onClick={toggleDrawer}
            aria-label="toggle suggestions"
          >
            <MenuIcon />
          </IconButton>
          <IconButton 
            color="inherit" 
            onClick={handleResetChat}
            aria-label="reset chat"
          >
            <RestartAltIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'row', 
        flexGrow: 1, 
        overflow: 'hidden'
      }}>
        {/* Main chat area */}
        <Box sx={{ 
          display: 'flex',
          flexDirection: 'column',
          flexGrow: 1,
          height: '100%',
          overflow: 'hidden'
        }}>
          {/* Chat messages */}
          <Box sx={{ 
            flexGrow: 1, 
            overflowY: 'auto', 
            pb: 2 
          }}>
            {renderChatMessages()}
            
            {/* Always show suggestions after messages - both initial and after answers */}
            {messages.length > 0 && (
              <Box sx={{ maxWidth: '900px', mx: 'auto', px: { xs: 2, md: 3 }, mt: 2 }}>
                {renderQuickSuggestions()}
              </Box>
            )}
            
            {/* Critical issues summary */}
            {nonCompliantCount > 0 && messages.length === 1 && (
              <Box sx={{ maxWidth: '900px', mx: 'auto', px: { xs: 2, md: 3 }, mt: 2 }}>
                <Alert severity="error">
                  <Typography variant="subtitle2">
                    {nonCompliantCount} critical compliance {nonCompliantCount === 1 ? 'issue' : 'issues'} must be fixed
                  </Typography>
                  <Typography variant="body2">
                    Ask me how to resolve these issues to proceed with your shipment.
                  </Typography>
                </Alert>
              </Box>
            )}
          </Box>
          
          {/* Input area */}
          <Box sx={{ 
            p: 2, 
            borderTop: '1px solid',
            borderColor: 'divider',
            backgroundColor: 'background.paper'
          }}>
            <Box sx={{ 
              display: 'flex',
              maxWidth: '900px',
              mx: 'auto'
            }}>
              <TextField
                fullWidth
                placeholder="Ask about compliance issues..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                multiline
                maxRows={4}
                variant="outlined"
                inputRef={inputRef}
                disabled={isLoading}
                sx={{ 
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  }
                }}
              />
              <IconButton 
                color="primary" 
                onClick={handleSendMessage}
                disabled={!message.trim() || isLoading}
                sx={{ ml: 1, alignSelf: 'flex-end' }}
                aria-label="send message"
              >
                {isLoading ? 
                  <CircularProgress size={24} /> : 
                  <SendIcon fontSize="large" />
                }
              </IconButton>
            </Box>
          </Box>
        </Box>
        
        {/* Drawer with suggestions */}
        <Drawer
          variant="temporary"
          anchor="right"
          open={isDrawerOpen}
          onClose={toggleDrawer}
          sx={{
            width: 320,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: 320,
            },
          }}
        >
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Compliance Issues
            </Typography>
            <Divider sx={{ mb: 2 }} />
            {resolutionSuggestions && resolutionSuggestions.length > 0 ? (
              renderResolutionSuggestions()
            ) : (
              <Typography variant="body2" color="text.secondary">
                No specific issues to display.
              </Typography>
            )}
          </Box>
        </Drawer>
      </Box>
    </Box>
  );
  
  return (
    <>
      {/* Enhanced chat button */}
      {!fullscreenMode && (
        <Box sx={{ position: 'fixed', bottom: 20, right: 20, zIndex: 1000 }}>
          <SpeedDial
            ariaLabel="Compliance Assistant"
            icon={
              <Badge 
                badgeContent={nonCompliantCount + warningCount} 
                color="error"
                invisible={nonCompliantCount + warningCount === 0}
              >
                <SpeedDialIcon icon={<BotIcon />} openIcon={<CloseIcon />} />
              </Badge>
            }
            onClose={() => setSpeedDialOpen(false)}
            onOpen={() => setSpeedDialOpen(true)}
            open={speedDialOpen}
            direction="up"
            FabProps={{
              color: 'primary',
              size: 'large',
              sx: {
                boxShadow: 3,
                '&:hover': {
                  transform: 'scale(1.05)',
                  transition: 'transform 0.2s',
                }
              }
            }}
          >
            <SpeedDialAction
              icon={<ChatIcon />}
              tooltipTitle="Open Chat Assistant"
              onClick={toggleFullscreenMode}
            />
            <SpeedDialAction
              icon={<HelpIcon />}
              tooltipTitle="View Compliance Issues"
              onClick={() => {
                setSpeedDialOpen(false);
                toggleFullscreenMode();
                setTimeout(() => {
                  setIsDrawerOpen(true);
                }, 300);
              }}
            />
            {messages.length > 0 && (
              <SpeedDialAction
                icon={<RestartAltIcon />}
                tooltipTitle="Reset Chat"
                onClick={() => {
                  setSpeedDialOpen(false);
                  handleResetChat();
                }}
              />
            )}
          </SpeedDial>
          
          {nonCompliantCount > 0 && (
            <Box
              sx={{
                position: 'absolute',
                bottom: -40,
                left: '50%',
                transform: 'translateX(-50%)',
                whiteSpace: 'nowrap',
                zIndex: 1
              }}
            >
              <Chip
                color="error"
                variant="filled"
                icon={<ErrorIcon />}
                label={`${nonCompliantCount} compliance issue${nonCompliantCount !== 1 ? 's' : ''} to fix`}
                onClick={toggleFullscreenMode}
                sx={{ 
                  fontWeight: 'bold',
                  boxShadow: 1,
                  cursor: 'pointer',
                  '&:hover': {
                    bgcolor: 'error.dark',
                  }
                }}
              />
            </Box>
          )}
        </Box>
      )}
      
      {/* Fullscreen chat interface */}
      {fullscreenMode && renderFullscreenInterface()}
      
      {/* Original popup chat window - now hidden in favor of fullscreen mode */}
      {false && isOpen && (
        <Paper
          elevation={3}
          sx={{
            position: 'fixed',
            bottom: 20,
            right: 20,
            width: 400,
            height: 600,
            display: 'flex',
            flexDirection: 'column',
            zIndex: 1000,
            overflow: 'hidden',
            borderRadius: 2
          }}
        >
          {/* Hidden content */}
        </Paper>
      )}
    </>
  );
};

export default ComplianceChat; 