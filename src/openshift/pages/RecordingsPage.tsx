import React from 'react';
import '@app/app.css';
import { CryostatContainer } from '@console-plugin/components/CryostatContainer';
import Recordings from '@app/Recordings/Recordings';

export default function RecordingsPage() {
  return (
    <CryostatContainer>
      <Recordings />
    </CryostatContainer>
  );
}
