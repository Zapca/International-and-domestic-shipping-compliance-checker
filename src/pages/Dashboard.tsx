import React, { useState } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Paper, 
  Tabs, 
  Tab, 
  Grid, 
  Card, 
  CardContent, 
  Button, 
  Chip, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemIcon,
  Divider,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  CardActions,
  AppBar,
  CssBaseline
} from '@mui/material';
import { 
  Inventory, 
  LocalShipping, 
  Notifications, 
  CheckCircle, 
  Schedule,
  History,
  Settings,
  Visibility,
  GetApp,
  VerifiedUser,
  Assessment,
  Warning,
  Description,
  FileCopy,
  Person
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

// Drawer width constant
const drawerWidth = 240;

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
      id={`dashboard-tabpanel-${index}`}
      aria-labelledby={`dashboard-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const Dashboard: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const { currentUser } = useAuth();

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Mock data for shipments
  const activeShipments = [
    { 
      id: 'SHP-1234567', 
      origin: 'New York, USA', 
      destination: 'London, UK', 
      status: 'In Transit', 
      estimatedDelivery: '2023-03-15',
      type: 'Air Freight'
    },
    { 
      id: 'SHP-7654321', 
      origin: 'Shanghai, China', 
      destination: 'Los Angeles, USA', 
      status: 'Customs Clearance', 
      estimatedDelivery: '2023-03-18',
      type: 'Ocean Freight'
    },
    { 
      id: 'SHP-9876543', 
      origin: 'Berlin, Germany', 
      destination: 'Paris, France', 
      status: 'Out for Delivery', 
      estimatedDelivery: '2023-03-10',
      type: 'Road Transport'
    }
  ];

  // Mock data for shipment history
  const shipmentHistory = [
    { 
      id: 'SHP-5432167', 
      origin: 'Tokyo, Japan', 
      destination: 'Sydney, Australia', 
      status: 'Delivered', 
      deliveryDate: '2023-02-28',
      type: 'Air Freight'
    },
    { 
      id: 'SHP-8765432', 
      origin: 'Mumbai, India', 
      destination: 'Dubai, UAE', 
      status: 'Delivered', 
      deliveryDate: '2023-02-15',
      type: 'Ocean Freight'
    },
    { 
      id: 'SHP-2345678', 
      origin: 'Toronto, Canada', 
      destination: 'Chicago, USA', 
      status: 'Delivered', 
      deliveryDate: '2023-02-10',
      type: 'Road Transport'
    }
  ];

  // Mock data for notifications
  const notifications = [
    { 
      id: 1, 
      message: 'Shipment SHP-1234567 has departed from New York', 
      time: '2 hours ago', 
      read: false 
    },
    { 
      id: 2, 
      message: 'Customs clearance completed for SHP-7654321', 
      time: '5 hours ago', 
      read: false 
    },
    { 
      id: 3, 
      message: 'Shipment SHP-9876543 will be delivered today', 
      time: '8 hours ago', 
      read: true 
    },
    { 
      id: 4, 
      message: 'New invoice available for payment', 
      time: '1 day ago', 
      read: true 
    }
  ];

  const getStatusChip = (status: string) => {
    switch(status) {
      case 'In Transit':
        return <Chip icon={<LocalShipping />} label={status} color="primary" size="small" />;
      case 'Customs Clearance':
        return <Chip icon={<Schedule />} label={status} color="warning" size="small" />;
      case 'Out for Delivery':
        return <Chip icon={<LocalShipping />} label={status} color="info" size="small" />;
      case 'Delivered':
        return <Chip icon={<CheckCircle />} label={status} color="success" size="small" />;
      default:
        return <Chip label={status} size="small" />;
    }
  };

  // Dashboard items
  const menuItems = [
    { 
      text: 'Compliance Overview', 
      icon: <VerifiedUser style={{ color: '#ff9800' }} />, 
      path: '/dashboard/overview' 
    },
    { 
      text: 'Compliance Reports', 
      icon: <Assessment style={{ color: '#ff9800' }} />, 
      path: '/dashboard/reports' 
    },
    { 
      text: 'Compliance Checker', 
      icon: <Inventory style={{ color: '#ff9800' }} />, 
      path: '/compliance-checker' 
    },
    { 
      text: 'Saved Documents', 
      icon: <FileCopy style={{ color: '#ff9800' }} />, 
      path: '/dashboard/documents' 
    },
    { 
      text: 'Settings', 
      icon: <Settings style={{ color: '#ff9800' }} />, 
      path: '/dashboard/settings' 
    },
    { 
      text: 'Account', 
      icon: <Person style={{ color: '#ff9800' }} />, 
      path: '/dashboard/account' 
    }
  ];
  
  const statCards = [
    { 
      title: 'Compliance Rate', 
      value: '94%', 
      icon: <CheckCircle color="success" />, 
      change: '+2.5%', 
      changeDirection: 'up' 
    },
    { 
      title: 'Documents Processed', 
      value: '1,284', 
      icon: <Description style={{ color: '#ff9800' }} />, 
      change: '+12%', 
      changeDirection: 'up' 
    },
    { 
      title: 'Compliance Issues', 
      value: '24', 
      icon: <Warning color="error" />, 
      change: '-5%', 
      changeDirection: 'down' 
    },
    { 
      title: 'Saved Shipping Templates', 
      value: '36', 
      icon: <LocalShipping style={{ color: '#ff9800' }} />, 
      change: '+4', 
      changeDirection: 'up' 
    }
  ];

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          bgcolor: '#ff9800',
        }}
      >
        {/* ... existing code ... */}
      </AppBar>
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Grid container spacing={3}>
          {/* Welcome Card */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3, display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h4" component="h1">
                  Welcome, {currentUser?.displayName || 'User'}
                </Typography>
                <Button variant="contained" color="primary" startIcon={<Settings />}>
                  Account Settings
                </Button>
              </Box>
              <Typography variant="body1" color="text.secondary">
                Manage your shipments, track deliveries, and view your logistics dashboard.
              </Typography>
            </Paper>
          </Grid>

          {/* Summary Cards */}
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <LocalShipping color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6" component="div">
                    Active Shipments
                  </Typography>
                </Box>
                <Typography variant="h3" component="div" sx={{ fontWeight: 'bold', mb: 1 }}>
                  {activeShipments.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Shipments currently in progress
                </Typography>
              </CardContent>
              <CardActions>
                <Button size="small" color="primary">View All</Button>
              </CardActions>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <History color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6" component="div">
                    Completed Shipments
                  </Typography>
                </Box>
                <Typography variant="h3" component="div" sx={{ fontWeight: 'bold', mb: 1 }}>
                  {shipmentHistory.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Successfully delivered shipments
                </Typography>
              </CardContent>
              <CardActions>
                <Button size="small" color="primary">View History</Button>
              </CardActions>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Notifications color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6" component="div">
                    Notifications
                  </Typography>
                </Box>
                <Typography variant="h3" component="div" sx={{ fontWeight: 'bold', mb: 1 }}>
                  {notifications.filter(n => !n.read).length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Unread notifications
                </Typography>
              </CardContent>
              <CardActions>
                <Button size="small" color="primary">View All</Button>
              </CardActions>
            </Card>
          </Grid>

          <Grid item xs={12} md={6} lg={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Recent AI Analysis
                </Typography>
                <Typography variant="h3" component="div" sx={{ mb: 1 }}>
                  5
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Documents analyzed with Gemini Vision
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Main Content Tabs */}
          <Grid item xs={12}>
            <Paper sx={{ width: '100%' }}>
              <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs 
                  value={tabValue} 
                  onChange={handleTabChange} 
                  aria-label="dashboard tabs"
                  variant="scrollable"
                  scrollButtons="auto"
                >
                  <Tab label="Active Shipments" icon={<LocalShipping />} iconPosition="start" />
                  <Tab label="Shipment History" icon={<History />} iconPosition="start" />
                  <Tab label="Notifications" icon={<Notifications />} iconPosition="start" />
                  <Tab label="Account" icon={<Settings />} iconPosition="start" />
                  <Tab 
                    label="AI Analysis" 
                    icon={<Schedule />} 
                    iconPosition="start" 
                    value="4" 
                  />
                </Tabs>
              </Box>

              {/* Active Shipments Tab */}
              <TabPanel value={tabValue} index={0}>
                <Typography variant="h6" gutterBottom component="div">
                  Current Shipments
                </Typography>
                <TableContainer component={Paper} elevation={0} variant="outlined">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Tracking Number</TableCell>
                        <TableCell>Route</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>ETA</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {activeShipments.map((shipment) => (
                        <TableRow key={shipment.id}>
                          <TableCell>{shipment.id}</TableCell>
                          <TableCell>{shipment.origin} → {shipment.destination}</TableCell>
                          <TableCell>
                            {getStatusChip(shipment.status)}
                          </TableCell>
                          <TableCell>{shipment.estimatedDelivery}</TableCell>
                          <TableCell>
                            <Button 
                              size="small" 
                              variant="outlined" 
                              color="primary"
                              startIcon={<Visibility />}
                            >
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </TabPanel>

              {/* Shipment History Tab */}
              <TabPanel value={tabValue} index={1}>
                <Typography variant="h6" gutterBottom component="div">
                  Shipment History
                </Typography>
                <TableContainer>
                  <Table sx={{ minWidth: 650 }} aria-label="shipment history table">
                    <TableHead>
                      <TableRow>
                        <TableCell>Tracking ID</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Origin</TableCell>
                        <TableCell>Destination</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Delivery Date</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {shipmentHistory.map((shipment) => (
                        <TableRow key={shipment.id}>
                          <TableCell component="th" scope="row">
                            {shipment.id}
                          </TableCell>
                          <TableCell>{shipment.type}</TableCell>
                          <TableCell>{shipment.origin}</TableCell>
                          <TableCell>{shipment.destination}</TableCell>
                          <TableCell>{getStatusChip(shipment.status)}</TableCell>
                          <TableCell>{shipment.deliveryDate}</TableCell>
                          <TableCell>
                            <Button size="small" color="primary">Details</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </TabPanel>

              {/* Notifications Tab */}
              <TabPanel value={tabValue} index={2}>
                <Typography variant="h6" gutterBottom component="div">
                  Notifications
                </Typography>
                <List>
                  {notifications.map((notification) => (
                    <React.Fragment key={notification.id}>
                      <ListItem alignItems="flex-start" sx={{ bgcolor: notification.read ? 'transparent' : 'rgba(0, 0, 0, 0.04)' }}>
                        <ListItemIcon>
                          {notification.read ? <Notifications color="disabled" /> : <Notifications color="primary" />}
                        </ListItemIcon>
                        <ListItemText
                          primary={notification.message}
                          secondary={notification.time}
                        />
                      </ListItem>
                      <Divider component="li" />
                    </React.Fragment>
                  ))}
                </List>
              </TabPanel>

              {/* Account Tab */}
              <TabPanel value={tabValue} index={3}>
                <Typography variant="h6" gutterBottom component="div">
                  Account Information
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3 }}>
                      <Typography variant="subtitle1" gutterBottom>
                        Personal Details
                      </Typography>
                      <Divider sx={{ mb: 2 }} />
                      <Grid container spacing={2}>
                        <Grid item xs={4}>
                          <Typography variant="body2" color="text.secondary">
                            Name
                          </Typography>
                        </Grid>
                        <Grid item xs={8}>
                          <Typography variant="body1">
                            {currentUser?.displayName || 'Not provided'}
                          </Typography>
                        </Grid>
                        <Grid item xs={4}>
                          <Typography variant="body2" color="text.secondary">
                            Email
                          </Typography>
                        </Grid>
                        <Grid item xs={8}>
                          <Typography variant="body1">
                            {currentUser?.email || 'Not provided'}
                          </Typography>
                        </Grid>
                        <Grid item xs={4}>
                          <Typography variant="body2" color="text.secondary">
                            Phone
                          </Typography>
                        </Grid>
                        <Grid item xs={8}>
                          <Typography variant="body1">
                            {currentUser?.phoneNumber || 'Not provided'}
                          </Typography>
                        </Grid>
                      </Grid>
                      <Button variant="outlined" color="primary" sx={{ mt: 2 }}>
                        Edit Profile
                      </Button>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3 }}>
                      <Typography variant="subtitle1" gutterBottom>
                        Account Settings
                      </Typography>
                      <Divider sx={{ mb: 2 }} />
                      <List>
                        <ListItem>
                          <ListItemIcon>
                            <Settings />
                          </ListItemIcon>
                          <ListItemText primary="Change Password" />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon>
                            <Notifications />
                          </ListItemIcon>
                          <ListItemText primary="Notification Preferences" />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon>
                            <Inventory />
                          </ListItemIcon>
                          <ListItemText primary="Shipping Preferences" />
                        </ListItem>
                      </List>
                    </Paper>
                  </Grid>
                </Grid>
              </TabPanel>

              {/* AI Analysis Tab Panel */}
              <TabPanel value={tabValue} index={4}>
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Recent Document Analysis Results
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Review recent AI-powered vision analysis of your logistics documents and parcels.
                  </Typography>
                  
                  <Grid container spacing={3}>
                    {[
                      {
                        id: 'ai1',
                        documentType: 'Shipping Label',
                        date: '2023-06-12',
                        confidence: 0.94,
                        extractedFields: 5,
                        imageUrl: '/ai-vision-demo.jpg'
                      },
                      {
                        id: 'ai2',
                        documentType: 'Package',
                        date: '2023-06-10',
                        confidence: 0.87,
                        extractedFields: 4,
                        imageUrl: '/ai-vision-demo.jpg'
                      },
                      {
                        id: 'ai3',
                        documentType: 'Invoice',
                        date: '2023-06-08',
                        confidence: 0.92,
                        extractedFields: 8,
                        imageUrl: '/ai-vision-demo.jpg'
                      },
                      {
                        id: 'ai4',
                        documentType: 'Customs Form',
                        date: '2023-06-05',
                        confidence: 0.89,
                        extractedFields: 6,
                        imageUrl: '/ai-vision-demo.jpg'
                      }
                    ].map((analysis) => (
                      <Grid item xs={12} sm={6} md={4} key={analysis.id}>
                        <Card variant="outlined" sx={{ height: '100%' }}>
                          <Box sx={{ height: 140, overflow: 'hidden', position: 'relative' }}>
                            <Box 
                              component="img" 
                              src={analysis.imageUrl} 
                              alt={analysis.documentType} 
                              sx={{ 
                                width: '100%', 
                                height: '100%',
                                objectFit: 'cover',
                                filter: 'brightness(0.9)',
                                bgcolor: 'grey.200'
                              }} 
                            />
                            <Box sx={{ 
                              position: 'absolute', 
                              top: 10, 
                              right: 10,
                              display: 'flex',
                              alignItems: 'center',
                              bgcolor: 'rgba(0,0,0,0.7)',
                              color: 'white',
                              px: 1,
                              py: 0.5,
                              borderRadius: 1,
                              fontSize: '0.75rem'
                            }}>
                              <Schedule sx={{ mr: 0.5, fontSize: '0.875rem' }} />
                              AI Processed
                            </Box>
                          </Box>
                          <CardContent>
                            <Typography gutterBottom variant="h6" component="div">
                              {analysis.documentType}
                            </Typography>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                              <Typography variant="body2" color="text.secondary">
                                Analyzed on {analysis.date}
                              </Typography>
                              <Chip 
                                size="small" 
                                label={`${Math.round(analysis.confidence * 100)}% confident`} 
                                color={analysis.confidence > 0.9 ? "success" : analysis.confidence > 0.8 ? "warning" : "error"}
                                variant="outlined"
                              />
                            </Box>
                            <Typography variant="body2">
                              {analysis.extractedFields} fields extracted
                            </Typography>
                            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
                              <Button size="small" startIcon={<Visibility />}>
                                View Details
                              </Button>
                              <Button size="small" startIcon={<GetApp />}>
                                Download
                              </Button>
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                    <Button 
                      variant="contained" 
                      component={Link} 
                      to="/compliance-checker" 
                      startIcon={<Schedule />}
                    >
                      Analyze New Document
                    </Button>
                  </Box>
                </Box>
              </TabPanel>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default Dashboard; 