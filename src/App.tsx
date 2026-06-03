import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Daily } from './pages/Daily';
import { Codes } from './pages/Codes';
import { AddCode } from './pages/AddCode';
import { EditCode } from './pages/EditCode';
import { CustomerDetails } from './pages/CustomerDetails';
import { Monthly } from './pages/Monthly';
import { Bills } from './pages/Bills';
import { AddEntry } from './pages/AddEntry';
import { Settings } from './pages/Settings';
import { AuthProvider } from './components/AuthProvider';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Daily />} />
            <Route path="codes" element={<Codes />} />
            <Route path="monthly" element={<Monthly />} />
            <Route path="bills" element={<Bills />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          <Route path="/add" element={<AddEntry />} />
          <Route path="/codes/add" element={<AddCode />} />
          <Route path="/codes/edit/:id" element={<EditCode />} />
          <Route path="/codes/history/:id" element={<CustomerDetails />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

