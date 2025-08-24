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
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Refresh,
  ExpandMore,
} from '@mui/icons-material';
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import { useAuth } from '../context/AuthContext';
import { assetsAPI, usersAPI } from '../services/api';
import { Asset, User } from '../types';

const AssetsPage: React.FC = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [formData, setFormData] = useState({
    server_name: '',
    asset_id: '',
    serial_number: '',
    ip_address: '',
    rack_number: '',
    slot_number: '',
    host_name: '',
    operating_system: '',
    service_packs: '',
    software_details: '',
    business_requirements: '',
    technical_contact: '',
    vendor: '',
    make_model: '',
    cpu: '',
    ram: '',
    hdd: '',
    purpose: '',
    asset_type: '',
    dependency: '',
    redundancy_requirements: '',
    stored_information: '',
    backup_schedule: '',
    confidentiality_req: '',
    integrity_req: '',
    availability_req: '',
    asset_value: '',
    asset_value_rating: 'medium' as const,
    classification: '',
    owner_id: '',
    custodian: '',
    users: '',
  });
  const { user } = useAuth();

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const response = await assetsAPI.getAssets();
      setAssets(response.assets);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load assets');
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
    fetchAssets();
    fetchUsers();
  }, [user]);

  const handleOpenDialog = (asset?: Asset) => {
    if (asset) {
      setEditingAsset(asset);
      setFormData({
        server_name: asset.server_name,
        asset_id: asset.asset_id,
        serial_number: asset.serial_number || '',
        ip_address: asset.ip_address || '',
        rack_number: asset.rack_number || '',
        slot_number: asset.slot_number || '',
        host_name: asset.host_name || '',
        operating_system: asset.operating_system || '',
        service_packs: asset.service_packs || '',
        software_details: asset.software_details || '',
        business_requirements: asset.business_requirements || '',
        technical_contact: asset.technical_contact || '',
        vendor: asset.vendor || '',
        make_model: asset.make_model || '',
        cpu: asset.cpu || '',
        ram: asset.ram || '',
        hdd: asset.hdd || '',
        purpose: asset.purpose || '',
        asset_type: asset.asset_type || '',
        dependency: asset.dependency || '',
        redundancy_requirements: asset.redundancy_requirements || '',
        stored_information: asset.stored_information || '',
        backup_schedule: asset.backup_schedule || '',
        confidentiality_req: asset.confidentiality_req || '',
        integrity_req: asset.integrity_req || '',
        availability_req: asset.availability_req || '',
        asset_value: asset.asset_value?.toString() || '',
        asset_value_rating: asset.asset_value_rating || 'medium',
        classification: asset.classification || '',
        owner_id: asset.owner || '',
        custodian: asset.custodian || '',
        users: asset.users || '',
      });
    } else {
      setEditingAsset(null);
      setFormData({
        server_name: '',
        asset_id: '',
        serial_number: '',
        ip_address: '',
        rack_number: '',
        slot_number: '',
        host_name: '',
        operating_system: '',
        service_packs: '',
        software_details: '',
        business_requirements: '',
        technical_contact: '',
        vendor: '',
        make_model: '',
        cpu: '',
        ram: '',
        hdd: '',
        purpose: '',
        asset_type: '',
        dependency: '',
        redundancy_requirements: '',
        stored_information: '',
        backup_schedule: '',
        confidentiality_req: '',
        integrity_req: '',
        availability_req: '',
        asset_value: '',
        asset_value_rating: 'medium',
        classification: '',
        owner_id: '',
        custodian: '',
        users: '',
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingAsset(null);
  };

  const handleSubmit = async () => {
    try {
      const assetData = {
        ...formData,
        asset_value: formData.asset_value ? parseFloat(formData.asset_value) : undefined,
        owner_id: formData.owner_id ? parseInt(formData.owner_id) : undefined,
      };

      if (editingAsset) {
        await assetsAPI.updateAsset(editingAsset.id, assetData);
      } else {
        await assetsAPI.createAsset(assetData);
      }

      handleCloseDialog();
      fetchAssets();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save asset');
    }
  };

  const handleDelete = async (assetId: number) => {
    if (window.confirm('Are you sure you want to delete this asset?')) {
      try {
        await assetsAPI.deleteAsset(assetId);
        fetchAssets();
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to delete asset');
      }
    }
  };

  const columns: GridColDef[] = [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'server_name', headerName: 'Server Name', width: 150, flex: 1 },
    { field: 'asset_id', headerName: 'Asset ID', width: 120 },
    { field: 'ip_address', headerName: 'IP Address', width: 120 },
    { field: 'asset_type', headerName: 'Type', width: 100 },
    { field: 'owner', headerName: 'Owner', width: 100 },
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
          Asset Management
        </Typography>
        <Box>
          <IconButton onClick={fetchAssets} color="primary">
            <Refresh />
          </IconButton>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
            sx={{ ml: 1 }}
          >
            Add Asset
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
          rows={assets}
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

      {/* Asset Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="lg" fullWidth>
        <DialogTitle>
          {editingAsset ? 'Edit Asset' : 'Create New Asset'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {/* Basic Information */}
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography variant="h6">Basic Information</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Server Name"
                      value={formData.server_name}
                      onChange={(e) => setFormData({ ...formData, server_name: e.target.value })}
                      required
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Asset ID"
                      value={formData.asset_id}
                      onChange={(e) => setFormData({ ...formData, asset_id: e.target.value })}
                      required
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Serial Number"
                      value={formData.serial_number}
                      onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="IP Address"
                      value={formData.ip_address}
                      onChange={(e) => setFormData({ ...formData, ip_address: e.target.value })}
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* Hardware Information */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography variant="h6">Hardware Information</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Make/Model"
                      value={formData.make_model}
                      onChange={(e) => setFormData({ ...formData, make_model: e.target.value })}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="CPU"
                      value={formData.cpu}
                      onChange={(e) => setFormData({ ...formData, cpu: e.target.value })}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="RAM"
                      value={formData.ram}
                      onChange={(e) => setFormData({ ...formData, ram: e.target.value })}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="HDD"
                      value={formData.hdd}
                      onChange={(e) => setFormData({ ...formData, hdd: e.target.value })}
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* Asset Classification */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography variant="h6">Asset Classification</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Asset Type"
                      value={formData.asset_type}
                      onChange={(e) => setFormData({ ...formData, asset_type: e.target.value })}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      select
                      label="Asset Value Rating"
                      value={formData.asset_value_rating}
                      onChange={(e) => setFormData({ ...formData, asset_value_rating: e.target.value as any })}
                    >
                      <MenuItem value="low">Low</MenuItem>
                      <MenuItem value="medium">Medium</MenuItem>
                      <MenuItem value="high">High</MenuItem>
                      <MenuItem value="critical">Critical</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Purpose/Service/Role"
                      multiline
                      rows={2}
                      value={formData.purpose}
                      onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingAsset ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AssetsPage;