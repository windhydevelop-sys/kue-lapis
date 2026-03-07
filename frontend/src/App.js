import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { NotificationProvider } from './contexts/NotificationContext';
import { ThemeModeProvider } from './contexts/ThemeModeContext';
import LampLogin from './components/LampLogin';
import ComplaintMenu from './components/ComplaintMenu';
import HandphoneMenu from './components/HandphoneMenu';
import UserManagement from './components/UserManagement';

import Register from './components/Register';
import Dashboard from './components/Dashboard';
import Customers from './components/Customers';
import FieldStaff from './components/FieldStaff';
import FieldStaffManagement from './components/FieldStaffManagement';
import OrderManagement from './components/OrderManagement';
import CashflowManagement from './components/CashflowManagement';
import BalanceTracker from './components/BalanceTracker';
import ProductDetail from './components/ProductDetail';
import HandphoneManagement from './components/HandphoneManagement';
import FieldStaffDashboard from './components/FieldStaffDashboard';
import BackupManagement from './components/BackupManagement';
import MenuPermissionsManagement from './components/MenuPermissionsManagement';
import WorkflowManagement from './components/WorkflowManagement';
import TelegramProductForm from './components/TelegramProductForm';
import TelegramSubmissions from './components/TelegramSubmissions';
import './App.css';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }, [token]);

  return (
    <ThemeModeProvider>
      <NotificationProvider>
        <Router>
          <div className="App">
            <Routes>
              <Route path="/login" element={<LampLogin />} />
              <Route path="/register" element={token ? <Navigate to="/dashboard" /> : <Register setToken={setToken} />} />
              <Route path="/dashboard" element={token ? <Dashboard setToken={setToken} /> : <Navigate to="/login" />} />
              <Route path="/customers" element={token ? <Customers /> : <Navigate to="/login" />} />
              <Route path="/field-staff" element={token ? <FieldStaff /> : <Navigate to="/login" />} />
              <Route path="/field-staff-management" element={token ? <FieldStaffManagement /> : <Navigate to="/login" />} />
              <Route path="/orders" element={token ? <OrderManagement /> : <Navigate to="/login" />} />
              <Route path="/cashflow" element={token ? <CashflowManagement /> : <Navigate to="/login" />} />
              <Route path="/balance-tracker" element={token ? <BalanceTracker /> : <Navigate to="/login" />} />
              <Route path="/product-details/:id" element={token ? <ProductDetail /> : <Navigate to="/login" />} />
              <Route path="/complaints" element={token ? <ComplaintMenu /> : <Navigate to="/login" />} />
              <Route path="/handphone" element={token ? <HandphoneMenu /> : <Navigate to="/login" />} />
              <Route path="/handphones" element={token ? <HandphoneManagement /> : <Navigate to="/login" />} />
              <Route path="/field-staff-dashboard" element={token ? <FieldStaffDashboard /> : <Navigate to="/login" />} />
              <Route path="/backup" element={token ? <BackupManagement /> : <Navigate to="/login" />} />
              <Route path="/menu-permissions" element={token ? <MenuPermissionsManagement /> : <Navigate to="/login" />} />
              <Route path="/users" element={token ? <UserManagement /> : <Navigate to="/login" />} />
              <Route path="/workflow" element={token ? <WorkflowManagement /> : <Navigate to="/login" />} />
              <Route path="/telegram-submissions" element={token ? <TelegramSubmissions /> : <Navigate to="/login" />} />
              <Route path="/telegram-form" element={<TelegramProductForm />} />
              <Route path="/" element={<Navigate to="/login" />} />
            </Routes>
          </div>
          <ToastContainer />
        </Router>
      </NotificationProvider>
    </ThemeModeProvider>
  );
}

export default App;

// External redirect component – navigates browser to a static URL outside the React Router context
