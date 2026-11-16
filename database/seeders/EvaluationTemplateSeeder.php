<?php

namespace Database\Seeders;

use App\Models\EvaluationCriterion;
use App\Models\EvaluationSection;
use App\Models\EvaluationTemplate;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class EvaluationTemplateSeeder extends Seeder
{
    public function run(): void
    {
        $templates = [
            [
                'code' => 'officer_abm',
                'title_en' => 'Form A: Field Officer, Program Officer & ABM',
                'title_bn' => 'ফরম ক: মাঠ কর্মকর্তা, কর্মসূচি কর্মকর্তা ও সহকারী শাখা ব্যবস্থাপক',
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
                'code' => 'accountant',
                'title_en' => 'Form B: Branch Accountant & Junior Accountant',
                'title_bn' => 'ফরম খ: শাখা হিসাবরক্ষক ও জুনিয়র হিসাবরক্ষক',
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
                        'name_en' => 'G. Integrity, Responsibility & Conduct (10 Marks)',
                        'name_bn' => 'ছ. সততা, দায়িত্বশীলতা ও আচরণ (১০ নম্বর)',
                        'max_marks' => 10,
                        'items' => [
                            ['key' => 'pers_honesty_ethics', 'en' => '39. Honesty and ethics', 'bn' => '৩৯. সততা ও নৈতিকতা', 'max' => 2],
                            ['key' => 'pers_duty_sincerity', 'en' => '40. Sincerity in performing duties', 'bn' => '৪০. দায়িত্ব পালনে আন্তরিকতা', 'max' => 2],
                            ['key' => 'pers_punctuality_attendance', 'en' => '41. Punctuality and attendance', 'bn' => '৪১. সময়ানুবর্তিতা ও উপস্থিতি', 'max' => 2],
                            ['key' => 'pers_confidential_fin_data', 'en' => '42. Maintaining confidentiality of sensitive financial information', 'bn' => '৪২. গোপনীয় আর্থিক তথ্য সংরক্ষণ', 'max' => 2],
                            ['key' => 'pers_colleague_senior_behavior', 'en' => '43. Courteous behavior towards colleagues and senior officials', 'bn' => '৪৩. সহকর্মী ও ঊর্ধ্বতন কর্মকর্তার সঙ্গে আচরণ', 'max' => 2],
                        ],
                    ],
                    [
                        'section_key' => 'H',
                        'name_en' => 'H. Eagerness to Learn & Problem Solving Ability (10 Marks)',
                        'name_bn' => 'জ. শেখার আগ্রহ ও সমস্যা সমাধানের সক্ষমতা (১০ নম্বর)',
                        'max_marks' => 10,
                        'items' => [
                            ['key' => 'learn_new_acc_method', 'en' => '44. Willingness and eagerness to learn new accounting methods', 'bn' => '৪৪. নতুন হিসাব পদ্ধতি শেখার আগ্রহ', 'max' => 2],
                            ['key' => 'learn_training_knowledge_apply', 'en' => '45. Practical application of training knowledge', 'bn' => '৪৫. প্রশিক্ষণ থেকে অর্জিত জ্ঞান কাজে প্রয়োগ', 'max' => 2],
                            ['key' => 'learn_problem_analysis_solve', 'en' => '46. Ability to analyze and solve accounting issues', 'bn' => '৪৬. হিসাবের সমস্যা বিশ্লেষণ ও সমাধানের চেষ্টা', 'max' => 2],
                            ['key' => 'learn_mistake_lesson_correct', 'en' => '47. Learning from errors and making constructive corrections', 'bn' => '৪৭. ভুল থেকে শিক্ষা গ্রহণ ও সংশোধন', 'max' => 2],
                            ['key' => 'learn_seek_advice_support', 'en' => '48. Ability to seek appropriate guidance and support when needed', 'bn' => '৪৮. প্রয়োজনীয় বিষয়ে পরামর্শ/সহায়তা চাওয়ার সক্ষমতা', 'max' => 2],
                        ],
                    ],
                ],
            ],
            [
                'code' => 'bm_and_above',
                'title_en' => 'Form C: Branch Manager to Higher Tier',
                'title_bn' => 'ফরম গ: শাখা ব্যবস্থাপক থেকে তদূর্ধ্ব কর্মীদের মূল্যায়ন',
                'total_marks' => 100,
                'sections' => [
                    [
                        'section_key' => 'A',
                        'name_en' => 'A. Loan Recovery & Portfolio Management (15 Marks)',
                        'name_bn' => 'ক. ঋণ আদায় ও পোর্টফোলিও ব্যবস্থাপনা (১৫ নম্বর)',
                        'max_marks' => 15,
                        'items' => [
                            ['key' => 'bm_regular_installment_recovery', 'en' => '1. Ensuring regular installment collection', 'bn' => '১. নিয়মিত কিস্তি আদায় নিশ্চিতকরণ', 'max' => 3],
                            ['key' => 'bm_overdue_identify_control', 'en' => '2. Identification and control of overdue loans', 'bn' => '২. বকেয়া ঋণ শনাক্তকরণ ও নিয়ন্ত্রণ', 'max' => 3],
                            ['key' => 'bm_risky_borrower_followup', 'en' => '3. Identifying risky borrowers and prompt follow-up', 'bn' => '৩. ঝুঁকিপূর্ণ ঋণগ্রহীতা শনাক্ত ও ফলোআপ', 'max' => 3],
                            ['key' => 'bm_recovery_plan_execution', 'en' => '4. Recovery planning and practical execution', 'bn' => '৪. আদায় পরিকল্পনা ও তার বাস্তবায়ন', 'max' => 2],
                            ['key' => 'bm_par_control', 'en' => '5. Controlling Portfolio at Risk (PAR)', 'bn' => '৫. Portfolio at Risk (PAR) নিয়ন্ত্রণ', 'max' => 3],
                            ['key' => 'bm_effective_overdue_action', 'en' => '6. Effective initiatives in overdue collection', 'bn' => '৬. বকেয়া আদায়ে কার্যকর উদ্যোগ', 'max' => 2],
                        ],
                    ],
                    [
                        'section_key' => 'B',
                        'name_en' => 'B. Loan Disbursement & Loan Management (15 Marks)',
                        'name_bn' => 'খ. ঋণ বিতরণ ও ঋণ ব্যবস্থাপনা (১৫ নম্বর)',
                        'max_marks' => 15,
                        'items' => [
                            ['key' => 'bm_loan_app_verify', 'en' => '7. Loan application verification and primary screening', 'bn' => '৭. ঋণ আবেদন যাচাই ও প্রাথমিক বাছাই', 'max' => 2],
                            ['key' => 'bm_borrower_eligibility_capacity', 'en' => '8. Verifying borrower eligibility and repayment capacity', 'bn' => '৮. ঋণগ্রহীতার যোগ্যতা ও সক্ষমতা যাচাই', 'max' => 2],
                            ['key' => 'bm_proposal_recommend_quality', 'en' => '9. Quality of recommendations in loan proposals', 'bn' => '৯. ঋণ প্রস্তাবে সুপারিশের মান', 'max' => 2],
                            ['key' => 'bm_loan_policy_process_follow', 'en' => '10. Adherence to credit policy and approval process', 'bn' => '১০. ঋণ নীতিমালা ও অনুমোদন প্রক্রিয়া অনুসরণ', 'max' => 3],
                            ['key' => 'bm_proper_loan_use_ensure', 'en' => '11. Ensuring proper utilization of disbursed loans', 'bn' => '১১. ঋণের সঠিক ব্যবহার নিশ্চিতকরণ', 'max' => 2],
                            ['key' => 'bm_disburse_transparency_control', 'en' => '12. Transparency and control in loan disbursement', 'bn' => '১২. ঋণ বিতরণে স্বচ্ছতা ও নিয়ন্ত্রণ', 'max' => 3],
                        ],
                    ],
                    [
                        'section_key' => 'C',
                        'name_en' => 'C. Financial & Accounts Management (10 Marks)',
                        'name_bn' => 'গ. আর্থিক ও হিসাব ব্যবস্থাপনা (১০ নম্বর)',
                        'max_marks' => 10,
                        'items' => [
                            ['key' => 'bm_daily_cash_bank_control', 'en' => '13. Control of daily cash and banking transactions', 'bn' => '১৩. দৈনিক নগদ ও ব্যাংক লেনদেনের নিয়ন্ত্রণ', 'max' => 2],
                            ['key' => 'bm_cashbook_records_verify', 'en' => '14. Verification of cash book and related records', 'bn' => '১৪. ক্যাশবুক ও সংশ্লিষ্ট রেকর্ড যাচাই', 'max' => 2],
                            ['key' => 'bm_accounts_accuracy_ensure', 'en' => '15. Ensuring accounting accuracy and compliance', 'bn' => '১৫. হিসাবের সঠিকতা নিশ্চিতকরণ', 'max' => 2],
                            ['key' => 'bm_daily_weekly_monthly_report_verify', 'en' => '16. Verification of daily/weekly/monthly financial reports', 'bn' => '১৬. দৈনিক/সাপ্তাহিক/মাসিক রিপোর্ট যাচাই', 'max' => 2],
                            ['key' => 'bm_prevent_irregularity_misappropriation', 'en' => '17. Preventing financial irregularities, embezzlement and wastage', 'bn' => '১৭. আর্থিক অনিয়ম, আত্মসাৎ ও অপচয় প্রতিরোধ', 'max' => 2],
                        ],
                    ],
                    [
                        'section_key' => 'D',
                        'name_en' => 'D. MIS, Reporting & Documentation (10 Marks)',
                        'name_bn' => 'ঘ. MIS, রিপোর্টিং ও ডকুমেন্টেশন (১০ নম্বর)',
                        'max_marks' => 10,
                        'items' => [
                            ['key' => 'bm_mis_report_data_accuracy', 'en' => '18. Accuracy of data in MIS reports', 'bn' => '১৮. MIS রিপোর্টে তথ্যের সঠিকতা', 'max' => 2],
                            ['key' => 'bm_timely_report_submission', 'en' => '19. Submission of reports within scheduled timeline', 'bn' => '১৯. নির্ধারিত সময়ে রিপোর্ট প্রেরণ', 'max' => 2],
                            ['key' => 'bm_all_records_safeguard', 'en' => '20. Safe preservation and maintenance of all official documents', 'bn' => '২০. সকল প্রকার নথিপত্র সংরক্ষণ', 'max' => 2],
                            ['key' => 'bm_data_analysis_decision', 'en' => '21. Decision making through data analysis', 'bn' => '২১. তথ্য বিশ্লেষণ করে সিদ্ধান্ত গ্রহণ', 'max' => 2],
                            ['key' => 'bm_report_error_detect_correct', 'en' => '22. Identification and correction of reporting errors', 'bn' => '২২. রিপোর্টের ভুল শনাক্ত ও সংশোধন', 'max' => 2],
                        ],
                    ],
                    [
                        'section_key' => 'E',
                        'name_en' => 'E. Internal Control, Compliance & Risk Management (10 Marks)',
                        'name_bn' => 'ঙ. অভ্যন্তরীণ নিয়ন্ত্রণ, কমপ্লায়েন্স ও ঝুঁকি ব্যবস্থাপনা (১০ নম্বর)',
                        'max_marks' => 10,
                        'items' => [
                            ['key' => 'bm_org_policy_sop_follow', 'en' => '23. Compliance with institutional policies and SOPs', 'bn' => '২৩. প্রতিষ্ঠানের নীতিমালা ও SOP অনুসরণ', 'max' => 2],
                            ['key' => 'bm_internal_control_effective_apply', 'en' => '24. Effective implementation of internal controls', 'bn' => '২৪. Internal Control কার্যকরভাবে প্রয়োগ', 'max' => 2],
                            ['key' => 'bm_fraud_irregularity_risk_detect', 'en' => '25. Detection of risks of irregularity/embezzlement/fraud', 'bn' => '২৫. অনিয়ম/আত্মসাৎ/জালিয়াতির ঝুঁকি শনাক্তকরণ', 'max' => 2],
                            ['key' => 'bm_audit_inspect_obs_resolve', 'en' => '26. Proper resolution of audit and inspection observations', 'bn' => '২৬. Audit/Inspection পর্যবেক্ষণ যথাযথভাবে সমাধান', 'max' => 2],
                            ['key' => 'bm_loan_program_risk_manage', 'en' => '27. Risk management of credit operations', 'bn' => '২৭. ঋণ কার্যক্রমের ঝুঁকি ব্যবস্থাপনা', 'max' => 2],
                        ],
                    ],
                    [
                        'section_key' => 'F',
                        'name_en' => 'F. Management & Leadership (15 Marks)',
                        'name_bn' => 'চ. ব্যবস্থাপনা ও নেতৃত্ব (১৫ নম্বর)',
                        'max_marks' => 15,
                        'items' => [
                            ['key' => 'bm_overall_planning_operation', 'en' => '28. Overall program planning and operational management', 'bn' => '২৮. সার্বিক কার্যক্রম পরিকল্পনা ও পরিচালনা', 'max' => 3],
                            ['key' => 'bm_subordinate_task_dist_supervision', 'en' => '29. Task delegation and supervision of subordinates', 'bn' => '২৯. অধীনস্তদের কাজ বণ্টন ও তদারকি', 'max' => 3],
                            ['key' => 'bm_subordinate_lead_motivate', 'en' => '30. Leadership, encouragement and motivation of subordinates', 'bn' => '৩০. অধীনস্তদের নেতৃত্ব ও উৎসাহ প্রদান', 'max' => 2],
                            ['key' => 'bm_target_achieve_leadership', 'en' => '31. Effective leadership in achieving institutional targets', 'bn' => '৩১. লক্ষ্যমাত্রা অর্জনে কার্যকর নেতৃত্ব', 'max' => 3],
                            ['key' => 'bm_subordinate_eval_feedback', 'en' => '32. Performance evaluation and constructive feedback to staff', 'bn' => '৩২. অধীনস্তদের কর্মক্ষমতা মূল্যায়ন ও ফিডব্যাক প্রদান', 'max' => 2],
                            ['key' => 'bm_discipline_office_management', 'en' => '33. Ensuring office discipline and administrative order', 'bn' => '৩৩. শৃঙ্খলা ও অফিস ব্যবস্থাপনা নিশ্চিতকরণ', 'max' => 2],
                        ],
                    ],
                    [
                        'section_key' => 'G',
                        'name_en' => 'G. Customer & Member Relationship Management (08 Marks)',
                        'name_bn' => 'ছ. গ্রাহক/সদস্য ব্যবস্থাপনা (০৮ নম্বর)',
                        'max_marks' => 8,
                        'items' => [
                            ['key' => 'bm_professional_member_conduct', 'en' => '34. Professional conduct with members and borrowers', 'bn' => '৩৪. সদস্য/ঋণগ্রহীতার সঙ্গে পেশাদার আচরণ', 'max' => 2],
                            ['key' => 'bm_member_grievance_redress', 'en' => '35. Redressal of member grievances and complaints', 'bn' => '৩৫. সদস্যদের অভিযোগ ও সমস্যা সমাধান', 'max' => 2],
                            ['key' => 'bm_member_retention_relation', 'en' => '36. Member retention and relationship development', 'bn' => '৩৬. সদস্য ধরে রাখা ও সম্পর্ক উন্নয়ন', 'max' => 2],
                            ['key' => 'bm_field_level_communication', 'en' => '37. Effective communication at the field level', 'bn' => '৩৭. মাঠ পর্যায়ে কার্যকর যোগাযোগ', 'max' => 2],
                        ],
                    ],
                    [
                        'section_key' => 'H',
                        'name_en' => 'H. Personal Competency, Behavior & Ethics (10 Marks)',
                        'name_bn' => 'জ. ব্যক্তিগত দক্ষতা, আচরণ ও মূল্যবোধ (১০ নম্বর)',
                        'max_marks' => 10,
                        'items' => [
                            ['key' => 'bm_honesty_ethics', 'en' => '38. Honesty and ethics', 'bn' => '৩৮. সততা ও নৈতিকতা', 'max' => 2],
                            ['key' => 'bm_sense_responsibility_duty', 'en' => '39. Sense of responsibility and dutifulness', 'bn' => '৩৯. দায়িত্ববোধ ও কর্তব্যপরায়ণতা', 'max' => 2],
                            ['key' => 'bm_punctuality_regular_attendance', 'en' => '40. Punctuality and regular attendance', 'bn' => '৪০. সময়ানুবর্তিতা ও নিয়মিত উপস্থিতি', 'max' => 1],
                            ['key' => 'bm_interpersonal_communication', 'en' => '41. Interpersonal communication skills', 'bn' => '৪১. যোগাযোগ দক্ষতা', 'max' => 2],
                            ['key' => 'bm_problem_solve_decision_making', 'en' => '42. Problem solving and decision making capability', 'bn' => '৪২. সমস্যা সমাধান ও সিদ্ধান্ত গ্রহণ', 'max' => 1],
                            ['key' => 'bm_work_under_pressure', 'en' => '43. Ability to perform effectively under pressure', 'bn' => '৪৩. চাপের মধ্যে কাজ করার সক্ষমতা', 'max' => 1],
                            ['key' => 'bm_adaptability_change', 'en' => '44. Ability to adapt to changes and new environments', 'bn' => '৪৪. পরিবর্তনের সঙ্গে খাপ খাওয়ানোর সক্ষমতা', 'max' => 1],
                        ],
                    ],
                    [
                        'section_key' => 'I',
                        'name_en' => 'I. Training/Meeting Participation & Learning Capacity (07 Marks)',
                        'name_bn' => 'ঝ. প্রশিক্ষণ/মিটিং অংশগ্রহণ ও শেখার সক্ষমতা (০৭ নম্বর)',
                        'max_marks' => 7,
                        'items' => [
                            ['key' => 'bm_meeting_training_active_part', 'en' => '45. Active participation in meetings and training sessions', 'bn' => '৪৫. প্রশিক্ষণ/মিটিং-এ সক্রিয় অংশগ্রহণ', 'max' => 1],
                            ['key' => 'bm_learn_new_rules_quickly', 'en' => '46. Ability to quickly learn new policies and processes', 'bn' => '৪৬. নতুন নিয়ম/পদ্ধতি দ্রুত শেখার সক্ষমতা', 'max' => 2],
                            ['key' => 'bm_apply_training_knowledge', 'en' => '47. Practical application of training knowledge in work', 'bn' => '৪৭. প্রশিক্ষণলব্ধ জ্ঞান বাস্তবে প্রয়োগ', 'max' => 2],
                            ['key' => 'bm_senior_guidance_apply', 'en' => '48. Accepting and applying advice from senior officials', 'bn' => '৪৮. ঊর্ধ্বতন কর্মকর্তার পরামর্শ গ্রহণ ও প্রয়োগ', 'max' => 1],
                            ['key' => 'bm_self_learning_enthusiasm', 'en' => '49. Self-learning and self-initiated enthusiasm', 'bn' => '৪৯. Self-learning/নিজ উদ্যোগে শেখার আগ্রহ', 'max' => 1],
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
                        'appraisal_type' => $tData['appraisal_type'] ?? 'promotion',
                        'category_name_bn' => $tData['category_name_bn'] ?? 'পদোন্নতি মূল্যায়ন',
                        'category_name_en' => $tData['category_name_en'] ?? 'Promotion Evaluation',
                        'description' => $tData['description'] ?? null,
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
