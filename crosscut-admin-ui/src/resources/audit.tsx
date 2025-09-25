import React from 'react';
import {
  List,
  Datagrid,
  TextField,
  DateField,
  Show,
  SimpleShowLayout,
  TopToolbar,
  ExportButton,
  FilterButton,
  SearchInput,
  SelectInput,
  TextInput,
} from 'react-admin';
import {
  Chip,
  Box,
  Typography,
  Card,
  CardContent,
} from '@mui/material';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineOppositeContent,
  TimelineDot,
} from '@mui/lab';
import {
  CheckCircle,
  Error,
  Info,
  PlayArrow,
  Build,
  Description,
  CloudUpload,
} from '@mui/icons-material';

// Status chip for audit entries
const AuditStatusField = ({ record }: any) => {
  const color = record?.status === 'success' ? 'success' : 'error';
  const icon = record?.status === 'success' ? <CheckCircle fontSize="small" /> : <Error fontSize="small" />;

  return (
    <Chip
      icon={icon}
      label={record?.status || 'unknown'}
      color={color as any}
      size="small"
      variant="outlined"
    />
  );
};

// Action icon mapper
const getActionIcon = (action: string) => {
  switch (action) {
    case 'workflow_started':
      return <PlayArrow color="primary" />;
    case 'template_plan_generated':
      return <Description color="primary" />;
    case 'plm_consultation':
      return <Build color="primary" />;
    case 'docgen_command':
      return <CloudUpload color="primary" />;
    case 'workflow_completed':
      return <CheckCircle color="success" />;
    default:
      return <Info color="action" />;
  }
};

// Custom filter inputs
const auditFilters = [
  <SearchInput source="q" alwaysOn />,
  <TextInput source="workflow_id" label="Workflow ID" />,
  <SelectInput
    source="status"
    choices={[
      { id: 'success', name: 'Success' },
      { id: 'failed', name: 'Failed' },
    ]}
  />,
  <SelectInput
    source="action"
    choices={[
      { id: 'workflow_started', name: 'Workflow Started' },
      { id: 'template_plan_generated', name: 'Template Generated' },
      { id: 'plm_consultation', name: 'PLM Consultation' },
      { id: 'docgen_command', name: 'DocGen Command' },
      { id: 'workflow_completed', name: 'Workflow Completed' },
    ]}
  />,
];

// List actions toolbar
const AuditListActions = () => (
  <TopToolbar>
    <FilterButton />
    <ExportButton />
  </TopToolbar>
);

export const AuditList = () => (
  <List
    filters={auditFilters}
    actions={<AuditListActions />}
    sort={{ field: 'timestamp', order: 'DESC' }}
  >
    <Datagrid rowClick="show" bulkActionButtons={false}>
      <DateField source="timestamp" label="Timestamp" showTime />
      <TextField source="workflow_id" label="Workflow ID" />
      <TextField source="event" label="Event" />
      <TextField source="action" label="Action" />
      <AuditStatusField source="status" label="Status" />
      <TextField source="error" label="Error" emptyText="-" />
    </Datagrid>
  </List>
);

// Timeline visualization for audit entries
const AuditTimeline = () => {
  // In a real implementation, we'd fetch all audit entries for this workflow
  const mockTimelineData = [
    {
      timestamp: '2025-09-25T10:30:00Z',
      action: 'workflow_started',
      status: 'success',
      details: { product_name: 'ROUTER-100', revision: 'C' }
    },
    {
      timestamp: '2025-09-25T10:30:01Z',
      action: 'template_plan_generated',
      status: 'success',
      details: { components: 1 }
    },
    {
      timestamp: '2025-09-25T10:30:02Z',
      action: 'plm_consultation',
      status: 'success',
      details: { voltage_resolved: '12V' }
    },
    {
      timestamp: '2025-09-25T10:30:05Z',
      action: 'docgen_command',
      status: 'success',
      details: { document_generated: true }
    },
    {
      timestamp: '2025-09-25T10:30:06Z',
      action: 'workflow_completed',
      status: 'success',
      details: { final_url: 'gcs://...' }
    },
  ];

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Workflow Execution Timeline
        </Typography>
        <Timeline>
          {mockTimelineData.map((item, index) => (
            <TimelineItem key={index}>
              <TimelineOppositeContent sx={{ m: 'auto 0' }} variant="body2" color="textSecondary">
                {new Date(item.timestamp).toLocaleTimeString()}
              </TimelineOppositeContent>
              <TimelineSeparator>
                <TimelineDot color={item.status === 'success' ? 'success' : 'error'}>
                  {getActionIcon(item.action)}
                </TimelineDot>
                {index < mockTimelineData.length - 1 && <TimelineConnector />}
              </TimelineSeparator>
              <TimelineContent sx={{ py: '12px', px: 2 }}>
                <Typography variant="h6" component="span">
                  {item.action.replace('_', ' ').toUpperCase()}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Status: {item.status}
                </Typography>
                {item.details && (
                  <Box mt={1}>
                    <Typography variant="caption" component="pre">
                      {JSON.stringify(item.details, null, 2)}
                    </Typography>
                  </Box>
                )}
              </TimelineContent>
            </TimelineItem>
          ))}
        </Timeline>
      </CardContent>
    </Card>
  );
};

export const AuditShow = () => (
  <Show>
    <SimpleShowLayout>
      <Typography variant="h5" gutterBottom>
        Audit Entry Details
      </Typography>

      <TextField source="workflow_id" label="Workflow ID" />
      <DateField source="timestamp" label="Timestamp" showTime />
      <TextField source="event" label="Event" />
      <TextField source="action" label="Action" />
      <AuditStatusField source="status" label="Status" />

      {/* Error field - only show if there's an error */}
      <TextField source="error" label="Error Message" emptyText="No error" />

      {/* Details field - show as formatted JSON */}
      <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
        Details
      </Typography>
      <Box component="pre" sx={{ backgroundColor: '#f5f5f5', p: 2, borderRadius: 1, fontSize: '0.875rem' }}>
        <TextField source="details" label="" />
      </Box>

      {/* Timeline visualization */}
      <Box mt={3}>
        <AuditTimeline />
      </Box>
    </SimpleShowLayout>
  </Show>
);