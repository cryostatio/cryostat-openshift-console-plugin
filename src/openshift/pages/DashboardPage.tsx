import Dashboard from '@app/Dashboard/Dashboard';
import React from 'react';
import '@app/app.css';
import { CryostatContainer } from '@console-plugin/components/CryostatContainer';

export default function DashboardPage() {
  // The Kiali plugin here runs a number of functions
  // Including:
  // - setting the router basename
  // - initializing listeners

  return (
    <CryostatContainer>
      <Dashboard />
    </CryostatContainer>
  );
}
