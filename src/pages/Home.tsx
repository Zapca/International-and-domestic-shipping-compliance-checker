import React, { useEffect, useState, ReactNode } from 'react';
import { useTheme } from '@mui/material';
import { 
  Container, 
  Typography, 
  Box, 
  Button, 
  Paper, 
  Grid, 
  Card, 
  CardContent, 
  TextField,
  Divider,
  Chip,
  useMediaQuery,
  alpha,
  Fade,
  Zoom,
  Slide,
  Avatar
} from '@mui/material';
import { 
  Public, 
  Speed, 
  SupportAgent as Support, 
  LocalShipping, 
  Flight,
  DirectionsBoat,
  Inventory, 
  VerifiedUser, 
  DocumentScanner,
  Straighten,
  Scale,
  Archive,
  Warning,
  Autorenew,
  AutoFixHigh,
  GppGood,
  PolicyOutlined,
  FactCheck,
  LanguageOutlined,
  KeyboardArrowDown,
  ChevronRight
} from '@mui/icons-material';
import { Link } from 'react-router-dom';

const Home: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  const [animateUI, setAnimateUI] = useState(false);

  // Trigger animations after initial render
  useEffect(() => {
    setAnimateUI(true);
  }, []);

  const services = [
    {
      title: 'Cross-Border Compliance',
      description: 'Automated verification for international shipping regulations',
      icon: <LanguageOutlined fontSize="large" sx={{ color: theme.palette.primary.main }} />
    },
    {
      title: 'Domestic Compliance',
      description: 'Ensure adherence to in-state shipping and logistics regulations',
      icon: <PolicyOutlined fontSize="large" sx={{ color: theme.palette.primary.main }} />
    },
    {
      title: 'Document Verification',
      description: 'Automated checking of shipping documents and manifests',
      icon: <DocumentScanner fontSize="large" sx={{ color: theme.palette.primary.main }} />
    },
    {
      title: 'Compliance Reporting',
      description: 'Generate compliance reports for auditing and record-keeping',
      icon: <FactCheck fontSize="large" sx={{ color: theme.palette.primary.main }} />
    }
  ];

  const features = [
    {
      title: 'Comprehensive Compliance',
      icon: <GppGood fontSize="large" sx={{ color: theme.palette.primary.main }} />,
      description: 'Our platform covers regulations across multiple jurisdictions and transportation types.'
    },
    {
      title: 'Real-Time Verification',
      icon: <Speed fontSize="large" sx={{ color: theme.palette.primary.main }} />,
      description: 'Instant compliance checks that save time and reduce the risk of penalties.'
    },
    {
      title: 'Secure Processing',
      icon: <VerifiedUser fontSize="large" sx={{ color: theme.palette.primary.main }} />,
      description: 'Advanced security measures to protect your sensitive shipping data.'
    },
    {
      title: 'Expert Support',
      icon: <Support fontSize="large" sx={{ color: theme.palette.primary.main }} />,
      description: 'Access to compliance experts who can help with complex regulatory questions.'
    }
  ];

  const heroSection = () => (
    <Box 
      sx={{ 
        position: 'relative',
        overflow: 'hidden',
        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.dark, 0.95)}, ${alpha(theme.palette.primary.main, 0.85)})`,
        color: 'white',
        pt: { xs: 12, md: 15 },
        pb: { xs: 12, md: 16 }
      }}
    >
      {/* Decorative elements */}
      <Box sx={{ 
        position: 'absolute', 
        width: '100%',
        height: '100%',
        top: 0,
        left: 0,
        overflow: 'hidden',
        zIndex: 0
      }}>
        <Box sx={{ 
          position: 'absolute',
          width: 800,
          height: 800,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${alpha(theme.palette.secondary.main, 0.2)} 0%, transparent 70%)`,
          top: -400,
          left: -200,
        }} />
        <Box sx={{ 
          position: 'absolute',
          width: 600,
          height: 600,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${alpha(theme.palette.primary.light, 0.1)} 0%, transparent 70%)`,
          bottom: -300,
          right: -100,
        }} />
      </Box>

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 2 }}>
        <Grid container spacing={6} alignItems="center">
          <Grid item xs={12} md={7}>
            <Fade in={animateUI} timeout={1000}>
              <Box sx={{ maxWidth: 650 }}>
                <Typography 
                  variant="h2" 
                  component="h1" 
                  gutterBottom
                  sx={{ 
                    fontWeight: 800,
                    mb: 3,
                    fontSize: { xs: '2.8rem', sm: '3.2rem', md: '3.8rem' },
                    letterSpacing: '-0.02em',
                    background: 'linear-gradient(90deg, #FFFFFF 0%, #E0E0E0 100%)',
                    backgroundClip: 'text',
                    textFillColor: 'transparent',
                    textShadow: '0px 2px 5px rgba(0, 0, 0, 0.2)'
                  }}
                >
                  Intelligent <span style={{ color: theme.palette.secondary.light }}>Shipping</span> Compliance
                </Typography>
                <Typography 
                  variant="h5" 
                  component="p" 
                  gutterBottom
                  sx={{ 
                    mb: 5,
                    fontWeight: 400,
                    lineHeight: 1.6,
                    opacity: 0.9,
                    fontSize: { xs: '1.1rem', md: '1.25rem' }
                  }}
                >
                  Streamlined verification for cross-border and domestic shipping regulations with AI-powered intelligence.
                </Typography>
                <Box sx={{ display: 'flex', gap: 3, flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
                  <Button 
                    variant="contained" 
                    color="secondary" 
                    size="large"
                    component={Link}
                    to="/compliance-checker"
                    sx={{ 
                      py: 2, 
                      px: 4,
                      fontSize: '1.1rem',
                      fontWeight: 600,
                      boxShadow: '0px 8px 20px rgba(0, 0, 0, 0.2)',
                      borderRadius: '50px',
                      transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                      '&:hover': {
                        boxShadow: '0px 10px 25px rgba(0, 0, 0, 0.25)',
                        transform: 'translateY(-3px)'
                      }
                    }}
                  >
                    Check Compliance Now
                  </Button>
                  <Button 
                    variant="outlined" 
                    color="inherit" 
                    size="large"
                    component={Link}
                    to="/services"
                    sx={{ 
                      py: 2, 
                      px: 4,
                      fontSize: '1.1rem',
                      fontWeight: 600,
                      borderWidth: 2,
                      borderRadius: '50px',
                      '&:hover': {
                        borderWidth: 2,
                        bgcolor: 'rgba(255, 255, 255, 0.1)'
                      }
                    }}
                  >
                    Explore Solutions
                  </Button>
                </Box>
                <Box sx={{ mt: 5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <KeyboardArrowDown 
                    sx={{ 
                      fontSize: 36, 
                      opacity: 0.8, 
                      animation: 'pulse 2s infinite',
                      '@keyframes pulse': {
                        '0%': { transform: 'translateY(0)' },
                        '50%': { transform: 'translateY(10px)' },
                        '100%': { transform: 'translateY(0)' }
                      }
                    }} 
                  />
                </Box>
              </Box>
            </Fade>
          </Grid>
          <Grid item xs={12} md={5} sx={{ display: { xs: 'none', md: 'block' } }}>
            <Zoom in={animateUI} timeout={1200}>
              <Box 
                sx={{ 
                  position: 'relative',
                  height: '100%',
                  display: 'flex',
                  justifyContent: 'center'
                }}
              >
                <Paper 
                  elevation={10} 
                  sx={{ 
                    p: 4, 
                    borderRadius: 4,
                    bgcolor: 'rgba(255, 255, 255, 0.95)',
                    transform: 'rotate(2deg)',
                    width: '100%',
                    maxWidth: 380,
                    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  <Box sx={{ 
                    position: 'absolute', 
                    top: 0, 
                    right: 0, 
                    width: 80, 
                    height: 80, 
                    background: theme.palette.success.main,
                    transform: 'rotate(45deg) translate(25%, -65%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1
                  }}>
                    <GppGood sx={{ transform: 'rotate(-45deg) translate(-5%, 0)', color: 'white', fontSize: 20 }} />
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, position: 'relative', zIndex: 2 }}>
                    <GppGood sx={{ color: 'success.main', mr: 1.5, fontSize: 28 }} />
                    <Typography variant="h5" color="primary" fontWeight="bold">
                      Compliance Verified
                    </Typography>
                  </Box>
                  <Divider sx={{ mb: 3 }} />
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body1" color="text.secondary">Package ID:</Typography>
                      <Typography variant="body1" fontWeight="medium">PCK23867451</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body1" color="text.secondary">Destination:</Typography>
                      <Typography variant="body1" fontWeight="medium">International</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body1" color="text.secondary">Documentation:</Typography>
                      <Chip size="small" color="success" label="Complete" sx={{ fontWeight: 'bold' }} />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body1" color="text.secondary">Customs Forms:</Typography>
                      <Chip size="small" color="success" label="Verified" sx={{ fontWeight: 'bold' }} />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body1" color="text.secondary">Restricted Items:</Typography>
                      <Chip size="small" color="success" label="Compliant" sx={{ fontWeight: 'bold' }} />
                    </Box>
                  </Box>
                  <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
                    <Button 
                      variant="outlined" 
                      color="primary" 
                      size="small" 
                      endIcon={<ChevronRight />}
                      sx={{ borderRadius: 50, fontWeight: 'bold', py: 0.5 }}
                    >
                      View Details
                    </Button>
                  </Box>
                </Paper>
              </Box>
            </Zoom>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );

  const servicesSection = () => (
    <Box sx={{ 
      py: { xs: 10, md: 12 }, 
      bgcolor: '#F9FAFC',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <Container maxWidth="lg">
        <Box sx={{ textAlign: 'center', mb: 8 }}>
          <Fade in={animateUI} timeout={600}>
            <Box>
              <Chip 
                label="OUR SERVICES" 
                color="primary" 
                size="small" 
                sx={{ 
                  mb: 2, 
                  fontWeight: 'bold',
                  borderRadius: 5,
                  px: 1
                }} 
              />
              <Typography 
                variant="h3" 
                component="h2" 
                gutterBottom 
                fontWeight="800"
                sx={{ 
                  mb: 2,
                  background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                  backgroundClip: 'text',
                  textFillColor: 'transparent'
                }}
              >
                Compliance Solutions
              </Typography>
              <Typography 
                variant="h6" 
                color="text.secondary" 
                sx={{ 
                  maxWidth: 700, 
                  mx: 'auto',
                  fontWeight: 'normal'
                }}
              >
                Comprehensive compliance verification tools for both cross-border and domestic shipping
              </Typography>
            </Box>
          </Fade>
        </Box>
        <Grid container spacing={4}>
          {services.map((service, index) => (
            <Grid item xs={12} sm={6} md={3} key={service.title}>
              <Zoom in={animateUI} style={{ transitionDelay: `${100 * index}ms` }}>
                <Card 
                  sx={{ 
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: '0 12px 30px rgba(0, 0, 0, 0.15)'
                    },
                    borderRadius: 4,
                    overflow: 'hidden',
                    border: '1px solid rgba(0, 0, 0, 0.05)'
                  }}
                  elevation={2}
                >
                  <Box sx={{ 
                    height: 6, 
                    background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`
                  }} />
                  <CardContent sx={{ flexGrow: 1, textAlign: 'center', p: 4 }}>
                    <Avatar
                      sx={{
                        width: 70,
                        height: 70,
                        mx: 'auto',
                        mb: 3,
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                        color: theme.palette.primary.main
                      }}
                    >
                      {service.icon}
                    </Avatar>
                    <Typography 
                      gutterBottom 
                      variant="h5" 
                      component="h3" 
                      fontWeight="bold"
                      sx={{ mb: 2 }}
                    >
                      {service.title}
                    </Typography>
                    <Typography 
                      color="text.secondary" 
                      variant="body1"
                      sx={{ mb: 3 }}
                    >
                      {service.description}
                    </Typography>
                    <Button 
                      variant="outlined" 
                      color="primary" 
                      size="small" 
                      endIcon={<ChevronRight />}
                      sx={{ 
                        borderRadius: 50, 
                        fontWeight: 'bold', 
                        '&:hover': {
                          backgroundColor: alpha(theme.palette.primary.main, 0.05)
                        }
                      }}
                    >
                      Learn More
                    </Button>
                  </CardContent>
                </Card>
              </Zoom>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );

  const aiVisionSection = () => (
    <Box sx={{ 
      py: { xs: 10, md: 12 }, 
      bgcolor: '#FFFFFF',
      position: 'relative'
    }}>
      <Container maxWidth="lg">
        <Grid container spacing={8} alignItems="center">
          <Grid item xs={12} md={6}>
            <Fade in={animateUI} timeout={800}>
              <Box sx={{ p: { xs: 2, md: 4 } }}>
                <Chip 
                  label="AI TECHNOLOGY" 
                  color="secondary" 
                  size="small" 
                  sx={{ 
                    mb: 2,
                    fontWeight: 'bold',
                    borderRadius: 5,
                    px: 1
                  }}
                />
                <Typography 
                  variant="h3" 
                  component="h2" 
                  gutterBottom 
                  fontWeight="800"
                  sx={{ 
                    color: theme.palette.primary.main,
                    mb: 2,
                    lineHeight: 1.2
                  }}
                >
                  AI-Powered Compliance Verification
                </Typography>
                <Typography 
                  variant="h6" 
                  gutterBottom 
                  color="text.primary" 
                  fontWeight="normal" 
                  sx={{ mb: 3 }}
                >
                  Advanced document analysis for seamless compliance checking
                </Typography>
                <Typography variant="body1" paragraph sx={{ mb: 4, color: 'text.secondary', lineHeight: 1.8 }}>
                  Our platform leverages cutting-edge AI technology to automatically verify compliance 
                  of shipping documents for both cross-border and domestic shipments. Upload an image of 
                  your shipping label or document and get instant compliance verification.
                </Typography>
                <Button 
                  variant="contained" 
                  color="primary" 
                  component={Link} 
                  to="/compliance-checker" 
                  size="large"
                  startIcon={<AutoFixHigh />}
                  sx={{ 
                    py: 1.25, 
                    px: 3,
                    fontWeight: 600,
                    borderRadius: 50,
                    boxShadow: 4,
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      transform: 'translateY(-3px)',
                      boxShadow: 6
                    }
                  }}
                >
                  Try Compliance Checker
                </Button>
              </Box>
            </Fade>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Paper 
              elevation={8} 
              sx={{ 
                p: 3, 
                position: 'relative', 
                borderRadius: 3,
                overflow: 'hidden',
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider'
              }}
            >
              <Box sx={{ position: 'relative' }}>
                <Box 
                  component="img" 
                  src="/ai-vision-demo.jpg" 
                  alt="AI Compliance Analysis" 
                  sx={{ 
                    width: '100%', 
                    height: 'auto',
                    borderRadius: 2,
                    mb: 2,
                    boxShadow: 2
                  }} 
                />
                <Box sx={{ 
                  position: 'absolute', 
                  top: 16, 
                  right: 16,
                  display: 'flex',
                  alignItems: 'center',
                  bgcolor: 'primary.main',
                  color: 'white',
                  px: 1.5,
                  py: 0.75,
                  borderRadius: 5
                }}>
                  <AutoFixHigh sx={{ mr: 0.5, fontSize: 16 }} />
                  <Typography variant="caption" fontWeight="bold">AI Analysis</Typography>
                </Box>
              </Box>
              
              <Box sx={{ 
                p: 3, 
                bgcolor: 'grey.50', 
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'grey.200'
              }}>
                <Typography variant="subtitle1" gutterBottom fontWeight="600">
                  Compliance Analysis Results:
                </Typography>
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Document Type:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'medium' }}>International Shipping Form</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Compliance Status:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'medium', color: 'success.main' }}>Verified ✓</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Destination Region:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'medium' }}>European Union</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Tracking ID:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'medium' }}>1Z999AA10123456784</Typography>
                  </Grid>
                </Grid>
                
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                  Detected Requirements:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 2 }}>
                  <Chip label="Commercial Invoice" size="small" color="primary" variant="outlined" />
                  <Chip label="Certificate of Origin" size="small" color="primary" variant="outlined" />
                  <Chip label="Packing List" size="small" color="success" />
                  <Chip label="Customs Declaration" size="small" color="success" />
                </Box>
                
                <Box sx={{ mt: 1, display: 'flex', alignItems: 'center' }}>
                  <Typography variant="caption" sx={{ mr: 1 }}>Confidence:</Typography>
                  <Box sx={{ 
                    flex: 1, 
                    height: 6, 
                    borderRadius: 3, 
                    bgcolor: 'grey.300',
                    overflow: 'hidden' 
                  }}>
                    <Box 
                      sx={{ 
                        height: '100%', 
                        width: '96%',
                        bgcolor: 'success.main'
                      }} 
                    />
                  </Box>
                  <Typography variant="caption" sx={{ ml: 1, fontWeight: 'bold' }}>
                    96%
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );

  const trackingSection = () => (
    <Box 
      sx={{ 
        py: { xs: 10, md: 12 }, 
        bgcolor: alpha(theme.palette.primary.light, 0.05),
        position: 'relative',
        overflow: 'hidden' 
      }}
    >
      {/* Background elements */}
      <Box sx={{ 
        position: 'absolute',
        top: -100,
        right: -100,
        width: 300,
        height: 300,
        borderRadius: '50%',
        background: alpha(theme.palette.primary.main, 0.03),
        zIndex: 0
      }} />
      <Box sx={{ 
        position: 'absolute',
        bottom: -80,
        left: -80,
        width: 200,
        height: 200,
        borderRadius: '50%',
        background: alpha(theme.palette.secondary.main, 0.05),
        zIndex: 0
      }} />

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        <Grid container spacing={8} alignItems="center">
          <Grid item xs={12} md={6}>
            <Zoom in={animateUI} timeout={800}>
              <Box>
                <Box 
                  component="img" 
                  src="/images/tracking-demo.jpg" 
                  alt="Tracking System" 
                  sx={{ 
                    width: '100%',
                    height: 'auto',
                    borderRadius: 4,
                    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
                    transform: {
                      xs: 'none',
                      md: 'perspective(1000px) rotateY(5deg)'
                    }
                  }} 
                />
              </Box>
            </Zoom>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Fade in={animateUI} timeout={1000}>
              <Box>
                <Chip 
                  label="TRACKING SYSTEM" 
                  color="primary" 
                  size="small" 
                  sx={{ 
                    mb: 2,
                    fontWeight: 'bold',
                    borderRadius: 5,
                    px: 1
                  }}
                />
                <Typography 
                  variant="h3" 
                  component="h2" 
                  gutterBottom 
                  fontWeight="800"
                  sx={{ mb: 2, lineHeight: 1.2 }}
                >
                  Compliance-Integrated Tracking
                </Typography>
                <Typography variant="h6" paragraph fontWeight="normal" sx={{ mb: 3, color: 'text.secondary' }}>
                  Track your shipments with real-time compliance status updates
                </Typography>
                <Typography variant="body1" paragraph sx={{ mb: 4, color: 'text.secondary', lineHeight: 1.8 }}>
                  Our tracking system integrates with the compliance checker to provide real-time updates 
                  on your shipment's compliance status throughout its journey. Identify potential issues 
                  before they become problems and ensure smooth delivery.
                </Typography>
                
                <Grid container spacing={3} sx={{ mb: 5 }}>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                      <Box 
                        sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          bgcolor: alpha(theme.palette.primary.main, 0.1),
                          borderRadius: '50%',
                          width: 40,
                          height: 40,
                          mr: 2
                        }}
                      >
                        <LocalShipping sx={{ color: theme.palette.primary.main }} />
                      </Box>
                      <Typography variant="body1" fontWeight="medium">
                        Real-time location updates
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Box 
                        sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          bgcolor: alpha(theme.palette.primary.main, 0.1),
                          borderRadius: '50%',
                          width: 40,
                          height: 40,
                          mr: 2
                        }}
                      >
                        <GppGood sx={{ color: theme.palette.primary.main }} />
                      </Box>
                      <Typography variant="body1" fontWeight="medium">
                        Compliance status alerts
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                      <Box 
                        sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          bgcolor: alpha(theme.palette.primary.main, 0.1),
                          borderRadius: '50%',
                          width: 40,
                          height: 40,
                          mr: 2
                        }}
                      >
                        <DocumentScanner sx={{ color: theme.palette.primary.main }} />
                      </Box>
                      <Typography variant="body1" fontWeight="medium">
                        Documentation verification
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Box 
                        sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          bgcolor: alpha(theme.palette.primary.main, 0.1),
                          borderRadius: '50%',
                          width: 40,
                          height: 40,
                          mr: 2
                        }}
                      >
                        <Speed sx={{ color: theme.palette.primary.main }} />
                      </Box>
                      <Typography variant="body1" fontWeight="medium">
                        Estimated delivery predictions
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
                
                <Button 
                  variant="contained" 
                  color="primary" 
                  component={Link} 
                  to="/tracking" 
                  size="large"
                  startIcon={<LocalShipping />}
                  sx={{ 
                    py: 1.5, 
                    px: 4,
                    fontWeight: 600,
                    borderRadius: 50,
                    boxShadow: 4,
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      transform: 'translateY(-3px)',
                      boxShadow: 6
                    }
                  }}
                >
                  Try Tracking System
                </Button>
              </Box>
            </Fade>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );

  const featuresSection = () => (
    <Box 
      sx={{ 
        py: { xs: 10, md: 12 }, 
        bgcolor: '#FFFFFF',
        position: 'relative' 
      }}
    >
      <Container maxWidth="lg">
        <Box sx={{ textAlign: 'center', mb: 8 }}>
          <Fade in={animateUI} timeout={600}>
            <Box>
              <Chip 
                label="KEY FEATURES" 
                color="secondary" 
                size="small" 
                sx={{ 
                  mb: 2,
                  fontWeight: 'bold',
                  borderRadius: 5,
                  px: 1
                }}
              />
              <Typography 
                variant="h3" 
                component="h2" 
                gutterBottom 
                fontWeight="800"
                sx={{ 
                  mb: 2,
                  background: `linear-gradient(135deg, ${theme.palette.secondary.main}, ${theme.palette.primary.main})`,
                  backgroundClip: 'text',
                  textFillColor: 'transparent'
                }}
              >
                Why Choose Our Platform
              </Typography>
              <Typography 
                variant="h6" 
                sx={{ 
                  maxWidth: 700, 
                  mx: 'auto', 
                  color: 'text.secondary',
                  fontWeight: 'normal'
                }}
              >
                Our comprehensive logistics compliance solution offers unique features designed for efficiency
              </Typography>
            </Box>
          </Fade>
        </Box>
        
        <Grid container spacing={4}>
          {features.map((feature, index) => (
            <Grid item xs={12} sm={6} md={3} key={feature.title}>
              <Zoom in={animateUI} style={{ transitionDelay: `${150 * index}ms` }}>
                <Paper 
                  elevation={2} 
                  sx={{ 
                    p: 4, 
                    height: '100%', 
                    borderRadius: 4,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: '0 12px 30px rgba(0, 0, 0, 0.1)'
                    },
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  <Box 
                    sx={{ 
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: 8,
                      background: index % 2 === 0 
                        ? `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`
                        : `linear-gradient(90deg, ${theme.palette.secondary.main}, ${theme.palette.secondary.light})`
                    }}
                  />
                  <Avatar
                    sx={{
                      width: 80,
                      height: 80,
                      mb: 3,
                      mt: 1,
                      bgcolor: alpha(
                        index % 2 === 0 ? theme.palette.primary.main : theme.palette.secondary.main, 
                        0.1
                      )
                    }}
                  >
                    {feature.icon}
                  </Avatar>
                  <Typography variant="h5" component="h3" gutterBottom fontWeight="bold">
                    {feature.title}
                  </Typography>
                  <Typography sx={{ color: 'text.secondary', flex: 1 }}>
                    {feature.description}
                  </Typography>
                </Paper>
              </Zoom>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );

  const ctaSection = () => (
    <Box 
      sx={{ 
        py: { xs: 10, md: 12 },
        color: 'white',
        position: 'relative',
        overflow: 'hidden',
        background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`
      }}
    >
      {/* Add decorative elements */}
      <Box sx={{ 
        position: 'absolute',
        width: '100%',
        height: '100%',
        top: 0,
        left: 0,
        opacity: 0.1,
        overflow: 'hidden'
      }}>
        <Box sx={{ 
          position: 'absolute',
          width: 600,
          height: 600,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%)',
          top: -200,
          right: -100,
        }} />
        <Box sx={{ 
          position: 'absolute',
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 70%)',
          bottom: -150,
          left: -100,
        }} />
      </Box>

      <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1 }}>
        <Fade in={animateUI} timeout={800}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography 
              variant="h2" 
              component="h2" 
              gutterBottom
              sx={{ 
                fontWeight: 800,
                fontSize: { xs: '2.5rem', sm: '3rem', md: '3.5rem' },
                mb: 3,
                textShadow: '0 2px 10px rgba(0,0,0,0.2)'
              }}
            >
              Ready to Streamline Your Shipping Compliance?
            </Typography>
            <Typography 
              variant="h5" 
              paragraph
              sx={{ 
                mb: 6, 
                fontWeight: 400,
                opacity: 0.9,
                maxWidth: 800,
                mx: 'auto'
              }}
            >
              Join thousands of businesses that have simplified their logistics compliance with our platform.
              Get started today with a free trial.
            </Typography>
            <Box 
              sx={{ 
                display: 'flex', 
                gap: 3, 
                justifyContent: 'center',
                flexWrap: { xs: 'wrap', sm: 'nowrap' }
              }}
            >
              <Button 
                variant="contained" 
                color="secondary" 
                size="large" 
                component={Link} 
                to="/compliance-checker"
                sx={{ 
                  px: 5, 
                  py: 2, 
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  borderRadius: 50,
                  boxShadow: '0 8px 20px rgba(0,0,0,0.3)',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-3px)',
                    boxShadow: '0 12px 25px rgba(0,0,0,0.4)'
                  }
                }}
              >
                Start Free Trial
              </Button>
              <Button 
                variant="outlined" 
                color="inherit" 
                size="large" 
                component={Link} 
                to="/contact"
                sx={{ 
                  px: 5, 
                  py: 2, 
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  borderRadius: 50,
                  borderWidth: 2,
                  '&:hover': {
                    borderWidth: 2,
                    bgcolor: 'rgba(255, 255, 255, 0.1)'
                  }
                }}
              >
                Contact Sales
              </Button>
            </Box>
          </Box>
        </Fade>
      </Container>
    </Box>
  );

  return (
    <div>
      {heroSection()}
      {servicesSection()}
      {aiVisionSection()}
      {trackingSection && trackingSection()}
      {featuresSection && featuresSection()}
      {ctaSection && ctaSection()}
    </div>
  );
};

export default Home;