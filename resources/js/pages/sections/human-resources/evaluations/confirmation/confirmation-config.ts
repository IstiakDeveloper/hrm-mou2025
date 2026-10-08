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

export const formAStructure: SectionStructure[] = [
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
            { key: 'office_discipline_values', name_en: '20. Adhering to office discipline and institutional values', name_bn: '২০. অফিস শৃঙ্খলা মেনে চলা ও প্রতিষ্ঠানের মূল্যবোধ ধারণ', max: 2 },
            { key: 'coaching_mentoring_juniors', name_en: '21. Coaching, mentoring and guiding subordinates / juniors', name_bn: '২১. অধীনস্থ/জুনিয়রদের কোচিং/মেন্টরিং/কাজ শেখানো', max: 3 },
            { key: 'future_promotion_potential', name_en: '22. Potential to assume higher responsibilities in future', name_bn: '২২. ভবিষ্যৎ উচ্চতর পদে দায়িত্ব পালনের সম্ভাবনা', max: 2 },
        ]
    }
];

export const formBStructure: SectionStructure[] = [
    {
        section_key: 'A',
        section_name_en: 'A. Bookkeeping & Financial Management (20 Marks)',
        section_name_bn: 'ক. হিসাব সংরক্ষণ ও আর্থিক ব্যবস্থাপনা (২০ নম্বর)',
        items: [
            { key: 'acc_daily_trans', name_en: '1. Proper recording of daily transactions', name_bn: '১. দৈনিক লেনদেন যথাযথভাবে হিসাবভুক্ত করা', max: 2 },
            { key: 'acc_cash_book', name_en: '2. Accurate maintenance of Cash Book', name_bn: '২. Cash Book সঠিকভাবে সংরক্ষণ করা', max: 2 },
            { key: 'acc_ledger_upkeep', name_en: '3. Proper maintenance of Ledger / accounts books', name_bn: '৩. Ledger/হিসাব খাতা সঠিকভাবে সংরক্ষণ', max: 2 },
            { key: 'acc_debit_credit', name_en: '4. Correct application of Debit and Credit', name_bn: '৪. Debit ও Credit-এর সঠিক প্রয়োগ', max: 2 },
            { key: 'acc_voucher_prep', name_en: '5. Proficiency in voucher preparation and verification', name_bn: '৫. Voucher প্রস্তুত ও যাচাইয়ের দক্ষতা', max: 2 },
            { key: 'acc_classification', name_en: '6. Correct accounting classification', name_bn: '৬. হিসাবের শ্রেণিবিন্যাস সঠিকভাবে করা', max: 2 },
            { key: 'acc_daily_closing', name_en: '7. Timely and accurate daily accounts closing', name_bn: '৭. দৈনিক হিসাব Closing সঠিকভাবে সম্পন্ন করা', max: 2 },
            { key: 'acc_error_identify', name_en: '8. Ability to identify accounting errors / mismatches', name_bn: '৮. হিসাবের ভুল/অমিল শনাক্ত করার সক্ষমতা', max: 2 },
            { key: 'acc_correction_procedure', name_en: '9. Following proper procedures for accounting adjustments', name_bn: '৯. হিসাব সংশোধনের ক্ষেত্রে যথাযথ পদ্ধতি অনুসরণ', max: 2 },
            { key: 'acc_record_discipline', name_en: '10. Discipline in maintaining accounting records', name_bn: '১০. হিসাবের রেকর্ড সংরক্ষণে শৃঙ্খলা', max: 2 },
        ]
    },
    {
        section_key: 'B',
        section_name_en: 'B. Loan Operations Accounting Management (15 Marks)',
        section_name_bn: 'খ. ঋণ কার্যক্রমের হিসাব ব্যবস্থাপনা (১৫ নম্বর)',
        items: [
            { key: 'loan_disburse_record', name_en: '11. Proper recording of loan disbursement', name_bn: '১১. ঋণ বিতরণের হিসাব সঠিকভাবে সংরক্ষণ', max: 2 },
            { key: 'loan_recovery_record', name_en: '12. Accurate recording of loan installment / collection', name_bn: '১২. ঋণের কিস্তি/আদায় হিসাব সঠিকভাবে রেকর্ড', max: 2 },
            { key: 'loan_reconciliation', name_en: '13. Verification and reconciliation between collection and accounts', name_bn: '১৩. ঋণ আদায় ও হিসাবের মধ্যে সামঞ্জস্য যাচাই', max: 2 },
            { key: 'savings_record_skill', name_en: '14. Proficiency in maintaining deposit / savings accounts', name_bn: '১৪. আমানত/সঞ্চয় হিসাব সংরক্ষণে দক্ষতা', max: 2 },
            { key: 'loan_overdue_concept', name_en: '15. Understanding of loan overdue / default accounting', name_bn: '১৫. ঋণ বকেয়া/Overdue হিসাব সম্পর্কে ধারণা', max: 2 },
            { key: 'loan_voucher_verify', name_en: '16. Verification of loan related vouchers / receipts', name_bn: '১৬. ঋণ সংক্রান্ত Voucher/রশিদ যাচাই', max: 2 },
            { key: 'loan_software_verify', name_en: '17. Verifying data in Loan Ledger / Software', name_bn: '১৭. Loan Ledger/Software-এ তথ্য যাচাই', max: 1 },
            { key: 'loan_daily_coord', name_en: '18. Daily accounts adjustment of loan operations', name_bn: '১৮. ঋণ কার্যক্রমের দৈনিক হিসাব সমন্বয়', max: 2 },
        ]
    },
    {
        section_key: 'C',
        section_name_en: 'C. Cash Management & Currency Handling (10 Marks)',
        section_name_bn: 'গ. নগদ অর্থ ও Cash Management (১০ নম্বর)',
        items: [
            { key: 'cash_in_out_precaution', name_en: '19. Care and precaution in cash receipt and disbursement', name_bn: '১৯. নগদ গ্রহণ ও প্রদানের ক্ষেত্রে সতর্কতা', max: 2 },
            { key: 'cash_balance_match', name_en: '20. Matching physical cash balance with book balance', name_bn: '২০. Cash Balance ও Book Balance মিলিয়ে দেখা', max: 2 },
            { key: 'cash_count_accurate', name_en: '21. Performing cash count accurately', name_bn: '২১. Cash Count সঠিকভাবে সম্পন্ন করা', max: 2 },
            { key: 'cash_short_excess_report', name_en: '22. Identifying and reporting cash shortage / excess', name_bn: '২২. Cash shortage/excess শনাক্ত ও রিপোর্ট করা', max: 2 },
            { key: 'cash_limit_compliance', name_en: '23. Adherence to cash in hand limits and organizational guidelines', name_bn: '২৩. Cash in hand limit ও সংস্থার নির্দেশনা অনুসরণ', max: 2 },
        ]
    },
    {
        section_key: 'D',
        section_name_en: 'D. Bank & Banking Operations (10 Marks)',
        section_name_bn: 'ঘ. ব্যাংক ও ব্যাংকিং কার্যক্রম (১০ নম্বর)',
        items: [
            { key: 'bank_dep_with_record', name_en: '24. Recording bank deposits and withdrawals', name_bn: '২৪. ব্যাংক জমা/উত্তোলনের হিসাব সংরক্ষণ', max: 2 },
            { key: 'cheque_book_preserve', name_en: '25. Proper upkeep and security of cheque books', name_bn: '২৫. চেক বই সঠিকভাবে সংরক্ষণ', max: 2 },
            { key: 'bank_reconciliation_concept', name_en: '26. Concept and practical application of Bank Reconciliation', name_bn: '২৬. Bank Reconciliation-এর ধারণা ও প্রয়োগ', max: 2 },
            { key: 'bank_voucher_docs_verify', name_en: '27. Verification of bank vouchers and related documents', name_bn: '২৭. ব্যাংক সংক্রান্ত Voucher ও নথিপত্র যাচাই', max: 2 },
            { key: 'bank_org_control_follow', name_en: '28. Following organization internal controls in banking transactions', name_bn: '২৮. ব্যাংক লেনদেনে সংস্থার নিয়ন্ত্রণ পদ্ধতি অনুসরণ', max: 2 },
        ]
    },
    {
        section_key: 'E',
        section_name_en: 'E. Computer & Software Utilization (15 Marks)',
        section_name_bn: 'ঙ. Computer ও Software ব্যবহার (১৫ নম্বর)',
        items: [
            { key: 'comp_accurate_data_entry', name_en: '29. Flawless data entry into software', name_bn: '২৯. Software-এ নির্ভুল Data entry', max: 3 },
            { key: 'comp_software_reports_skill', name_en: '30. Proficiency in generating and interpreting software reports', name_bn: '৩০. Software-এর যাবতীয় রিপোর্ট সম্পর্কে দক্ষতা', max: 3 },
            { key: 'comp_excel_formula_skill', name_en: '31. Proficiency in Microsoft Excel including formulas', name_bn: '৩১. ফর্মুলা সহ Microsoft Excel ব্যবহারের দক্ষতা', max: 3 },
            { key: 'comp_word_bangla_typing', name_en: '32. Ability to write official letters in MS Word with Bangla typing', name_bn: '৩২. বাংলা টাইপিং সহ Microsoft Word-এ বিভিন্ন চিঠিপত্র লেখার দক্ষতা', max: 3 },
            { key: 'comp_day_end_process', name_en: '33. Timely completion of Day End Process in software', name_bn: '৩৩. নির্দিষ্ট সময়ে Software-এ Day End Process সম্পন্ন করা', max: 3 },
        ]
    },
    {
        section_key: 'F',
        section_name_en: 'F. Internal Control & Compliance (10 Marks)',
        section_name_bn: 'চ. অভ্যন্তরীণ নিয়ন্ত্রণ ও Compliance (১০ নম্বর)',
        items: [
            { key: 'comp_fin_policy_follow', name_en: '34. Compliance with organizational financial policy', name_bn: '৩৪. সংস্থার আর্থিক নীতিমালা অনুসরণ', max: 2 },
            { key: 'comp_approval_process_follow', name_en: '35. Strict adherence to authorization / approval process', name_bn: '৩৫. অনুমোদন প্রক্রিয়া যথাযথভাবে অনুসরণ', max: 2 },
            { key: 'comp_voucher_support_docs', name_en: '36. Safe retention of vouchers and supporting documents', name_bn: '৩৬. Voucher ও supporting documents সংরক্ষণ', max: 2 },
            { key: 'comp_internal_control_aware', name_en: '37. Awareness and practice of internal controls', name_bn: '৩৭. Internal Control সম্পর্কে সচেতনতা', max: 2 },
            { key: 'comp_audit_accounts_ready', name_en: '38. Keeping accounts up to date and ready for audit / inspection', name_bn: '৩৮. Audit/পরিদর্শনের জন্য হিসাব প্রস্তুত রাখা', max: 2 },
        ]
    },
    {
        section_key: 'G',
        section_name_en: 'G. Integrity, Responsibility & Conduct (10 Marks)',
        section_name_bn: 'ছ. সততা, দায়িত্বশীলতা ও আচরণ (১০ নম্বর)',
        items: [
            { key: 'pers_honesty_ethics', name_en: '39. Honesty and ethics', name_bn: '৩৯. সততা ও নৈতিকতা', max: 2 },
            { key: 'pers_duty_sincerity', name_en: '40. Sincerity in performing duties', name_bn: '৪০. দায়িত্ব পালনে আন্তরিকতা', max: 2 },
            { key: 'pers_punctuality_attendance', name_en: '41. Punctuality and attendance', name_bn: '৪১. সময়ানুবর্তিতা ও উপস্থিতি', max: 2 },
            { key: 'pers_confidential_fin_data', name_en: '42. Maintaining confidentiality of sensitive financial information', name_bn: '৪২. গোপনীয় আর্থিক তথ্য সংরক্ষণ', max: 2 },
            { key: 'pers_colleague_senior_behavior', name_en: '43. Courteous behavior towards colleagues and senior officials', name_bn: '৪৩. সহকর্মী ও ঊর্ধ্বতন কর্মকর্তার সঙ্গে আচরণ', max: 2 },
        ]
    },
    {
        section_key: 'H',
        section_name_en: 'H. Eagerness to Learn & Problem Solving Ability (10 Marks)',
        section_name_bn: 'জ. শেখার আগ্রহ ও সমস্যা সমাধানের সক্ষমতা (১০ নম্বর)',
        items: [
            { key: 'learn_new_acc_method', name_en: '44. Willingness and eagerness to learn new accounting methods', name_bn: '৪৪. নতুন হিসাব পদ্ধতি শেখার আগ্রহ', max: 2 },
            { key: 'learn_training_knowledge_apply', name_en: '45. Practical application of training knowledge', name_bn: '৪৫. প্রশিক্ষণ থেকে অর্জিত জ্ঞান কাজে প্রয়োগ', max: 2 },
            { key: 'learn_problem_analysis_solve', name_en: '46. Ability to analyze and solve accounting issues', name_bn: '৪৬. হিসাবের সমস্যা বিশ্লেষণ ও সমাধানের চেষ্টা', max: 2 },
            { key: 'learn_mistake_lesson_correct', name_en: '47. Learning from errors and making constructive corrections', name_bn: '৪৭. ভুল থেকে শিক্ষা গ্রহণ ও সংশোধন', max: 2 },
            { key: 'learn_seek_advice_support', name_en: '48. Ability to seek appropriate guidance and support when needed', name_bn: '৪৮. প্রয়োজনীয় বিষয়ে পরামর্শ/সহায়তা চাওয়ার সক্ষমতা', max: 2 },
        ]
    }
];

export const formCStructure: SectionStructure[] = [
    {
        section_key: 'A',
        section_name_en: 'A. Loan Recovery & Portfolio Management (15 Marks)',
        section_name_bn: 'ক. ঋণ আদায় ও পোর্টফোলিও ব্যবস্থাপনা (১৫ নম্বর)',
        items: [
            { key: 'bm_regular_installment_recovery', name_en: '1. Ensuring regular installment collection', name_bn: '১. নিয়মিত কিস্তি আদায় নিশ্চিতকরণ', max: 3 },
            { key: 'bm_overdue_identify_control', name_en: '2. Identification and control of overdue loans', name_bn: '২. বকেয়া ঋণ শনাক্তকরণ ও নিয়ন্ত্রণ', max: 3 },
            { key: 'bm_risky_borrower_followup', name_en: '3. Identifying risky borrowers and prompt follow-up', name_bn: '৩. ঝুঁকিপূর্ণ ঋণগ্রহীতা শনাক্ত ও ফলোআপ', max: 2 },
            { key: 'bm_recovery_plan_execution', name_en: '4. Recovery planning and practical execution', name_bn: '৪. আদায় পরিকল্পনা ও তার বাস্তবায়ন', max: 2 },
            { key: 'bm_par_control', name_en: '5. Controlling Portfolio at Risk (PAR)', name_bn: '৫. Portfolio at Risk (PAR) নিয়ন্ত্রণ', max: 3 },
            { key: 'bm_effective_overdue_action', name_en: '6. Effective initiatives in overdue collection', name_bn: '৬. বকেয়া আদায়ে কার্যকর উদ্যোগ', max: 2 },
        ]
    },
    {
        section_key: 'B',
        section_name_en: 'B. Loan Disbursement & Loan Management (15 Marks)',
        section_name_bn: 'খ. ঋণ বিতরণ ও ঋণ ব্যবস্থাপনা (১৫ নম্বর)',
        items: [
            { key: 'bm_loan_app_verify', name_en: '7. Loan application verification and primary screening', name_bn: '৭. ঋণ আবেদন যাচাই ও প্রাথমিক বাছাই', max: 2 },
            { key: 'bm_borrower_eligibility_capacity', name_en: '8. Verifying borrower eligibility and repayment capacity', name_bn: '৮. ঋণগ্রহীতার যোগ্যতা ও সক্ষমতা যাচাই', max: 3 },
            { key: 'bm_proposal_recommend_quality', name_en: '9. Quality of recommendations in loan proposals', name_bn: '৯. ঋণ প্রস্তাবে সুপারিশের মান', max: 2 },
            { key: 'bm_loan_policy_process_follow', name_en: '10. Adherence to credit policy and approval process', name_bn: '১০. ঋণ নীতিমালা ও অনুমোদন প্রক্রিয়া অনুসরণ', max: 3 },
            { key: 'bm_proper_loan_use_ensure', name_en: '11. Ensuring proper utilization of disbursed loans', name_bn: '১১. ঋণের সঠিক ব্যবহার নিশ্চিতকরণ', max: 2 },
            { key: 'bm_disburse_transparency_control', name_en: '12. Transparency and control in loan disbursement', name_bn: '১২. ঋণ বিতরণে স্বচ্ছতা ও নিয়ন্ত্রণ', max: 3 },
        ]
    },
    {
        section_key: 'C',
        section_name_en: 'C. Financial & Accounts Management (10 Marks)',
        section_name_bn: 'গ. আর্থিক ও হিসাব ব্যবস্থাপনা (১০ নম্বর)',
        items: [
            { key: 'bm_daily_cash_bank_control', name_en: '13. Control of daily cash and banking transactions', name_bn: '১৩. দৈনিক নগদ ও ব্যাংক লেনদেনের নিয়ন্ত্রণ', max: 2 },
            { key: 'bm_cashbook_records_verify', name_en: '14. Verification of cash book and related records', name_bn: '১৪. ক্যাশবুক ও সংশ্লিষ্ট রেকর্ড যাচাই', max: 2 },
            { key: 'bm_accounts_accuracy_ensure', name_en: '15. Ensuring accounting accuracy and compliance', name_bn: '১৫. হিসাবের সঠিকতা নিশ্চিতকরণ', max: 2 },
            { key: 'bm_daily_weekly_monthly_report_verify', name_en: '16. Verification of daily/weekly/monthly financial reports', name_bn: '১৬. দৈনিক/সাপ্তাহিক/মাসিক রিপোর্ট যাচাই', max: 2 },
            { key: 'bm_prevent_irregularity_misappropriation', name_en: '17. Preventing financial irregularities, embezzlement and wastage', name_bn: '১৭. আর্থিক অনিয়ম, আত্মসাৎ ও অপচয় প্রতিরোধ', max: 2 },
        ]
    },
    {
        section_key: 'D',
        section_name_en: 'D. MIS, Reporting & Documentation (10 Marks)',
        section_name_bn: 'ঘ. MIS, রিপোর্টিং ও ডকুমেন্টেশন (১০ নম্বর)',
        items: [
            { key: 'bm_mis_report_data_accuracy', name_en: '18. Accuracy of data in MIS reports', name_bn: '১৮. MIS রিপোর্টে তথ্যের সঠিকতা', max: 2 },
            { key: 'bm_timely_report_submission', name_en: '19. Submission of reports within scheduled timeline', name_bn: '১৯. নির্ধারিত সময়ে রিপোর্ট প্রেরণ', max: 2 },
            { key: 'bm_all_records_safeguard', name_en: '20. Safe preservation and maintenance of all official documents', name_bn: '২০. সকল প্রকার নথিপত্র সংরক্ষণ', max: 2 },
            { key: 'bm_data_analysis_decision', name_en: '21. Decision making through data analysis', name_bn: '২১. তথ্য বিশ্লেষণ করে সিদ্ধান্ত গ্রহণ', max: 2 },
            { key: 'bm_report_error_detect_correct', name_en: '22. Identification and correction of reporting errors', name_bn: '২২. রিপোর্টের ভুল শনাক্ত ও সংশোধন', max: 2 },
        ]
    },
    {
        section_key: 'E',
        section_name_en: 'E. Internal Control, Compliance & Risk Management (10 Marks)',
        section_name_bn: 'ঙ. অভ্যন্তরীণ নিয়ন্ত্রণ, কমপ্লায়েন্স ও ঝুঁকি ব্যবস্থাপনা (১০ নম্বর)',
        items: [
            { key: 'bm_org_policy_sop_follow', name_en: '23. Compliance with institutional policies and SOPs', name_bn: '২৩. প্রতিষ্ঠানের নীতিমালা ও SOP অনুসরণ', max: 2 },
            { key: 'bm_internal_control_effective_apply', name_en: '24. Effective implementation of internal controls', name_bn: '২৪. Internal Control কার্যকরভাবে প্রয়োগ', max: 2 },
            { key: 'bm_fraud_irregularity_risk_detect', name_en: '25. Detection of risks of irregularity/embezzlement/fraud', name_bn: '২৫. অনিয়ম/আত্মসাৎ/জালিয়াতির ঝুঁকি শনাক্তকরণ', max: 2 },
            { key: 'bm_audit_inspect_obs_resolve', name_en: '26. Proper resolution of audit and inspection observations', name_bn: '২৬. Audit/Inspection পর্যবেক্ষণ যথাযথভাবে সমাধান', max: 2 },
            { key: 'bm_loan_program_risk_manage', name_en: '27. Risk management of credit operations', name_bn: '২৭. ঋণ কার্যক্রমের ঝুঁকি ব্যবস্থাপনা', max: 2 },
        ]
    },
    {
        section_key: 'F',
        section_name_en: 'F. Management & Leadership (15 Marks)',
        section_name_bn: 'চ. ব্যবস্থাপনা ও নেতৃত্ব (১৫ নম্বর)',
        items: [
            { key: 'bm_overall_planning_operation', name_en: '28. Overall program planning and operational management', name_bn: '২৮. সার্বিক কার্যক্রম পরিকল্পনা ও পরিচালনা', max: 3 },
            { key: 'bm_subordinate_task_dist_supervision', name_en: '29. Task delegation and supervision of subordinates', name_bn: '২৯. অধীনস্তদের কাজ বণ্টন ও তদারকি', max: 3 },
            { key: 'bm_subordinate_lead_motivate', name_en: '30. Leadership, encouragement and motivation of subordinates', name_bn: '৩০. অধীনস্তদের নেতৃত্ব ও উৎসাহ প্রদান', max: 2 },
            { key: 'bm_target_achieve_leadership', name_en: '31. Effective leadership in achieving institutional targets', name_bn: '৩১. লক্ষ্যমাত্রা অর্জনে কার্যকর নেতৃত্ব', max: 3 },
            { key: 'bm_subordinate_eval_feedback', name_en: '32. Performance evaluation and constructive feedback to staff', name_bn: '৩২. অধীনস্তদের কর্মক্ষমতা মূল্যায়ন ও ফিডব্যাক প্রদান', max: 2 },
            { key: 'bm_discipline_office_management', name_en: '33. Ensuring office discipline and administrative order', name_bn: '৩৩. শৃঙ্খলা ও অফিস ব্যবস্থাপনা নিশ্চিতকরণ', max: 2 },
        ]
    },
    {
        section_key: 'G',
        section_name_en: 'G. Customer & Member Relationship Management (08 Marks)',
        section_name_bn: 'ছ. গ্রাহক/সদস্য ব্যবস্থাপনা (০৮ নম্বর)',
        items: [
            { key: 'bm_professional_member_conduct', name_en: '34. Professional conduct with members and borrowers', name_bn: '৩৪. সদস্য/ঋণগ্রহীতার সঙ্গে পেশাদার আচরণ', max: 2 },
            { key: 'bm_member_grievance_redress', name_en: '35. Redressal of member grievances and complaints', name_bn: '৩৫. সদস্যদের অভিযোগ ও সমস্যা সমাধান', max: 2 },
            { key: 'bm_member_retention_relation', name_en: '36. Member retention and relationship development', name_bn: '৩৬. সদস্য ধরে রাখা ও সম্পর্ক উন্নয়ন', max: 2 },
            { key: 'bm_field_level_communication', name_en: '37. Effective communication at the field level', name_bn: '৩৭. মাঠ পর্যায়ে কার্যকর যোগাযোগ', max: 2 },
        ]
    },
    {
        section_key: 'H',
        section_name_en: 'H. Personal Competency, Behavior & Ethics (10 Marks)',
        section_name_bn: 'জ. ব্যক্তিগত দক্ষতা, আচরণ ও মূল্যবোধ (১০ নম্বর)',
        items: [
            { key: 'bm_honesty_ethics', name_en: '38. Honesty and ethics', name_bn: '৩৮. সততা ও নৈতিকতা', max: 2 },
            { key: 'bm_sense_responsibility_duty', name_en: '39. Sense of responsibility and dutifulness', name_bn: '৩৯. দায়িত্ববোধ ও কর্তব্যপরায়ণতা', max: 2 },
            { key: 'bm_punctuality_regular_attendance', name_en: '40. Punctuality and regular attendance', name_bn: '৪০. সময়ানুবর্তিতা ও নিয়মিত উপস্থিতি', max: 1 },
            { key: 'bm_interpersonal_communication', name_en: '41. Interpersonal communication skills', name_bn: '৪১. যোগাযোগ দক্ষতা', max: 2 },
            { key: 'bm_problem_solve_decision_making', name_en: '42. Problem solving and decision making capability', name_bn: '৪২. সমস্যা সমাধান ও সিদ্ধান্ত গ্রহণ', max: 1 },
            { key: 'bm_work_under_pressure', name_en: '43. Ability to perform effectively under pressure', name_bn: '৪৩. চাপের মধ্যে কাজ করার সক্ষমতা', max: 1 },
            { key: 'bm_adaptability_change', name_en: '44. Ability to adapt to changes and new environments', name_bn: '৪৪. পরিবর্তনের সঙ্গে খাপ খাওয়ানোর সক্ষমতা', max: 1 },
        ]
    },
    {
        section_key: 'I',
        section_name_en: 'I. Training/Meeting Participation & Learning Capacity (07 Marks)',
        section_name_bn: 'ঝ. প্রশিক্ষণ/মিটিং অংশগ্রহণ ও শেখার সক্ষমতা (০৭ নম্বর)',
        items: [
            { key: 'bm_meeting_training_active_part', name_en: '45. Active participation in meetings and training sessions', name_bn: '৪৫. প্রশিক্ষণ/মিটিং-এ সক্রিয় অংশগ্রহণ', max: 1 },
            { key: 'bm_learn_new_rules_quickly', name_en: '46. Ability to quickly learn new policies and processes', name_bn: '৪৬. নতুন নিয়ম/পদ্ধতি দ্রুত শেখার সক্ষমতা', max: 2 },
            { key: 'bm_apply_training_knowledge', name_en: '47. Practical application of training knowledge in work', name_bn: '৪৭. প্রশিক্ষণলব্ধ জ্ঞান বাস্তবে প্রয়োগ', max: 2 },
            { key: 'bm_senior_guidance_apply', name_en: '48. Accepting and applying advice from senior officials', name_bn: '৪৮. ঊর্ধ্বতন কর্মকর্তার পরামর্শ গ্রহণ ও প্রয়োগ', max: 1 },
            { key: 'bm_self_learning_enthusiasm', name_en: '49. Self-learning and self-initiated enthusiasm', name_bn: '৪৯. Self-learning/নিজ উদ্যোগে শেখার আগ্রহ', max: 1 },
        ]
    }
];

export function getFormStructure(formType: string): SectionStructure[] {
    switch (formType) {
        case 'accountant':
            return formBStructure;
        case 'bm_and_above':
            return formCStructure;
        case 'officer_abm':
        default:
            return formAStructure;
    }
}

export function calculateGrade(score: number): {
    grade: 'excellent' | 'very_good' | 'good' | 'not_satisfactory';
    labelBn: string;
    labelEn: string;
    badgeVariant: 'default' | 'secondary' | 'outline' | 'destructive';
} {
    if (score >= 85) {
        return {
            grade: 'excellent',
            labelBn: 'Excellent (স্থায়ীকরণের জন্য অত্যন্ত উপযুক্ত)',
            labelEn: 'Excellent (Highly Recommended for Confirmation)',
            badgeVariant: 'default',
        };
    } else if (score >= 65) {
        return {
            grade: 'very_good',
            labelBn: 'Very Good (স্থায়ীকরণের জন্য উপযুক্ত)',
            labelEn: 'Very Good (Recommended for Confirmation)',
            badgeVariant: 'secondary',
        };
    } else if (score >= 50) {
        return {
            grade: 'good',
            labelBn: 'Good (স্থায়ীকরণের জন্য বিবেচনাযোগ্য)',
            labelEn: 'Good (Eligible for Consideration)',
            badgeVariant: 'outline',
        };
    } else {
        return {
            grade: 'not_satisfactory',
            labelBn: 'Not Satisfactory (স্থায়ীকরণের জন্য অনুপযুক্ত)',
            labelEn: 'Not Satisfactory (Not Suitable for Confirmation)',
            badgeVariant: 'destructive',
        };
    }
}

export const confirmationTranslations = {
    bn: {
        pageTitle: 'শিক্ষানবিশকাল স্থায়ীকরণ মূল্যায়ন',
        pageSubtitle: 'প্রবেশনার কর্মকর্তাদের শিক্ষানবিশকাল সমাপ্তি ও স্থায়ীকরণ মূল্যায়নের আবেদন এবং অগ্রগতি',
        newEvaluation: 'নতুন স্থায়ীকরণ মূল্যায়ন',
        searchPlaceholder: 'কর্মীর পিন বা নাম দিয়ে খুঁজুন...',
        allStatuses: 'সকল স্ট্যাটাস',
        allForms: 'সকল ফরম',
        formA: 'ফরম ক (অফিসার ও এ.বি.এম)',
        formB: 'ফরম খ (হিসাবরক্ষক)',
        formC: 'ফরম গ (শাখা ব্যবস্থাপক তদূর্ধ্ব)',
        employee: 'কর্মীর বিবরণ',
        designation: 'পদবী',
        branch: 'শাখা ও অঞ্চল',
        joiningDate: 'যোগদানের তারিখ',
        probationEndDate: 'শিক্ষানবিসকাল সমাপ্তির তারিখ',
        scoreAndGrade: 'প্রাপ্ত নম্বর ও ফলাফল',
        recommendation: 'সুপারিশ',
        status: 'বর্তমান স্তর',
        actions: 'অ্যাকশন',
        view: 'বিস্তারিত দেখুন',
        edit: 'সম্পাদনা',
        print: 'প্রিন্ট রিপোর্ট',
        delete: 'মুছে ফেলুন',
        quickApprove: 'দ্রুত অনুমোদন / ফরোয়ার্ড',
        sendBack: 'ফেরত পাঠান (Send Back)',
        totalEvaluations: 'মোট মূল্যায়ন',
        pendingApprovals: 'অনুমোদনের অপেক্ষায়',
        approvedConfirmations: 'অনুমোদিত স্থায়ীকরণ',
        recommendedCandidates: 'স্থায়ীকরণের সুপারিশকৃত',
        draft: 'খসড়া (Draft)',
        recommended: 'স্থায়ীকরণের জন্য সুপারিশকৃত',
        extendProbation: 'শিক্ষানবিসকাল বর্ধিতকরণ',
        notSuitable: 'স্থায়ীকরণের অনুপযুক্ত (অব্যাহতি)',
    },
    en: {
        pageTitle: 'Confirmation Evaluations',
        pageSubtitle: 'Probation employee performance evaluation for permanent confirmation approval',
        newEvaluation: 'New Confirmation Evaluation',
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
        probationEndDate: 'Probation End Date',
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
        approvedConfirmations: 'Approved Confirmations',
        recommendedCandidates: 'Recommended for Confirmation',
        draft: 'Draft',
        recommended: 'Recommended for Confirmation',
        extendProbation: 'Extend Probation',
        notSuitable: 'Not Suitable (Discharge)',
    }
};

export const toBn = (num: number | string | null | undefined): string => {
    if (num === null || num === undefined || num === '') return '';
    const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return String(num).replace(/\d/g, (d) => bnDigits[Number(d)]);
};

export const formatClosingMonth = (val?: string | null, targetLang: 'bn' | 'en' = 'bn') => {
    if (!val) return '__________________';
    const str = String(val).trim();
    if (/^\d{4}-\d{2}$/.test(str)) {
        const [year, monthStr] = str.split('-');
        const monthNum = parseInt(monthStr, 10);
        const bnMonths = [
            'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
            'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
        ];
        const enMonths = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        if (monthNum >= 1 && monthNum <= 12) {
            if (targetLang === 'bn') {
                return `${bnMonths[monthNum - 1]} ${toBn(year)}`;
            } else {
                return `${enMonths[monthNum - 1]} ${year}`;
            }
        }
    }
    return targetLang === 'bn' ? toBn(str) : str;
};

