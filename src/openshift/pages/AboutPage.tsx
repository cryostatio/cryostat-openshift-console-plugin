import { About } from '@app/About/About';
import React from 'react';
import '@app/app.css';
import { CryostatContainer } from '@console-plugin/components/CryostatContainer';

export default function AboutPage() {
  return (
    <CryostatContainer>
      <About />
    </CryostatContainer>
  );
}
