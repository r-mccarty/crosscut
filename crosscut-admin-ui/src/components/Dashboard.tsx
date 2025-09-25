import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Grid,
  Typography,
  Box,
  Chip,
  LinearProgress
} from '@mui/material';
import {
  Work,
  CheckCircle,
  Error,
  Timer,
  HealthAndSafety as Health,
} from '@mui/icons-material';
import { useGetList, Title } from 'react-admin';
import type { ServiceHealth } from '../types';

const MetricCard: React.FC<{
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'success';
}> = ({ title, value, icon, color = 'primary' }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Box>
          <Typography color="textSecondary" gutterBottom variant="body2">
            {title}
          </Typography>
          <Typography variant="h4" color={color === 'primary' ? 'primary' : color}>
            {value}
          </Typography>
        </Box>
        <Box color={`${color}.main`}>
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

const ServiceHealthCard: React.FC<{ services: ServiceHealth[] }> = ({ services }) => (
  <Card>
    <CardHeader title="Service Health" />
    <CardContent>
      <Grid container spacing={2}>
        {services.map((service, index) => (
          <Grid item xs={12} sm={4} key={index}>
            <Box display="flex" alignItems="center" gap={1}>
              <Health color={service.status === 'healthy' ? 'success' : 'error'} />
              <Box>
                <Typography variant="body2" fontWeight={600}>
                  {service.service}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  {service.version}
                </Typography>
              </Box>
              <Chip
                label={service.status}
                color={service.status === 'healthy' ? 'success' : 'error'}
                size="small"
                sx={{ ml: 'auto' }}
              />
            </Box>
          </Grid>
        ))}
      </Grid>
    </CardContent>
  </Card>
);

const RecentWorkflowsCard: React.FC = () => {
  const { data: workflows, isLoading } = useGetList('workflows', {
    pagination: { page: 1, perPage: 5 },
    sort: { field: 'created_at', order: 'DESC' },
  });

  return (
    <Card>
      <CardHeader title="Recent Workflows" />
      <CardContent>
        {isLoading ? (
          <LinearProgress />
        ) : (
          <Box>
            {workflows?.length === 0 ? (
              <Typography color="textSecondary">No workflows found</Typography>
            ) : (
              workflows?.map((workflow: any) => (
                <Box
                  key={workflow.id}
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  py={1}
                  borderBottom="1px solid #f0f0f0"
                >
                  <Box>
                    <Typography variant="body2" fontWeight={600}>
                      {workflow.product_name} Rev {workflow.revision}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {new Date(workflow.created_at).toLocaleString()}
                    </Typography>
                  </Box>
                  <Chip
                    label={workflow.status}
                    color={
                      workflow.status === 'completed'
                        ? 'success'
                        : workflow.status === 'failed'
                        ? 'error'
                        : 'warning'
                    }
                    size="small"
                  />
                </Box>
              ))
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export const Dashboard: React.FC = () => {
  const { data: workflows } = useGetList('workflows');

  // Calculate metrics from workflows data
  const totalWorkflows = workflows?.length || 0;
  const completedWorkflows = workflows?.filter((w: any) => w.status === 'completed').length || 0;
  const failedWorkflows = workflows?.filter((w: any) => w.status === 'failed').length || 0;
  const runningWorkflows = workflows?.filter((w: any) => w.status === 'running').length || 0;

  // Mock service health data - in a real app this would come from an API
  const mockServicesHealth: ServiceHealth[] = [
    { status: 'healthy', service: 'CrossCut BPO', version: '1.0.0' },
    { status: 'healthy', service: 'Mock PLM', version: '1.0.0' },
    { status: 'healthy', service: 'Mock DocGen', version: '1.0.0' },
  ];

  return (
    <>
      <Title title="CrossCut BPO Dashboard" />
      <Box p={2}>
        <Typography variant="h4" gutterBottom>
          CrossCut BPO Dashboard
        </Typography>

        <Grid container spacing={3}>
          {/* Metrics Row */}
          <Grid item xs={12} sm={6} md={3}>
            <MetricCard
              title="Total Workflows"
              value={totalWorkflows}
              icon={<Work fontSize="large" />}
              color="primary"
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <MetricCard
              title="Completed"
              value={completedWorkflows}
              icon={<CheckCircle fontSize="large" />}
              color="success"
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <MetricCard
              title="Failed"
              value={failedWorkflows}
              icon={<Error fontSize="large" />}
              color="error"
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <MetricCard
              title="Running"
              value={runningWorkflows}
              icon={<Timer fontSize="large" />}
              color="warning"
            />
          </Grid>

          {/* Service Health */}
          <Grid item xs={12}>
            <ServiceHealthCard services={mockServicesHealth} />
          </Grid>

          {/* Recent Workflows */}
          <Grid item xs={12}>
            <RecentWorkflowsCard />
          </Grid>
        </Grid>
      </Box>
    </>
  );
};