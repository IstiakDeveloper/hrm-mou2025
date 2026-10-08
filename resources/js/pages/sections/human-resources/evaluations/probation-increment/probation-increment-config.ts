export interface CriteriaItem {
    key: string;
    name_en: string;
    name_bn: string;
    max: number;
}

export interface SectionStructure {
    section_key: string;
    section_name_en: string;
    section_name_bn: string;
    items: CriteriaItem[];
}

export const formAIncrementStructure: SectionStructure[] = [
    {
        section_key: 'A',
        section_name_en: 'A. Targets & Achievements (45 Marks)',
        section_name_bn: 'ক. লক্ষ্যমাত্রা ও অর্জন (Target and achievements)-৪৫ নম্বর',
        items: [
            { key: 'loan_outstanding_growth', name_en: '1. Loan outstanding growth according to target', name_bn: '১. লক্ষ্যমাত্রা অনুযায়ী ঋণস্থিতি বৃদ্ধি', max: 10 },
            { key: 'loan_recovery_rate', name_en: '2. Loan Recovery Rate', name_bn: '২. ঋণ আদায়ের হার (Recovery Rate)', max: 10 },
            { key: 'par_maintenance', name_en: '3. Maintaining standard PAR rate', name_bn: '৩. PAR এর মান বজায় রাখা', max: 10 },
            { key: 'borrower_growth', name_en: '4. Borrower growth according to target', name_bn: '৪. লক্ষ্যমাত্রা অনুযায়ী ঋণী বৃদ্ধি', max: 5 },
            { key: 'active_member_retention', name_en: '5. Maintaining standard rate of active member retention', name_bn: '৫. সক্রিয় সদস্য ধরে রাখার হার-এ আদর্শ মান বজায় রাখা', max: 5 },
            { key: 'savings_growth', name_en: '6. Savings / deposit collection and retention target achievement', name_bn: '৬. সঞ্চয়/আমানত সংগ্রহ ও ধরে রাখা লক্ষ্যমাত্রা অনুযায়ী অর্জন', max: 5 },
        ]
    },
    {
        section_key: 'B',
        section_name_en: 'B. Skills & Competency (25 Marks)',
        section_name_bn: 'খ. দক্ষতা ও কাজের মান (Skills & Competency)-২৫ নম্বর',
        items: [
            { key: 'member_survey_loan_eval', name_en: '7. Member survey and loan assessment competency', name_bn: '৭. সদস্য জরিপ ও ঋণ মূল্যায়নের দক্ষতা', max: 5 },
            { key: 'compliance_policy_order', name_en: '8. Compliance with organization policies and office orders', name_bn: '৮. প্রতিষ্ঠানের নীতিমালা ও অফিস আদেশ অনুসরণ', max: 4 },
            { key: 'documentation_preservation', name_en: '9. Documentation and record keeping', name_bn: '৯. নথিপত্র সংরক্ষণ', max: 4 },
            { key: 'reporting_accuracy_timeliness', name_en: '10. Accuracy in reporting and timely preparation / submission', name_bn: '১০. রিপোর্টিংয়ের নির্ভুলতা ও সঠিক সময়ে রিপোর্ট তৈরি/উপস্থাপন', max: 4 },
            { key: 'mis_software_skill', name_en: '11. Competency in using MIS / software', name_bn: '১১. MIS/সফটওয়্যার ব্যবহারের দক্ষতা', max: 4 },
            { key: 'credit_risk_mitigation', name_en: '12. Identification of credit risks and preventive measures', name_bn: '১২. ঋণঝুঁকি শনাক্তকরণ ও প্রতিরোধমূলক ব্যবস্থা গ্রহণ', max: 4 },
        ]
    },
    {
        section_key: 'C',
        section_name_en: 'C. Personal Skills & Behavior (20 Marks)',
        section_name_bn: 'গ. ব্যক্তিগত দক্ষতা ও আচরণ (Personal skills and behavior)-২০ নম্বর',
        items: [
            { key: 'honesty_transparency_accountability', name_en: '13. Honesty, transparency and financial accountability', name_bn: '১৩. সততা, স্বচ্ছতা ও আর্থিক জবাবদিহিতা', max: 5 },
            { key: 'member_conduct_service', name_en: '14. Professional conduct towards members and client service', name_bn: '১৪. সদস্যদের সাথে আচরণ ও গ্রাহকসেবা', max: 4 },
            { key: 'communication_networking', name_en: '15. Communication and networking skills', name_bn: '১৫. যোগাযোগ ও নেটওয়ার্কিং দক্ষতা', max: 3 },
            { key: 'teamwork_collaboration', name_en: '16. Teamwork and peer collaboration', name_bn: '১৬. দলগত কাজ ও সহকর্মীদের সহযোগিতা', max: 3 },
            { key: 'problem_solving_decision', name_en: '17. Problem solving and decision making', name_bn: '১৭. সমস্যা সমাধান ও সিদ্ধান্ত গ্রহণ', max: 3 },
            { key: 'leadership_potential', name_en: '18. Leadership potential', name_bn: '১৮. নেতৃত্বের সম্ভাবনা', max: 2 },
        ]
    },
    {
        section_key: 'D',
        section_name_en: 'D. Discipline & Personal Qualities (10 Marks)',
        section_name_bn: 'ঘ. শৃঙ্খলা ও ব্যক্তিগত গুণাবলী (Discipline and personal qualities)-১০ নম্বর',
        items: [
            { key: 'attendance_punctuality', name_en: '19. Attendance and punctuality', name_bn: '১৯. উপস্থিতি ও সময়ানুবর্তিতা', max: 3 },
            { key: 'office_discipline_values', name_en: '20. Adhering to office discipline and upholding organizational values', name_bn: '২০. অফিস শৃঙ্খলা মেনে চলা ও প্রতিষ্ঠানের মূল্যবোধ ধারণ', max: 2 },
            { key: 'coaching_mentoring_juniors', name_en: '21. Coaching, mentoring and training juniors / subordinates', name_bn: '২১. অধীনস্থ/ জুনিয়রদের কোচিং/মেন্টরিং/কাজ শেখানো', max: 3 },
            { key: 'higher_post_potential', name_en: '22. Potential for assuming higher post responsibilities in future', name_bn: '২২. ভবিষ্যৎ উচ্চতর পদে দায়িত্ব পালনের সম্ভাবনা', max: 2 },
        ]
    }
];

export const formBIncrementStructure: SectionStructure[] = [
    {
        section_key: 'A',
        section_name_en: 'A. Accounting & Financial Management (20 Marks)',
        section_name_bn: 'ক. হিসাব সংরক্ষণ ও আর্থিক ব্যবস্থাপনা (২০ নম্বর)',
        items: [
            { key: 'daily_transactions_entry', name_en: '1. Properly recording daily transactions', name_bn: '১. দৈনিক লেনদেন যথাযথভাবে হিসাবভুক্ত করা', max: 2 },
            { key: 'cash_book_maintenance', name_en: '2. Maintaining Cash Book properly', name_bn: '২. Cash Book সঠিকভাবে সংরক্ষণ করা', max: 2 },
            { key: 'ledger_maintenance', name_en: '3. Maintaining Ledger / account registers properly', name_bn: '৩. Ledger/হিসাব খাতা সঠিকভাবে সংরক্ষণ', max: 2 },
            { key: 'debit_credit_application', name_en: '4. Correct application of Debit & Credit principles', name_bn: '৪. Debit ও Credit-এর সঠিক প্রয়োগ', max: 2 },
            { key: 'voucher_prep_verification', name_en: '5. Voucher preparation and verification skills', name_bn: '৫. Voucher প্রস্তুত ও যাচাইয়ের দক্ষতা', max: 2 },
            { key: 'account_classification', name_en: '6. Proper classification of accounts', name_bn: '৬. হিসাবের শ্রেণিবিন্যাস সঠিকভাবে করা', max: 2 },
            { key: 'daily_closing_execution', name_en: '7. Properly completing daily closing', name_bn: '৭. দৈনিক হিসাব Closing সঠিকভাবে সম্পন্ন করা', max: 2 },
            { key: 'error_mismatch_detection', name_en: '8. Ability to detect accounting errors and mismatches', name_bn: '৮. হিসাবের ভুল/অমিল শনাক্ত করার সক্ষমতা', max: 2 },
            { key: 'correction_methodology', name_en: '9. Following appropriate procedure for accounting corrections', name_bn: '৯. হিসাব সংশোধনের ক্ষেত্রে যথাযথ পদ্ধতি অনুসরণ', max: 2 },
            { key: 'record_keeping_discipline', name_en: '10. Discipline in preserving accounting records', name_bn: '১০. হিসাবের রেকর্ড সংরক্ষণে শৃঙ্খলা', max: 2 },
        ]
    },
    {
        section_key: 'B',
        section_name_en: 'B. Loan Operation Accounting Management (15 Marks)',
        section_name_bn: 'খ. ঋণ কার্যক্রমের হিসাব ব্যবস্থাপনা (১৫ নম্বর)',
        items: [
            { key: 'loan_disbursement_accounts', name_en: '11. Accurately maintaining loan disbursement records', name_bn: '১১. ঋণ বিতরণের হিসাব সঠিকভাবে সংরক্ষণ', max: 2 },
            { key: 'loan_installment_recovery_records', name_en: '12. Accurately recording loan installment / recovery', name_bn: '১২. ঋণের কিস্তি/আদায় হিসাব সঠিকভাবে রেকর্ড', max: 2 },
            { key: 'recovery_account_reconciliation', name_en: '13. Cross-verifying consistency between loan recovery and accounts', name_bn: '১৩. ঋণ আদায় ও হিসাবের মধ্যে সামঞ্জস্য যাচাই', max: 2 },
            { key: 'deposit_savings_maintenance', name_en: '14. Proficiency in maintaining deposit and savings accounts', name_bn: '১৪. আমানত/সঞ্চয় হিসাব সংরক্ষণে দক্ষতা', max: 2 },
            { key: 'overdue_accounting_concept', name_en: '15. Concept and understanding of overdue loan accounting', name_bn: '১৫. ঋণ বকেয়া/Overdue হিসাব সম্পর্কে ধারণা', max: 2 },
            { key: 'loan_voucher_receipt_check', name_en: '16. Verification of loan related vouchers and receipts', name_bn: '১৬. ঋণ সংক্রান্ত Voucher/রসিদ যাচাই', max: 2 },
            { key: 'loan_ledger_software_check', name_en: '17. Verifying data in Loan Ledger / Software', name_bn: '১৭. Loan Ledger/Software-এ তথ্য যাচাই', max: 1 },
            { key: 'loan_daily_reconciliation', name_en: '18. Daily accounting reconciliation of loan program', name_bn: '১৮. ঋণ কার্যক্রমের দৈনিক হিসাব সমন্বয়', max: 2 },
        ]
    },
    {
        section_key: 'C',
        section_name_en: 'C. Cash Management (10 Marks)',
        section_name_bn: 'গ. নগদ অর্থ ও Cash Management (১০ নম্বর)',
        items: [
            { key: 'cash_receipt_payment_caution', name_en: '19. Prudence in cash receipt and disbursement', name_bn: '১৯. নগদ গ্রহণ ও প্রদানের ক্ষেত্রে সতর্কতা', max: 2 },
            { key: 'cash_book_balance_match', name_en: '20. Matching Cash Balance with Book Balance', name_bn: '২০. Cash Balance ও Book Balance মিলিয়ে দেখা', max: 2 },
            { key: 'cash_count_accuracy', name_en: '21. Executing physical Cash Count accurately', name_bn: '২১. Cash Count সঠিকভাবে সম্পন্ন করা', max: 2 },
            { key: 'cash_shortage_excess_reporting', name_en: '22. Identifying and reporting cash shortage or excess', name_bn: '২২. Cash shortage/excess শনাক্ত ও রিপোর্ট করা', max: 2 },
            { key: 'cash_in_hand_compliance', name_en: '23. Adhering to cash in hand limits and organizational directives', name_bn: '২৩. Cash in hand limit ও সংস্থার নির্দেশনা অনুসরণ', max: 2 },
        ]
    },
    {
        section_key: 'D',
        section_name_en: 'D. Bank & Banking Operations (10 Marks)',
        section_name_bn: 'ঘ. ব্যাংক ও ব্যাংকিং কার্যক্রম (১০ নম্বর)',
        items: [
            { key: 'bank_deposit_withdrawal_records', name_en: '24. Recording bank deposits and withdrawals accurately', name_bn: '২৪. ব্যাংক জমা/উত্তোলনের হিসাব সংরক্ষণ', max: 2 },
            { key: 'cheque_book_safekeeping', name_en: '25. Proper maintenance and safe-keeping of cheque books', name_bn: '২৫. চেক বই সঠিকভাবে সংরক্ষণ', max: 2 },
            { key: 'bank_reconciliation_concept', name_en: '26. Concept and application of Bank Reconciliation Statement', name_bn: '২৬. Bank Reconciliation-এর ধারণা ও প্রয়োগ', max: 2 },
            { key: 'bank_voucher_doc_check', name_en: '27. Verification of bank vouchers and related documents', name_bn: '২৭. ব্যাংক সংক্রান্ত Voucher ও নথিপত্র যাচাই', max: 2 },
            { key: 'bank_control_methodology', name_en: '28. Following organizational control procedures in banking transactions', name_bn: '২৮. ব্যাংক লেনদেনে সংস্থার নিয়ন্ত্রণ পদ্ধতি অনুসরণ', max: 2 },
        ]
    },
    {
        section_key: 'E',
        section_name_en: 'E. Computer & Software Usage (15 Marks)',
        section_name_bn: 'ঙ. Computer ও Software ব্যবহার (১৫ নম্বর)',
        items: [
            { key: 'error_free_data_entry', name_en: '29. Accurate, error-free data entry in software', name_bn: '২৯. Software-এ নির্ভুল Data entry', max: 3 },
            { key: 'software_reports_proficiency', name_en: '30. Proficiency in generating all software reports', name_bn: '৩০. Software-এর যাবতীয় রিপোর্ট সম্পর্কে দক্ষতা', max: 3 },
            { key: 'ms_excel_formula_skills', name_en: '31. Proficiency in Microsoft Excel including formulas', name_bn: '৩১. ফর্মুলা সহ Microsoft Excel ব্যবহারের দক্ষতা', max: 3 },
            { key: 'bangla_typing_word_drafting', name_en: '32. Letter drafting in MS Word along with Bangla typing', name_bn: '৩২. বাংলা টাইপিং সহ Microsoft Word-এ বিভিন্ন চিঠিপত্র লেখার দক্ষতা', max: 3 },
            { key: 'day_end_process_timeliness', name_en: '33. Timely completion of Day End Process in software', name_bn: '৩৩. নির্দিষ্ট সময়ে Software-এ Day End Process সম্পন্ন করা', max: 3 },
        ]
    },
    {
        section_key: 'F',
        section_name_en: 'F. Internal Control & Compliance (10 Marks)',
        section_name_bn: 'চ. অভ্যন্তরীণ নিয়ন্ত্রণ ও Compliance (১০ নম্বর)',
        items: [
            { key: 'financial_policy_adherence', name_en: '34. Compliance with organization financial policy', name_bn: '৩৪. সংস্থার আর্থিক নীতিমালা অনুসরণ', max: 2 },
            { key: 'approval_process_compliance', name_en: '35. Following approval procedures accurately', name_bn: '৩৫. অনুমোদন প্রক্রিয়া যথাযথভাবে অনুসরণ', max: 2 },
            { key: 'voucher_supporting_docs', name_en: '36. Proper preservation of vouchers and supporting documents', name_bn: '৩৬. Voucher ও supporting documents সংরক্ষণ', max: 2 },
            { key: 'internal_control_awareness', name_en: '37. Awareness of Internal Control mechanisms', name_bn: '৩৭. Internal Control সম্পর্কে সচেতনতা', max: 2 },
            { key: 'audit_inspection_readiness', name_en: '38. Keeping accounts prepared for audit / inspection visits', name_bn: '৩৮. Audit/পরিদর্শনের জন্য হিসাব প্রস্তুত রাখা', max: 2 },
        ]
    },
    {
        section_key: 'G',
        section_name_en: 'G. Integrity, Responsibility & Conduct (10 Marks)',
        section_name_bn: 'ছ. সততা, দায়িত্বশীলতা ও আচরণ (১০ নম্বর)',
        items: [
            { key: 'honesty_ethics', name_en: '39. Honesty and ethics', name_bn: '৩৯. সততা ও নৈতিকতা', max: 2 },
            { key: 'duty_sincerity', name_en: '40. Sincerity in performing duties', name_bn: '৪০. দায়িত্ব পালনে আন্তরিকতা', max: 2 },
            { key: 'punctuality_presence', name_en: '41. Punctuality and attendance', name_bn: '৪১. সময়ানুবর্তিতা ও উপস্থিতি', max: 2 },
            { key: 'confidential_data_protection', name_en: '42. Preservation and protection of confidential financial data', name_bn: '৪২. গোপনীয় আর্থিক তথ্য সংরক্ষণ', max: 2 },
            { key: 'peer_superior_conduct', name_en: '43. Courteous conduct with peers and superiors', name_bn: '৪৩. সহকর্মী ও ঊর্ধ্বতন কর্মকর্তার সঙ্গে আচরণ', max: 2 },
        ]
    },
    {
        section_key: 'H',
        section_name_en: 'H. Learning Interest & Problem Solving Capacity (10 Marks)',
        section_name_bn: 'জ. শেখার আগ্রহ ও সমস্যা সমাধানের সক্ষমতা (১০ নম্বর)',
        items: [
            { key: 'new_method_learning_interest', name_en: '44. Eagerness to learn new accounting methods', name_bn: '৪৪. নতুন হিসাব পদ্ধতি শেখার আগ্রহ', max: 2 },
            { key: 'training_knowledge_application', name_en: '45. Practical application of knowledge gained from training', name_bn: '৪৫. প্রশিক্ষণ থেকে অর্জিত জ্ঞান কাজে প্রয়োগ', max: 2 },
            { key: 'problem_analysis_resolution', name_en: '46. Analyzing and attempting to resolve accounting problems', name_bn: '৪৬. হিসাবের সমস্যা বিশ্লেষণ ও সমাধানের চেষ্টা', max: 2 },
            { key: 'learning_from_mistakes', name_en: '47. Learning from mistakes and taking corrective actions', name_bn: '৪৭. ভুল থেকে শিক্ষা গ্রহণ ও সংশোধন', max: 2 },
            { key: 'seeking_guidance_readiness', name_en: '48. Readiness to seek guidance and advice when required', name_bn: '৪৮. প্রয়োজনীয় বিষয়ে পরামর্শ/সহায়তা চাওয়ার সক্ষমতা', max: 2 },
        ]
    }
];

export const formCIncrementStructure: SectionStructure[] = [
    {
        section_key: 'A',
        section_name_en: 'A. Loan Recovery & Portfolio Management (15 Marks)',
        section_name_bn: 'ক. ঋণ আদায় ও পোর্টফোলিও ব্যবস্থাপনা (১৫ নম্বর)',
        items: [
            { key: 'regular_installment_collection', name_en: '1. Ensuring regular installment collection', name_bn: '১. নিয়মিত কিস্তি আদায় নিশ্চিতকরণ', max: 3 },
            { key: 'overdue_loan_id_control', name_en: '2. Identification and control of overdue loans', name_bn: '২. বকেয়া ঋণ শনাক্তকরণ ও নিয়ন্ত্রণ', max: 3 },
            { key: 'risky_borrower_followup', name_en: '3. Identifying risky borrowers and structured follow-up', name_bn: '৩. ঝুঁকিপূর্ণ ঋণগ্রহীতা শনাক্ত ও ফলোআপ', max: 2 },
            { key: 'recovery_plan_execution', name_en: '4. Recovery planning and effective implementation', name_bn: '৪. আদায় পরিকল্পনা ও কার্যকর বাস্তবায়ন', max: 2 },
            { key: 'par_control', name_en: '5. Portfolio at Risk (PAR) control', name_bn: '৫. Portfolio at Risk (PAR) নিয়ন্ত্রণ', max: 3 },
            { key: 'overdue_recovery_initiatives', name_en: '6. Effective initiatives for overdue recovery', name_bn: '৬. বকেয়া আদায়ে কার্যকর উদ্যোগ', max: 2 },
        ]
    },
    {
        section_key: 'B',
        section_name_en: 'B. Loan Disbursement & Management (15 Marks)',
        section_name_bn: 'খ. ঋণ বিতরণ ও ঋণ ব্যবস্থাপনা (১৫ নম্বর)',
        items: [
            { key: 'loan_app_verification_screening', name_en: '7. Loan application verification and preliminary screening', name_bn: '৭. ঋণ আবেদন যাচাই ও প্রাথমিক বাছাই', max: 2 },
            { key: 'borrower_eligibility_capacity_eval', name_en: '8. Assessing borrower eligibility and repayment capacity', name_bn: '৮. ঋণগ্রহীতার যোগ্যতা ও সক্ষমতা যাচাই', max: 3 },
            { key: 'proposal_recommendation_quality', name_en: '9. Quality and reliability of recommendation in loan proposals', name_bn: '৯. ঋণ প্রস্তাবে সুপারিশের মান', max: 2 },
            { key: 'credit_policy_approval_compliance', name_en: '10. Adhering to credit policy and approval procedure', name_bn: '১০. ঋণ নীতিমালা ও অনুমোদন প্রক্রিয়া অনুসরণ', max: 3 },
            { key: 'proper_loan_utilization', name_en: '11. Ensuring proper loan utilization by borrowers', name_bn: '১১. ঋণের সঠিক ব্যবহার নিশ্চিতকরণ', max: 2 },
            { key: 'disbursement_transparency_control', name_en: '12. Transparency and control in loan disbursement', name_bn: '১২. ঋণ বিতরণে স্বচ্ছতা ও নিয়ন্ত্রণ', max: 3 },
        ]
    },
    {
        section_key: 'C',
        section_name_en: 'C. Financial & Accounts Management (10 Marks)',
        section_name_bn: 'গ. আর্থিক ও হিসাব ব্যবস্থাপনা (১০ নম্বর)',
        items: [
            { key: 'cash_bank_transaction_control', name_en: '13. Control of daily cash and banking transactions', name_bn: '১৩. দৈনিক নগদ ও ব্যাংক লেনদেনের নিয়ন্ত্রণ', max: 2 },
            { key: 'cash_book_record_verification', name_en: '14. Verifying cash book and related accounting records', name_bn: '১৪. ক্যাশবুখ ও সংশ্লিষ্ট রেকর্ড যাচাই', max: 2 },
            { key: 'account_accuracy_assurance', name_en: '15. Ensuring accounting accuracy and completeness', name_bn: '১৫. হিসাবের সঠিকতা নিশ্চিতকরণ', max: 2 },
            { key: 'daily_weekly_monthly_report_check', name_en: '16. Verification of daily, weekly, and monthly reports', name_bn: '১৬. দৈনিক/সাপ্তাহিক/মাসিক রিপোর্ট যাচাই', max: 2 },
            { key: 'financial_irregularity_prevention', name_en: '17. Preventing financial irregularity, embezzlement and waste', name_bn: '১৭. আর্থিক অনিয়ম, আত্মসাৎ ও অপচয় প্রতিরোধ', max: 2 },
        ]
    },
    {
        section_key: 'D',
        section_name_en: 'D. MIS, Reporting & Documentation (10 Marks)',
        section_name_bn: 'ঘ. MIS, রিপোর্টিং ও ডকুমেন্টেশন (১০ নম্বর)',
        items: [
            { key: 'mis_report_data_accuracy', name_en: '18. Accuracy of data in MIS reports', name_bn: '১৮. MIS রিপোর্টে তথ্যের সঠিকতা', max: 2 },
            { key: 'timely_report_submission', name_en: '19. Timely submission of reports to higher authority', name_bn: '১৯. নির্ধারিত সময়ে রিপোর্ট প্রেরণ', max: 2 },
            { key: 'all_record_preservation', name_en: '20. Systematic preservation of all records and files', name_bn: '২০. সকল প্রকার নথিপত্র সংরক্ষণ', max: 2 },
            { key: 'data_analysis_decision_making', name_en: '21. Making informed decisions by analyzing operational data', name_bn: '২১. তথ্য বিশ্লেষণ করে সিদ্ধান্ত গ্রহণ', max: 2 },
            { key: 'report_error_detection_correction', name_en: '22. Detecting and rectifying errors in reports', name_bn: '২২. রিপোর্টের ভুল শনাক্ত ও সংশোধন', max: 2 },
        ]
    },
    {
        section_key: 'E',
        section_name_en: 'E. Internal Control, Compliance & Risk Management (10 Marks)',
        section_name_bn: 'ঙ. অভ্যন্তরীণ নিয়ন্ত্রণ, কমপ্লায়েন্স ও ঝুঁকি ব্যবস্থাপনা (১০ নম্বর)',
        items: [
            { key: 'policy_sop_compliance', name_en: '23. Compliance with organization policies and SOPs', name_bn: '২৩. প্রতিষ্ঠানের নীতিমালা ও SOP অনুসরণ', max: 2 },
            { key: 'effective_internal_control_impl', name_en: '24. Effective implementation of internal control measures', name_bn: '২৪. Internal Control কার্যকরভাবে প্রয়োগ', max: 2 },
            { key: 'irregularity_fraud_risk_id', name_en: '25. Identification of risks relating to irregularity and fraud', name_bn: '২৫. অনিয়ম/আত্মসাৎ/জালিয়াতির ঝুঁকি শনাক্তকরণ', max: 2 },
            { key: 'audit_inspection_compliance', name_en: '26. Properly addressing and resolving audit/inspection observations', name_bn: '২৬. Audit/Inspection পর্যবেক্ষণ যথাযথভাবে সমাধান', max: 2 },
            { key: 'credit_operation_risk_mgmt', name_en: '27. Proactive risk management in credit operations', name_bn: '২৭. ঋণ কার্যক্রমের ঝুঁকি ব্যবস্থাপনা', max: 2 },
        ]
    },
    {
        section_key: 'F',
        section_name_en: 'F. Management & Leadership (15 Marks)',
        section_name_bn: 'চ. ব্যবস্থাপনা ও নেতৃত্ব (১৫ নম্বর)',
        items: [
            { key: 'overall_operation_planning', name_en: '28. Comprehensive operational planning and execution', name_bn: '২৮. সার্বিক কার্যক্রম পরিকল্পনা ও পরিচালনা', max: 3 },
            { key: 'subordinate_work_allocation_supervision', name_en: '29. Work distribution and close supervision of subordinates', name_bn: '২৯. অধীনস্তদের কাজ বণ্টন ও তদারকি', max: 3 },
            { key: 'leadership_motivation_team', name_en: '30. Providing leadership and motivation to subordinates', name_bn: '৩০. অধীনস্তদের নেতৃত্ব ও উৎসাহ প্রদান', max: 2 },
            { key: 'target_achievement_leadership', name_en: '31. Effective leadership for target achievement', name_bn: '৩১. লক্ষ্যমাত্রা অর্জনে কার্যকর নেতৃত্ব', max: 3 },
            { key: 'performance_evaluation_feedback', name_en: '32. Assessing subordinate performance and providing constructive feedback', name_bn: '৩২. অধীনস্তদের কর্মদক্ষতা মূল্যায়ন ও ফিডব্যাক প্রদান', max: 2 },
            { key: 'office_discipline_management', name_en: '33. Ensuring workplace discipline and office management', name_bn: '৩৩. শৃঙ্খলা ও অফিস ব্যবস্থাপনা নিশ্চিতকরণ', max: 2 },
        ]
    },
    {
        section_key: 'G',
        section_name_en: 'G. Client / Member Management (08 Marks)',
        section_name_bn: 'ছ. গ্রাহক/সদস্য ব্যবস্থাপনা (০৮ নম্বর)',
        items: [
            { key: 'professional_member_conduct', name_en: '34. Professional conduct towards members and borrowers', name_bn: '৩৪. সদস্য/ঋণগ্রহীতার সঙ্গে পেশাদার আচরণ', max: 2 },
            { key: 'complaint_redressal_problem_solving', name_en: '35. Addressing member complaints and solving issues', name_bn: '৩৫. সদস্যদের অভিযোগ ও সমস্যা সমাধান', max: 2 },
            { key: 'member_retention_relationship_building', name_en: '36. Retaining members and fostering relationships', name_bn: '৩৬. সদস্য ধরে রাখা ও সম্পর্ক উন্নয়ন', max: 2 },
            { key: 'field_level_communication', name_en: '37. Effective field-level engagement and communication', name_bn: '৩৭. মাঠ পর্যায়ে কার্যকর যোগাযোগ', max: 2 },
        ]
    },
    {
        section_key: 'H',
        section_name_en: 'H. Personal Skills, Behavior & Values (10 Marks)',
        section_name_bn: 'জ. ব্যক্তিগত দক্ষতা, আচরণ ও মূল্যবোধ (১০ নম্বর)',
        items: [
            { key: 'integrity_ethics', name_en: '38. Honesty and ethics', name_bn: '৩৮. সততা ও নৈতিকতা', max: 2 },
            { key: 'responsibility_dutifulness', name_en: '39. Responsibility and dutifulness', name_bn: '৩৯. দায়িত্ববোধ ও কর্তব্যপরায়ণতা', max: 2 },
            { key: 'punctuality_regularity', name_en: '40. Punctuality and regular presence', name_bn: '৪০. সময়ানুবর্তিতা ও নিয়মিত উপস্থিতি', max: 1 },
            { key: 'interpersonal_communication', name_en: '41. Interpersonal communication skills', name_bn: '৪১. যোগাযোগ দক্ষতা', max: 2 },
            { key: 'problem_solving_decision_making', name_en: '42. Problem solving and decision making capacity', name_bn: '৪২. সমস্যা সমাধান ও সিদ্ধান্ত গ্রহণ', max: 1 },
            { key: 'work_under_pressure', name_en: '43. Capacity to work effectively under pressure', name_bn: '৪৩. চাপের মধ্যে কাজ করার সক্ষমতা', max: 1 },
            { key: 'adaptability_to_change', name_en: '44. Adaptability to change and organizational shifts', name_bn: '৪৪. পরিবর্তনের সঙ্গে খাপ খাওয়ানোর সক্ষমতা', max: 1 },
        ]
    },
    {
        section_key: 'I',
        section_name_en: 'I. Training/Meeting Participation & Learning (07 Marks)',
        section_name_bn: 'ঝ. প্রশিক্ষণ/মিটিং অংশগ্রহণ ও শেখার সক্ষমতা (০৭ নম্বর)',
        items: [
            { key: 'active_training_meeting_participation', name_en: '45. Active participation in training sessions and meetings', name_bn: '৪৫. প্রশিক্ষণ/মিটিং-এ সক্রিয় অংশগ্রহণ', max: 1 },
            { key: 'quick_grasp_new_rules', name_en: '46. Ability to quickly grasp new rules and procedures', name_bn: '৪৬. নতুন নিয়ম/পদ্ধতি দ্রুত শেখার সক্ষমতা', max: 2 },
            { key: 'practical_training_application', name_en: '47. Applying training knowledge in real work situations', name_bn: '৪৭. প্রশিক্ষণলব্ধ জ্ঞান বাস্তবে প্রয়োগ', max: 2 },
            { key: 'superiors_guidance_adoption', name_en: '48. Receptiveness and adoption of superior guidance', name_bn: '৪৮. ঊর্ধ্বতন কর্মকর্তার পরামর্শ গ্রহণ ও প্রয়োগ', max: 1 },
            { key: 'self_learning_initiative', name_en: '49. Self-learning initiative and continuous improvement', name_bn: '৪৯. Self-learning/নিজ উদ্যোগে শেখার আগ্রহ', max: 1 },
        ]
    }
];

export const getIncrementFormStructure = (formType: string): SectionStructure[] => {
    switch (formType) {
        case 'accountant':
            return formBIncrementStructure;
        case 'bm_and_above':
            return formCIncrementStructure;
        case 'officer_abm':
        default:
            return formAIncrementStructure;
    }
};

export const calculateIncrementGrade = (score: number) => {
    if (score >= 85) {
        return {
            grade: 'excellent',
            labelBn: 'Excellent (বেতন বৃদ্ধির জন্য অত্যন্ত উপযুক্ত)',
            labelEn: 'Excellent (Highly Recommended for Salary Increment)',
            badgeVariant: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        };
    }
    if (score >= 65) {
        return {
            grade: 'very_good',
            labelBn: 'Very Good (বেতন বৃদ্ধির জন্য উপযুক্ত)',
            labelEn: 'Very Good (Recommended for Salary Increment)',
            badgeVariant: 'bg-blue-100 text-blue-800 border-blue-300',
        };
    }
    if (score >= 50) {
        return {
            grade: 'good',
            labelBn: 'Good (বেতন বৃদ্ধির জন্য বিবেচনাযোগ্য)',
            labelEn: 'Good (Considerable for Salary Increment)',
            badgeVariant: 'bg-amber-100 text-amber-800 border-amber-300',
        };
    }
    return {
        grade: 'not_satisfactory',
        labelBn: 'Not Satisfactory (বেতন বৃদ্ধির জন্য অনুপযুক্ত)',
        labelEn: 'Not Satisfactory (Not Suitable for Salary Increment)',
        badgeVariant: 'bg-rose-100 text-rose-800 border-rose-300',
    };
};

export const toBn = (num: number | string | null | undefined): string => {
    if (num === null || num === undefined || num === '') return '';
    const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return String(num).replace(/\d/g, (d) => bnDigits[Number(d)]);
};

export const getFormStructure = getIncrementFormStructure;
export const calculateGrade = calculateIncrementGrade;
export const formAStructure = formAIncrementStructure;
export const formBStructure = formBIncrementStructure;
export const formCStructure = formCIncrementStructure;

export const probationIncrementTranslations = {
    bn: {
        pageTitle: 'শিক্ষানবিস ইনক্রিমেন্ট মূল্যায়ন',
        pageSubtitle: 'শিক্ষানবিস কর্মীদের ২য় ধাপে বেতন বৃদ্ধি (Increment) অনুমোদন পরিক্রমা',
        newEvaluation: 'নতুন ইনক্রিমেন্ট মূল্যায়ন',
        searchPlaceholder: 'পিন বা কর্মীর নাম দিয়ে খুঁজুন...',
        allStatuses: 'সকল স্ট্যাটাস',
        allForms: 'সকল ফরম',
        formA: 'ফরম ক (অফিসার ও সহকারী শাখা ব্যবস্থাপক)',
        formB: 'ফরম খ (হিসাবরক্ষক)',
        formC: 'ফরম গ (শাখা ব্যবস্থাপক থেকে তদূর্ধ্ব)',
        employee: 'কর্মীর বিবরণ',
        designation: 'পদবী',
        branch: 'শাখা ও অঞ্চল',
        joiningDate: 'যোগদানের তারিখ',
        probation3mDate: '০৩ মাস পূর্তির তারিখ',
        scoreAndGrade: 'প্রাপ্ত নম্বর ও ফলাফল',
        recommendation: 'সুপারিশ',
        status: 'বর্তমান স্তর',
        actions: 'অ্যাকশন',
        view: 'বিস্তারিত দেখুন',
        edit: 'সম্পাদনা',
        print: 'প্রিন্ট ফরম',
        delete: 'মুছে ফেলুন',
        quickApprove: 'দ্রুত অনুমোদন / ফরোয়ার্ড',
        sendBack: 'ফেরত পাঠান (Send Back)',
        totalEvaluations: 'মোট মূল্যায়ন',
        pendingApprovals: 'অনুমোদনের অপেক্ষায়',
        approvedIncrements: 'অনুমোদিত ইনক্রিমেন্ট',
        recommendedCandidates: 'ইনক্রিমেন্ট সুপারিশকৃত',
        draft: 'খসড়া (Draft)',
        recommended: 'বেতন বৃদ্ধির জন্য সুপারিশকৃত',
        deferIncrement: 'বেতন বৃদ্ধি স্থগিত রেখে পুনমূল্যায়ন',
        notSuitable: 'বেতন বৃদ্ধির অনুপযুক্ত (অব্যাহতি)',
    },
    en: {
        pageTitle: 'Probation Increment Evaluations',
        pageSubtitle: 'Probation employee 2nd step salary increment performance evaluation and workflow',
        newEvaluation: 'New Increment Evaluation',
        searchPlaceholder: 'Search by PIN or employee name...',
        allStatuses: 'All Statuses',
        allForms: 'All Forms',
        formA: 'Form A (Officer & ABM)',
        formB: 'Form B (Accountant)',
        formC: 'Form C (BM & Above)',
        employee: 'Employee',
        designation: 'Designation',
        branch: 'Branch & Region',
        joiningDate: 'Joining Date',
        probation3mDate: '03-Month Completion Date',
        scoreAndGrade: 'Score & Grade',
        recommendation: 'Recommendation',
        status: 'Current Stage',
        actions: 'Actions',
        view: 'View Details',
        edit: 'Edit',
        print: 'Print Dossier',
        delete: 'Delete',
        quickApprove: 'Quick Approve / Forward',
        sendBack: 'Send Back for Revision',
        totalEvaluations: 'Total Evaluations',
        pendingApprovals: 'Pending Approvals',
        approvedIncrements: 'Approved Increments',
        recommendedCandidates: 'Recommended for Increment',
        draft: 'Draft',
        recommended: 'Recommended for Increment',
        deferIncrement: 'Defer Increment & Re-evaluate',
        notSuitable: 'Not Suitable (Discharge)',
    }
};
