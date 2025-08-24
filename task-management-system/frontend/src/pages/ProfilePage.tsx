import React, { useState, useEffect } from 'react';
import { Box, Typography, Alert, CircularProgress } from '@mui/material';

const ProfilePage: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Profile
      </Typography>
      <Alert severity="info">
        Profile page - Implementation in progress
      </Alert>
    </Box>
  );
};

export default ProfilePage;