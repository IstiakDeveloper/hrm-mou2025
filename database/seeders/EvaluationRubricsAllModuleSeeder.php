<?php

namespace Database\Seeders;

use App\Models\EvaluationCriterion;
use App\Models\EvaluationSection;
use App\Models\EvaluationTemplate;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class EvaluationRubricsAllModuleSeeder extends Seeder
{
    public function run(): void
    {
        $modules = [
            // ==========================================
            // PROBATION INCREMENT EVALUATION TEMPLATES
            // ==========================================
            [
                'code' => 'prob_officer_abm',
                'appraisal_type' => 'probation_increment',
                'category_name_bn' => 'শিক্ষানবিস ইনক্রিমেন্ট',
                'category_name_en' => 'Probation Increment',
                'title_en' => 'Form A: Field Officer, Program Officer & ABM Probation Increment Evaluation',
                'title_bn' => 'ফরম ক: মাঠ কর্মকর্তা, কর্মসূচি কর্মকর্তা ও সহকারী শাখা ব্যবস্থাপক (শিক্ষানবিস বেতন বৃদ্ধি)',
                'description' => 'শিক্ষানবিশকালে কর্মরত মাঠ কর্মকর্তা, কর্মসূচি কর্মকর্তা ও সহকারী শাখা ব্যবস্থাপকদের ২য় ধাপে বেতন বৃদ্ধির মূল্যায়ন ফরম।',
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
                            ['key' => 'office_discipline_values', 'en' => '20. Adhering to office discipline and upholding organizational values', 'bn' => '২০. অফিস শৃঙ্খলা মেনে চলা ও প্রতিষ্ঠানের মূল্যবোধ ধারণ', 'max' => 2],
                            ['key' => 'coaching_mentoring_juniors', 'en' => '21. Coaching, mentoring and training juniors / subordinates', 'bn' => '২১. অধীনস্থ/ জুনিয়রদের কোচিং/মেন্টরিং/কাজ শেখানো', 'max' => 3],
                            ['key' => 'higher_post_potential', 'en' => '22. Potential for assuming higher post responsibilities in future', 'bn' => '২২. ভবিষ্যৎ উচ্চতর পদে দায়িত্ব পালনের সম্ভাবনা', 'max' => 2],
                        ],
                    ],
                ],
            ],

            [
                'code' => 'prob_accountant',
                'appraisal_type' => 'probation_increment',
                'category_name_bn' => 'শিক্ষানবিস ইনক্রিমেন্ট',
                'category_name_en' => 'Probation Increment',
                'title_en' => 'Form B: Branch Accountant & Junior Accountant Probation Increment Evaluation',
                'title_bn' => 'ফরম খ: শাখা হিসাবরক্ষক ও জুনিয়র হিসাবরক্ষক (শিক্ষানবিস বেতন বৃদ্ধি)',
                'description' => 'শিক্ষানবিশকালে কর্মরত শাখা হিসাবরক্ষক ও জুনিয়র হিসাবরক্ষকদের ২য় ধাপে বেতন বৃদ্ধির মূল্যায়ন ফরম।',
                'total_marks' => 100,
                'sections' => [
                    [
                        'section_key' => 'A',
                        'name_en' => 'A. Accounting & Financial Management (20 Marks)',
                        'name_bn' => 'ক. হিসাব সংরক্ষণ ও আর্থিক ব্যবস্থাপনা (২০ নম্বর)',
                        'max_marks' => 20,
                        'items' => [
                            ['key' => 'daily_transactions_entry', 'en' => '1. Properly recording daily transactions', 'bn' => '১. দৈনিক লেনদেন যথাযথভাবে হিসাবভুক্ত করা', 'max' => 2],
                            ['key' => 'cash_book_maintenance', 'en' => '2. Maintaining Cash Book properly', 'bn' => '২. Cash Book সঠিকভাবে সংরক্ষণ করা', 'max' => 2],
                            ['key' => 'ledger_maintenance', 'en' => '3. Maintaining Ledger / account registers properly', 'bn' => '৩. Ledger/হিসাব খাতা সঠিকভাবে সংরক্ষণ', 'max' => 2],
                            ['key' => 'debit_credit_application', 'en' => '4. Correct application of Debit & Credit principles', 'bn' => '৪. Debit ও Credit-এর সঠিক প্রয়োগ', 'max' => 2],
                            ['key' => 'voucher_prep_verification', 'en' => '5. Voucher preparation and verification skills', 'bn' => '৫. Voucher প্রস্তুত ও যাচাইয়ের দক্ষতা', 'max' => 2],
                            ['key' => 'account_classification', 'en' => '6. Proper classification of accounts', 'bn' => '৬. হিসাবের শ্রেণিবিন্যাস সঠিকভাবে করা', 'max' => 2],
                            ['key' => 'daily_closing_execution', 'en' => '7. Properly completing daily closing', 'bn' => '৭. দৈনিক হিসাব Closing সঠিকভাবে সম্পন্ন করা', 'max' => 2],
                            ['key' => 'error_mismatch_detection', 'en' => '8. Ability to detect accounting errors and mismatches', 'bn' => '৮. হিসাবের ভুল/অমিল শনাক্ত করার সক্ষমতা', 'max' => 2],
                            ['key' => 'correction_methodology', 'en' => '9. Following appropriate procedure for accounting corrections', 'bn' => '৯. হিসাব সংশোধনের ক্ষেত্রে যথাযথ পদ্ধতি অনুসরণ', 'max' => 2],
                            ['key' => 'record_keeping_discipline', 'en' => '10. Discipline in preserving accounting records', 'bn' => '১০. হিসাবের রেকর্ড সংরক্ষণে শৃঙ্খলা', 'max' => 2],
                        ],
                    ],
                    [
                        'section_key' => 'B',
                        'name_en' => 'B. Loan Operation Accounting Management (15 Marks)',
                        'name_bn' => 'খ. ঋণ কার্যক্রমের হিসাব ব্যবস্থাপনা (১৫ নম্বর)',
                        'max_marks' => 15,
                        'items' => [
                            ['key' => 'loan_disbursement_accounts', 'en' => '11. Accurately maintaining loan disbursement records', 'bn' => '১১. ঋণ বিতরণের হিসাব সঠিকভাবে সংরক্ষণ', 'max' => 2],
                            ['key' => 'loan_installment_recovery_records', 'en' => '12. Accurately recording loan installment / recovery', 'bn' => '১২. ঋণের কিস্তি/আদায় হিসাব সঠিকভাবে রেকর্ড', 'max' => 2],
                            ['key' => 'recovery_account_reconciliation', 'en' => '13. Cross-verifying consistency between loan recovery and accounts', 'bn' => '১৩. ঋণ আদায় ও হিসাবের মধ্যে সামঞ্জস্য যাচাই', 'max' => 2],
                            ['key' => 'deposit_savings_maintenance', 'en' => '14. Proficiency in maintaining deposit and savings accounts', 'bn' => '১৪. আমানত/সঞ্চয় হিসাব সংরক্ষণে দক্ষতা', 'max' => 2],
                            ['key' => 'overdue_accounting_concept', 'en' => '15. Concept and understanding of overdue loan accounting', 'bn' => '১৫. ঋণ বকেয়া/Overdue হিসাব সম্পর্কে ধারণা', 'max' => 2],
                            ['key' => 'loan_voucher_receipt_check', 'en' => '16. Verification of loan related vouchers and receipts', 'bn' => '১৬. ঋণ সংক্রান্ত Voucher/রসিদ যাচাই', 'max' => 2],
                            ['key' => 'loan_ledger_software_check', 'en' => '17. Verifying data in Loan Ledger / Software', 'bn' => '১৭. Loan Ledger/Software-এ তথ্য যাচাই', 'max' => 1],
                            ['key' => 'loan_daily_reconciliation', 'en' => '18. Daily accounting reconciliation of loan program', 'bn' => '১৮. ঋণ কার্যক্রমের দৈনিক হিসাব সমন্বয়', 'max' => 2],
                        ],
                    ],
                    [
                        'section_key' => 'C',
                        'name_en' => 'C. Cash Management & Financial Security (15 Marks)',
                        'name_bn' => 'গ. ক্যাশ ব্যবস্থাপনা ও আর্থিক নিরাপত্তা (১৫ নম্বর)',
                        'max_marks' => 15,
                        'items' => [
                            ['key' => 'cash_balance_check_control', 'en' => '19. Accuracy and control of daily cash balance', 'bn' => '১৯. দৈনিক Cash Balance-এর সঠিকতা ও নিয়ন্ত্রণ', 'max' => 2],
                            ['key' => 'cash_count_verification', 'en' => '20. Daily physical cash count and ledger verification', 'bn' => '২০. দৈনিক Cash গণনা ও হিসাবের সাথে মিলকরণ', 'max' => 2],
                            ['key' => 'vault_cash_limit_safety', 'en' => '21. Adherence to Cash Limit and vault security', 'bn' => '২১. Cash Limit মেনে চলা ও ভল্টের নিরাপত্তা', 'max' => 2],
                            ['key' => 'bank_transaction_reconciliation', 'en' => '22. Bank transaction management & Bank Reconciliation', 'bn' => '২২. ব্যাংক লেনদেন ব্যবস্থাপনা ও Bank Reconciliation', 'max' => 2],
                            ['key' => 'cheque_payment_accuracy', 'en' => '23. Cheque issuance and payment verification', 'bn' => '২৩. চেক ইস্যু ও পেমেন্ট প্রক্রিয়ার সঠিকতা', 'max' => 2],
                            ['key' => 'cash_shortage_excess_reporting', 'en' => '24. Immediate reporting of cash shortage or excess', 'bn' => '২৪. নগদ টাকার ঘাটতি বা উদ্বৃত্তের তাৎক্ষণিক রিপোর্ট', 'max' => 2],
                            ['key' => 'fraud_embezzlement_prevention', 'en' => '25. Vigilance in preventing financial fraud and embezzlement', 'bn' => '২৫. আর্থিক জালিয়াতি ও তছরুপ প্রতিরোধে সতর্কতা', 'max' => 3],
                        ],
                    ],
                    [
                        'section_key' => 'D',
                        'name_en' => 'D. Rules, Discipline & Internal Control (10 Marks)',
                        'name_bn' => 'ঘ. নিয়ম-নীতি, শৃঙ্খলা ও অভ্যন্তরীণ নিয়ন্ত্রণ (১০ নম্বর)',
                        'max_marks' => 10,
                        'items' => [
                            ['key' => 'financial_policy_sop_compliance', 'en' => '26. Compliance with financial policies and SOPs', 'bn' => '২৬. আর্থিক নীতিমালা ও SOP অনুসরণ', 'max' => 2],
                            ['key' => 'office_order_circular_adherence', 'en' => '27. Adhering to office orders and circulars', 'bn' => '২৭. অফিস আদেশ ও সার্কুলার মেনে চলা', 'max' => 2],
                            ['key' => 'audit_compliance_handling', 'en' => '28. Timely resolution of audit and inspection objections', 'bn' => '২৮. অডিট ও পরিদর্শন আপত্তির সময়মতো নিষ্পত্তি', 'max' => 2],
                            ['key' => 'internal_control_adherence', 'en' => '29. Strict adherence to internal control guidelines', 'bn' => '২৯. অভ্যন্তরীণ নিয়ন্ত্রণ ব্যবস্থা যথাযথভাবে মান্যকরণ', 'max' => 2],
                            ['key' => 'transparency_clean_record_culture', 'en' => '30. Maintaining cleanliness and transparency in financial records', 'bn' => '৩০. আর্থিক তথ্যের স্বচ্ছতা ও পরিচ্ছন্ন রেকর্ড সংস্কৃতি', 'max' => 2],
                        ],
                    ],
                    [
                        'section_key' => 'E',
                        'name_en' => 'E. Reporting, MIS & Software Competency (10 Marks)',
                        'name_bn' => 'ঙ. রিপোর্টিং, MIS ও সফটওয়্যার ব্যবহারের দক্ষতা (১০ নম্বর)',
                        'max_marks' => 10,
                        'items' => [
                            ['key' => 'daily_weekly_monthly_reporting', 'en' => '31. Accuracy and timeliness in daily/weekly/monthly reports', 'bn' => '৩১. দৈনিক/সাপ্তাহিক/মাসিক রিপোর্ট প্রস্তুত ও প্রেরণ', 'max' => 2],
                            ['key' => 'mis_software_entry_accuracy', 'en' => '32. Accuracy in MIS / accounting software data entry', 'bn' => '৩২. MIS/হিসাব সফটওয়্যারে ডেটা এন্ট্রির নির্ভুলতা', 'max' => 2],
                            ['key' => 'financial_statement_prep_aid', 'en' => '33. Assisting in preparing trial balance & financial statements', 'bn' => '৩৩. রেওয়ামিল ও আর্থিক বিবরণী তৈরিতে সহায়তা', 'max' => 2],
                            ['key' => 'excel_word_computer_skills', 'en' => '34. Practical proficiency in Excel, Word and computer tools', 'bn' => '৩৪. Excel, Word ও কম্পিউটার ব্যবহারে ব্যবহারিক দক্ষতা', 'max' => 2],
                            ['key' => 'data_security_backup_awareness', 'en' => '35. Awareness of digital data security and backup', 'bn' => '৩৫. ডিজিটাল ডেটা নিরাপত্তা ও ব্যাকআপ সচেতনতা', 'max' => 2],
                        ],
                    ],
                    [
                        'section_key' => 'F',
                        'name_en' => 'F. Coordination & Communication (10 Marks)',
                        'name_bn' => 'চ. যোগাযোগ ও সমন্বয় (১০ নম্বর)',
                        'max_marks' => 10,
                        'items' => [
                            ['key' => 'branch_manager_coordination', 'en' => '36. Effective professional coordination with Branch Manager', 'bn' => '৩৬. শাখা ব্যবস্থাপকের সাথে কার্যকর পেশাগত সমন্বয়', 'max' => 3],
                            ['key' => 'field_staff_accounts_assistance', 'en' => '37. Guiding and assisting field staff with accounts and collection', 'bn' => '৩৭. মাঠকর্মীদের হিসাব ও আদায়ের তথ্য দিয়ে সহযোগিতা', 'max' => 2],
                            ['key' => 'head_office_accounts_coordination', 'en' => '38. Smooth communication with Head Office accounts dept', 'bn' => '৩৮. প্রধান কার্যালয়ের হিসাব বিভাগের সাথে সংযোগ', 'max' => 2],
                            ['key' => 'bank_official_liaison', 'en' => '39. Courteous and disciplined liaison with bank officials', 'bn' => '৩৯. ব্যাংক কর্মকর্তাদের সাথে শিষ্টাচার ও সুসম্পর্ক', 'max' => 3],
                        ],
                    ],
                    [
                        'section_key' => 'G',
                        'name_en' => 'G. Integrity, Responsibility & Conduct (10 Marks)',
                        'name_bn' => 'ছ. সততা, দায়িত্বশীলতা ও আচরণ (১০ নম্বর)',
                        'max_marks' => 10,
                        'items' => [
                            ['key' => 'honesty_ethics', 'en' => '40. Honesty and ethics', 'bn' => '৪০. সততা ও নৈতিকতা', 'max' => 2],
                            ['key' => 'duty_sincerity', 'en' => '41. Sincerity in performing duties', 'bn' => '৪১. দায়িত্ব পালনে আন্তরিকতা', 'max' => 2],
                            ['key' => 'punctuality_presence', 'en' => '42. Punctuality and attendance', 'bn' => '৪২. সময়ানুবর্তিতা ও উপস্থিতি', 'max' => 2],
                            ['key' => 'confidential_data_protection', 'en' => '43. Preservation and protection of confidential financial data', 'bn' => '৪৩. গোপনীয় আর্থিক তথ্য সংরক্ষণ', 'max' => 2],
                            ['key' => 'peer_superior_conduct', 'en' => '44. Courteous conduct with peers and superiors', 'bn' => '৪৪. সহকর্মী ও ঊর্ধ্বতন কর্মকর্তার সঙ্গে আচরণ', 'max' => 2],
                        ],
                    ],
                    [
                        'section_key' => 'H',
                        'name_en' => 'H. Learning Interest & Problem Solving Capacity (10 Marks)',
                        'name_bn' => 'জ. শেখার আগ্রহ ও সমস্যা সমাধানের সক্ষমতা (১০ নম্বর)',
                        'max_marks' => 10,
                        'items' => [
                            ['key' => 'new_method_learning_interest', 'en' => '45. Eagerness to learn new accounting methods', 'bn' => '৪৫. নতুন হিসাব পদ্ধতি শেখার আগ্রহ', 'max' => 2],
                            ['key' => 'training_knowledge_application', 'en' => '46. Practical application of knowledge gained from training', 'bn' => '৪৬. প্রশিক্ষণ থেকে অর্জিত জ্ঞান কাজে প্রয়োগ', 'max' => 2],
                            ['key' => 'problem_analysis_resolution', 'en' => '47. Analyzing and attempting to resolve accounting problems', 'bn' => '৪৭. হিসাবের সমস্যা বিশ্লেষণ ও সমাধানের চেষ্টা', 'max' => 2],
                            ['key' => 'learning_from_mistakes', 'en' => '48. Learning from mistakes and taking corrective actions', 'bn' => '৪৮. ভুল থেকে শিক্ষা গ্রহণ ও সংশোধন', 'max' => 2],
                            ['key' => 'seeking_guidance_readiness', 'en' => '49. Readiness to seek guidance and advice when required', 'bn' => '৪৯. প্রয়োজনীয় বিষয়ে পরামর্শ/সহায়তা চাওয়ার সক্ষমতা', 'max' => 2],
                        ],
                    ],
                ],
            ],

            [
                'code' => 'prob_bm_and_above',
                'appraisal_type' => 'probation_increment',
                'category_name_bn' => 'শিক্ষানবিস ইনক্রিমেন্ট',
                'category_name_en' => 'Probation Increment',
                'title_en' => 'Form C: Branch Manager to Above Probation Increment Evaluation',
                'title_bn' => 'ফরম গ: শাখা ব্যবস্থাপক থেকে তদূর্ধ্ব কর্মীদের শিক্ষানবিস বেতন বৃদ্ধি মূল্যায়ন',
                'description' => 'শিক্ষানবিশকালে কর্মরত শাখা ব্যবস্থাপক থেকে তদূর্ধ্ব কর্মীদের ২য় ধাপে বেতন বৃদ্ধির মূল্যায়ন ফরম।',
                'total_marks' => 100,
                'sections' => [
                    [
                        'section_key' => 'A',
                        'name_en' => 'A. Loan Recovery & Portfolio Management (15 Marks)',
                        'name_bn' => 'ক. ঋণ আদায় ও পোর্টফোলিও ব্যবস্থাপনা (১৫ নম্বর)',
                        'max_marks' => 15,
                        'items' => [
                            ['key' => 'regular_installment_collection', 'en' => '1. Ensuring regular installment collection', 'bn' => '১. নিয়মিত কিস্তি আদায় নিশ্চিতকরণ', 'max' => 3],
                            ['key' => 'overdue_loan_id_control', 'en' => '2. Identification and control of overdue loans', 'bn' => '২. বকেয়া ঋণ শনাক্তকরণ ও নিয়ন্ত্রণ', 'max' => 3],
                            ['key' => 'risky_borrower_followup', 'en' => '3. Identifying risky borrowers and structured follow-up', 'bn' => '৩. ঝুঁকিপূর্ণ ঋণগ্রহীতা শনাক্ত ও ফলোআপ', 'max' => 2],
                            ['key' => 'recovery_plan_execution', 'en' => '4. Recovery planning and effective implementation', 'bn' => '৪. আদায় পরিকল্পনা ও কার্যকর বাস্তবায়ন', 'max' => 2],
                            ['key' => 'par_control', 'en' => '5. Portfolio at Risk (PAR) control', 'bn' => '৫. Portfolio at Risk (PAR) নিয়ন্ত্রণ', 'max' => 3],
                            ['key' => 'overdue_recovery_initiatives', 'en' => '6. Effective initiatives for overdue recovery', 'bn' => '৬. বকেয়া আদায়ে কার্যকর উদ্যোগ', 'max' => 2],
                        ],
                    ],
                    [
                        'section_key' => 'B',
                        'name_en' => 'B. Loan Disbursement & Management (15 Marks)',
                        'name_bn' => 'খ. ঋণ বিতরণ ও ঋণ ব্যবস্থাপনা (১৫ নম্বর)',
                        'max_marks' => 15,
                        'items' => [
                            ['key' => 'loan_app_verification_screening', 'en' => '7. Loan application verification and preliminary screening', 'bn' => '৭. ঋণ আবেদন যাচাই ও প্রাথমিক বাছাই', 'max' => 2],
                            ['key' => 'borrower_eligibility_capacity_eval', 'en' => '8. Assessing borrower eligibility and repayment capacity', 'bn' => '৮. ঋণগ্রহীতার যোগ্যতা ও সক্ষমতা যাচাই', 'max' => 3],
                            ['key' => 'proposal_recommendation_quality', 'en' => '9. Quality and reliability of recommendation in loan proposals', 'bn' => '৯. ঋণ প্রস্তাবে সুপারিশের মান', 'max' => 2],
                            ['key' => 'credit_policy_approval_compliance', 'en' => '10. Adhering to credit policy and approval procedure', 'bn' => '১০. ঋণ নীতিমালা ও অনুমোদন প্রক্রিয়া অনুসরণ', 'max' => 3],
                            ['key' => 'proper_loan_utilization', 'en' => '11. Ensuring proper loan utilization by borrowers', 'bn' => '১১. ঋণের সঠিক ব্যবহার নিশ্চিতকরণ', 'max' => 2],
                            ['key' => 'disbursement_transparency_control', 'en' => '12. Transparency and control in loan disbursement', 'bn' => '১২. ঋণ বিতরণে স্বচ্ছতা ও নিয়ন্ত্রণ', 'max' => 3],
                        ],
                    ],
                    [
                        'section_key' => 'C',
                        'name_en' => 'C. Financial & Accounts Management (10 Marks)',
                        'name_bn' => 'গ. আর্থিক ও হিসাব ব্যবস্থাপনা (১০ নম্বর)',
                        'max_marks' => 10,
                        'items' => [
                            ['key' => 'cash_bank_transaction_control', 'en' => '13. Control of daily cash and banking transactions', 'bn' => '১৩. দৈনিক নগদ ও ব্যাংক লেনদেনের নিয়ন্ত্রণ', 'max' => 2],
                            ['key' => 'cash_book_record_verification', 'en' => '14. Verifying cash book and related accounting records', 'bn' => '১৪. ক্যাশবুখ ও সংশ্লিষ্ট রেকর্ড যাচাই', 'max' => 2],
                            ['key' => 'account_accuracy_assurance', 'en' => '15. Ensuring accounting accuracy and completeness', 'bn' => '১৫. হিসাবের সঠিকতা নিশ্চিতকরণ', 'max' => 2],
                            ['key' => 'daily_weekly_monthly_report_check', 'en' => '16. Verification of daily, weekly, and monthly reports', 'bn' => '১৬. দৈনিক/সাপ্তাহিক/মাসিক রিপোর্ট যাচাই', 'max' => 2],
                            ['key' => 'financial_irregularity_prevention', 'en' => '17. Preventing financial irregularity, embezzlement and waste', 'bn' => '১৭. আর্থিক অনিয়ম, আত্মসাৎ ও অপচয় প্রতিরোধ', 'max' => 2],
                        ],
                    ],
                    [
                        'section_key' => 'D',
                        'name_en' => 'D. MIS, Reporting & Documentation (10 Marks)',
                        'name_bn' => 'ঘ. MIS, রিপোর্টিং ও ডকুমেন্টেশন (১০ নম্বর)',
                        'max_marks' => 10,
                        'items' => [
                            ['key' => 'mis_report_data_accuracy', 'en' => '18. Accuracy of data in MIS reports', 'bn' => '১৮. MIS রিপোর্টে তথ্যের সঠিকতা', 'max' => 2],
                            ['key' => 'timely_report_submission', 'en' => '19. Timely submission of reports to higher authority', 'bn' => '১৯. নির্ধারিত সময়ে রিপোর্ট প্রেরণ', 'max' => 2],
                            ['key' => 'all_record_preservation', 'en' => '20. Systematic preservation of all records and files', 'bn' => '২০. সকল প্রকার নথিপত্র সংরক্ষণ', 'max' => 2],
                            ['key' => 'data_analysis_decision_making', 'en' => '21. Making informed decisions by analyzing operational data', 'bn' => '২১. তথ্য বিশ্লেষণ করে সিদ্ধান্ত গ্রহণ', 'max' => 2],
                            ['key' => 'report_error_detection_correction', 'en' => '22. Detecting and rectifying errors in reports', 'bn' => '২২. রিপোর্টের ভুল শনাক্ত ও সংশোধন', 'max' => 2],
                        ],
                    ],
                    [
                        'section_key' => 'E',
                        'name_en' => 'E. Internal Control, Compliance & Risk Management (10 Marks)',
                        'name_bn' => 'ঙ. অভ্যন্তরীণ নিয়ন্ত্রণ, কমপ্লায়েন্স ও ঝুঁকি ব্যবস্থাপনা (১০ নম্বর)',
                        'max_marks' => 10,
                        'items' => [
                            ['key' => 'policy_sop_compliance', 'en' => '23. Compliance with organization policies and SOPs', 'bn' => '২৩. প্রতিষ্ঠানের নীতিমালা ও SOP অনুসরণ', 'max' => 2],
                            ['key' => 'effective_internal_control_impl', 'en' => '24. Effective implementation of internal control measures', 'bn' => '২৪. Internal Control কার্যকরভাবে প্রয়োগ', 'max' => 2],
                            ['key' => 'irregularity_fraud_risk_id', 'en' => '25. Identification of risks relating to irregularity and fraud', 'bn' => '২৫. অনিয়ম/আত্মসাৎ/জালিয়াতির ঝুঁকি শনাক্তকরণ', 'max' => 2],
                            ['key' => 'audit_inspection_compliance', 'en' => '26. Properly addressing and resolving audit/inspection observations', 'bn' => '২৬. Audit/Inspection পর্যবেক্ষণ যথাযথভাবে সমাধান', 'max' => 2],
                            ['key' => 'credit_operation_risk_mgmt', 'en' => '27. Proactive risk management in credit operations', 'bn' => '২৭. ঋণ কার্যক্রমের ঝুঁকি ব্যবস্থাপনা', 'max' => 2],
                        ],
                    ],
                    [
                        'section_key' => 'F',
                        'name_en' => 'F. Management & Leadership (15 Marks)',
                        'name_bn' => 'চ. ব্যবস্থাপনা ও নেতৃত্ব (১৫ নম্বর)',
                        'max_marks' => 15,
                        'items' => [
                            ['key' => 'overall_operation_planning', 'en' => '28. Comprehensive operational planning and execution', 'bn' => '২৮. সার্বিক কার্যক্রম পরিকল্পনা ও পরিচালনা', 'max' => 3],
                            ['key' => 'subordinate_work_allocation_supervision', 'en' => '29. Work distribution and close supervision of subordinates', 'bn' => '২৯. অধীনস্তদের কাজ বণ্টন ও তদারকি', 'max' => 3],
                            ['key' => 'leadership_motivation_team', 'en' => '30. Providing leadership and motivation to subordinates', 'bn' => '৩০. অধীনস্তদের নেতৃত্ব ও উৎসাহ প্রদান', 'max' => 2],
                            ['key' => 'target_achievement_leadership', 'en' => '31. Effective leadership for target achievement', 'bn' => '৩১. লক্ষ্যমাত্রা অর্জনে কার্যকর নেতৃত্ব', 'max' => 3],
                            ['key' => 'performance_evaluation_feedback', 'en' => '32. Assessing subordinate performance and providing constructive feedback', 'bn' => '৩২. অধীনস্তদের কর্মদক্ষতা মূল্যায়ন ও ফিডব্যাক প্রদান', 'max' => 2],
                            ['key' => 'office_discipline_management', 'en' => '33. Ensuring workplace discipline and office management', 'bn' => '৩৩. শৃঙ্খলা ও অফিস ব্যবস্থাপনা নিশ্চিতকরণ', 'max' => 2],
                        ],
                    ],
                    [
                        'section_key' => 'G',
                        'name_en' => 'G. Client / Member Management (08 Marks)',
                        'name_bn' => 'ছ. গ্রাহক/সদস্য ব্যবস্থাপনা (০৮ নম্বর)',
                        'max_marks' => 8,
                        'items' => [
                            ['key' => 'professional_member_conduct', 'en' => '34. Professional conduct towards members and borrowers', 'bn' => '৩৪. সদস্য/ঋণগ্রহীতার সঙ্গে পেশাদার আচরণ', 'max' => 2],
                            ['key' => 'complaint_redressal_problem_solving', 'en' => '35. Addressing member complaints and solving issues', 'bn' => '৩৫. সদস্যদের অভিযোগ ও সমস্যা সমাধান', 'max' => 2],
                            ['key' => 'member_retention_relationship_building', 'en' => '36. Retaining members and fostering relationships', 'bn' => '৩৬. সদস্য ধরে রাখা ও সম্পর্ক উন্নয়ন', 'max' => 2],
                            ['key' => 'field_level_communication', 'en' => '37. Effective field-level engagement and communication', 'bn' => '৩৭. মাঠ পর্যায়ে কার্যকর যোগাযোগ', 'max' => 2],
                        ],
                    ],
                    [
                        'section_key' => 'H',
                        'name_en' => 'H. Personal Skills, Behavior & Values (10 Marks)',
                        'name_bn' => 'জ. ব্যক্তিগত দক্ষতা, আচরণ ও মূল্যবোধ (১০ নম্বর)',
                        'max_marks' => 10,
                        'items' => [
                            ['key' => 'integrity_ethics', 'en' => '38. Honesty and ethics', 'bn' => '৩৮. সততা ও নৈতিকতা', 'max' => 2],
                            ['key' => 'responsibility_dutifulness', 'en' => '39. Responsibility and dutifulness', 'bn' => '৩৯. দায়িত্ববোধ ও কর্তব্যপরায়ণতা', 'max' => 2],
                            ['key' => 'punctuality_regularity', 'en' => '40. Punctuality and regular presence', 'bn' => '৪০. সময়ানুবর্তিতা ও নিয়মিত উপস্থিতি', 'max' => 1],
                            ['key' => 'interpersonal_communication', 'en' => '41. Interpersonal communication skills', 'bn' => '৪১. যোগাযোগ দক্ষতা', 'max' => 2],
                            ['key' => 'problem_solving_decision_making', 'en' => '42. Problem solving and decision making capacity', 'bn' => '৪২. সমস্যা সমাধান ও সিদ্ধান্ত গ্রহণ', 'max' => 1],
                            ['key' => 'work_under_pressure', 'en' => '43. Capacity to work effectively under pressure', 'bn' => '৪৩. চাপের মধ্যে কাজ করার সক্ষমতা', 'max' => 1],
                            ['key' => 'adaptability_to_change', 'en' => '44. Adaptability to change and organizational shifts', 'bn' => '৪৪. পরিবর্তনের সঙ্গে খাপ খাওয়ানোর সক্ষমতা', 'max' => 1],
                        ],
                    ],
                    [
                        'section_key' => 'I',
                        'name_en' => 'I. Training/Meeting Participation & Learning (07 Marks)',
                        'name_bn' => 'ঝ. প্রশিক্ষণ/মিটিং অংশগ্রহণ ও শেখার সক্ষমতা (০৭ নম্বর)',
                        'max_marks' => 7,
                        'items' => [
                            ['key' => 'active_training_meeting_participation', 'en' => '45. Active participation in training sessions and meetings', 'bn' => '৪৫. প্রশিক্ষণ/মিটিং-এ সক্রিয় অংশগ্রহণ', 'max' => 1],
                            ['key' => 'quick_grasp_new_rules', 'en' => '46. Ability to quickly grasp new rules and procedures', 'bn' => '৪৬. নতুন নিয়ম/পদ্ধতি দ্রুত শেখার সক্ষমতা', 'max' => 2],
                            ['key' => 'practical_training_application', 'en' => '47. Applying training knowledge in real work situations', 'bn' => '৪৭. প্রশিক্ষণলব্ধ জ্ঞান বাস্তবে প্রয়োগ', 'max' => 2],
                            ['key' => 'superiors_guidance_adoption', 'en' => '48. Receptiveness and adoption of superior guidance', 'bn' => '৪৮. ঊর্ধ্বতন কর্মকর্তার পরামর্শ গ্রহণ ও প্রয়োগ', 'max' => 1],
                            ['key' => 'self_learning_initiative', 'en' => '49. Self-learning initiative and continuous improvement', 'bn' => '৪৯. Self-learning/নিজ উদ্যোগে শেখার আগ্রহ', 'max' => 1],
                        ],
                    ],
                ],
            ],

            // ==========================================
            // TRAINEE EVALUATION TEMPLATES
            // ==========================================
            [
                'code' => 'trainee_officer_abm',
                'appraisal_type' => 'trainee',
                'category_name_bn' => 'প্রশিক্ষণার্থী মূল্যায়ন',
                'category_name_en' => 'Trainee Evaluation',
                'title_en' => 'Trainee Evaluation: Officer & Assistant Branch Manager',
                'title_bn' => 'প্রশিক্ষণার্থী মূল্যায়ন ফরম: অফিসার ও সহকারী শাখা ব্যবস্থাপক',
                'description' => 'প্রশিক্ষণার্থী অফিসার ও সহকারী শাখা ব্যবস্থাপক পদবীর কর্মীদের জন্য ১০০ নম্বরের মূল্যায়ন রুব্রিক্স।',
                'total_marks' => 100,
                'sections' => [
                    [
                        'section_key' => 'A',
                        'name_en' => 'Evaluation Rubrics & Scoring (100 Marks)',
                        'name_bn' => 'মূল্যায়ন রুব্রিক্স ও নম্বর বণ্টন (১০০ নম্বর)',
                        'max_marks' => 100,
                        'items' => [
                            ['key' => 'off_loan_knowledge', 'en' => '1. Knowledge of loan operation', 'bn' => '১. ঋণ কার্যক্রমের জ্ঞান – সংস্থার নিয়মনীতি, ঋণ পণ্য, সদস্যের যোগ্যতা, কিস্তি ও সঞ্চয় সম্পর্কে ধারণা', 'max' => 15],
                            ['key' => 'off_field_skill', 'en' => '2. Field level working skill', 'bn' => '২. মাঠপর্যায়ে কাজের দক্ষতা – সদস্য/সম্ভাব্য সদস্যের সাথে যোগাযোগ, বাড়ি/ব্যবসা পরিদর্শন ও তথ্য সংগ্রহ', 'max' => 15],
                            ['key' => 'off_member_verification', 'en' => '3. Member verification & loan proposal', 'bn' => '৩. সদস্য যাচাই ও ঋণ প্রস্তাব – সদস্যের পরিচয়, আয়-ব্যয়, ব্যবসা, ঋণের উদ্দেশ্য ও পরিশোধ সক্ষমতা যাচাই', 'max' => 15],
                            ['key' => 'off_recovery_teamwork', 'en' => '4. Recovery, overdue & teamwork', 'bn' => '৪. কিস্তি ও বকেয়া আদায় এবং টিম ওয়ার্ক – নিয়মিত আদায়, বকেয়া আদায় ও টিম ওয়ার্কে অংশগ্রহণ', 'max' => 15],
                            ['key' => 'off_records_reporting', 'en' => '5. Records keeping & reporting', 'bn' => '৫. নথিপত্র সংরক্ষণ ও রিপোর্টিং – ফরম, রেজিস্টার, সদস্যের রেকর্ড ও দৈনিক/সাপ্তাহিক রিপোর্ট সঠিকভাবে প্রস্তুত', 'max' => 15],
                            ['key' => 'off_customer_service', 'en' => '6. Customer service & communication', 'bn' => '৬. সদস্যসেবা ও যোগাযোগ দক্ষতা – সদস্যের সাথে ভদ্র আচরণ, বোঝানোর ক্ষমতা, অভিযোগ/সমস্যা মোকাবেলা', 'max' => 15],
                            ['key' => 'off_discipline_responsibility', 'en' => '7. Discipline & responsibility', 'bn' => '৭. শৃঙ্খলা ও দায়িত্ববোধ – নিয়মানুবর্তিতা, উপস্থিতি, দায়িত্ব পালন ও ঊর্ধ্বতন কর্মকর্তার নির্দেশনা অনুসরণ', 'max' => 10],
                        ],
                    ],
                ],
            ],

            [
                'code' => 'trainee_accountant',
                'appraisal_type' => 'trainee',
                'category_name_bn' => 'প্রশিক্ষণার্থী মূল্যায়ন',
                'category_name_en' => 'Trainee Evaluation',
                'title_en' => 'Trainee Evaluation: Branch Accountant',
                'title_bn' => 'প্রশিক্ষণার্থী মূল্যায়ন ফরম: শাখা হিসাবরক্ষক',
                'description' => 'প্রশিক্ষণার্থী শাখা হিসাবরক্ষক পদবীর কর্মীদের জন্য ১০০ নম্বরের মূল্যায়ন রুব্রিক্স।',
                'total_marks' => 100,
                'sections' => [
                    [
                        'section_key' => 'A',
                        'name_en' => 'Evaluation Rubrics & Scoring (100 Marks)',
                        'name_bn' => 'মূল্যায়ন রুব্রিক্স ও নম্বর বণ্টন (১০০ নম্বর)',
                        'max_marks' => 100,
                        'items' => [
                            ['key' => 'acc_records_entry', 'en' => '1. Bookkeeping & daily transaction entry', 'bn' => '১. হিসাব সংরক্ষণ ও লেনদেন লিপিবদ্ধকরণ – Cash Book, Ledger, Journal ও দৈনিক হিসাব সঠিকভাবে সংরক্ষণ', 'max' => 10],
                            ['key' => 'acc_cash_management', 'en' => '2. Cash management & safety', 'bn' => '২. নগদ অর্থ ব্যবস্থাপনা – Cash balance, cash count, cash closing এবং নগদ ক্যাশ নিরাপত্তা', 'max' => 10],
                            ['key' => 'acc_loan_savings_mgmt', 'en' => '3. Loan & savings account management', 'bn' => '৩. ঋণ ও সঞ্চয় হিসাব ব্যবস্থাপনা – ঋণ বিতরণ, কিস্তি আদায়, সঞ্চয় ও সংশ্লিষ্ট হিসাবের নির্ভুলতা', 'max' => 10],
                            ['key' => 'acc_voucher_support', 'en' => '4. Voucher & supporting document check', 'bn' => '৪. Voucher ও Supporting Document যাচাই – Voucher প্রস্তুত, যাচাই, অনুমোদন ও সংরক্ষণ প্রক্রিয়া', 'max' => 10],
                            ['key' => 'acc_banking_reconciliation', 'en' => '5. Banking & Bank Reconciliation', 'bn' => '৫. ব্যাংকিং ও Reconciliation – ব্যাংক লেনদেন, Bank Book এবং হিসাবের অমিল সনাক্তকরণ', 'max' => 10],
                            ['key' => 'acc_reporting_statements', 'en' => '6. Reporting & financial statements', 'bn' => '৬. রিপোর্ট ও হিসাব বিবরণী প্রস্তুত – দৈনিক/মাসিক রিপোর্ট এবং প্রয়োজনীয় তথ্য সময়মতো প্রদান', 'max' => 10],
                            ['key' => 'acc_accuracy_control', 'en' => '7. Accounting accuracy & control', 'bn' => '৭. হিসাবের নির্ভুলতা ও নিয়ন্ত্রণ – ভুল সনাক্তকরণ, হিসাব মেলানো এবং Internal Control অনুসরণ', 'max' => 10],
                            ['key' => 'acc_software_excel', 'en' => '8. Software & Excel competency', 'bn' => '৮. হিসাব সফটওয়্যার/Excel ব্যবহারের দক্ষতা – প্রয়োজনীয় তথ্য এন্ট্রি, যাচাই ও রিপোর্ট তৈরি', 'max' => 15],
                            ['key' => 'acc_learning_agility', 'en' => '9. Learning interest & agility', 'bn' => '৯. শেখার আগ্রহ ও দ্রুত শেখার সক্ষমতা – প্রশিক্ষণ গ্রহণ, নির্দেশনা অনুসরণ এবং শেখা বিষয় কাজে প্রয়োগ', 'max' => 5],
                            ['key' => 'acc_integrity_ethics', 'en' => '10. Integrity, responsibility & professional ethics', 'bn' => '১০. সততা, দায়িত্বশীলতা ও পেশাগত আচরণ – গোপনীয়তা, নিয়মানুবর্তিতা, শৃঙ্খলা ও সহকর্মীদের সাথে আচরণ', 'max' => 10],
                        ],
                    ],
                ],
            ],

            [
                'code' => 'trainee_bm_and_above',
                'appraisal_type' => 'trainee',
                'category_name_bn' => 'প্রশিক্ষণার্থী মূল্যায়ন',
                'category_name_en' => 'Trainee Evaluation',
                'title_en' => 'Trainee Evaluation: Branch Manager & Above',
                'title_bn' => 'প্রশিক্ষণার্থী মূল্যায়ন ফরম: শাখা ব্যবস্থাপক থেকে তদূর্ধ্ব',
                'description' => 'প্রশিক্ষণার্থী শাখা ব্যবস্থাপক থেকে তদূর্ধ্ব কর্মীদের জন্য ১০০ নম্বরের মূল্যায়ন রুব্রিক্স।',
                'total_marks' => 100,
                'sections' => [
                    [
                        'section_key' => 'A',
                        'name_en' => 'Evaluation Rubrics & Scoring (100 Marks)',
                        'name_bn' => 'মূল্যায়ন রুব্রিক্স ও নম্বর বণ্টন (১০০ নম্বর)',
                        'max_marks' => 100,
                        'items' => [
                            ['key' => 'bm_loan_program', 'en' => '1. Loan program knowledge & application', 'bn' => '১. ঋণ কার্যক্রমের জ্ঞান ও প্রয়োগ — ঋণ নীতিমালা, বিতরণ, ঋণগ্রহীতা যাচাই ও ব্যবহার', 'max' => 15],
                            ['key' => 'bm_recovery_overdue', 'en' => '2. Recovery & overdue loan management', 'bn' => '২. আদায় ও বকেয়া ব্যবস্থাপনা — কিস্তি আদায়, বকেয়া সনাক্তকরণ ও ফলোআপ', 'max' => 15],
                            ['key' => 'bm_branch_operation', 'en' => '3. Branch operation & planning skills', 'bn' => '৩. শাখা পরিচালনার দক্ষতা — দৈনন্দিন কার্যক্রম, পরিকল্পনা ও কাজের সমন্বয়', 'max' => 15],
                            ['key' => 'bm_team_supervision', 'en' => '4. Team leadership & supervision', 'bn' => '৪. কর্মী পরিচালনা ও তদারকি — কর্মীদের কাজ তদারকি, দিকনির্দেশনা ও জবাবদিহিতা', 'max' => 15],
                            ['key' => 'bm_accounts_control', 'en' => '5. Accounts, cash & internal control', 'bn' => '৫. হিসাব ও অভ্যন্তরীণ নিয়ন্ত্রণ — ক্যাশ ব্যবস্থাপনা, নথিপত্র ও ভাউচার যাচাই', 'max' => 15],
                            ['key' => 'bm_member_expansion', 'en' => '6. Member service & program expansion', 'bn' => '৬. সদস্যসেবা ও কার্যক্রম সম্প্রসারণ — গ্রাহক সন্তুষ্টি, নতুন সদস্য ও ঋণস্থিতি বৃদ্ধি', 'max' => 15],
                            ['key' => 'bm_discipline_leadership', 'en' => '7. Discipline, values & leadership potential', 'bn' => '৭. শৃঙ্খলা ও দায়িত্ববোধ — প্রতিষ্ঠানের নিয়ম মেনে চলা ও নেতৃত্বের গুণাবলী', 'max' => 10],
                        ],
                    ],
                ],
            ],
        ];

        DB::transaction(function () use ($modules) {
            foreach ($modules as $mod) {
                $template = EvaluationTemplate::updateOrCreate(
                    ['code' => $mod['code']],
                    [
                        'appraisal_type' => $mod['appraisal_type'],
                        'category_name_bn' => $mod['category_name_bn'],
                        'category_name_en' => $mod['category_name_en'],
                        'title_en' => $mod['title_en'],
                        'title_bn' => $mod['title_bn'],
                        'description' => $mod['description'],
                        'total_marks' => $mod['total_marks'],
                        'is_active' => true,
                        'version' => 1,
                    ]
                );

                $secOrder = 1;
                foreach ($mod['sections'] as $sec) {
                    $section = EvaluationSection::updateOrCreate(
                        [
                            'template_id' => $template->id,
                            'section_key' => $sec['section_key'],
                        ],
                        [
                            'name_en' => $sec['name_en'],
                            'name_bn' => $sec['name_bn'],
                            'max_marks' => $sec['max_marks'],
                            'order' => $secOrder++,
                        ]
                    );

                    $critOrder = 1;
                    foreach ($sec['items'] as $item) {
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
