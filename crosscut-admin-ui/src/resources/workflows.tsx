import React from 'react';
import {
  List,
  Datagrid,
  TextField,
  DateField,
  Show,
  SimpleShowLayout,
  Create,
  SimpleForm,
  TextInput,
  SelectInput,
  required,
  useNotify,
  useRedirect,
  TopToolbar,
  CreateButton,
  ExportButton,
  FilterButton,
  SearchInput,
  UrlField,
  TabbedShowLayout,
  Tab,
} from 'react-admin';
import {
  Chip,
  Box,
  Typography,
  Alert,
} from '@mui/material';
import {
  CheckCircle,
  Error,
  HourglassEmpty,
  PlayArrow,
} from '@mui/icons-material';

// Status chip with appropriate colors
const WorkflowStatusField = ({ record }: any) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'failed':
        return 'error';
      case 'running':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle fontSize="small" />;
      case 'failed':
        return <Error fontSize="small" />;
      case 'running':
        return <HourglassEmpty fontSize="small" />;
      default:
        return <PlayArrow fontSize="small" />;
    }
  };

  return (
    <Chip
      icon={getStatusIcon(record?.status)}
      label={record?.status || 'unknown'}
      color={getStatusColor(record?.status) as any}
      size="small"
      variant="outlined"
    />
  );
};

// Custom filter inputs
const workflowFilters = [
  <SearchInput source="q" alwaysOn />,
  <SelectInput
    source="status"
    choices={[
      { id: 'completed', name: 'Completed' },
      { id: 'failed', name: 'Failed' },
      { id: 'running', name: 'Running' },
    ]}
  />,
  <TextInput source="product_name" />,
];

// List actions toolbar
const WorkflowListActions = () => (
  <TopToolbar>
    <FilterButton />
    <CreateButton />
    <ExportButton />
  </TopToolbar>
);

export const WorkflowList = () => (
  <List
    filters={workflowFilters}
    actions={<WorkflowListActions />}
    sort={{ field: 'created_at', order: 'DESC' }}
  >
    <Datagrid rowClick="show" bulkActionButtons={false}>
      <TextField source="workflow_id" label="Workflow ID" />
      <TextField source="product_name" label="Product" />
      <TextField source="revision" label="Revision" />
      <WorkflowStatusField source="status" label="Status" />
      <DateField source="created_at" label="Created" showTime />
      <TextField source="message" label="Message" />
    </Datagrid>
  </List>
);

// Timeline component for workflow steps (currently unused)
// const WorkflowTimeline = ({ workflowId }: { workflowId: string }) => {
//   return (
//     <Card>
//       <CardContent>
//         <Typography variant="h6" gutterBottom>
//           Workflow Timeline
//         </Typography>
//         <ReferenceManyField
//           reference="audit"
//           target="workflow_id"
//           filter={{ workflow_id: workflowId }}
//           sort={{ field: 'timestamp', order: 'ASC' }}
//         >
//           <Box>
//             {/* This would be replaced with audit entries when available */}
//             <Alert severity="info">
//               Audit timeline will be displayed here. Currently showing placeholder.
//             </Alert>
//           </Box>
//         </ReferenceManyField>
//       </CardContent>
//     </Card>
//   );
// };

export const WorkflowShow = () => (
  <Show>
    <TabbedShowLayout>
      <Tab label="Overview">
        <SimpleShowLayout>
          <TextField source="workflow_id" label="Workflow ID" />
          <TextField source="product_name" label="Product Name" />
          <TextField source="revision" label="Revision" />
          <WorkflowStatusField source="status" label="Status" />
          <DateField source="created_at" label="Created At" showTime />
          <TextField source="message" label="Message" />
          <UrlField source="document_url" label="Generated Document" />
        </SimpleShowLayout>
      </Tab>
      <Tab label="Timeline">
        <Box p={2}>
          {/* Timeline component would go here */}
          <Alert severity="info">
            Workflow execution timeline will be implemented here.
          </Alert>
        </Box>
      </Tab>
    </TabbedShowLayout>
  </Show>
);

export const WorkflowCreate = () => {
  const notify = useNotify();
  const redirect = useRedirect();

  const onSuccess = (data: any) => {
    notify('Workflow triggered successfully!', { type: 'success' });
    redirect('show', 'workflows', data.id);
  };

  const onError = (error: any) => {
    notify(`Failed to trigger workflow: ${error.message}`, { type: 'error' });
  };

  return (
    <Create mutationOptions={{ onSuccess, onError }}>
      <SimpleForm>
        <Typography variant="h6" gutterBottom>
          Trigger New Workflow
        </Typography>

        <Alert severity="info" sx={{ mb: 2 }}>
          This will trigger a "schematic.released" workflow for the specified product.
        </Alert>

        <SelectInput
          source="trigger_event"
          label="Trigger Event"
          choices={[
            { id: 'schematic.released', name: 'Schematic Released' }
          ]}
          defaultValue="schematic.released"
          validate={required()}
          disabled
        />

        <SelectInput
          source="product_name"
          label="Product Name"
          choices={[
            { id: 'ROUTER-100', name: 'ROUTER-100 (12V Router)' },
            { id: 'SWITCH-200', name: 'SWITCH-200 (24V Switch)' },
          ]}
          validate={required()}
        />

        <TextInput
          source="revision"
          label="Revision"
          defaultValue="A"
          validate={required()}
          helperText="Product revision (e.g., A, B, C)"
        />
      </SimpleForm>
    </Create>
  );
};