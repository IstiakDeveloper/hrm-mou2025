<?php

namespace Database\Seeders;

use App\Models\EvaluationCriterion;
use App\Models\EvaluationSection;
use App\Models\EvaluationTemplate;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ConfirmationEvaluationTemplateSeeder extends Seeder
{
    public function run(): void
    {
        $templates = [
            [
                'code' => 'conf_officer_abm',
                'appraisal_type' => 'confirmation',
                'category_name_bn' => 'স্থায়ীকরণ মূল্যায়ন',
                'category_name_en' => 'Confirmation Evaluation',
                'title_en' => 'Form A: Field Officer, Program Officer & ABM Confirmation Evaluation',
                'title_bn' => 'ফরম ক: মাঠ কর্মকর্তা, কর্মসূচি কর্মকর্তা ও সহকারী শাখা ব্যবস্থাপক স্থায়ীকরণ মূল্যায়ন',
                'description' => 'শিক্ষানবিশকালে কর্মরত মাঠ কর্মকর্তা, কর্মসূচি কর্মকর্তা ও সহকারী শাখা ব্যবস্থাপকদের চাকরি স্থায়ীকরণের মূল্যায়ন ফরম।',
                'total_marks' => 100,
                'sections' => [
                    [
                        'section_key' => 'A',
                        'name_en' => 'A. Targets & Achievements (45 Marks)',
                        'name_bn' => 'ক. লক্ষ্যমাত্রা ও অর্জন (Target and achievements)-৪৫ নম্বর',
                        'max_marks' => 45,
                        'items' => [
                            ['key' => 'loan_outstanding_growth', 'en' => '1. Loan outstanding growth according to target', 'bn' => '১. লক্ষ্যমাত্রা অনুযায়ী ঋণস্থিতি বৃদ্ধি', 'max' => 10],
                            ['key' => 'loan_recovery_rate', 'en' => '2. Loan Recovery Rate', 'bn' => '২. ঋণ আদায়ের হার (Recovery Rate)', 'max' => 10],
                            ['key' => 'par_maintenance', 'en' => '3. Maintaining standard PAR rate', 'bn' => '৩. PAR এর মান বজায় রাখা', 'max' => 10],
                            ['key' => 'borrower_growth', 'en' => '4. Borrower growth according to target', 'bn' => '৪. লক্ষ্যমাত্রা অনুযায়ী ঋণী বৃদ্ধি', 'max' => 5],
                            ['key' => 'active_member_retention', 'en' => '5. Maintaining standard rate of active member retention', 'bn' => '৫. সক্রিয় সদস্য ধরে রাখার হার-এ আদর্শ মান বজায় রাখা', 'max' => 5],
                            ['key' => 'savings_growth', 'en' => '6. Savings / deposit collection and retention target achievement', 'bn' => '৬. সঞ্চয়/আমানত সংগ্রহ ও ধরে রাখা লক্ষ্যমাত্রা অনুযায়ী অর্জন', 'max' => 5],
                        ],
                    ],
                    [
                        'section_key' => 'B',
                        'name_en' => 'B. Skills & Competency (25 Marks)',
                        'name_bn' => 'খ. দক্ষতা ও কাজের মান (Skills & Competency)-২৫ নম্বর',
                        'max_marks' => 25,
                        'items' => [
                            ['key' => 'member_survey_loan_eval', 'en' => '7. Member survey and loan assessment competency', 'bn' => '৭. সদস্য জরিপ ও ঋণ মূল্যায়নের দক্ষতা', 'max' => 5],
                            ['key' => 'compliance_policy_order', 'en' => '8. Compliance with organization policies and office orders', 'bn' => '৮. প্রতিষ্ঠানের নীতিমালা ও অফিস আদেশ অনুসরণ', 'max' => 4],
                            ['key' => 'documentation_preservation', 'en' => '9. Documentation and record keeping', 'bn' => '৯. নথিপত্র সংরক্ষণ', 'max' => 4],
                            ['key' => 'reporting_accuracy_timeliness', 'en' => '10. Accuracy in reporting and timely preparation / submission', 'bn' => '১০. রিপোর্টিংয়ের নির্ভুলতা ও সঠিক সময়ে রিপোর্ট তৈরি/উপস্থাপন', 'max' => 4],
                            ['key' => 'mis_software_skill', 'en' => '11. Competency in using MIS / software', 'bn' => '১১. MIS/সফটওয়্যার ব্যবহারের দক্ষতা', 'max' => 4],
                            ['key' => 'credit_risk_mitigation', 'en' => '12. Identification of credit risks and preventive measures', 'bn' => '১২. ঋণঝুঁকি শনাক্তকরণ ও প্রতিরোধমূলক ব্যবস্থা গ্রহণ', 'max' => 4],
                        ],
                    ],
                    [
                        'section_key' => 'C',
                        'name_en' => 'C. Personal Skills & Behavior (20 Marks)',
                        'name_bn' => 'গ. ব্যক্তিগত দক্ষতা ও আচরণ (Personal skills and behavior)-২০ নম্বর',
                        'max_marks' => 20,
                        'items' => [
                            ['key' => 'honesty_transparency_accountability', 'en' => '13. Honesty, transparency and financial accountability', 'bn' => '১৩. সততা, স্বচ্ছতা ও আর্থিক জবাবদিহিতা', 'max' => 5],
                            ['key' => 'member_conduct_service', 'en' => '14. Professional conduct towards members and client service', 'bn' => '১৪. সদস্যদের সাথে আচরণ ও গ্রাহকসেবা', 'max' => 4],
                            ['key' => 'communication_networking', 'en' => '15. Communication and networking skills', 'bn' => '১৫. যোগাযোগ ও নেটওয়ার্কিং দক্ষতা', 'max' => 3],
                            ['key' => 'teamwork_collaboration', 'en' => '16. Teamwork and peer collaboration', 'bn' => '১৬. দলগত কাজ ও সহকর্মীদের সহযোগিতা', 'max' => 3],
                            ['key' => 'problem_solving_decision', 'en' => '17. Problem solving and decision making', 'bn' => '১৭. সমস্যা সমাধান ও সিদ্ধান্ত গ্রহণ', 'max' => 3],
                            ['key' => 'leadership_potential', 'en' => '18. Leadership potential', 'bn' => '১৮. নেতৃত্বের সম্ভাবনা', 'max' => 2],
                        ],
                    ],
                    [
                        'section_key' => 'D',
                        'name_en' => 'D. Discipline & Personal Qualities (10 Marks)',
                        'name_bn' => 'ঘ. শৃঙ্খলা ও ব্যক্তিগত গুণাবলী (Discipline and personal qualities)-১০ নম্বর',
                        'max_marks' => 10,
                        'items' => [
                            ['key' => 'attendance_punctuality', 'en' => '19. Attendance and punctuality', 'bn' => '১৯. উপস্থিতি ও সময়ানুবর্তিতা', 'max' => 3],
                            ['key' => 'office_discipline_values', 'en' => '20. Adhering to office discipline and institutional values', 'bn' => '২০. অফিস শৃঙ্খলা মেনে চলা ও প্রতিষ্ঠানের মূল্যবোধ ধারণ', 'max' => 2],
                            ['key' => 'coaching_mentoring_juniors', 'en' => '21. Coaching, mentoring and guiding subordinates / juniors', 'bn' => '২১. অধীনস্থ/জুনিয়রদের কোচিং/মেন্টরিং/কাজ শেখানো', 'max' => 3],
                            ['key' => 'future_promotion_potential', 'en' => '22. Potential to assume higher responsibilities in future', 'bn' => '২২. ভবিষ্যৎ উচ্চতর পদে দায়িত্ব পালনের সম্ভাবনা', 'max' => 2],
                        ],
                    ],
                ],
            ],
            [
                'code' => 'conf_accountant',
                'appraisal_type' => 'confirmation',
                'category_name_bn' => 'স্থায়ীকরণ মূল্যায়ন',
                'category_name_en' => 'Confirmation Evaluation',
                'title_en' => 'Form B: Branch Accountant & Junior Accountant Confirmation Evaluation',
                'title_bn' => 'ফরম খ: শাখা হিসাবরক্ষক ও জুনিয়র হিসাবরক্ষক স্থায়ীকরণ মূল্যায়ন',
                'description' => 'শিক্ষানবিশকালে কর্মরত শাখা হিসাবরক্ষক ও জুনিয়র হিসাবরক্ষকদের চাকরি স্থায়ীকরণের মূল্যায়ন ফরম।',
                'total_marks' => 100,
                'sections' => [
                    [
                        'section_key' => 'A',
                        'name_en' => 'A. Bookkeeping & Financial Management (20 Marks)',
                        'name_bn' => 'ক. হিসাব সংরক্ষণ ও আর্থিক ব্যবস্থাপনা (২০ নম্বর)',
                        'max_marks' => 20,
                        'items' => [
                            ['key' => 'acc_daily_trans', 'en' => '1. Proper recording of daily transactions', 'bn' => '১. দৈনিক লেনদেন যথাযথভাবে হিসাবভুক্ত করা', 'max' => 2],
                            ['key' => 'acc_cash_book', 'en' => '2. Accurate maintenance of Cash Book', 'bn' => '২. Cash Book সঠিকভাবে সংরক্ষণ করা', 'max' => 2],
                            ['key' => 'acc_ledger_upkeep', 'en' => '3. Proper maintenance of Ledger / accounts books', 'bn' => '৩. Ledger/হিসাব খাতা সঠিকভাবে সংরক্ষণ', 'max' => 2],
                            ['key' => 'acc_debit_credit', 'en' => '4. Correct application of Debit and Credit', 'bn' => '৪. Debit ও Credit-এর সঠিক প্রয়োগ', 'max' => 2],
                            ['key' => 'acc_voucher_prep', 'en' => '5. Proficiency in voucher preparation and verification', 'bn' => '৫. Voucher প্রস্তুত ও যাচাইয়ের দক্ষতা', 'max' => 2],
                            ['key' => 'acc_classification', 'en' => '6. Correct accounting classification', 'bn' => '৬. হিসাবের শ্রেণিবিন্যাস সঠিকভাবে করা', 'max' => 2],
                            ['key' => 'acc_daily_closing', 'en' => '7. Timely and accurate daily accounts closing', 'bn' => '৭. দৈনিক হিসাব Closing সঠিকভাবে সম্পন্ন করা', 'max' => 2],
                            ['key' => 'acc_error_identify', 'en' => '8. Ability to identify accounting errors / mismatches', 'bn' => '৮. হিসাবের ভুল/অমিল শনাক্ত করার সক্ষমতা', 'max' => 2],
                            ['key' => 'acc_correction_procedure', 'en' => '9. Following proper procedures for accounting adjustments', 'bn' => '৯. হিসাব সংশোধনের ক্ষেত্রে যথাযথ পদ্ধতি অনুসরণ', 'max' => 2],
                            ['key' => 'acc_record_discipline', 'en' => '10. Discipline in maintaining accounting records', 'bn' => '১০. হিসাবের রেকর্ড সংরক্ষণে শৃঙ্খলা', 'max' => 2],
                        ],
                    ],
                    [
                        'section_key' => 'B',
                        'name_en' => 'B. Loan Operations Accounting Management (15 Marks)',
                        'name_bn' => 'খ. ঋণ কার্যক্রমের হিসাব ব্যবস্থাপনা (১৫ নম্বর)',
                        'max_marks' => 15,
                        'items' => [
                            ['key' => 'loan_disburse_record', 'en' => '11. Proper recording of loan disbursement', 'bn' => '১১. ঋণ বিতরণের হিসাব সঠিকভাবে সংরক্ষণ', 'max' => 2],
                            ['key' => 'loan_recovery_record', 'en' => '12. Accurate recording of loan installment / collection', 'bn' => '১২. ঋণের কিস্তি/আদায় হিসাব সঠিকভাবে রেকর্ড', 'max' => 2],
                            ['key' => 'loan_reconciliation', 'en' => '13. Verification and reconciliation between collection and accounts', 'bn' => '১৩. ঋণ আদায় ও হিসাবের মধ্যে সামঞ্জস্য যাচাই', 'max' => 2],
                            ['key' => 'savings_record_skill', 'en' => '14. Proficiency in maintaining deposit / savings accounts', 'bn' => '১৪. আমানত/সঞ্চয় হিসাব সংরক্ষণে দক্ষতা', 'max' => 2],
                            ['key' => 'loan_overdue_concept', 'en' => '15. Understanding of loan overdue / default accounting', 'bn' => '১৫. ঋণ বকেয়া/Overdue হিসাব সম্পর্কে ধারণা', 'max' => 2],
                            ['key' => 'loan_voucher_verify', 'en' => '16. Verification of loan related vouchers / receipts', 'bn' => '১৬. ঋণ সংক্রান্ত Voucher/রশিদ যাচাই', 'max' => 2],
                            ['key' => 'loan_software_verify', 'en' => '17. Verifying data in Loan Ledger / Software', 'bn' => '১৭. Loan Ledger/Software-এ তথ্য যাচাই', 'max' => 1],
                            ['key' => 'loan_daily_coord', 'en' => '18. Daily accounts adjustment of loan operations', 'bn' => '১৮. ঋণ কার্যক্রমের দৈনিক হিসাব সমন্বয়', 'max' => 2],
                        ],
                    ],
                    [
                        'section_key' => 'C',
                        'name_en' => 'C. Cash Management & Currency Handling (10 Marks)',
                        'name_bn' => 'গ. নগদ অর্থ ও Cash Management (১০ নম্বর)',
                        'max_marks' => 10,
                        'items' => [
                            ['key' => 'cash_in_out_precaution', 'en' => '19. Care and precaution in cash receipt and disbursement', 'bn' => '১৯. নগদ গ্রহণ ও প্রদানের ক্ষেত্রে সতর্কতা', 'max' => 2],
                            ['key' => 'cash_balance_match', 'en' => '20. Matching physical cash balance with book balance', 'bn' => '২০. Cash Balance ও Book Balance মিলিয়ে দেখা', 'max' => 2],
                            ['key' => 'cash_count_accurate', 'en' => '21. Performing cash count accurately', 'bn' => '২১. Cash Count সঠিকভাবে সম্পন্ন করা', 'max' => 2],
                            ['key' => 'cash_short_excess_report', 'en' => '22. Identifying and reporting cash shortage / excess', 'bn' => '২২. Cash shortage/excess শনাক্ত ও রিপোর্ট করা', 'max' => 2],
                            ['key' => 'cash_limit_compliance', 'en' => '23. Adherence to cash in hand limits and organizational guidelines', 'bn' => '২৩. Cash in hand limit ও সংস্থার নির্দেশনা অনুসরণ', 'max' => 2],
                        ],
                    ],
                    [
                        'section_key' => 'D',
                        'name_en' => 'D. Bank & Banking Operations (10 Marks)',
                        'name_bn' => 'ঘ. ব্যাংক ও ব্যাংকিং কার্যক্রম (১০ নম্বর)',
                        'max_marks' => 10,
                        'items' => [
                            ['key' => 'bank_dep_with_record', 'en' => '24. Recording bank deposits and withdrawals', 'bn' => '২৪. ব্যাংক জমা/উত্তোলনের হিসাব সংরক্ষণ', 'max' => 2],
                            ['key' => 'cheque_book_preserve', 'en' => '25. Proper upkeep and security of cheque books', 'bn' => '২৫. চেক বই সঠিকভাবে সংরক্ষণ', 'max' => 2],
                            ['key' => 'bank_reconciliation_concept', 'en' => '26. Concept and practical application of Bank Reconciliation', 'bn' => '২৬. Bank Reconciliation-এর ধারণা ও প্রয়োগ', 'max' => 2],
                            ['key' => 'bank_voucher_docs_verify', 'en' => '27. Verification of bank vouchers and related documents', 'bn' => '২৭. ব্যাংক সংক্রান্ত Voucher ও নথিপত্র যাচাই', 'max' => 2],
                            ['key' => 'bank_org_control_follow', 'en' => '28. Following organization internal controls in banking transactions', 'bn' => '২৮. ব্যাংক লেনদেনে সংস্থার নিয়ন্ত্রণ পদ্ধতি অনুসরণ', 'max' => 2],
                        ],
                    ],
                    [
                        'section_key' => 'E',
                        'name_en' => 'E. Computer & Software Utilization (15 Marks)',
                        'name_bn' => 'ঙ. Computer ও Software ব্যবহার (১৫ নম্বর)',
                        'max_marks' => 15,
                        'items' => [
                            ['key' => 'comp_accurate_data_entry', 'en' => '29. Flawless data entry into software', 'bn' => '২৯. Software-এ নির্ভুল Data entry', 'max' => 3],
                            ['key' => 'comp_software_reports_skill', 'en' => '30. Proficiency in generating and interpreting software reports', 'bn' => '৩০. Software-এর যাবতীয় রিপোর্ট সম্পর্কে দক্ষতা', 'max' => 3],
                            ['key' => 'comp_excel_formula_skill', 'en' => '31. Proficiency in Microsoft Excel including formulas', 'bn' => '৩১. ফর্মুলা সহ Microsoft Excel ব্যবহারের দক্ষতা', 'max' => 3],
                            ['key' => 'comp_word_bangla_typing', 'en' => '32. Ability to write official letters in MS Word with Bangla typing', 'bn' => '৩২. বাংলা টাইপিং সহ Microsoft Word-এ বিভিন্ন চিঠিপত্র লেখার দক্ষতা', 'max' => 3],
                            ['key' => 'comp_day_end_process', 'en' => '33. Timely completion of Day End Process in software', 'bn' => '৩৩. নির্দিষ্ট সময়ে Software-এ Day End Process সম্পন্ন করা', 'max' => 3],
                        ],
                    ],
                    [
                        'section_key' => 'F',
                        'name_en' => 'F. Internal Control & Compliance (10 Marks)',
                        'name_bn' => 'চ. অভ্যন্তরীণ নিয়ন্ত্রণ ও Compliance (১০ নম্বর)',
                        'max_marks' => 10,
                        'items' => [
                            ['key' => 'comp_fin_policy_follow', 'en' => '34. Compliance with organizational financial policy', 'bn' => '৩৪. সংস্থার আর্থিক নীতিমালা অনুসরণ', 'max' => 2],
                            ['key' => 'comp_approval_process_follow', 'en' => '35. Strict adherence to authorization / approval process', 'bn' => '৩৫. অনুমোদন প্রক্রিয়া যথাযথভাবে অনুসরণ', 'max' => 2],
                            ['key' => 'comp_voucher_support_docs', 'en' => '36. Safe retention of vouchers and supporting documents', 'bn' => '৩৬. Voucher ও supporting documents সংরক্ষণ', 'max' => 2],
                            ['key' => 'comp_internal_control_aware', 'en' => '37. Awareness and practice of internal controls', 'bn' => '৩৭. Internal Control সম্পর্কে সচেতনতা', 'max' => 2],
                            ['key' => 'comp_audit_accounts_ready', 'en' => '38. Keeping accounts up to date and ready for audit / inspection', 'bn' => '৩৮. Audit/পরিদর্শনের জন্য হিসাব প্রস্তুত রাখা', 'max' => 2],
                        ],
                    ],
                    [
                        'section_key' => 'G',
                        'name_en' => 'G. Reporting & Communication (05 Marks)',
                        'name_bn' => 'ছ. Reporting ও যোগাযোগ (০৫ নম্বর)',
                        'max_marks' => 5,
                        'items' => [
                            ['key' => 'rep_timely_submission', 'en' => '39. Preparation and timely submission of monthly/periodical reports', 'bn' => '৩৯. মাসিক/পর্যায়ক্রমিক রিপোর্ট তৈরি ও সময়মতো পাঠানো', 'max' => 2],
                            ['key' => 'rep_error_free_reports', 'en' => '40. Error-free and reliable reporting', 'bn' => '৪০. নির্ভুল তথ্য ও রিপোর্টের বিশ্বাসযোগ্যতা', 'max' => 2],
                            ['key' => 'rep_senior_colleague_coord', 'en' => '41. Coordination with Branch Manager and colleagues', 'bn' => '৪১. শাখা ব্যবস্থাপক ও সহকর্মীদের সাথে সমন্বয়', 'max' => 1],
                        ],
                    ],
                    [
                        'section_key' => 'H',
                        'name_en' => 'H. Office Discipline & Conduct (08 Marks)',
                        'name_bn' => 'জ. অফিস শৃঙ্খলা ও আচরণ (০৮ নম্বর)',
                        'max_marks' => 8,
                        'items' => [
                            ['key' => 'disc_attendance_punctual', 'en' => '42. Regular attendance and punctuality', 'bn' => '৪২. নিয়মিত উপস্থিতি ও সময়ানুবর্তিতা', 'max' => 2],
                            ['key' => 'disc_asset_paper_care', 'en' => '43. Proper care and preservation of office files and assets', 'bn' => '৪৩. অফিসের নথিপত্র ও সম্পদের যত্ন নেওয়া', 'max' => 2],
                            ['key' => 'disc_member_colleague_behavior', 'en' => '44. Polite behavior towards members and colleagues', 'bn' => '৪৪. সহকর্মী ও সদস্যদের সাথে শালীন আচরণ', 'max' => 2],
                            ['key' => 'disc_confidentiality', 'en' => '45. Maintaining organizational confidentiality', 'bn' => '৪৫. সংস্থার গোপনীয়তা বজায় রাখা', 'max' => 2],
                        ],
                    ],
                    [
                        'section_key' => 'I',
                        'name_en' => 'I. Professional Development & Responsibility (07 Marks)',
                        'name_bn' => 'ঝ. পেশাগত আগ্রহ ও দায়িত্বশীলতা (০৭ নম্বর)',
                        'max_marks' => 7,
                        'items' => [
                            ['key' => 'prof_new_rules_interest', 'en' => '46. Interest in learning new rules and accounting techniques', 'bn' => '৪৬. নতুন নিয়ম ও অ্যাকাউন্টিং পদ্ধতি শেখার আগ্রহ', 'max' => 2],
                            ['key' => 'prof_responsibility_sense', 'en' => '47. High sense of responsibility and dedication towards work', 'bn' => '৪৭. কাজের প্রতি দায়িত্ববোধ ও একাগ্রতা', 'max' => 2],
                            ['key' => 'prof_future_reliability', 'en' => '48. Reliability in handling higher responsibilities in future', 'bn' => '৪৮. ভবিষ্যতে বড় দায়িত্ব পালনের সক্ষমতা ও নির্ভরযোগ্যতা', 'max' => 3],
                        ],
                    ],
                ],
            ],
            [
                'code' => 'conf_bm_and_above',
                'appraisal_type' => 'confirmation',
                'category_name_bn' => 'স্থায়ীকরণ মূল্যায়ন',
                'category_name_en' => 'Confirmation Evaluation',
                'title_en' => 'Form C: Branch Manager to Zonal Manager Confirmation Evaluation',
                'title_bn' => 'ফরম গ: শাখা ব্যবস্থাপক থেকে তদূর্ধ্ব কর্মীদের স্থায়ীকরণ মূল্যায়ন',
                'description' => 'শিক্ষানবিশকালে কর্মরত শাখা ব্যবস্থাপক, আঞ্চলিক ব্যবস্থাপক ও জোনাল ম্যানেজারদের চাকরি স্থায়ীকরণের মূল্যায়ন ফরম।',
                'total_marks' => 100,
                'sections' => [
                    [
                        'section_key' => 'A',
                        'name_en' => 'A. Branch Management & Leadership (15 Marks)',
                        'name_bn' => 'ক. শাখা ব্যবস্থাপনা ও নেতৃত্ব (১৫ নম্বর)',
                        'max_marks' => 15,
                        'items' => [
                            ['key' => 'bm_effective_planning_lead', 'en' => '1. Effective planning and leadership', 'bn' => '১. শাখার সামগ্রিক কার্যক্রমে কার্যকর পরিকল্পনা ও নেতৃত্ব', 'max' => 3],
                            ['key' => 'bm_team_guidance_motivation', 'en' => '2. Subordinate team guidance and motivation', 'bn' => '২. অধীনস্থ কর্মীদের কাজ তদারকি, পরিচালনা ও উৎসাহ প্রদান', 'max' => 3],
                            ['key' => 'bm_timely_decision_making', 'en' => '3. Timely and appropriate decision making', 'bn' => '৩. সঠিক সময়ে সঠিক সিদ্ধান্ত গ্রহণের সক্ষমতা', 'max' => 3],
                            ['key' => 'bm_fair_work_distribution', 'en' => '4. Fair work distribution and coordination among team members', 'bn' => '৪. সহকর্মীদের মধ্যে কাজের সুষম বণ্টন ও সমন্বয়', 'max' => 3],
                            ['key' => 'bm_crisis_problem_management', 'en' => '5. Crisis handling and field problem management ability', 'bn' => '৫. জরুরি পরিস্থিতি ও সমস্যা মোকাবিলার দক্ষতা', 'max' => 3],
                        ],
                    ],
                    [
                        'section_key' => 'B',
                        'name_en' => 'B. Program Operations & Target Achievement (15 Marks)',
                        'name_bn' => 'খ. কর্মসূচি পরিচালনা ও লক্ষ্যমাত্রা অর্জন (১৫ নম্বর)',
                        'max_marks' => 15,
                        'items' => [
                            ['key' => 'bm_member_borrower_target', 'en' => '6. Member and borrower enrollment according to target', 'bn' => '৬. লক্ষ্যমাত্রা অনুযায়ী সদস্য ও ঋণী ভর্তি', 'max' => 3],
                            ['key' => 'bm_loan_disbursement_quality', 'en' => '7. Loan disbursement according to plan and quality maintenance', 'bn' => '৭. পরিকল্পনা অনুযায়ী ঋণ বিতরণ ও ঋণের গুণগত মান নিশ্চিতকরণ', 'max' => 3],
                            ['key' => 'bm_loan_recovery_regularity', 'en' => '8. Loan recovery rate and maintaining regular collections', 'bn' => '৮. ঋণ আদায়ের হার (Recovery Rate) বজায় রাখা ও নিয়মিত আদায়', 'max' => 3],
                            ['key' => 'bm_overdue_par_control', 'en' => '9. Keeping Overdue and PAR within targeted limits', 'bn' => '৯. খেলাপি ঋণ (Overdue) ও PAR নিয়ন্ত্রণে রাখা', 'max' => 3],
                            ['key' => 'bm_savings_mobilization_target', 'en' => '10. Savings mobilization according to target', 'bn' => '১০. সঞ্চয়/আমানত বৃদ্ধি লক্ষ্যমাত্রা অর্জন', 'max' => 3],
                        ],
                    ],
                    [
                        'section_key' => 'C',
                        'name_en' => 'C. Field Supervision, Monitoring & Community Relations (15 Marks)',
                        'name_bn' => 'গ. মাঠ তদারকি, মনিটরিং ও গণসংযোগ (১৫ নম্বর)',
                        'max_marks' => 15,
                        'items' => [
                            ['key' => 'bm_regular_samity_inspection', 'en' => '11. Regular field and center/samity visits', 'bn' => '১১. নিয়মিত মাঠ ও সমিতি পরিদর্শন', 'max' => 3],
                            ['key' => 'bm_loan_utilization_check', 'en' => '12. Verification of proper loan utilization', 'bn' => '১২. ঋণের সঠিক ব্যবহার যাচাই', 'max' => 3],
                            ['key' => 'bm_problematic_area_resolution', 'en' => '13. Direct intervention to resolve field bottlenecks', 'bn' => '১৩. সমস্যাযুক্ত এলাকায় নিজে উপস্থিত হয়ে সমাধান', 'max' => 3],
                            ['key' => 'bm_member_trust_relationship', 'en' => '14. Building cordial relationship and trust with members', 'bn' => '১৪. সদস্যদের সঙ্গে সৌহার্দ্যপূর্ণ সম্পর্ক ও আস্থা অর্জন', 'max' => 3],
                            ['key' => 'bm_local_community_networking', 'en' => '15. Networking with local administration and dignitaries', 'bn' => '১৫. স্থানীয় গণ্যমান্য ব্যক্তি ও প্রশাসনের সাথে যোগাযোগ', 'max' => 3],
                        ],
                    ],
                    [
                        'section_key' => 'D',
                        'name_en' => 'D. Financial Management, Accounts & Cash Discipline (12 Marks)',
                        'name_bn' => 'ঘ. আর্থিক ব্যবস্থাপনা, হিসাব ও নগদ শৃঙ্খলা (১২ নম্বর)',
                        'max_marks' => 12,
                        'items' => [
                            ['key' => 'bm_daily_cash_accounts_check', 'en' => '16. Daily cash verification and accounts monitoring', 'bn' => '১৬. দৈনিক হিসাব ও ক্যাশ নিয়মিত যাচাই', 'max' => 2],
                            ['key' => 'bm_bank_transaction_reconcile', 'en' => '17. Smooth bank transactions and reconciliation monitoring', 'bn' => '১৭. ব্যাংক লেনদেন ও সমন্বয় সঠিক রাখা', 'max' => 2],
                            ['key' => 'bm_cost_control_efficiency', 'en' => '18. Branch operational cost control and cost minimization', 'bn' => '১৮. ব্যয় নিয়ন্ত্রণ ও মিতব্যয়িতা বজায় রাখা', 'max' => 2],
                            ['key' => 'bm_financial_policy_adherence', 'en' => '19. Strict adherence to organizational financial policy', 'bn' => '১৯. আর্থিক নীতিমালা সঠিকভাবে অনুসরণ', 'max' => 2],
                            ['key' => 'bm_advance_settlement_timely', 'en' => '20. Timely adjustment of advances', 'bn' => '২০. অগ্রিম সমন্বয় সময়মতো সম্পন্ন করা', 'max' => 2],
                            ['key' => 'bm_cash_security_management', 'en' => '21. Strict security maintenance in cash preservation and transit', 'bn' => '২১. নগদ টাকা সংরক্ষণ ও পরিবহনে নিরাপত্তা ব্যবস্থা', 'max' => 2],
                        ],
                    ],
                    [
                        'section_key' => 'E',
                        'name_en' => 'E. Human Resource Management & Team Development (10 Marks)',
                        'name_bn' => 'ঙ. মানবসম্পদ ব্যবস্থাপনা ও টিম উন্নয়ন (১০ নম্বর)',
                        'max_marks' => 10,
                        'items' => [
                            ['key' => 'bm_staff_attendance_discipline', 'en' => '22. Maintaining staff attendance and discipline', 'bn' => '২২. কর্মীদের উপস্থিতি ও নিয়মানুবর্তিতা নিশ্চিত করা', 'max' => 2],
                            ['key' => 'bm_on_the_job_training_guidance', 'en' => '23. Mentoring subordinates and on-the-job training', 'bn' => '২৩. নতুন ও দুর্বল কর্মীদের কাজ শেখানো (Mentoring)', 'max' => 2],
                            ['key' => 'bm_staff_conflict_resolution', 'en' => '24. Resolving peer misunderstandings and conflict management', 'bn' => '২৪. কর্মীদের মধ্যে ভুল বোঝাবুঝি দূর করা ও সুষ্ঠু পরিবেশ বজায় রাখা', 'max' => 2],
                            ['key' => 'bm_staff_motivation_retention', 'en' => '25. Motivating staff to reduce job dissatisfaction and turnover', 'bn' => '২৫. কর্মীদের মনোবল বৃদ্ধি ও চাকরি ছাড়ার প্রবণতা হ্রাস', 'max' => 2],
                            ['key' => 'bm_objective_staff_evaluation', 'en' => '26. Impartial and objective staff performance evaluation', 'bn' => '২৬. কর্মীদের কাজের নিরপেক্ষ মূল্যায়ন ও প্রতিবেদন প্রদান', 'max' => 2],
                        ],
                    ],
                    [
                        'section_key' => 'F',
                        'name_en' => 'F. Internal Control, Compliance & Risk Management (08 Marks)',
                        'name_bn' => 'চ. অভ্যন্তরীণ নিয়ন্ত্রণ, কমপ্লায়েন্স ও ঝুঁকি ব্যবস্থাপনা (০৮ নম্বর)',
                        'max_marks' => 8,
                        'items' => [
                            ['key' => 'bm_policy_manual_circular_follow', 'en' => '27. Complying with organizational manuals and office circulars', 'bn' => '২৭. সংস্থার ম্যানুয়াল ও সার্কুলার সঠিকভাবে অনুসরণ', 'max' => 2],
                            ['key' => 'bm_audit_observation_rectify', 'en' => '28. Rapid rectification and response to audit observations', 'bn' => '২৮. অডিট ও পরিদর্শন আপত্তির দ্রুত নিষ্পত্তি', 'max' => 2],
                            ['key' => 'bm_fraud_irregularity_prevention', 'en' => '29. Preventing financial irregularities and fraud', 'bn' => '২৯. অনিয়ম ও জালিয়াতি প্রতিরোধে সতর্কতা', 'max' => 2],
                            ['key' => 'bm_risk_identification_resolution', 'en' => '30. Early risk identification and mitigating measures', 'bn' => '৩০. ঝুঁকি আগেই শনাক্তকরণ ও কার্যকর পদক্ষেপ গ্রহণ', 'max' => 2],
                        ],
                    ],
                    [
                        'section_key' => 'G',
                        'name_en' => 'G. Reporting, Office Management & IT Competency (06 Marks)',
                        'name_bn' => 'ছ. রিপোর্টিং, অফিস ব্যবস্থাপনা ও তথ্যপ্রযুক্তি ব্যবহার (০৬ নম্বর)',
                        'max_marks' => 6,
                        'items' => [
                            ['key' => 'bm_timely_accurate_reports_send', 'en' => '31. Timely and accurate submission of periodicals to head office', 'bn' => '৩১. সময়মতো ও নির্ভুলভাবে রিপোর্ট প্রদান', 'max' => 1],
                            ['key' => 'bm_software_mis_monitoring', 'en' => '32. Software usage and checking daily MIS reports', 'bn' => '৩২. সফটওয়্যার ব্যবহারে দক্ষতা ও তথ্য যাচাই', 'max' => 1],
                            ['key' => 'bm_cleanliness_decorum_upkeep', 'en' => '33. Maintaining branch neatness and environmental cleanliness', 'bn' => '৩৩. শাখা অফিসের পরিবেশ ও পরিচ্ছন্নতা রক্ষা', 'max' => 1],
                            ['key' => 'bm_office_asset_logistics_upkeep', 'en' => '34. Safe upkeep of office equipment and assets', 'bn' => '৩৪. অফিস সরঞ্জাম ও নথিপত্র যথাযথ সংরক্ষণ', 'max' => 1],
                            ['key' => 'bm_email_letter_communication', 'en' => '35. Professional official communication via email/letters', 'bn' => '৩৫. ইমেইল ও চিঠিপত্রে দ্রুত ও কার্যকর যোগাযোগ', 'max' => 2],
                        ],
                    ],
                    [
                        'section_key' => 'H',
                        'name_en' => 'H. Personal Skills, Behavior & Ethics (10 Marks)',
                        'name_bn' => 'জ. ব্যক্তিগত দক্ষতা, আচরণ ও মূল্যবোধ (১০ নম্বর)',
                        'max_marks' => 10,
                        'items' => [
                            ['key' => 'bm_honesty_ethics', 'en' => '36. Honesty and ethics', 'bn' => '৩৬. সততা ও নৈতিকতা', 'max' => 2],
                            ['key' => 'bm_sense_responsibility_duty', 'en' => '37. Sense of responsibility and dutifulness', 'bn' => '৩৭. দায়িত্ববোধ ও কর্তব্যপরায়ণতা', 'max' => 2],
                            ['key' => 'bm_punctuality_regular_attendance', 'en' => '38. Punctuality and regular attendance', 'bn' => '৩৮. সময়ানুবর্তিতা ও নিয়মিত উপস্থিতি', 'max' => 1],
                            ['key' => 'bm_interpersonal_communication', 'en' => '39. Interpersonal communication skills', 'bn' => '৩৯. যোগাযোগ দক্ষতা', 'max' => 2],
                            ['key' => 'bm_problem_solve_decision_making', 'en' => '40. Problem solving and decision making capability', 'bn' => '৪০. সমস্যা সমাধান ও সিদ্ধান্ত গ্রহণ', 'max' => 1],
                            ['key' => 'bm_work_under_pressure', 'en' => '41. Ability to perform effectively under pressure', 'bn' => '৪১. চাপের মধ্যে কাজ করার সক্ষমতা', 'max' => 1],
                            ['key' => 'bm_adaptability_change', 'en' => '42. Ability to adapt to changes and new environments', 'bn' => '৪২. পরিবর্তনের সঙ্গে খাপ খাওয়ানোর সক্ষমতা', 'max' => 1],
                        ],
                    ],
                    [
                        'section_key' => 'I',
                        'name_en' => 'I. Training/Meeting Participation & Learning Capacity (07 Marks)',
                        'name_bn' => 'ঝ. প্রশিক্ষণ/মিটিং অংশগ্রহণ ও শেখার সক্ষমতা (০৭ নম্বর)',
                        'max_marks' => 7,
                        'items' => [
                            ['key' => 'bm_meeting_training_active_part', 'en' => '43. Active participation in meetings and training sessions', 'bn' => '৪৩. প্রশিক্ষণ/মিটিং-এ সক্রিয় অংশগ্রহণ', 'max' => 1],
                            ['key' => 'bm_learn_new_rules_quickly', 'en' => '44. Ability to quickly learn new policies and processes', 'bn' => '৪৪. নতুন নিয়ম/পদ্ধতি দ্রুত শেখার সক্ষমতা', 'max' => 2],
                            ['key' => 'bm_apply_training_knowledge', 'en' => '45. Practical application of training knowledge in work', 'bn' => '৪৫. প্রশিক্ষণলব্ধ জ্ঞান বাস্তবে প্রয়োগ', 'max' => 2],
                            ['key' => 'bm_senior_guidance_apply', 'en' => '46. Accepting and applying advice from senior officials', 'bn' => '৪৬. ঊর্ধ্বতন কর্মকর্তার পরামর্শ গ্রহণ ও প্রয়োগ', 'max' => 1],
                            ['key' => 'bm_self_learning_enthusiasm', 'en' => '47. Self-learning and self-initiated enthusiasm', 'bn' => '৪৭. Self-learning/নিজ উদ্যোগে শেখার আগ্রহ', 'max' => 1],
                        ],
                    ],
                ],
            ],
        ];

        DB::transaction(function () use ($templates) {
            foreach ($templates as $tData) {
                $template = EvaluationTemplate::updateOrCreate(
                    ['code' => $tData['code']],
                    [
                        'appraisal_type' => $tData['appraisal_type'],
                        'category_name_bn' => $tData['category_name_bn'],
                        'category_name_en' => $tData['category_name_en'],
                        'description' => $tData['description'],
                        'title_en' => $tData['title_en'],
                        'title_bn' => $tData['title_bn'],
                        'total_marks' => $tData['total_marks'],
                        'is_active' => true,
                        'version' => 1,
                    ]
                );

                $secOrder = 1;
                foreach ($tData['sections'] as $sData) {
                    $section = EvaluationSection::updateOrCreate(
                        [
                            'template_id' => $template->id,
                            'section_key' => $sData['section_key'],
                        ],
                        [
                            'name_en' => $sData['name_en'],
                            'name_bn' => $sData['name_bn'],
                            'max_marks' => $sData['max_marks'],
                            'order' => $secOrder++,
                        ]
                    );

                    $critOrder = 1;
                    foreach ($sData['items'] as $item) {
                        EvaluationCriterion::updateOrCreate(
                            [
                                'section_id' => $section->id,
                                'criteria_key' => $item['key'],
                            ],
                            [
                                'name_en' => $item['en'],
                                'name_bn' => $item['bn'],
                                'max_score' => $item['max'],
                                'order' => $critOrder++,
                                'is_active' => true,
                            ]
                        );
                    }
                }
            }
        });
    }
}
