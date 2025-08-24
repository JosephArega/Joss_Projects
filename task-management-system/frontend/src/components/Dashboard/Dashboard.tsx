import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
} from '@mui/material';
import {
  Assignment,
  CloudUpload,
  ReportProblem,
  Computer,
  TrendingUp,
  Warning,
  CheckCircle,
  Error,
  Pending,
  Refresh,
} from '@mui/icons-material';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { reportsAPI, tasksAPI } from '../../services/api';
import { DashboardData, Task } from '../../types';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const Dashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [dashboardResponse, tasksResponse] = await Promise.all([
        reportsAPI.getDashboard(),
        user?.role === 'member' ? tasksAPI.getMyTasks() : tasksAPI.getTasks()
      ]);
      
      setDashboardData(dashboardResponse.dashboard);
      
      // Get recent tasks (last 5)
      const sortedTasks = tasksResponse.tasks
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5);
      setRecentTasks(sortedTasks);
      
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
      case 'successful':
      case 'resolved':
        return <CheckCircle color="success" />;
      case 'failed':
      case 'overdue':
        return <Error color="error" />;
      case 'pending':
        return <Pending color="warning" />;
      default:
        return <Warning color="info" />;
    }
  };

  const getStatusColor = (status: string): "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" => {
    switch (status) {
      case 'completed':
      case 'successful':
      case 'resolved':
        return 'success';
      case 'failed':
      case 'overdue':
        return 'error';
      case 'pending':
        return 'warning';
      case 'in_progress':
      case 'investigating':
        return 'info';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert 
        severity="error" 
        action={
          <IconButton color="inherit" size="small" onClick={fetchDashboardData}>
            <Refresh />
          </IconButton>
        }
      >
        {error}
      </Alert>
    );
  }

  if (!dashboardData) {
    return <Alert severity="warning">No dashboard data available</Alert>;
  }

  // Prepare chart data
  const taskStatusData = [
    { name: 'Pending', value: dashboardData.tasks.pending, color: COLORS[0] },
    { name: 'Completed', value: dashboardData.tasks.completed, color: COLORS[1] },
    { name: 'Overdue', value: dashboardData.tasks.overdue, color: COLORS[3] },
  ].filter(item => item.value > 0);

  const deploymentStatusData = [
    { name: 'Successful', value: dashboardData.deployments.successful, color: COLORS[1] },
    { name: 'Pending', value: dashboardData.deployments.pending, color: COLORS[0] },
    { name: 'Failed', value: dashboardData.deployments.failed, color: COLORS[3] },
  ].filter(item => item.value > 0);

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1" gutterBottom>
          Dashboard
        </Typography>
        <IconButton onClick={fetchDashboardData} color="primary">
          <Refresh />
        </IconButton>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Total Tasks
                  </Typography>
                  <Typography variant="h4" component="h2">
                    {dashboardData.tasks.total}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {dashboardData.tasks.pending} pending
                  </Typography>
                </Box>
                <Assignment color="primary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Deployments
                  </Typography>
                  <Typography variant="h4" component="h2">
                    {dashboardData.deployments.total}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {dashboardData.deployments.successful} successful
                  </Typography>
                </Box>
                <CloudUpload color="secondary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Incidents
                  </Typography>
                  <Typography variant="h4" component="h2">
                    {dashboardData.incidents.total}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {dashboardData.incidents.open} open
                  </Typography>
                </Box>
                <ReportProblem color="warning" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Assets
                  </Typography>
                  <Typography variant="h4" component="h2">
                    {dashboardData.assets.total}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Managed assets
                  </Typography>
                </Box>
                <Computer color="info" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts and Recent Activity */}
      <Grid container spacing={3}>
        {/* Task Status Chart */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" component="h3" gutterBottom>
                Task Status Distribution
              </Typography>
              {taskStatusData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={taskStatusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {taskStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Typography variant="body2" color="textSecondary" align="center" sx={{ py: 4 }}>
                  No task data available
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Deployment Status Chart */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" component="h3" gutterBottom>
                Deployment Status
              </Typography>
              {deploymentStatusData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={deploymentStatusData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Typography variant="body2" color="textSecondary" align="center" sx={{ py: 4 }}>
                  No deployment data available
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Tasks */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" component="h3" gutterBottom>
                Recent Tasks
              </Typography>
              {recentTasks.length > 0 ? (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Task Name</TableCell>
                        <TableCell>Priority</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Assigned To</TableCell>
                        <TableCell>Due Date</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {recentTasks.map((task) => (
                        <TableRow key={task.id}>
                          <TableCell>
                            <Box display="flex" alignItems="center">
                              {getStatusIcon(task.status)}
                              <Typography variant="body2" sx={{ ml: 1 }}>
                                {task.name}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={task.priority} 
                              size="small" 
                              color={task.priority === 'high' || task.priority === 'critical' ? 'error' : 
                                     task.priority === 'medium' ? 'warning' : 'default'} 
                            />
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={task.status} 
                              size="small" 
                              color={getStatusColor(task.status)} 
                            />
                          </TableCell>
                          <TableCell>{task.assigned_to || 'Unassigned'}</TableCell>
                          <TableCell>
                            {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography variant="body2" color="textSecondary" align="center" sx={{ py: 4 }}>
                  No recent tasks available
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;