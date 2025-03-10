import React from 'react';
import { Box, Container, Grid, Typography, Link, Divider, IconButton } from '@mui/material';
import { Facebook, Twitter, LinkedIn, Instagram, YouTube } from '@mui/icons-material';

const Footer: React.FC = () => {
  return (
    <Box
      component="footer"
      sx={{
        bgcolor: 'primary.main',
        color: 'white',
        py: 6,
        mt: 'auto',
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={4}>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="h6" gutterBottom>
              LogiTrack
            </Typography>
            <Typography variant="body2">
              Your trusted logistics partner for efficient and reliable shipping solutions worldwide.
            </Typography>
            <Box sx={{ mt: 2 }}>
              <IconButton color="inherit" aria-label="Facebook">
                <Facebook />
              </IconButton>
              <IconButton color="inherit" aria-label="Twitter">
                <Twitter />
              </IconButton>
              <IconButton color="inherit" aria-label="LinkedIn">
                <LinkedIn />
              </IconButton>
              <IconButton color="inherit" aria-label="Instagram">
                <Instagram />
              </IconButton>
              <IconButton color="inherit" aria-label="YouTube">
                <YouTube />
              </IconButton>
            </Box>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="h6" gutterBottom>
              Services
            </Typography>
            <Link href="/services#air-freight" color="inherit" display="block" sx={{ mb: 1 }}>
              Air Freight
            </Link>
            <Link href="/services#ocean-freight" color="inherit" display="block" sx={{ mb: 1 }}>
              Ocean Freight
            </Link>
            <Link href="/services#road-transport" color="inherit" display="block" sx={{ mb: 1 }}>
              Road Transport
            </Link>
            <Link href="/services#warehousing" color="inherit" display="block" sx={{ mb: 1 }}>
              Warehousing
            </Link>
            <Link href="/services#supply-chain" color="inherit" display="block" sx={{ mb: 1 }}>
              Supply Chain Solutions
            </Link>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="h6" gutterBottom>
              Quick Links
            </Typography>
            <Link href="/tracking" color="inherit" display="block" sx={{ mb: 1 }}>
              Track Shipment
            </Link>
            <Link href="/quote" color="inherit" display="block" sx={{ mb: 1 }}>
              Get a Quote
            </Link>
            <Link href="/locations" color="inherit" display="block" sx={{ mb: 1 }}>
              Our Locations
            </Link>
            <Link href="/careers" color="inherit" display="block" sx={{ mb: 1 }}>
              Careers
            </Link>
            <Link href="/news" color="inherit" display="block" sx={{ mb: 1 }}>
              News & Updates
            </Link>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="h6" gutterBottom>
              Contact Us
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              123 Logistics Avenue
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Business District, City 12345
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Email: info@logitrack.com
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Phone: +91 9876543210
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Support: 24/7 Customer Service
            </Typography>
          </Grid>
        </Grid>
        
        <Divider sx={{ my: 3, bgcolor: 'rgba(255, 255, 255, 0.2)' }} />
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <Typography variant="body2" sx={{ mb: { xs: 2, md: 0 } }}>
            © {new Date().getFullYear()} LogiTrack. All rights reserved.
          </Typography>
          <Box>
            <Link href="/privacy" color="inherit" sx={{ mx: 1 }}>
              Privacy Policy
            </Link>
            <Link href="/terms" color="inherit" sx={{ mx: 1 }}>
              Terms of Service
            </Link>
            <Link href="/cookies" color="inherit" sx={{ mx: 1 }}>
              Cookie Policy
            </Link>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer; 