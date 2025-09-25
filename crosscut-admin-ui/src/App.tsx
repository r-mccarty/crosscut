import { Admin, Resource, Layout } from 'react-admin';
import { dataProvider } from './providers/dataProvider';

// Import icons from MUI
import WorkIcon from '@mui/icons-material/Work';
import AuditIcon from '@mui/icons-material/Receipt';
import ProductionQuantityLimitsIcon from '@mui/icons-material/ProductionQuantityLimits';

// Import resource components (we'll create these next)
import { WorkflowList, WorkflowShow, WorkflowCreate } from './resources/workflows';
import { AuditList, AuditShow } from './resources/audit';
import { ProductList, ProductShow } from './resources/products';
import { Dashboard } from './components/Dashboard';

// Custom layout with CrossCut branding
const CrossCutLayout = (props: any) => (
  <Layout {...props} sx={{ '& .RaLayout-appFrame': { marginTop: 0 } }} />
);

// Custom theme for CrossCut
const theme = {
  palette: {
    primary: {
      main: '#1976d2', // Blue theme for CrossCut
    },
    secondary: {
      main: '#dc004e',
    },
  },
  typography: {
    h6: {
      fontWeight: 600,
    },
  },
};

function App() {
  return (
    <Admin
      dataProvider={dataProvider}
      title="CrossCut BPO Admin"
      dashboard={Dashboard}
      layout={CrossCutLayout}
      theme={theme}
    >
      <Resource
        name="workflows"
        list={WorkflowList}
        show={WorkflowShow}
        create={WorkflowCreate}
        icon={WorkIcon}
        options={{ label: 'Workflows' }}
      />
      <Resource
        name="audit"
        list={AuditList}
        show={AuditShow}
        icon={AuditIcon}
        options={{ label: 'Audit Trail' }}
      />
      <Resource
        name="products"
        list={ProductList}
        show={ProductShow}
        icon={ProductionQuantityLimitsIcon}
        options={{ label: 'Products' }}
      />
    </Admin>
  );
}

export default App;
