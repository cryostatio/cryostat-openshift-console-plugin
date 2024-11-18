import Events from '@app/Events/Events';
import React from 'react';
import '@app/app.css';
import { CryostatContainer } from '@console-plugin/components/CryostatContainer';

export default function EventsPage() {
  return (
    <CryostatContainer>
      <Events />
    </CryostatContainer>
  );
}
