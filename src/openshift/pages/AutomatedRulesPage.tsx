import React from 'react';
import '@app/app.css';
import { CryostatContainer } from '@console-plugin/components/CryostatContainer';
import Rules from '@app/Rules/Rules';

export default function AutomatedRulesPage() {
  return (
    <CryostatContainer>
      <Rules />
    </CryostatContainer>
  );
}
