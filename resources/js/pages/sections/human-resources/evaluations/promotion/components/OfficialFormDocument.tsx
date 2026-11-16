import { lazy, Suspense } from 'react';

const OfficerAbmFormDocument = lazy(() => import('./OfficerAbmFormDocument'));
const AccountantFormDocument = lazy(() => import('./AccountantFormDocument'));
const BmToZmFormDocument = lazy(() => import('./BmToZmFormDocument'));

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
    const Doc = formType === 'accountant'
        ? AccountantFormDocument
        : (formType === 'bm_and_above' || formType === 'bm_above')
            ? BmToZmFormDocument
            : OfficerAbmFormDocument;

    return (
        <Suspense
            fallback={
                <div className="p-8 text-center text-sm text-slate-500">
                    {lang === 'bn' ? 'ফরম লোড হচ্ছে…' : 'Loading form…'}
                </div>
            }
        >
            <Doc evaluation={evaluation} lang={lang} isLivePreview={isLivePreview} />
        </Suspense>
    );
}
