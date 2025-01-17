import React from 'react';
import '@app/app.css';
import { CryostatContainer } from '@console-plugin/components/CryostatContainer';
import CreateTarget from '@app/Topology/Actions/CreateTarget';

export default function CreateTargetPage() {
  return (
    <CryostatContainer>
        <CreateTarget/>
    </CryostatContainer>
  );
}
