import React from 'react';
import {
  List,
  Datagrid,
  TextField,
  Show,
  SimpleShowLayout,
  TopToolbar,
  ExportButton,
  FilterButton,
  SearchInput,
  ArrayField,
} from 'react-admin';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  Memory,
  ElectricBolt,
  Engineering,
} from '@mui/icons-material';

// Custom voltage display component
const VoltageField = ({ record }: any) => (
  <Chip
    icon={<ElectricBolt fontSize="small" />}
    label={record?.voltage}
    color="primary"
    size="small"
    variant="outlined"
  />
);

// Product type icon
const ProductTypeIcon = ({ productName }: { productName: string }) => {
  return productName?.includes('ROUTER') ?
    <Memory color="primary" /> :
    <Engineering color="secondary" />;
};

// Custom filter inputs
const productFilters = [
  <SearchInput source="q" alwaysOn />,
];

// List actions toolbar
const ProductListActions = () => (
  <TopToolbar>
    <FilterButton />
    <ExportButton />
  </TopToolbar>
);

export const ProductList = () => (
  <List
    filters={productFilters}
    actions={<ProductListActions />}
    sort={{ field: 'name', order: 'ASC' }}
  >
    <Datagrid rowClick="show" bulkActionButtons={false}>
      <TextField source="name" label="Product Name" />
      <TextField source="description" label="Description" />
      <VoltageField source="voltage" label="Voltage" />
      <TextField source="revision" label="Revision" />
    </Datagrid>
  </List>
);

// Component specifications table
const ComponentSpecsTable = ({ components }: { components: any[] }) => (
  <TableContainer component={Paper}>
    <Table>
      <TableHead>
        <TableRow>
          <TableCell>Component Name</TableCell>
          <TableCell>Voltage</TableCell>
          <TableCell>Test Type</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {components?.map((component, index) => (
          <TableRow key={index}>
            <TableCell>{component.name}</TableCell>
            <TableCell>
              <Chip
                icon={<ElectricBolt fontSize="small" />}
                label={component.voltage}
                color="primary"
                size="small"
                variant="outlined"
              />
            </TableCell>
            <TableCell>{component.test_type}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </TableContainer>
);

export const ProductShow = () => (
  <Show>
    <SimpleShowLayout>
      <Box display="flex" alignItems="center" gap={2} mb={2}>
        <ProductTypeIcon productName="ROUTER-100" />
        <Typography variant="h4">
          Product Details
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Basic Information Card */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Basic Information
              </Typography>
              <Box display="flex" flexDirection="column" gap={1}>
                <Box>
                  <Typography variant="body2" color="textSecondary">
                    Product Name
                  </Typography>
                  <TextField source="name" />
                </Box>
                <Box>
                  <Typography variant="body2" color="textSecondary">
                    Description
                  </Typography>
                  <TextField source="description" />
                </Box>
                <Box>
                  <Typography variant="body2" color="textSecondary">
                    Current Revision
                  </Typography>
                  <TextField source="revision" />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Electrical Specifications Card */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Electrical Specifications
              </Typography>
              <Box display="flex" alignItems="center" gap={2}>
                <ElectricBolt color="primary" />
                <Box>
                  <Typography variant="body2" color="textSecondary">
                    Operating Voltage
                  </Typography>
                  <VoltageField />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Components Specifications */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Component Specifications
              </Typography>
              <ArrayField source="components" label="">
                <ComponentSpecsTable components={[]} />
              </ArrayField>
            </CardContent>
          </Card>
        </Grid>

        {/* Workflow Integration Info */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Workflow Integration
              </Typography>
              <Typography variant="body2" color="textSecondary" paragraph>
                This product is integrated with CrossCut BPO workflows. When a "schematic.released"
                event is triggered for this product, the system will:
              </Typography>
              <Box component="ul" sx={{ pl: 3 }}>
                <Typography component="li" variant="body2">
                  Generate a template plan with unresolved voltage requirements
                </Typography>
                <Typography component="li" variant="body2">
                  Consult the PLM service for voltage specifications
                </Typography>
                <Typography component="li" variant="body2">
                  Command the DocGen service to create DVT documentation
                </Typography>
                <Typography component="li" variant="body2">
                  Maintain complete audit trail of the process
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </SimpleShowLayout>
  </Show>
);