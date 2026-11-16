export interface RubricCriterion {
    sl_no: number;
    key: string;
    nameBn: string;
    maxScore: number;
}

export interface QualitativeIndicator {
    sl_no: number;
    key: string;
    nameBn: string;
}

export type RatingOptionKey = 'excellent' | 'good' | 'satisfactory' | 'needs_improvement' | 'poor';

export interface RatingOption {
    key: RatingOptionKey;
    labelBn: string;
    labelEn: string;
    color: string;
}

export const QUALITATIVE_RATING_OPTIONS: RatingOption[] = [
    { key: 'excellent', labelBn: 'অসাধারণ', labelEn: 'Excellent', color: 'text-emerald-700 bg-emerald-50 border-emerald-300' },
    { key: 'good', labelBn: 'ভালো', labelEn: 'Good', color: 'text-blue-700 bg-blue-50 border-blue-300' },
    { key: 'satisfactory', labelBn: 'সন্তোষজনক', labelEn: 'Satisfactory', color: 'text-amber-700 bg-amber-50 border-amber-300' },
    { key: 'needs_improvement', labelBn: 'উন্নয়ন প্রয়োজন', labelEn: 'Needs Improvement', color: 'text-orange-700 bg-orange-50 border-orange-300' },
    { key: 'poor', labelBn: 'দুর্বল', labelEn: 'Poor', color: 'text-rose-700 bg-rose-50 border-rose-300' },
];

export const TRAINEE_FORM_CONFIGS: Record<string, {
    labelBn: string;
    labelEn: string;
    titleBn: string;
    titleEn: string;
    departmentReviewerBn: string;
    departmentReviewerEn: string;
    rubrics: RubricCriterion[];
    qualitativeIndicators: QualitativeIndicator[];
}> = {
    officer_abm: {
        labelBn: 'অফিসার ও সহকারী শাখা ব্যবস্থাপক (Officer & ABM)',
        labelEn: 'Officer & Assistant Branch Manager',
        titleBn: 'প্রশিক্ষণার্থী মূল্যায়ন ফরম (অফিসার ও সহকারী শাখা ব্যবস্থাপক পদবীর জন্য প্রযোজ্য)',
        titleEn: 'Trainee Evaluation Form (Officer & Assistant Branch Manager)',
        departmentReviewerBn: 'মাইক্রোফাইন্যান্স বিভাগ',
        departmentReviewerEn: 'Microfinance Department',
        rubrics: [
            {
                sl_no: 1,
                key: 'off_loan_knowledge',
                nameBn: 'ঋণ কার্যক্রমের জ্ঞান – সংস্থার নিয়মনীতি, ঋণ পণ্য, সদস্যের যোগ্যতা, কিস্তি ও সঞ্চয় সম্পর্কে ধারণা',
                maxScore: 15,
            },
            {
                sl_no: 2,
                key: 'off_field_skill',
                nameBn: 'মাঠপর্যায়ে কাজের দক্ষতা – সদস্য/সম্ভাব্য সদস্যের সাথে যোগাযোগ, বাড়ি/ব্যবসা পরিদর্শন ও তথ্য সংগ্রহ',
                maxScore: 15,
            },
            {
                sl_no: 3,
                key: 'off_member_verification',
                nameBn: 'সদস্য যাচাই ও ঋণ প্রস্তাব – সদস্যের পরিচয়, আয়-ব্যয়, ব্যবসা, ঋণের উদ্দেশ্য ও পরিশোধ সক্ষমতা যাচাই',
                maxScore: 15,
            },
            {
                sl_no: 4,
                key: 'off_recovery_teamwork',
                nameBn: 'কিস্তি ও বকেয়া আদায় এবং টিম ওয়ার্ক – নিয়মিত আদায়, বকেয়া আদায় ও টিম ওয়ার্কে অংশগ্রহণ',
                maxScore: 15,
            },
            {
                sl_no: 5,
                key: 'off_records_reporting',
                nameBn: 'নথিপত্র সংরক্ষণ ও রিপোর্টিং – ফরম, রেজিস্টার, সদস্যের রেকর্ড ও দৈনিক/সাপ্তাহিক রিপোর্ট সঠিকভাবে প্রস্তুত',
                maxScore: 15,
            },
            {
                sl_no: 6,
                key: 'off_customer_service',
                nameBn: 'সদস্যসেবা ও যোগাযোগ দক্ষতা – সদস্যের সাথে ভদ্র আচরণ, বোঝানোর ক্ষমতা, অভিযোগ/সমস্যা মোকাবেলা',
                maxScore: 15,
            },
            {
                sl_no: 7,
                key: 'off_discipline_responsibility',
                nameBn: 'শৃঙ্খলা ও দায়িত্ববোধ – নিয়মানুবর্তিতা, উপস্থিতি, দায়িত্ব পালন ও ঊর্ধ্বতন কর্মকর্তার নির্দেশনা অনুসরণ',
                maxScore: 10,
            },
        ],
        qualitativeIndicators: [
            { sl_no: 1, key: 'q_off_comm', nameBn: 'সদস্যের সাথে যোগাযোগ' },
            { sl_no: 2, key: 'q_off_survey', nameBn: 'সদস্য জরিপ ও যাচাই' },
            { sl_no: 3, key: 'q_off_field_visit', nameBn: 'মাঠ পরিদর্শন' },
            { sl_no: 4, key: 'q_off_loan_proposal', nameBn: 'ঋণ প্রস্তাব প্রস্তুত' },
            { sl_no: 5, key: 'q_off_regular_recovery', nameBn: 'নিয়মিত কিস্তি আদায়' },
            { sl_no: 6, key: 'q_off_savings_collection', nameBn: 'সঞ্চয়/আমানত আদায় সক্ষমতা' },
            { sl_no: 7, key: 'q_off_overdue_recovery', nameBn: 'বকেয়া আদায় সক্ষমতা' },
            { sl_no: 8, key: 'q_off_records', nameBn: 'হিসাব ও নথিপত্র সংরক্ষণ' },
            { sl_no: 9, key: 'q_off_reporting', nameBn: 'রিপোর্টিং' },
            { sl_no: 10, key: 'q_off_problem_solving', nameBn: 'সমস্যা সমাধান' },
            { sl_no: 11, key: 'q_off_teamwork', nameBn: 'নেতৃত্ব/দলগত কাজ' },
            { sl_no: 12, key: 'q_off_overtime', nameBn: 'অতিরিক্ত সময় কাজ করার আগ্রহ' },
            { sl_no: 13, key: 'q_off_stress_handling', nameBn: 'চাপের মধ্যে কাজ করার সক্ষমতা' },
            { sl_no: 14, key: 'q_off_it_skill', nameBn: 'তথ্য ও যোগাযোগ প্রযুক্তি ব্যবহার দক্ষতা' },
        ],
    },

    accountant: {
        labelBn: 'হিসাবরক্ষক (Accountant)',
        labelEn: 'Accountant',
        titleBn: 'প্রশিক্ষণার্থী মূল্যায়ন ফরম (হিসাবরক্ষক পদবীর জন্য প্রযোজ্য)',
        titleEn: 'Trainee Evaluation Form (Accountant)',
        departmentReviewerBn: 'অর্থ ও হিসাব বিভাগ',
        departmentReviewerEn: 'Finance & Accounts Department',
        rubrics: [
            {
                sl_no: 1,
                key: 'acc_records_entry',
                nameBn: 'হিসাব সংরক্ষণ ও লেনদেন লিপিবদ্ধকরণ – Cash Book, Ledger, Journal ও দৈনিক হিসাব সঠিকভাবে সংরক্ষণ',
                maxScore: 10,
            },
            {
                sl_no: 2,
                key: 'acc_cash_management',
                nameBn: 'নগদ অর্থ ব্যবস্থাপনা – Cash balance, cash count, cash closing এবং নগদ ক্যাশ নিরাপত্তা',
                maxScore: 10,
            },
            {
                sl_no: 3,
                key: 'acc_loan_savings_mgmt',
                nameBn: 'ঋণ ও সঞ্চয় হিসাব ব্যবস্থাপনা – ঋণ বিতরণ, কিস্তি আদায়, সঞ্চয় ও সংশ্লিষ্ট হিসাবের নির্ভুলতা',
                maxScore: 10,
            },
            {
                sl_no: 4,
                key: 'acc_voucher_support',
                nameBn: 'Voucher ও Supporting Document যাচাই – Voucher প্রস্তুত, যাচাই, অনুমোদন ও সংরক্ষণ প্রক্রিয়া',
                maxScore: 10,
            },
            {
                sl_no: 5,
                key: 'acc_banking_reconciliation',
                nameBn: 'ব্যাংকিং ও Reconciliation – ব্যাংক লেনদেন, Bank Book এবং হিসাবের অমিল সনাক্তকরণ',
                maxScore: 10,
            },
            {
                sl_no: 6,
                key: 'acc_reporting_statements',
                nameBn: 'রিপোর্ট ও হিসাব বিবরণী প্রস্তুত – দৈনিক/মাসিক রিপোর্ট এবং প্রয়োজনীয় তথ্য সময়মতো প্রদান',
                maxScore: 10,
            },
            {
                sl_no: 7,
                key: 'acc_accuracy_control',
                nameBn: 'হিসাবের নির্ভুলতা ও নিয়ন্ত্রণ – ভুল সনাক্তকরণ, হিসাব মেলানো এবং Internal Control অনুসরণ',
                maxScore: 10,
            },
            {
                sl_no: 8,
                key: 'acc_software_excel',
                nameBn: 'হিসাব সফটওয়্যার/Excel ব্যবহারের দক্ষতা – প্রয়োজনীয় তথ্য এন্ট্রি, যাচাই ও রিপোর্ট তৈরি',
                maxScore: 15,
            },
            {
                sl_no: 9,
                key: 'acc_learning_agility',
                nameBn: 'শেখার আগ্রহ ও দ্রুত শেখার সক্ষমতা – প্রশিক্ষণ গ্রহণ, নির্দেশনা অনুসরণ এবং শেখা বিষয় কাজে প্রয়োগ',
                maxScore: 5,
            },
            {
                sl_no: 10,
                key: 'acc_integrity_ethics',
                nameBn: 'সততা, দায়িত্বশীলতা ও পেশাগত আচরণ – গোপনীয়তা, নিয়মানুবর্তিতা, শৃঙ্খলা ও সহকর্মীদের সাথে আচরণ',
                maxScore: 10,
            },
        ],
        qualitativeIndicators: [
            { sl_no: 1, key: 'q_acc_daily_accounts', nameBn: 'দৈনিক হিসাব সংরক্ষণ' },
            { sl_no: 2, key: 'q_acc_cash_handling', nameBn: 'নগদ গ্রহণ ও প্রদানের ক্ষেত্রে সতর্কতা' },
            { sl_no: 3, key: 'q_acc_voucher_prep', nameBn: 'Voucher প্রস্তুত ও যাচাই' },
            { sl_no: 4, key: 'q_acc_loan_savings_acc', nameBn: 'ঋণ ও সঞ্চয় হিসাব ব্যবস্থাপনা' },
            { sl_no: 5, key: 'q_acc_records_keeping', nameBn: 'প্রয়োজনীয় কাগজপত্র/রেকর্ড সংরক্ষণ' },
            { sl_no: 6, key: 'q_acc_bank_recon', nameBn: 'ব্যাংক লেনদেন ও Bank Reconciliation' },
            { sl_no: 7, key: 'q_acc_error_detection', nameBn: 'হিসাবের ভুল/অমিল সনাক্তকরণ' },
            { sl_no: 8, key: 'q_acc_software_knowledge', nameBn: 'হিসাব/HR/অন্যান্য সফটওয়্যার সম্পর্কে জ্ঞান' },
            { sl_no: 9, key: 'q_acc_timely_reporting', nameBn: 'রিপোর্ট প্রস্তুত ও সময়মতো দাখিল' },
            { sl_no: 10, key: 'q_acc_peer_behavior', nameBn: 'সহকর্মী ও ঊর্ধ্বতনদের সাথে পেশাগত আচরণ' },
            { sl_no: 11, key: 'q_acc_policy_following', nameBn: 'সততা, দায়িত্বশীলতা ও নিয়ম-নীতি অনুসরণ' },
            { sl_no: 12, key: 'q_acc_overtime', nameBn: 'অতিরিক্ত সময় কাজ করার আগ্রহ' },
            { sl_no: 13, key: 'q_acc_stress_handling', nameBn: 'চাপের মধ্যে কাজ করার সক্ষমতা' },
            { sl_no: 14, key: 'q_acc_computer_office', nameBn: 'Computer, Office package, Internet ব্যবহার' },
        ],
    },

    bm_and_above: {
        labelBn: 'শাখা ব্যবস্থাপক থেকে তদূর্ধ্ব (BM to ZM)',
        labelEn: 'Branch Manager to Zonal Manager',
        titleBn: 'প্রশিক্ষণার্থী মূল্যায়ন ফরম (শাখা ব্যবস্থাপক থেকে তদূর্ধ্ব পদবীর জন্য প্রযোজ্য)',
        titleEn: 'Trainee Evaluation Form (Branch Manager to Zonal Manager)',
        departmentReviewerBn: 'মাইক্রোফাইন্যান্স বিভাগ',
        departmentReviewerEn: 'Microfinance Department',
        rubrics: [
            {
                sl_no: 1,
                key: 'bm_loan_program',
                nameBn: 'ঋণ কার্যক্রমের জ্ঞান ও প্রয়োগ — ঋণ নীতিমালা, বিতরণ, ঋণগ্রহীতা যাচাই ও ব্যবহার',
                maxScore: 15,
            },
            {
                sl_no: 2,
                key: 'bm_recovery_overdue',
                nameBn: 'আদায় ও বকেয়া ব্যবস্থাপনা — কিস্তি আদায়, বকেয়া সনাক্তকরণ ও ফলোআপ',
                maxScore: 15,
            },
            {
                sl_no: 3,
                key: 'bm_branch_operation',
                nameBn: 'শাখা পরিচালনার দক্ষতা — দৈনন্দিন কার্যক্রম, পরিকল্পনা ও কাজের সমন্বয়',
                maxScore: 15,
            },
            {
                sl_no: 4,
                key: 'bm_leadership_hr',
                nameBn: 'নেতৃত্ব ও কর্মী ব্যবস্থাপনা — কাজ বণ্টন, তদারকি, নির্দেশনা ও দল পরিচালনা',
                maxScore: 15,
            },
            {
                sl_no: 5,
                key: 'bm_mis_control',
                nameBn: 'হিসাব, MIS ও নিয়ন্ত্রণ — হিসাব যাচাই, রিপোর্টিং, নথিপত্র সংরক্ষণ ও Internal Control',
                maxScore: 10,
            },
            {
                sl_no: 6,
                key: 'bm_learning_capacity',
                nameBn: 'প্রশিক্ষণ গ্রহণ ও শেখার সক্ষমতা — আগ্রহ, দ্রুত শেখা ও শেখা বিষয় কাজে প্রয়োগ',
                maxScore: 10,
            },
            {
                sl_no: 7,
                key: 'bm_decision_making',
                nameBn: 'সমস্যা সমাধান ও সিদ্ধান্ত গ্রহণ — বাস্তব পরিস্থিতি বিশ্লেষণ ও যথাযথ সিদ্ধান্ত',
                maxScore: 10,
            },
            {
                sl_no: 8,
                key: 'bm_integrity_conduct',
                nameBn: 'সততা, দায়িত্ববোধ ও পেশাগত আচরণ — নৈতিকতা, নিয়মানুবর্তিতা, যোগাযোগ ও শৃঙ্খলা',
                maxScore: 10,
            },
        ],
        qualitativeIndicators: [
            { sl_no: 1, key: 'q_bm_integrity', nameBn: 'সততা ও নৈতিকতা' },
            { sl_no: 2, key: 'q_bm_cash_control', nameBn: 'নগদ/আর্থিক নিয়ন্ত্রণ' },
            { sl_no: 3, key: 'q_bm_loan_recovery', nameBn: 'ঋণ আদায় সক্ষমতা' },
            { sl_no: 4, key: 'q_bm_savings_collection', nameBn: 'সঞ্চয়/আমানত আদায় সক্ষমতা' },
            { sl_no: 5, key: 'q_bm_overdue_recovery', nameBn: 'বকেয়া আদায় সক্ষমতা' },
            { sl_no: 6, key: 'q_bm_risk_detection', nameBn: 'ঋণ ঝুঁকি সনাক্তকরণ' },
            { sl_no: 7, key: 'q_bm_staff_mgmt', nameBn: 'কর্মী ব্যবস্থাপনা' },
            { sl_no: 8, key: 'q_bm_policy_following', nameBn: 'নীতিমালা অনুসরণ' },
            { sl_no: 9, key: 'q_bm_decision', nameBn: 'সিদ্ধান্ত গ্রহণ' },
            { sl_no: 10, key: 'q_bm_software_knowledge', nameBn: 'হিসাব/HR/অন্যান্য সফটওয়্যার সম্পর্কে জ্ঞান' },
            { sl_no: 11, key: 'q_bm_reporting', nameBn: 'রিপোর্ট প্রস্তুত ও সময়মতো দাখিল' },
            { sl_no: 12, key: 'q_bm_overtime', nameBn: 'অতিরিক্ত সময় কাজ করার আগ্রহ' },
            { sl_no: 13, key: 'q_bm_stress_handling', nameBn: 'চাপের মধ্যে কাজ করার সক্ষমতা' },
            { sl_no: 14, key: 'q_bm_computer_office', nameBn: 'Computer, Office package, Internet ব্যবহার' },
        ],
    },
};

export interface GradeConfig {
    grade: 'excellent' | 'very_good' | 'good' | 'not_satisfactory';
    min: number;
    max: number;
    labelBn: string;
    labelEn: string;
    descriptionBn: string;
    descriptionEn: string;
    badgeVariant: string;
}

export const TRAINEE_SCORE_GRADES: GradeConfig[] = [
    {
        grade: 'excellent',
        min: 85,
        max: 100,
        labelBn: 'Excellent (৮৫-১০০)',
        labelEn: 'Excellent (85-100)',
        descriptionBn: 'প্রশিক্ষণ সফলভাবে সম্পন্ন হয়েছে, নিয়োগের জন্য অত্যন্ত উপযুক্ত',
        descriptionEn: 'Training successfully completed, highly suitable for appointment',
        badgeVariant: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    },
    {
        grade: 'very_good',
        min: 65,
        max: 84,
        labelBn: 'Very Good (৬৫-৮৪)',
        labelEn: 'Very Good (65-84)',
        descriptionBn: 'প্রশিক্ষণ সম্পন্ন হয়েছে, নিয়োগের জন্য উপযুক্ত',
        descriptionEn: 'Training completed, suitable for appointment',
        badgeVariant: 'bg-blue-100 text-blue-800 border-blue-300',
    },
    {
        grade: 'good',
        min: 50,
        max: 64,
        labelBn: 'Good (৫০-৬৪)',
        labelEn: 'Good (50-64)',
        descriptionBn: 'নিয়োগের জন্য বিবেচনাযোগ্য',
        descriptionEn: 'Considerable for appointment',
        badgeVariant: 'bg-amber-100 text-amber-800 border-amber-300',
    },
    {
        grade: 'not_satisfactory',
        min: 0,
        max: 49.99,
        labelBn: 'Not Satisfactory (৫০-এর নিচে)',
        labelEn: 'Not Satisfactory (Below 50)',
        descriptionBn: 'প্রশিক্ষণ সমাপ্ত করতে হবে',
        descriptionEn: 'Training should be discontinued / terminated',
        badgeVariant: 'bg-rose-100 text-rose-800 border-rose-300',
    },
];

export function calculateTraineeGrade(totalScore: number): GradeConfig {
    const score = Number(totalScore) || 0;
    if (score >= 85) return TRAINEE_SCORE_GRADES[0];
    if (score >= 65) return TRAINEE_SCORE_GRADES[1];
    if (score >= 50) return TRAINEE_SCORE_GRADES[2];
    return TRAINEE_SCORE_GRADES[3];
}

export function getGradeBadge(totalScore: number) {
    const grade = calculateTraineeGrade(totalScore);
    return {
        labelBn: grade.labelBn,
        labelEn: grade.labelEn,
        color: grade.badgeVariant,
        descriptionBn: grade.descriptionBn,
        descriptionEn: grade.descriptionEn,
    };
}

export const TRAINEE_RECOMMENDATION_OPTIONS = [
    {
        key: 'recommend_appointment',
        labelBn: 'নিয়োগের জন্য সুপারিশ করা হলো।',
        labelEn: 'Recommended for Appointment.',
    },
    {
        key: 'extend_probation',
        labelBn: 'প্রশিক্ষণকাল বৃদ্ধি করে পুনর্মূল্যায়ন করা হোক।',
        labelEn: 'Extend training period and re-evaluate.',
    },
    {
        key: 'not_satisfactory',
        labelBn: 'প্রশিক্ষণ সন্তোষজনক নয়, প্রশিক্ষণকাল সমাপ্ত করা যেতে পারে।',
        labelEn: 'Training not satisfactory, training may be discontinued.',
    },
];

export const toBengaliNumber = (num: number | string | null | undefined) => {
    if (num === null || num === undefined || num === '') return '';
    const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return String(num).replace(/\d/g, d => bnDigits[Number(d)]);
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
                return `${bnMonths[monthNum - 1]} ${toBengaliNumber(year)}`;
            } else {
                return `${enMonths[monthNum - 1]} ${year}`;
            }
        }
    }
    return targetLang === 'bn' ? toBengaliNumber(str) : str;
};

