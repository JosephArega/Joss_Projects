import React, { useState, useEffect } from 'react';
import { Box, Typography, Alert, CircularProgress } from '@mui/material';

const SearchPage: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Search Results
      </Typography>
      <Alert severity="info">
        Search page - Implementation in progress
      </Alert>
    </Box>
  );
};

export default SearchPage;