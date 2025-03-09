import React, { useState } from 'react';
import { 
  Container, 
  Typography, 
  TextField, 
  Button, 
  Grid, 
  Box, 
  Paper,
  Tab,
  Tabs,
  InputAdornment,
  IconButton,
  Alert
} from '@mui/material';
import { Google, Visibility, VisibilityOff, Phone, Email } from '@mui/icons-material';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

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
      id={`auth-tabpanel-${index}`}
      aria-labelledby={`auth-tab-${index}`}
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

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationId, setVerificationId] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [otpSent, setOtpSent] = useState(false);

  const { logInWithEmail, logInWithGoogle, logInWithPhone, verifyOtp } = useAuth();
  const navigate = useNavigate();

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setError('');
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setError('');
      setLoading(true);
      await logInWithEmail(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to log in');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setError('');
      setLoading(true);
      await logInWithGoogle();
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Google');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phoneNumber || phoneNumber.length < 10) {
      return setError('Please enter a valid phone number');
    }

    try {
      setError('');
      setLoading(true);
      const formattedPhoneNumber = `+${phoneNumber}`;
      const confirmationResult = await logInWithPhone(formattedPhoneNumber);
      setVerificationId(confirmationResult.verificationId);
      setOtpSent(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!otp || otp.length !== 6) {
      return setError('Please enter a valid OTP');
    }

    try {
      setError('');
      setLoading(true);
      await verifyOtp(verificationId, otp);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to verify OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Paper elevation={3} sx={{ p: 4, mt: 8, borderRadius: 2 }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Typography component="h1" variant="h5" sx={{ mb: 3 }}>
            Login
          </Typography>

          {error && <Alert severity="error" sx={{ width: '100%', mb: 2 }}>{error}</Alert>}

          <Box sx={{ borderBottom: 1, borderColor: 'divider', width: '100%' }}>
            <Tabs 
              value={tabValue} 
              onChange={handleTabChange} 
              aria-label="auth tabs"
              variant="fullWidth"
            >
              <Tab icon={<Email />} label="Email" />
              <Tab icon={<Google />} label="Google" />
              <Tab icon={<Phone />} label="Phone" />
            </Tabs>
          </Box>

          <TabPanel value={tabValue} index={0}>
            <Box component="form" onSubmit={handleEmailLogin} noValidate sx={{ mt: 1 }}>
              <TextField
                margin="normal"
                required
                fullWidth
                id="email"
                label="Email Address"
                name="email"
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="Password"
                type={showPassword ? 'text' : 'password'}
                id="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2 }}
                disabled={loading}
              >
                Log In
              </Button>
            </Box>
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<Google />}
                onClick={handleGoogleLogin}
                disabled={loading}
                sx={{ mt: 2, mb: 2 }}
              >
                Log in with Google
              </Button>
            </Box>
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            {!otpSent ? (
              <Box component="form" onSubmit={handleSendOtp} noValidate sx={{ mt: 1 }}>
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  id="phoneNumber"
                  label="Phone Number"
                  name="phoneNumber"
                  autoComplete="tel"
                  autoFocus
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="Country code + number, e.g., 911234567890"
                />
                <div id="recaptcha-container"></div>
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  sx={{ mt: 3, mb: 2 }}
                  disabled={loading}
                >
                  Send OTP
                </Button>
              </Box>
            ) : (
              <Box component="form" onSubmit={handleVerifyOtp} noValidate sx={{ mt: 1 }}>
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  id="otp"
                  label="OTP"
                  name="otp"
                  autoFocus
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                />
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  sx={{ mt: 3, mb: 2 }}
                  disabled={loading}
                >
                  Verify OTP & Login
                </Button>
              </Box>
            )}
          </TabPanel>

          <Grid container justifyContent="center">
            <Grid item>
              <Link to="/signup">
                Don't have an account? Sign Up
              </Link>
            </Grid>
          </Grid>
        </Box>
      </Paper>
    </Container>
  );
};

export default Login; 