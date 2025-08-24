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
  Assignment,
} from '@mui/icons-material';
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import { useAuth } from '../context/AuthContext';
import { incidentsAPI, usersAPI, rcaAPI } from '../services/api';
import { Incident, User } from '../types';

const IncidentsPage: React.FC = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIncident, setEditingIncident] = useState<Incident | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    severity: 'medium' as const,
    status: 'open' as const,
    incident_date: '',
    assigned_to: '',
  });
  const { user } = useAuth();

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      const response = await incidentsAPI.getIncidents();
      setIncidents(response.incidents);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load incidents');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      if (user?.role !== 'member') {
        const response = await usersAPI.getUsers();
        setUsers(response.users);
      }
    } catch (err: any) {
      console.error('Failed to load users:', err);
    }
  };

  useEffect(() => {
    fetchIncidents();
    fetchUsers();
  }, [user]);

  const handleOpenDialog = (incident?: Incident) => {
    if (incident) {
      setEditingIncident(incident);
      setFormData({
        name: incident.name,
        description: incident.description,
        severity: incident.severity,
        status: incident.status,
        incident_date: incident.incident_date ? incident.incident_date.split('T')[0] : '',
        assigned_to: incident.assigned_to || '',
      });
    } else {
      setEditingIncident(null);
      setFormData({
        name: '',
        description: '',
        severity: 'medium',
        status: 'open',
        incident_date: new Date().toISOString().split('T')[0],
        assigned_to: '',
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingIncident(null);
  };

  const handleSubmit = async () => {
    try {
      const incidentData = {
        ...formData,
        incident_date: formData.incident_date || undefined,
        assigned_to: formData.assigned_to ? parseInt(formData.assigned_to) : undefined,
      };

      if (editingIncident) {
        await incidentsAPI.updateIncident(editingIncident.id, incidentData);
      } else {
        await incidentsAPI.createIncident(incidentData);
      }

      handleCloseDialog();
      fetchIncidents();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save incident');
    }
  };

  const handleDelete = async (incidentId: number) => {
    if (window.confirm('Are you sure you want to delete this incident?')) {
      try {
        await incidentsAPI.deleteIncident(incidentId);
        fetchIncidents();
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to delete incident');
      }
    }
  };

  const handleCreateRCA = async (incidentId: number) => {
    try {
      await rcaAPI.createRCA({
        incident_id: incidentId,
        root_cause: 'To be determined',
        status: 'draft',
      });
      alert('RCA created successfully');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create RCA');
    }
  };

  const getStatusColor = (status: string): "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" => {
    switch (status) {
      case 'resolved':
      case 'closed': return 'success';
      case 'open': return 'error';
      case 'investigating': return 'warning';
      default: return 'default';
    }
  };

  const getSeverityColor = (severity: string): "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" => {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const columns: GridColDef[] = [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'name', headerName: 'Incident Name', width: 200, flex: 1 },
    {
      field: 'severity',
      headerName: 'Severity',
      width: 100,
      renderCell: (params) => (
        <Chip label={params.value} color={getSeverityColor(params.value)} size="small" />
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => (
        <Chip label={params.value} color={getStatusColor(params.value)} size="small" />
      ),
    },
    { field: 'assigned_to', headerName: 'Assigned To', width: 120 },
    {
      field: 'incident_date',
      headerName: 'Incident Date',
      width: 120,
      renderCell: (params) => new Date(params.value).toLocaleDateString(),
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 150,
      getActions: (params) => [
        <GridActionsCellItem
          icon={<Edit />}
          label="Edit"
          onClick={() => handleOpenDialog(params.row)}
        />,
        <GridActionsCellItem
          icon={<Assignment />}
          label="Create RCA"
          onClick={() => handleCreateRCA(params.row.id)}
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
          Incident Management
        </Typography>
        <Box>
          <IconButton onClick={fetchIncidents} color="primary">
            <Refresh />
          </IconButton>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
            sx={{ ml: 1 }}
          >
            Add Incident
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
          rows={incidents}
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

      {/* Incident Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingIncident ? 'Edit Incident' : 'Create New Incident'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Incident Name"
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
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                select
                label="Severity"
                value={formData.severity}
                onChange={(e) => setFormData({ ...formData, severity: e.target.value as any })}
              >
                <MenuItem value="low">Low</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="critical">Critical</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                select
                label="Status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              >
                <MenuItem value="open">Open</MenuItem>
                <MenuItem value="investigating">Investigating</MenuItem>
                <MenuItem value="resolved">Resolved</MenuItem>
                <MenuItem value="closed">Closed</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="date"
                label="Incident Date"
                InputLabelProps={{ shrink: true }}
                value={formData.incident_date}
                onChange={(e) => setFormData({ ...formData, incident_date: e.target.value })}
              />
            </Grid>
            {user?.role !== 'member' && (
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  select
                  label="Assigned To"
                  value={formData.assigned_to}
                  onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                >
                  <MenuItem value="">Unassigned</MenuItem>
                  {users.map((u) => (
                    <MenuItem key={u.id} value={u.id}>
                      {u.username} ({u.first_name} {u.last_name})
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingIncident ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default IncidentsPage;