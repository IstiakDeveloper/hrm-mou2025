import React from 'react';
import OfficerAbmFormDocument from './OfficerAbmFormDocument';
import AccountantFormDocument from './AccountantFormDocument';
import BmToZmFormDocument from './BmToZmFormDocument';

interface OfficialFormDocumentProps {
    evaluation: any;
    lang?: 'bn' | 'en';
    isLivePreview?: boolean;
}

export default function OfficialFormDocument({
    evaluation,
    lang = 'bn',
    isLivePreview = false,
}: OfficialFormDocumentProps) {
    const formType = evaluation?.form_type;

    if (formType === 'accountant') {
        return <AccountantFormDocument evaluation={evaluation} lang={lang} isLivePreview={isLivePreview} />;
    }

    if (formType === 'bm_and_above' || formType === 'bm_above') {
        return <BmToZmFormDocument evaluation={evaluation} lang={lang} isLivePreview={isLivePreview} />;
    }

    // Default: Officer & Assistant Branch Manager (Officer and ABM)
    return <OfficerAbmFormDocument evaluation={evaluation} lang={lang} isLivePreview={isLivePreview} />;
}
