import SecurityPanel from '@app/SecurityPanel/SecurityPanel';
import React from 'react';
import '@app/app.css';
import { CryostatContainer } from '@console-plugin/components/CryostatContainer';

export default function SecurityPage() {
  return (
    <CryostatContainer>
      <SecurityPanel />
    </CryostatContainer>
  );
}
