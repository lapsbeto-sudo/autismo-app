import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import Dashboard from './components/dashboard/Dashboard';
import PatientList from './components/patients/PatientList';
import PatientForm from './components/patients/PatientForm';
import PatientProfile from './components/patients/PatientProfile';
import TestList from './components/tests/TestList';
import TestApply from './components/tests/TestApply';
import ReportView from './components/reports/ReportView';
import ReportEdit from './components/reports/ReportEdit';
import TestManager from './components/admin/TestManager';
import ItemManager from './components/admin/ItemManager';
import './App.css';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="loading">Cargando...</div>;
  }
  
  return user ? children : <Navigate to="/login" />;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="loading">Cargando...</div>;
  }
  
  return user ? <Navigate to="/dashboard" /> : children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/login" element={
              <PublicRoute><Login /></PublicRoute>
            } />
            <Route path="/register" element={
              <PublicRoute><Register /></PublicRoute>
            } />
            <Route path="/dashboard" element={
              <PrivateRoute><Dashboard /></PrivateRoute>
            } />
            <Route path="/patients" element={
              <PrivateRoute><PatientList /></PrivateRoute>
            } />
            <Route path="/patients/:id" element={
              <PrivateRoute><PatientProfile /></PrivateRoute>
            } />
            <Route path="/patients/new" element={
              <PrivateRoute><PatientForm /></PrivateRoute>
            } />
            <Route path="/patients/:id/edit" element={
              <PrivateRoute><PatientForm /></PrivateRoute>
            } />
            <Route path="/tests" element={
              <PrivateRoute><TestList /></PrivateRoute>
            } />
            <Route path="/tests/:id/apply" element={
              <PrivateRoute><TestApply /></PrivateRoute>
            } />
            <Route path="/reports/:applicationId" element={
              <PrivateRoute><ReportView /></PrivateRoute>
            } />
            <Route path="/reports/:applicationId/edit" element={
              <PrivateRoute><ReportEdit /></PrivateRoute>
            } />
            <Route path="/admin" element={
              <PrivateRoute><TestManager /></PrivateRoute>
            } />
            <Route path="/admin/tests/:testId/items" element={
              <PrivateRoute><ItemManager /></PrivateRoute>
            } />
            <Route path="/" element={<Navigate to="/dashboard" />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;