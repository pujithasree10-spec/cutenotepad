import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { PrivateRoute } from './components/layout/PrivateRoute';
import { Layout } from './components/layout/Layout';
import { Login } from './app/Login';
import { Dashboard } from './app/Dashboard';
import { Journal } from './app/Journal';
import { Habits } from './app/Habits';
import { Tasks } from './app/Tasks';
import { Focus } from './app/Focus';
import { Analytics } from './app/Analytics';
import { Settings } from './app/Settings';

const AnimatedRoutes: React.FC = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="journal" element={<Journal />} />
          <Route path="habits" element={<Habits />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="focus" element={<Focus />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </AnimatePresence>
  );
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AnimatedRoutes />
    </BrowserRouter>
  );
};

export default App;
