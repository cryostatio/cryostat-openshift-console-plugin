import React from 'react';
import '@app/app.css';
import { CryostatContainer } from '@console-plugin/components/CryostatContainer';
import DashboardSolo from '@app/Dashboard/DashboardSolo';

export default function DashboardSoloPage() {
  return (
    <CryostatContainer>
      <DashboardSolo/>
    </CryostatContainer>
  );
}
