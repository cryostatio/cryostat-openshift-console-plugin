/*
 * Copyright The Cryostat Authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { useCryostatTranslation } from '@i18n/i18nextUtil';
import { Button, WizardFooter, WizardFooterWrapper, useWizardContext } from '@patternfly/react-core';
import * as React from 'react';

interface WizardCustomFooterProps {
  onQuickRegister: () => void;
  onSubmit: () => void;
  onCancel: () => void;
  isValid: boolean;
}

export const WizardCustomFooter: React.FC<WizardCustomFooterProps> = ({
  onQuickRegister,
  onSubmit,
  onCancel,
  isValid,
}) => {
  const { t } = useCryostatTranslation();
  const { activeStep, goToNextStep, goToPrevStep, close } = useWizardContext();

  if (activeStep.id === 'instance-selection') {
    return (
      <WizardFooterWrapper>
        <Button variant="primary" onClick={onQuickRegister} isDisabled={!isValid}>
          {t('DEPLOYMENT_ACTION_QUICK_REGISTER')}
        </Button>
        <Button variant="secondary" onClick={goToNextStep} isDisabled={!isValid}>
          {t('NEXT')}
        </Button>
        <Button variant="link" onClick={onCancel}>
          {t('CANCEL')}
        </Button>
      </WizardFooterWrapper>
    );
  }

  if (activeStep.id === 'review') {
    return (
      <WizardFooterWrapper>
        <Button variant="primary" onClick={onSubmit}>
          {t('DEPLOYMENT_ACTION_REGISTER')}
        </Button>
        <Button variant="secondary" onClick={goToPrevStep}>
          {t('BACK')}
        </Button>
        <Button variant="link" onClick={onCancel}>
          {t('CANCEL')}
        </Button>
      </WizardFooterWrapper>
    );
  }

  return (
    <WizardFooter
      activeStep={activeStep}
      onNext={goToNextStep}
      onBack={goToPrevStep}
      onClose={close}
      isBackDisabled={activeStep.index === 0}
    />
  );
};
