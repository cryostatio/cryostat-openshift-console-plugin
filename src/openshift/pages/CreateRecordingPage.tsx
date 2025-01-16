import React from 'react';
import '@app/app.css';
import { CryostatContainer } from '@console-plugin/components/CryostatContainer';
import CreateRecording from '@app/CreateRecording/CreateRecording';

export default function CreateRecordingPage() {
  return (
    <CryostatContainer>
        <CreateRecording/>
    </CryostatContainer>
  );
}
