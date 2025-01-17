import React from 'react';
import '@app/app.css';
import { CryostatContainer } from '@console-plugin/components/CryostatContainer';
import CreateRule from '@app/Rules/CreateRule';

export default function CreateRulesPage() {
  return (
    <CryostatContainer>
        <CreateRule></CreateRule>
    </CryostatContainer>
  );
}
