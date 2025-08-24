import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Alert,
  CircularProgress,
  Grid,
  Chip,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Refresh,
} from '@mui/icons-material';
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import { useAuth } from '../context/AuthContext';
import { deploymentsAPI } from '../services/api';
import { Deployment } from '../types';

const DeploymentsPage: React.FC = () => {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDeployment, setEditingDeployment] = useState<Deployment | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'pending' as const,
    deployment_date: '',
    backup_location: '',
  });
  const { user } = useAuth();

  const fetchDeployments = async () => {
    try {
      setLoading(true);
      const response = await deploymentsAPI.getDeployments();
      setDeployments(response.deployments);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load deployments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeployments();
  }, [user]);

  const handleOpenDialog = (deployment?: Deployment) => {
    if (deployment) {
      setEditingDeployment(deployment);
      setFormData({
        name: deployment.name,
        description: deployment.description || '',
        status: deployment.status,
        deployment_date: deployment.deployment_date ? deployment.deployment_date.split('T')[0] : '',
        backup_location: deployment.backup_location || '',
      });
    } else {
      setEditingDeployment(null);
      setFormData({
        name: '',
        description: '',
        status: 'pending',
        deployment_date: new Date().toISOString().split('T')[0],
        backup_location: '',
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingDeployment(null);
  };

  const handleSubmit = async () => {
    try {
      const deploymentData = {
        ...formData,
        deployment_date: formData.deployment_date || undefined,
      };

      if (editingDeployment) {
        await deploymentsAPI.updateDeployment(editingDeployment.id, deploymentData);
      } else {
        await deploymentsAPI.createDeployment(deploymentData);
      }

      handleCloseDialog();
      fetchDeployments();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save deployment');
    }
  };

  const handleDelete = async (deploymentId: number) => {
    if (window.confirm('Are you sure you want to delete this deployment?')) {
      try {
        await deploymentsAPI.deleteDeployment(deploymentId);
        fetchDeployments();
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to delete deployment');
      }
    }
  };

  const getStatusColor = (status: string): "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" => {
    switch (status) {
      case 'successful': return 'success';
      case 'failed': return 'error';
      case 'pending': return 'warning';
      default: return 'default';
    }
  };

  const columns: GridColDef[] = [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'name', headerName: 'Deployment Name', width: 200, flex: 1 },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => (
        <Chip label={params.value} color={getStatusColor(params.value)} size="small" />
      ),
    },
    {
      field: 'deployment_date',
      headerName: 'Deployment Date',
      width: 150,
      renderCell: (params) => new Date(params.value).toLocaleDateString(),
    },
    { field: 'deployed_by', headerName: 'Deployed By', width: 120 },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 120,
      getActions: (params) => [
        <GridActionsCellItem
          icon={<Edit />}
          label="Edit"
          onClick={() => handleOpenDialog(params.row)}
        />,
        <GridActionsCellItem
          icon={<Delete />}
          label="Delete"
          onClick={() => handleDelete(params.row.id)}
        />,
      ],
    },
  ];

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Deployment Management
        </Typography>
        <Box>
          <IconButton onClick={fetchDeployments} color="primary">
            <Refresh />
          </IconButton>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
            sx={{ ml: 1 }}
          >
            Add Deployment
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Paper sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={deployments}
          columns={columns}
          initialState={{
            pagination: {
              paginationModel: { page: 0, pageSize: 10 },
            },
          }}
          pageSizeOptions={[5, 10, 25]}
          checkboxSelection
          disableRowSelectionOnClick
        />
      </Paper>

      {/* Deployment Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingDeployment ? 'Edit Deployment' : 'Create New Deployment'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Deployment Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                select
                label="Status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              >
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="successful">Successful</MenuItem>
                <MenuItem value="failed">Failed</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="date"
                label="Deployment Date"
                InputLabelProps={{ shrink: true }}
                value={formData.deployment_date}
                onChange={(e) => setFormData({ ...formData, deployment_date: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Backup Location"
                value={formData.backup_location}
                onChange={(e) => setFormData({ ...formData, backup_location: e.target.value })}
                placeholder="e.g., /backups/deployment_20231225"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingDeployment ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DeploymentsPage;