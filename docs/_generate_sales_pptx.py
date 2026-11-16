# -*- coding: utf-8 -*-
"""Generate Mousumi ERP sales PowerPoint. Run from repo: python docs/_generate_sales_pptx.py"""
from pathlib import Path

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.oxml.ns import qn
from pptx.util import Inches, Pt

OUT = Path(__file__).resolve().parent / "Mousumi-ERP-Sales-Presentation.pptx"

NAVY = RGBColor(0x0F, 0x17, 0x2A)
SLATE = RGBColor(0x33, 0x41, 0x55)
MUTED = RGBColor(0x64, 0x74, 0x8B)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
OFFWHITE = RGBColor(0xF8, 0xFA, 0xFC)
EMERALD = RGBColor(0x04, 0x78, 0x57)
TEAL = RGBColor(0x0F, 0x76, 0x6E)
GOLD = RGBColor(0xB4, 0x53, 0x09)
LINE = RGBColor(0xE2, 0xE8, 0xF0)

W = Inches(13.333)
H = Inches(7.5)

# Nirmala UI carries both Latin and Bengali on Windows
FONT = "Nirmala UI"
FONT_BN = "Nirmala UI"


def set_run(run, size=18, bold=False, color=SLATE, font=FONT, italic=False):
    run.font.name = font
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.italic = italic
    run.font.color.rgb = color
    rPr = run._r.get_or_add_rPr()
    latin = rPr.find(qn("a:latin"))
    if latin is None:
        latin = rPr.makeelement(qn("a:latin"), {})
        rPr.append(latin)
    latin.set("typeface", font)


def add_rect(slide, l, t, w, h, fill):
    sh = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, l, t, w, h)
    sh.fill.solid()
    sh.fill.fore_color.rgb = fill
    sh.line.fill.background()
    return sh


def add_text_box(slide, l, t, w, h, text, size=18, bold=False, color=SLATE, align=PP_ALIGN.LEFT, font=FONT, italic=False):
    tb = slide.shapes.add_textbox(l, t, w, h)
    tf = tb.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.alignment = align
    run = p.add_run()
    run.text = text
    set_run(run, size=size, bold=bold, color=color, font=font, italic=italic)
    return tb


def notes(slide, text):
    if not text:
        return
    tf = slide.notes_slide.notes_text_frame
    tf.text = text
    for p in tf.paragraphs:
        for r in p.runs:
            r.font.name = FONT_BN
            r.font.size = Pt(14)


def footer(slide, num, total):
    add_text_box(slide, Inches(0.5), Inches(7.18), Inches(8), Inches(0.25), "Mousumi ERP  ·  Confidential", 11, False, MUTED)
    add_text_box(slide, Inches(10.6), Inches(7.18), Inches(2.2), Inches(0.25), f"{num}  /  {total}", 11, False, MUTED, PP_ALIGN.RIGHT)


def chrome_content(slide, kicker, title, num, total):
    add_rect(slide, 0, 0, W, H, WHITE)
    add_rect(slide, 0, 0, W, Inches(0.12), EMERALD)
    add_rect(slide, 0, Inches(7.05), W, Inches(0.45), OFFWHITE)
    if kicker:
        add_text_box(slide, Inches(0.55), Inches(0.28), Inches(12.2), Inches(0.28), kicker.upper(), 12, True, EMERALD)
    add_text_box(slide, Inches(0.55), Inches(0.52), Inches(12.2), Inches(0.5), title, 28, True, NAVY)
    add_rect(slide, Inches(0.55), Inches(1.08), Inches(1.4), Inches(0.06), EMERALD)
    footer(slide, num, total)


def bullets(slide, items, top=1.28, left=0.55, width=12.2, size=18, color=SLATE):
    tb = slide.shapes.add_textbox(Inches(left), Inches(top), Inches(width), Inches(5.55))
    tf = tb.text_frame
    tf.word_wrap = True
    for i, item in enumerate(items):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.level = 0
        p.space_after = Pt(8)
        p.space_before = Pt(2)
        run = p.add_run()
        run.text = "•  " + item
        set_run(run, size=size, color=color)


def two_col_bullets(slide, left_items, right_items, top=1.28):
    for col, items in ((0.55, left_items), (6.95, right_items)):
        tb = slide.shapes.add_textbox(Inches(col), Inches(top), Inches(5.8), Inches(5.5))
        tf = tb.text_frame
        tf.word_wrap = True
        for i, item in enumerate(items):
            p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
            p.space_after = Pt(8)
            run = p.add_run()
            run.text = "•  " + item
            set_run(run, size=16, color=SLATE)


def add_table(slide, rows, left=0.55, top=1.28, width=12.2, col_w=None, header=True):
    n_rows = len(rows)
    n_cols = len(rows[0])
    table_shape = slide.shapes.add_table(n_rows, n_cols, Inches(left), Inches(top), Inches(width), Inches(min(0.42 * n_rows, 5.4)))
    table = table_shape.table
    if col_w:
        for i, w in enumerate(col_w):
            table.columns[i].width = Inches(w)
    for r, row in enumerate(rows):
        for c, val in enumerate(row):
            cell = table.cell(r, c)
            cell.text = ""
            p = cell.text_frame.paragraphs[0]
            run = p.add_run()
            run.text = str(val)
            is_h = header and r == 0
            set_run(run, size=13 if is_h else 13, bold=is_h, color=WHITE if is_h else NAVY)
            cell.text_frame.word_wrap = True
            fill = EMERALD if is_h else (OFFWHITE if r % 2 == 0 else WHITE)
            cell.fill.solid()
            cell.fill.fore_color.rgb = fill


# --- slide content: (kind, kicker, title, payload, notes)
# kind: title | section | bullets | two_col | table | quote | closer

SLIDES = []


def S(*args):
    SLIDES.append(args)


S(
    "title",
    "",
    "Mousumi ERP",
    {
        "subtitle": "Human Resource  +  Payroll  +  Operations Platform",
        "tag": "এক প্ল্যাটফর্মে মানুষ, সময়, বেতন, সম্পদ",
        "foot": "Confidential  |  Sales Presentation",
    },
    "আজকের প্রেজেন্টেশনের উদ্দেশ্য একটাই — আপনাদের সংস্থা কীভাবে একটা ইন্টিগ্রেটেড সিস্টেমে কর্মী, উপস্থিতি, ছুটি, বেতন, ঋণ, প্রভিডেন্ট ফান্ড, গ্র্যাচুইটি, ফিক্সড অ্যাসেট আর ইনভেন্টরি চালাতে পারে। এটি আলাদা আলাদা এক্সেল বা আলাদা সফটওয়্যার নয়; এক লগইন, এক ডাটাবেস, এক ওয়ার্কফ্লো।",
)

S("section", "01", "Opening", "সমস্যা, সমাধান, কেন এই প্রোডাক্ট", "")

S(
    "bullets",
    "Agenda",
    "আজকের আলোচনা",
    [
        "সমস্যা — আজকের বাস্তবতা",
        "সমাধান — Mousumi ERP এক নজরে",
        "১০টি লাইভ মডিউল (ডিটেইলে)",
        "কে কী দেখবে — রোল ও অনুমতি",
        "রিপোর্ট ও কমপ্লায়েন্স",
        "টেকনোলজি, মোবাইল, সিকিউরিটি",
        "ইমপ্লিমেন্টেশন ও পরবর্তী ধাপ",
    ],
    "প্রথমে সমস্যা বুঝব, তারপর সিস্টেম দেখাব, তারপর মডিউল ধরে ধরে যাব। শেষে ডেমো ও পরবর্তী ধাপ। প্রশ্ন যেকোনো সময় করতে পারেন।",
)

S(
    "two_col",
    "The problem",
    "আপনাদের মতো প্রতিষ্ঠানের ব্যথা",
    [
        [
            "কর্মী তথ্য এক্সেল / ফাইলে ছড়ানো",
            "বায়োমেট্রিক মেশিন আলাদা, বেতন আলাদা, ছুটি আলাদা",
            "শাখা, জোন, আঞ্চলিক অফিস — কে কী দেখবে তা কাগজে",
        ],
        [
            "স্যালারি শিট, ব্যাংক অ্যাডভাইস, PF, গ্র্যাচুইটি ম্যানুয়াল",
            "ফিল্ড মুভমেন্ট, কি.মি., ভাউচার — হিসাব মিলাতে দেরি",
            "অডিট এলে রিপোর্ট জোড়া লাগাতে রাত জাগা",
        ],
    ],
    "মাল্টি-ব্রাঞ্চ প্রতিষ্ঠানে সবচেয়ে বড় ক্ষতি হলো ডাটা দ্বৈততা। একজন কর্মী বদলি হলে অ্যাটেনডেন্স ডিভাইস, বেতন স্ট্রাকচার, লোন কিস্তি — সব জায়গায় আলাদা করে আপডেট। আমরা এগুলোকে এক চেইনে বেঁধেছি।",
)

S(
    "quote",
    "The solution",
    "সমাধান এক লাইনে",
    {
        "quote": "এক লগইন। অনেক মডিউল। এক সত্যের উৎস।",
        "bullets": [
            "কর্মী মাস্টার থেকে শুরু — একবার এন্ট্রি",
            "উপস্থিতি ও মুভমেন্ট সেই কর্মীতেই জমা",
            "ছুটি, লোন, PF, গ্র্যাচুইটি সেই লেজারেই",
            "পে-রোল সেগুলো কেটে পে-স্লিপ বানায়",
            "রিপোর্ট এক ক্লিকে PDF / Excel / প্রিন্ট",
        ],
    },
    "কর্মী একবার এন্ট্রি হলে বাকি মডিউল সেই আইডি ব্যবহার করে। তাই স্যালারি শিটে ভুল PIN, লোনে ভুল ব্রাঞ্চ, PF-এ ভুল ব্যালেন্স — এই ধরনের গ্যাপ কমে।",
)

S(
    "bullets",
    "Why us",
    "কেন এই প্রোডাক্ট",
    [
        "বাংলাদেশ-কেন্দ্রিক — গ্রেড-স্টেপ বেতন, আয়কর স্ল্যাব, PF, গ্র্যাচুইটি, জুলাই–জুন আর্থিক বছর",
        "মাল্টি-ব্রাঞ্চ অরগানোগ্রাম — ED → Director → ZM → RM → BM → Department Head",
        "বায়োমেট্রিক + মোবাইল জিওফেন্স একসাথে",
        "ফিল্ড মুভমেন্ট + লগবুক + পেমেন্ট + পেনাল্টি — NGO/MFI ফিল্ড অপারেশন",
        "লোন ↔ পে-রোল ↔ PF এক ইঞ্জিনে",
        "PWA — ফিল্ড স্টাফ ফোনে অ্যাপের মতো ব্যবহার করতে পারে",
    ],
    "আন্তর্জাতিক HRIS গুলো পশ্চিমা অফিসের জন্য। আমাদের সিস্টেম শাখা, মাঠকর্মী, প্রবেশন, অবসরকালীন ফাইনাল পেমেন্ট — এই বাস্তবতাকে মাথায় রেখে তৈরি।",
)

S(
    "bullets",
    "Proof",
    "লাইভ রেফারেন্স — কনসেপ্ট নয়",
    [
        "প্রোডাক্ট: Mousumi ERP / HRM Application",
        "রেফারেন্স অর্গানাইজেশন: MOUSUMI, উকিলপাড়া, নওগাঁ",
        "অ্যাক্সেস: ওয়েব + মোবাইল (PWA)",
        "মডিউল লঞ্চার: Control Center — এক স্ক্রিনে সব সেকশন",
        "হোয়াইট-লেবেল: আপনাদের নাম, লোগো, ঠিকানা, শাখা — রিপোর্ট হেডারে আপনাদের নামই ছাপা হবে",
    ],
    "এটি কনসেপ্ট নয়, চলমান সিস্টেম। আপনাদের নাম, লোগো, ঠিকানা, শাখা কাঠামো বসিয়ে হোয়াইট-লেবেল করা যায়।",
)

S(
    "table",
    "Audience",
    "কাদের জন্য",
    [
        ["উপযোগী", "উদাহরণ"],
        ["NGO / উন্নয়ন সংস্থা", "মাল্টি-প্রজেক্ট, মাল্টি-ব্রাঞ্চ"],
        ["মাইক্রোফাইন্যান্স", "জোন–রিজিওন–শাখা লাইন"],
        ["কর্পোরেট (মাল্টি-লোকেশন)", "HO + ফ্যাক্টরি / শাখা"],
        ["শিক্ষা / হাসপাতাল নেটওয়ার্ক", "সেন্ট্রাল HR + লোকাল অ্যাটেনডেন্স"],
    ],
    "সবচেয়ে বেশি মিল যাদের: অনেক শাখা, ফিল্ড মুভমেন্ট, গ্রেড-ভিত্তিক বেতন, স্টাফ লোন ও PF। সিঙ্গেল অফিস ছোট কোম্পানির জন্যও চলে, কিন্তু মূল শক্তি মাল্টি-ব্রাঞ্চে।",
)

S(
    "two_col",
    "Scale",
    "এক নজরে সংখ্যা",
    [
        [
            "১০টি লাইভ ERP সেকশন + অফিস ম্যাপ",
            "১০০+ বিজনেস মডেল",
            "৩০০+ স্ক্রিন (ওয়েব UI)",
            "১৫+ বিল্ট-ইন রোল",
        ],
        [
            "পে-রোল রিপোর্ট ১৭  ·  PF ১০  ·  গ্র্যাচুইটি ৯",
            "লোন ১০  ·  ফিক্সড অ্যাসেট ১১",
            "এক্সপোর্ট: PDF, Excel, প্রিন্ট, ব্যাংক অ্যাডভাইস",
            "সেলফ-সার্ভিস পে-স্লিপ, PF, লোন, মাই অ্যাসেট",
        ],
    ],
    "এগুলো মার্কেটিং সংখ্যা নয় — সিস্টেমে আসলেই এতগুলো স্ক্রিন ও রিপোর্ট আছে। ডেমোতে মূল ফ্লো, বাকিটা ইমপ্লিমেন্টেশনে।",
)

S("section", "02", "Control Center", "এক লগইন, দশটি লাইভ মডিউল", "")

S(
    "table",
    "Modules",
    "Control Center — লাইভ মডিউল",
    [
        ["মডিউল", "কাজ এক লাইনে"],
        ["Human Resources", "কর্মী, অর্গ, বদলি/পদোন্নতি, অব্যাহতি"],
        ["Attendance & Movement", "উপস্থিতি + ফিল্ড মুভমেন্ট"],
        ["Leave", "আবেদন, ব্যালেন্স, অনুমোদন"],
        ["Employee Loan", "নীতি → অনুমোদন → কিস্তি"],
        ["Staff Fund", "PF, গ্র্যাচুইটি, ফাইনাল পেমেন্ট"],
        ["Payroll", "স্ট্রাকচার → প্রসেস → পোস্ট → পে-স্লিপ"],
        ["Fixed Asset", "ক্রয় থেকে ডিসপোজাল"],
        ["Inventory", "স্টক ইন ও ইস্যু"],
        ["Administration", "ইউজার, রোল, নোটিশ"],
        ["Office Map", "শাখা / জোন ম্যাপ"],
    ],
    "রোল অনুযায়ী কিছু মডিউল লক থাকে। অ্যাকাউন্টেন্ট পে-রোল মাস্টার দেখবেন না; শাখা ম্যানেজার শুধু নিজের শাখা; সাধারণ কর্মী শুধু সেলফ-সার্ভিস। রোডম্যাপ টাইল: Recruitment, Training, Store — ওভারসেল করবেন না। ডেমো: /sections",
)

S(
    "quote",
    "Lifecycle",
    "কর্মীর জীবনচক্র — Join to Exit",
    {
        "quote": "যোগদান → প্রোফাইল → প্রবেশন → কনফার্মেশন → ক্যারিয়ার → বেতন/লোন/PF → অব্যাহতি → ফাইনাল সেটেলমেন্ট",
        "bullets": [
            "Recruitment ATS এখন রোডম্যাপে — যোগদানের পর থেকে এক্সিট লাইভ",
            "ফাইনাল পেমেন্ট: PF রিফান্ড + গ্র্যাচুইটি − লোন রিকভারি",
            "এটি অনেক প্রতিষ্ঠানের সবচেয়ে কষ্টের কাজ — এখানে এক স্ক্রিনে",
        ],
    },
    "Recruitment এখন রোডম্যাপে। যোগদানের পর থেকে এক্সিট পর্যন্ত পুরো চেইন লাইভ।",
)

S("section", "03", "Human Resources", "মাস্টার ডাটা থেকে অব্যাহতি", "")

S(
    "bullets",
    "HR",
    "অর্গানাইজেশন স্ট্রাকচার",
    [
        "জোন → আঞ্চলিক অফিস → শাখা",
        "হেড অফিস ডিপার্টমেন্ট ও পদবি (Designation)",
        "কর্মীর ধরন, প্রোগ্রাম, প্রজেক্ট — ডোনার/প্রজেক্ট রিপোর্টের জন্য ট্যাগ",
        "অর্গানাইজেশন চার্ট",
        "শাখায় জিওফেন্স (মোবাইল অ্যাটেনডেন্স)",
        "শাখাভেদে উইকএন্ড, অ্যাটেনডেন্স রুল, পে-রোল ব্যাংক অ্যাকাউন্ট",
    ],
    "শাখা শুধু নাম নয়। ডেমো: Organization Setup → Branches / Zones / Departments / Chart।",
)

S(
    "two_col",
    "HR",
    "কর্মী মাস্টার — ৩৬০° প্রোফাইল",
    [
        [
            "ব্যক্তিগত তথ্য, ছবি, NID, মোবাইল",
            "ঠিকানা: উপজেলা–ইউনিয়ন–গ্রাম",
            "শিক্ষা, অভিজ্ঞতা, প্রশিক্ষণ রেকর্ড",
            "নমিনি (PF/গ্র্যাচুইটির জন্য)",
            "গ্যারান্টর ও গ্যারান্টর চেক",
        ],
        [
            "ব্যাংক অ্যাকাউন্ট → ব্যাংক অ্যাডভাইস",
            "জামানত / কল্যাটারাল (স্টাফ লোন)",
            "স্যালারি অ্যাসাইনমেন্ট",
            "বায়োমেট্রিক ID / ডিভাইস ইউজার ID",
            "ডকুমেন্ট আপলোড-ডাউনলোড, স্ট্যাটাস",
        ],
    ],
    "HR ফাইল আর সফটওয়্যার এক জায়গায়। একবার এন্ট্রি, সব মডিউল ব্যবহার করে। ডেমো: Employee Create/Edit ট্যাব।",
)

S(
    "bullets",
    "HR",
    "ইমপোর্ট, এক্সপোর্ট, ব্ল্যাঙ্ক ফর্ম",
    [
        "Excel এক্সপোর্ট — পুরো তালিকা",
        "Excel ইমপোর্ট উইজার্ড — প্রিভিউ → রিভিউ → কমিট",
        "প্রিন্টযোগ্য খালি HR ফর্ম — ম্যানুয়াল সংগ্রহের পর এন্ট্রি",
        "মাইগ্রেশনে শত শত কর্মী তোলা যায়; ভুল রো আগে দেখায়",
    ],
    "নতুন শাখা খুললে প্রিন্টেড ফর্ম দিয়ে ডাটা সংগ্রহ করে পরে এন্ট্রি — দুটো পথই আছে।",
)

S(
    "table",
    "HR",
    "ক্যারিয়ার ইভেন্ট — অনুমোদনসহ",
    [
        ["ইভেন্ট", "কী হয়"],
        ["Confirmation", "প্রবেশন → স্থায়ী; বেতন/পদোন্নতির সাথে যুক্ত"],
        ["Promotion / Demotion", "আবেদন → অনুমোদন → সম্পন্ন; হিস্ট্রি থাকে"],
        ["Transfer", "একক + বাল্ক বদলি — প্রজেক্ট শিফট/মার্জার"],
        ["Disciplinary Action", "শাস্তির রেজিস্টার"],
        ["Separation (অব্যাহতি)", "এক্সিট ওয়ার্কফ্লো → ফাইনাল পেমেন্ট"],
    ],
    "বদলি হলে শুধু শাখার নাম বদলায় না — অ্যাটেনডেন্স স্কোপ, অরগানোগ্রাম ভিজিবিলিটি, পে-রোল ব্রাঞ্চ সেই পোস্টিং অনুসারে চলে।",
)

S(
    "bullets",
    "HR",
    "হলিডে ক্যালেন্ডার",
    [
        "পাবলিক হলিডে CRUD + ক্যালেন্ডার ভিউ",
        "শাখা-প্রযোজ্য ছুটি",
        "মাসিক অ্যাটেনডেন্সে স্বয়ংক্রিয় Holiday স্ট্যাটাস",
        "উইকএন্ড আলাদা — শাখাভেদে শুক্র-শনি বা অন্য দিন",
    ],
    "ছুটির দিন ম্যানুয়ালি অ্যাটেনডেন্সে বসাতে হয় না। ক্যালেন্ডারে দিলে মাসিক শিটে H চলে আসে।",
)

S("section", "04", "Attendance & Movement", "মেশিন + মোবাইল + মাঠ", "")

S(
    "bullets",
    "Attendance",
    "তিনভাবে উপস্থিতি",
    [
        "ZKTeco বায়োমেট্রিক মেশিন — ফিঙ্গার / ফেস",
        "iClock ADMS — ডিভাইস নিজে সার্ভারে পাঠায়",
        "মোবাইল সেলফ-পাঞ্চ — GPS জিওফেন্স + প্রতিদিন এক ডিভাইস লক",
        "HR ম্যানুয়াল এন্ট্রি; সুপার অ্যাডমিন বাল্ক অ্যাটেনডেন্স",
        "অফিস স্টাফ মেশিনে, ফিল্ড স্টাফ ফোনে — এক গ্রিডে মিলে",
    ],
    "জিওফেন্সের বাইরে পাঞ্চ হয় না। একই ফোন অন্যকে দিয়ে পাঞ্চ করানো ঠেকাতে প্রতি কর্মী প্রতিদিন এক ডিভাইস লক।",
)

S(
    "bullets",
    "Attendance",
    "ডিভাইস ও সেটিংস",
    [
        "ডিভাইস রেজিস্টার, কানেকশন টেস্ট, সিঙ্ক",
        "কর্মীকে ডিভাইসে পাঠানো, বায়োমেট্রিক ID ম্যাপিং",
        "কাজ শুরু/শেষ, লেট থ্রেশহোল্ড, হাফ-ডে আওয়ার",
        "শাখাভেদে উইকএন্ড; কর্মীবৈশিষ্ট্য ইন-আউট টাইম",
        "শিফট-রোস্টার (রোটেটিং) এখন রোডম্যাপ — ওভারসেল নয়",
    ],
    "হেড অফিস আর শাখার অফিস আওয়ার আলাদা হতে পারে। ডিভাইস SDK পুশ পাথ ডিপ্লয়মেন্টে যাচাই করে নিতে হবে।",
)

S(
    "bullets",
    "Attendance",
    "দৈনিক ও মাসিক ভিউ",
    [
        "Daily portal — শাখা/ডিপার্টমেন্ট ফিল্টার; daily branch summary",
        "Monthly grid — দিনে দিনে স্ট্যাটাস; sheet report + PDF",
        "স্ট্যাটাস: Present · Absent · Late · Half Day · Leave · On Duty · Weekend · Holiday",
        "প্রাধান্য: ছুটির দিন → লিভ → মুভমেন্ট → উইকএন্ড → পাঞ্চ",
        "ওভারটাইম ঘণ্টা রিপোর্টে",
    ],
    "একদিনে লিভ থাকলে পাঞ্চ থাকলেও লিভই প্রাধান্য পায়। মুভমেন্ট অ্যাপ্রুভড থাকলে On Duty। ডেমো: Monthly Attendance।",
)

S(
    "bullets",
    "Movement",
    "ফিল্ড মুভমেন্ট + লগবুক + পেনাল্টি",
    [
        "ওয়ার্কফ্লো: আবেদন → অনুমোদন → সক্রিয় → সম্পন্ন/বন্ধ",
        "স্থান, কি.মি., মিটার রিডিং; প্রিন্টযোগ্য ফর্ম",
        "লগবুক রেজিস্টার — প্রিন্ট ও Excel",
        "লগবুক পেমেন্ট — ভাউচার, রেকমেন্ড, অনুমোদন/বাতিল",
        "পেনাল্টি: বকেয়া থাকলে অ্যাকাউন্ট লক; পেমেন্ট ভেরিফাই হলে খোলে",
    ],
    "এটি সাধারণ আউটডোর ডিউটি টিক নয়। মাঠকর্মী ঘোরে, কি.মি. হিসাব হয়, বিল ওঠে। পেনাল্টি গেট দিয়ে অসমাপ্ত মুভমেন্ট ঝুলিয়ে রাখা যায় না।",
)

S("section", "05", "Leave · Payroll · Loan · Fund", "সময়ের পর টাকা", "")

S(
    "bullets",
    "Leave",
    "লিভ — পুরো চক্র",
    [
        "লিভ টাইপ কনফিগারযোগ্য (ক্যাজুয়াল, সিক, আনপেইড…)",
        "মাল্টি-টিয়ার অনুমোদন — কে কোন স্তরে অ্যাপ্রুভ করবে",
        "ব্যালেন্স: বরাদ্দ, বাল্ক অ্যালোকেট, বছর রিসেট",
        "আবেদন: সংযুক্তি, ক্যানসেল, PDF; অটো-অ্যাপ্রুভ এলিজিবিলিটি",
        "ইমেইল নোটিফিকেশন; শাখা ও কর্মী ড্যাশবোর্ড; PDF/Excel রিপোর্ট",
    ],
    "টিম লিডার → ব্রাঞ্চ ম্যানেজার → ঊর্ধ্বতন — এই চেইন সেটিংসে বসানো যায়। আনপেইড লিভ টাইপ পে-রোল কাটার জন্য নিশ্চিত।",
)

S(
    "bullets",
    "Payroll",
    "বেতন কাঠামো — বাংলাদেশ গ্রেড-স্টেপ",
    [
        "Payscale → Grade → Step → Salary Heads → Employee Structure",
        "আয় ও কর্তন হেড (PF, ট্যাক্স, লোন ফ্ল্যাগ)",
        "হেড মডিফিকেশন — মাসিক সমন্বয়",
        "প্রবেশন স্যালারি রুল + ইনডিভিজুয়াল ওভাররাইড; ফিক্সড স্যালারি",
        "Salary withheld — বেতন/বোনাস হোল্ড, কারণসহ",
        "শাখাভিত্তিক পে-রোল ব্যাংক",
    ],
    "প্রমোশনে স্টেপ বদল, প্রবেশনে আলাদা নিয়ম, কেউ ফিক্সড প্যাকেজে — তিনটেই সাপোর্টেড।",
)

S(
    "quote",
    "Payroll",
    "মাসিক প্রসেস",
    {
        "quote": "Process (ড্রাফট)  →  রিভিউ পে-স্লিপ  →  Post  →  Bank Advice",
        "bullets": [
            "ভুল হলে Rollback — পোস্টের আগে ব্যাংকে টাকা যায় না",
            "পোস্টে স্বয়ংক্রিয়: PF, আয়কর (স্ল্যাব), লোন কিস্তি",
            "বোনাস আলাদা রান: টাইপ → কনফিগ → ক্যালক → পোস্ট",
            "কর্মী সেলফ-সার্ভিস: পে-স্লিপ দেখা ও ডাউনলোড",
        ],
    },
    "আনপোস্টেড শিট দিয়ে HR/ফিনান্স চেক করে, তারপর পোস্ট। ডেমো: Salary process লিস্ট + একটি পে-স্লিপ।",
)

S(
    "two_col",
    "Payroll",
    "১৭টি পে-রোল রিপোর্ট",
    [
        [
            "Grade Step Calculation",
            "Salary Sheet — Posted / Un-posted",
            "Employee-wise Posted / Unposted",
            "Date Range · Branch topsheet",
            "Month-wise · Designation-wise",
            "Bank Advice — Salary ও Bonus",
        ],
        [
            "Addition Register",
            "Deduction Register",
            "Advance Salary Report",
            "Bonus Register",
            "Final Payment Report",
            "Salary Certificate (ভিসা/ঋণ)",
        ],
    ],
    "ফিল্টার: বছর, মাস, শাখা, ডিপার্টমেন্ট, পদবি, অরগানোগ্রাম, প্রোগ্রাম, প্রজেক্ট। অডিট, ব্যাংক, বোর্ড — তিন ফরম্যাট।",
)

S(
    "bullets",
    "Loan",
    "স্টাফ লোন — লাইফসাইকেল",
    [
        "নীতি → কমিটি → আবেদন → অনুমোদন → ডিসবার্স",
        "পে-রোল কিস্তি অথবা ম্যানুয়াল/ব্যাচ/অ্যাডভান্স কালেকশন",
        "ওয়েভ / রিবেট / ফুল পেমেন্ট → ক্লোজ",
        "লিগ্যাসি লোন মাইগ্রেশন — পুরনো খাতা তোলা",
        "লোন রোলব্যাক; কর্মী থেকে কর্মীতে ট্রান্সফার",
    ],
    "অনেক প্রতিষ্ঠানে লোন এক্সেলে চলে আর পে-রোলে হাতে কাটে। এখানে পোস্টেড পে-রোল কিস্তি নিজে কেটে লেজারে বসায়।",
)

S(
    "bullets",
    "Loan",
    "লোন রিপোর্ট — ১০টি",
    [
        "Loan Ledger · Disburse Register · Recoverable",
        "Collection Register · Loan & PF Balance (একসাথে)",
        "Full Paid Register · Rebate Register",
        "Statement — Employee / Component / Branch wise",
    ],
    "PF ব্যালেন্স ও লোন আউটস্ট্যান্ডিং এক রিপোর্টে — ফাইনাল সেটেলমেন্ট বা নতুন লোন এলিজিবিলিটির সময় দরকারি।",
)

S(
    "two_col",
    "Staff Fund",
    "প্রভিডেন্ট ফান্ড",
    [
        [
            "ওপেনিং ব্যালেন্স ও ম্যানুয়াল এন্ট্রি",
            "পে-রোল থেকে কন্ট্রিবিউশন",
            "বার্ষিক সুদ — কর্মী ৫০% / প্রতিষ্ঠান ৫০%",
            "উত্তোলন; কর্মী সেলফ-সার্ভিস লেজার",
        ],
        [
            "PF Ledger · Contribution & Loan Deduction",
            "Deduction / Interest / Refund Register",
            "Balance (Details, Branch, Department)",
            "Transaction Register — মোট ১০টি রিপোর্ট",
        ],
    ],
    "PF আলাদা সফটওয়্যার নয়। স্যালারি পোস্ট হলে কন্ট্রিবিউশন লেজারে পড়ে। বছর শেষে ইন্টারেস্ট রান।",
)

S(
    "quote",
    "Staff Fund",
    "গ্র্যাচুইটি ও ফাইনাল সেটেলমেন্ট",
    {
        "quote": "PF রিফান্ড  +  গ্র্যাচুইটি  −  লোন রিকভারি  =  নেট পেয়েবল",
        "bullets": [
            "চাকুরিকাল × বেসিক × কনফিগারযোগ্য টিয়ার",
            "প্রজেক্টেড লায়াবিলিটি — শাখা ও ডিপার্টমেন্ট",
            "Employee Financial Statement — PF + গ্র্যাচুইটি + লোন",
            "৯টি গ্র্যাচুইটি রিপোর্ট: ledger, entitlements, eligible, liability, settlement…",
        ],
    },
    "বোর্ডকে বলতে পারবেন আজকের তারিখে গ্র্যাচুইটি দায় কত। এক্সিটের দিন এক স্ক্রিনে নেট পেয়েবল — অডিট ও শ্রম মামলার জন্য শক্ত কাগজ।",
)

S("section", "06", "Assets · Inventory · Admin", "সম্পদ, স্টক, নিয়ন্ত্রণ", "")

S(
    "bullets",
    "Fixed Asset",
    "ফিক্সড অ্যাসেট — ক্রয় থেকে ডিসপোজাল",
    [
        "সেটিংস: ক্যাটাগরি, ভেন্ডর, জুলাই–জুন আর্থিক বছর, কাস্টোডিয়ান",
        "ক্রয়, রেজিস্টার, স্টক সামারি, অ্যাসাইনমেন্ট",
        "মেইনটেন্যান্স, ইন্স্যুরেন্স, ওয়ারেন্টি, গ্যারান্টি",
        "ডেপ্রিসিয়েশন: ক্যালক / পোস্ট / রোলব্যাক / ম্যানুয়াল",
        "ট্রান্সফার (শাখা/প্রজেক্ট/কাস্টোডিয়ান), ডিসপোজাল, রিভ্যালুয়েশন",
        "কর্মী: My Assets",
    ],
    "কম্পিউটার, মোটরসাইকেল, ফার্নিচার — শাখায় কোথায়, কার কাছে, কত বুক ভ্যালু। বাংলাদেশের FY জুলাই–জুন নেটিভ।",
)

S(
    "bullets",
    "Fixed Asset",
    "অ্যাসেট রিপোর্ট — ১১টি (অডিট শিডিউলসহ)",
    [
        "Asset Tracking — ক্রয়, লোকেশন, বুক ভ্যালু",
        "Purchase List — Branch / Category / Month wise",
        "Disposal Asset List",
        "Category & Branch schedules — detail, summary, Audit variant",
        "অডিট শিডিউল: কস্ট ও ডেপ্রিসিয়েশন ব্যালেন্স FY ধরে",
    ],
    "এক্সটার্নাল অডিটর যে ফরম্যাট চায় তার কাছাকাছি।",
)

S(
    "table",
    "Stock",
    "ইনভেন্টরি বনাম অ্যাসেট বনাম স্টোর",
    [
        ["", "Fixed Asset", "Inventory", "Store"],
        ["উদাহরণ", "ল্যাপটপ, বাইক", "কলম, ফর্ম", "পূর্ণাঙ্গ রিকুইজিশন"],
        ["ডেপ্রিসিয়েশন", "হ্যাঁ", "না", "—"],
        ["এখন", "লাইভ", "লাইভ", "রোডম্যাপ টাইল"],
    ],
    "দৈনন্দিন ইস্যু ইনভেন্টরিতেই হয়: প্রোডাক্ট মাস্টার, স্টক ইন, কর্মীকে ইস্যু, Stock/Product Ledger। পূর্ণাঙ্গ স্টোর ইন্ডেন্ট চাইলে আলাদা ফেজ।",
)

S(
    "two_col",
    "Admin",
    "Administration ও অফিস ম্যাপ",
    [
        [
            "ইউজার CRUD, স্ট্যাটাস অন/অফ",
            "পোস্টিং থেকে শাখা অ্যাকাউন্ট সিঙ্ক",
            "বাল্ক ইমেইল; রোল CRUD",
            "Sync Default Roles / Line Roles",
            "মডিউল লক (blocked sections)",
            "সেশন দেখা ও রিভোক",
        ],
        [
            "অ্যাডমিন নোটিশ + অ্যাটাচমেন্ট + Web Push",
            "প্রোফাইল, পাসওয়ার্ড, থিম",
            "Office Map — Leaflet",
            "হেড অফিস, জোন, শাখা এক নজরে",
            "সেলস মিটিংয়ে নেটওয়ার্কের আকার দেখান",
            "ইন-অ্যাপ নোটিফিকেশন + আনরিড কাউন্ট",
        ],
    ],
    "কেউ চাকরি ছাড়লে সেশন কেটে অ্যাকাউন্ট ইনঅ্যাকটিভ। নোটিশ ফোনের পুশে যায়। SMS এখন নেই — প্রমিস করবেন না যদি স্কোপে না থাকে।",
)

S("section", "07", "Roles · Security · Tech", "কে কী দেখবে, কীভাবে চলে", "")

S(
    "table",
    "Access",
    "কে কী দেখবে",
    [
        ["রোল", "উদ্দেশ্য"],
        ["Super Admin / HR Admin", "ফুল অ্যাক্সেস; HR Admin ডিলিট/ইউজার নয়"],
        ["Accountant", "লোন, PF, অ্যাসেট, ইনভেন্টরি, অ্যাটেনডেন্স, লিভ"],
        ["ED / Director / ZM / RM / BM", "লাইন অথরিটি + ভৌগোলিক স্কোপ"],
        ["Dept Head / Team Leader", "HO টিম অনুমোদন"],
        ["Branch Account", "PIN-only শাখা টার্মিনাল"],
        ["Employee", "সেলফ-সার্ভিস"],
    ],
    "অনুমতি দুই স্তর: কী করতে পারবে, আর কার ডাটা দেখবে। Super Admin ছাড়া ডিলিট সাধারণত বন্ধ।",
)

S(
    "two_col",
    "Access",
    "শাখা টার্মিনাল ও সেলফ-সার্ভিস",
    [
        [
            "Branch Account — শেয়ার্ড PIN লগইন",
            "অ্যাটেনডেন্স, ইনভেন্টরি, অ্যাসেট এন্ট্রি",
            "পে-রোল শিট দেখা, লিভ ব্যালেন্স",
            "HO-এর ফুল ERP শাখায় খোলা থাকে না",
        ],
        [
            "কর্মী: জিওফেন্সড পাঞ্চ, লিভ, মুভমেন্ট",
            "পে-স্লিপ, PF/গ্র্যাচুইটি লেজার, নিজের লোন",
            "My Assets, প্রোফাইল, নোটিশ, হলিডে",
            "HR-এর কাছে ‘পে-স্লিপ দিন’ কমে",
        ],
    ],
    "প্রতি শাখায় সবার ইমেইল না থাকলেও একটি টার্মিনাল দিয়ে দৈনন্দিন কাজ চলে।",
)

S(
    "bullets",
    "Security",
    "সিকিউরিটি ও কন্ট্রোল",
    [
        "৮০+ পারমিশন কি; মডিউল-লেভেল লক; মাল্টি-রোল",
        "সেশন রিভোক; পাসওয়ার্ড রিসেট",
        "জিওফেন্স + ডিভাইস ফিঙ্গারপ্রিন্ট লক",
        "মুভমেন্ট পেনাল্টি লক",
        "মডিউল-ভিত্তিক হিস্ট্রি (কনফার্মেশন, বদলি, পদোন্নতি, অ্যাসেট, লোন)",
        "সীমা: সেন্ট্রাল ‘সব কিছুর অডিট লগ’ UI আলাদা নেই",
    ],
    "ব্যাংক-গ্রেড SIEM নয়, কিন্তু অপারেশনাল কন্ট্রোল শক্ত।",
)

S(
    "table",
    "IT",
    "টেকনোলজি স্ট্যাক",
    [
        ["স্তর", "প্রযুক্তি"],
        ["ব্যাকএন্ড", "Laravel 12, PHP 8.2+"],
        ["ফ্রন্টএন্ড", "React 19, TypeScript, Inertia.js, Tailwind"],
        ["অথ / API", "সেশন + Laravel Sanctum"],
        ["PDF / Excel", "DomPDF, mPDF, Chrome/Browsershot, SimpleXLSXGen"],
        ["মোবাইল", "PWA — স্টোর ছাড়াই ফোনে ইনস্টল"],
        ["ম্যাপ / Push / Queue", "Leaflet, Web Push, database queue, Redis-ready"],
    ],
    "আপনাদের IT যদি PHP/Laravel জানে, হ্যান্ডওভার সহজ। API আছে ডিভাইস ও অর্গ সিঙ্কের জন্য।",
)

S(
    "two_col",
    "IT",
    "ইন্টিগ্রেশন ও মাল্টি-ব্রাঞ্চ",
    [
        [
            "ZKTeco সিঙ্ক + কর্মী পুশ",
            "iClock ADMS প্রোটোকল",
            "শাখা/ডিভাইস কর্মী API",
            "MisLoan ফিল্ড অফিসার সিঙ্ক",
            "অন্য ব্র্যান্ড / GL পোস্ট = আলাদা স্কোপ",
        ],
        [
            "মাল্টি-ব্রাঞ্চ, জোন, রিজিওন — হ্যাঁ",
            "মাল্টি-কোম্পানি SaaS — এখন নয়",
            "এক লিগ্যাল এন্টিটি + অনেক শাখা = ফিট",
            "গ্রুপ অফ কোম্পানিজ = আলাদা ইনস্টল",
            "ক্রস-রিপোর্ট হাব + মডিউল গ্যালারি",
        ],
    ],
    "অ্যাটেনডেন্স মেশিন বদলাতে হবে না যদি ZKTeco/ADMS হয়।",
)

S(
    "bullets",
    "Compliance",
    "বাংলাদেশ কমপ্লায়েন্স ফিট",
    [
        "আয়কর স্ল্যাব (XLSX থেকে সিড)",
        "PF কন্ট্রিবিউশন ও সুদ; গ্র্যাচুইটি টিয়ার",
        "জুলাই–জুন ফিনান্সিয়াল ইয়ার (অ্যাসেট)",
        "শুক্র-শনি উইকএন্ড ডিফল্ট, শাখায় পরিবর্তনযোগ্য",
        "টাকার ফরম্যাট / অঙ্কে লেখা",
        "রিপোর্টে স্বাক্ষর ব্লক: Prepared / Verified / Approved (HR, F&A, ED)",
    ],
    "বিদেশি HRIS-এ এই ফর্মগুলো কাস্টম ডেভেলপমেন্ট। এখানে আউট অফ দ্য বক্স।",
)

S("section", "08", "Scope · Pilot · Next step", "যা আছে, যা নেই, কীভাবে শুরু", "")

S(
    "table",
    "Honesty",
    "যা লাইভ — যা রোডম্যাপ",
    [
        ["আইটেম", "অবস্থা"],
        ["HR, Attendance, Movement, Leave", "লাইভ — আজই ডেমো"],
        ["Payroll, Bonus, Loan, PF, Gratuity", "লাইভ"],
        ["Fixed Asset, Inventory, Admin, Map, PWA", "লাইভ"],
        ["Recruitment ATS / Training LMS", "সেকশন টাইল; ফুল মডিউল নয়"],
        ["শিফট রোস্টার / SMS / মাল্টি-কোম্পানি", "এই রিলিজে নেই"],
        ["সেন্ট্রাল অডিট লগ UI", "নেই — হিস্ট্রি মডিউলভিত্তিক"],
    ],
    "আমরা যা চালাই তাই দেখাই। রিক্রুটমেন্ট/ট্রেনিং লাগলে আলাদা ফেজ। এই সততাই লম্বা কন্ট্রাক্টের ভিত্তি।",
)

S(
    "table",
    "Delivery",
    "ইমপ্লিমেন্টেশন ফেজ",
    [
        ["ফেজ", "কাজ", "ফলাফল"],
        ["0", "ডিসকভারি: শাখা, রোল, পে-স্কেল, লিভ পলিসি", "স্কোপ ডক"],
        ["1", "মাস্টার: অর্গ, কর্মী ইমপোর্ট, ইউজার/রোল", "HR চালু"],
        ["2", "ডিভাইস + জিওফেন্স + লিভ", "সময় ও ছুটি"],
        ["3", "পে-রোল স্ট্রাকচার, প্যারালাল এক মাস", "স্যালারি চালু"],
        ["4", "লোন মাইগ্রেশন + PF ওপেনিং", "স্টাফ ফান্ড"],
        ["5–6", "অ্যাসেট, ইনভেন্টরি, ট্রেনিং, গো-লাইভ", "স্ট্যাবিলাইজ"],
    ],
    "সব মডিউল একদিনে গো-লাইভ করতে হয় না। প্যারালাল রান এক মাস রাখা নিরাপদ।",
)

S(
    "two_col",
    "Demo",
    "২০ মিনিট ডেমো স্ক্রিপ্ট",
    [
        [
            "1. Control Center — রোল টাইল (১ মি)",
            "2. কর্মী প্রোফাইল ট্যাব (২ মি)",
            "3. Monthly attendance + ডিভাইস (৩ মি)",
            "4. লিভ আবেদন অনুমোদন (২ মি)",
            "5. মুভমেন্ট ও লগবুক (২ মি)",
        ],
        [
            "6. পে-রোল গ্যালারি + পে-স্লিপ (৩ মি)",
            "7. লোন লেজার / PF ব্যালেন্স (২ মি)",
            "8. ফাইনাল পেমেন্ট কনসেপ্ট (১ মি)",
            "9. ফিক্সড অ্যাসেট রেজিস্টার (২ মি)",
            "10. অফিস ম্যাপ + PWA (২ মি)",
        ],
    ],
    "তিনটা লগইন রাখুন: Super Admin, Branch Manager, Employee। ক্লায়েন্টের একজনকে Employee রোলে বসিয়ে সেলফ-সার্ভিস দেখান।",
)

S(
    "bullets",
    "Value",
    "ব্যবসায়িক সুফল",
    [
        "পে-রোল দিন নয়, ঘণ্টায়",
        "ব্যাংক অ্যাডভাইস কপি-পেস্ট ভুল কমে",
        "মাসিক অ্যাটেনডেন্স মিটিং ছাড়াই লক",
        "অব্যাহতিতে ফাইনাল বিল নিয়ে বিরোধ কমে",
        "অডিট প্যাক: স্যালারি, PF, গ্র্যাচুইটি, অ্যাসেট শিডিউল",
        "শাখা থেকে HO একই সত্য দেখে; ফিল্ড পাঞ্চ স্বচ্ছ",
    ],
    "সফটওয়্যারের দাম একবার। ম্যানুয়াল সমন্বয়, জরিমানা, অডিট আপত্তি, ভুল বেতন — সেগুলো প্রতি মাসে।",
)

S(
    "bullets",
    "CTA",
    "পরবর্তী ধাপ",
    [
        "১. ডিসকভারি ওয়ার্কশপ — আপনাদের পলিসি ও শাখা ম্যাপ",
        "২. স্যাণ্ডবক্স ডেমো — আপনাদের লোগোসহ টেস্ট",
        "৩. পাইলট — ১ হেড অফিস + ১/২ শাখা",
        "৪. কমার্শিয়াল প্রপোজাল — লাইসেন্স, ইমপ্লিমেন্টেশন, সাপোর্ট, হোস্টিং",
        "পাইলটের সাফল্য: এক মাসের স্যালারি শিট সিস্টেম থেকে উঠল কি না",
    ],
    "আজ সিদ্ধান্ত নিতে হবে না। পাইলট সফল হলে বাকি শাখা রোলআউট।",
)

S(
    "closer",
    "",
    "ধন্যবাদ",
    {
        "line": "Mousumi ERP",
        "sub": "এক প্ল্যাটফর্মে  HR  ·  Time  ·  Pay  ·  Fund  ·  Assets",
        "ask": "প্রশ্ন?",
    },
    "যোগাযোগের নাম, পদবি, ফোন, ইমেইল এখানে বলুন। অ্যাপেন্ডিক্স স্লাইড প্রশ্ন এলে খুলবেন।",
)

# Appendix
S("section", "App", "Appendix", "IT, FAQ, মাইগ্রেশন — প্রশ্ন এলে", "")

S(
    "bullets",
    "Appendix",
    "A1–A3  ·  হেড, অ্যাটেনডেন্স রুল, অরগানোগ্রাম",
    [
        "নতুন অ্যালাউন্স = নতুন স্যালারি হেড + স্ট্রাকচার লাইন — কোড চেঞ্জ লাগে না",
        "অ্যাটেনডেন্স: Holiday → Leave → On Duty → Weekend → পাঞ্চ (Present/Late/Half/Absent)",
        "মাইক্রোফাইন্যান্স লাইন: কর্মী → TL/BM → RM → ZM → AD → Director → ED",
        "ZM অন্য জোনের কর্মী দেখেন না — স্কোপ পোস্টিং দিয়ে",
        "পদবির নাম আলাদা হলে (Area Manager ইত্যাদি) ম্যাপিং করে দিই",
    ],
    "",
)

S(
    "bullets",
    "Appendix",
    "A4–A5  ·  API ও হোস্টিং",
    [
        "POST /api/zkteco/sync · ডিভাইস PIN ম্যাপ · শাখা অনুযায়ী কর্মী",
        "iClock: cdata, getrequest, devicecmd, ping · Sanctum টোকেন",
        "ফায়ারওয়ালে ডিভাইস→সার্ভার পোর্ট; ADMS হলে মেশিন আউটবাউন্ড",
        "আলোচনা: ক্লাউড vs অন-প্রিম, SSL, ব্যাকআপ, স্টেজিং, কিউ ওয়ার্কার",
        "পে-রোল PDF-এর জন্য Chrome/Browsershot; প্রোডাক্ট ও হোস্টিং আলাদা লাইন হতে পারে",
    ],
    "",
)

S(
    "bullets",
    "Appendix",
    "A9  ·  ডেটা মাইগ্রেশন চেকলিস্ট",
    [
        "কর্মী মাস্টার (এক্সেল উইজার্ড) ও ব্যাংক অ্যাকাউন্ট",
        "পে-স্কেল ম্যাপিং; লিভ ব্যালেন্স ওপেনিং",
        "লোন ওপেনিং (মাইগ্রেশন মডিউল); PF ওপেনিং",
        "অ্যাসেট রেজিস্টার; বায়োমেট্রিক ID ম্যাপ",
        "ইউজার ↔ কর্মী লিংক  ·  মাইগ্রেশনই প্রজেক্টের ~৫০% ঝুঁকি",
    ],
    "সোর্স এক্সেল পরিষ্কার রাখতে ক্লায়েন্ট HR লাগে। আমরা উইজার্ড দিয়ে ঝুঁকি কমাই।",
)

S(
    "two_col",
    "Appendix",
    "A10  ·  প্রশ্নোত্তর",
    [
        [
            "মাল্টি-কোম্পানি? প্রতি এন্টিটিতে আলাদা ইনস্টল",
            "প্লে স্টোর অ্যাপ? PWA; নেটিভ অ্যাপ আলাদা স্কোপ",
            "অফলাইন পাঞ্চ? জিওফেন্স অনলাইন; ফুল অফলাইন আলাদা আলোচনা",
            "অন্য বায়োমেট্রিক? ZKTeco/iClock রেডি",
        ],
        [
            "Tally/QuickBooks? GL পোস্ট আলাদা ইন্টিগ্রেশন",
            "বাংলা UI? অপারেশন ইংরেজি; বাংলা UI আলাদা স্কোপ",
            "রিক্রুটমেন্ট? রোডম্যাপ; অফারের পর মাস্টার এন্ট্রি",
            "কাস্টম রোল? হ্যাঁ — Admin → Roles",
        ],
    ],
    "",
)


def render_title(prs, payload, note, num, total):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    add_rect(slide, 0, 0, W, H, NAVY)
    add_rect(slide, 0, 0, Inches(0.18), H, EMERALD)
    add_rect(slide, 0, Inches(6.85), W, Inches(0.65), TEAL)
    add_text_box(slide, Inches(0.7), Inches(1.7), Inches(11.5), Inches(0.4), "SALES PRESENTATION", 14, True, GOLD)
    add_text_box(slide, Inches(0.7), Inches(2.15), Inches(11.8), Inches(1.1), "Mousumi ERP", 54, True, WHITE)
    add_rect(slide, Inches(0.7), Inches(3.35), Inches(1.6), Inches(0.07), EMERALD)
    add_text_box(slide, Inches(0.7), Inches(3.6), Inches(11.5), Inches(0.5), payload["subtitle"], 22, False, RGBColor(0xCB, 0xD5, 0xE1))
    add_text_box(slide, Inches(0.7), Inches(4.25), Inches(11.5), Inches(0.45), payload["tag"], 20, False, RGBColor(0x6E, 0xE7, 0xB7), font=FONT_BN)
    add_text_box(slide, Inches(0.7), Inches(6.95), Inches(8), Inches(0.35), payload["foot"], 14, False, WHITE)
    add_text_box(slide, Inches(10.4), Inches(6.95), Inches(2.4), Inches(0.35), f"{num} / {total}", 14, False, WHITE, PP_ALIGN.RIGHT)
    notes(slide, note)


def render_section(prs, kicker, title, subtitle, note, num, total):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    add_rect(slide, 0, 0, W, H, NAVY)
    add_rect(slide, 0, 0, Inches(0.18), H, EMERALD)
    add_text_box(slide, Inches(0.8), Inches(2.35), Inches(11), Inches(0.4), f"PART  {kicker}", 16, True, GOLD)
    add_text_box(slide, Inches(0.8), Inches(2.85), Inches(11.5), Inches(1.0), title, 40, True, WHITE, font=FONT_BN)
    add_text_box(slide, Inches(0.8), Inches(4.05), Inches(11), Inches(0.5), subtitle, 20, False, RGBColor(0x94, 0xA3, 0xB8), font=FONT_BN)
    add_text_box(slide, Inches(0.8), Inches(6.95), Inches(11.5), Inches(0.3), f"{num}  /  {total}", 12, False, MUTED)
    notes(slide, note)


def render_closer(prs, payload, note, num, total):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    add_rect(slide, 0, 0, W, H, NAVY)
    add_rect(slide, 0, 0, Inches(0.18), H, EMERALD)
    add_text_box(slide, Inches(0.8), Inches(2.4), Inches(11.5), Inches(0.9), payload["line"], 48, True, WHITE)
    add_rect(slide, Inches(0.8), Inches(3.4), Inches(1.6), Inches(0.07), EMERALD)
    add_text_box(slide, Inches(0.8), Inches(3.7), Inches(11.5), Inches(0.5), payload["sub"], 20, False, RGBColor(0xCB, 0xD5, 0xE1), font=FONT_BN)
    add_text_box(slide, Inches(0.8), Inches(4.5), Inches(11.5), Inches(0.5), payload["ask"], 28, True, RGBColor(0x6E, 0xE7, 0xB7), font=FONT_BN)
    add_text_box(slide, Inches(0.8), Inches(6.5), Inches(11.5), Inches(0.4), "নাম  ·  পদবি  ·  ফোন  ·  ইমেইল", 16, False, MUTED, font=FONT_BN)
    add_text_box(slide, Inches(10.4), Inches(6.95), Inches(2.4), Inches(0.3), f"{num} / {total}", 12, False, MUTED, PP_ALIGN.RIGHT)
    notes(slide, note)


def render_quote(prs, kicker, title, payload, note, num, total):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    chrome_content(slide, kicker, title, num, total)
    add_rect(slide, Inches(0.55), Inches(1.32), Inches(12.2), Inches(1.35), OFFWHITE)
    add_rect(slide, Inches(0.55), Inches(1.32), Inches(0.1), Inches(1.35), EMERALD)
    add_text_box(slide, Inches(0.9), Inches(1.5), Inches(11.6), Inches(1.05), payload["quote"], 20, True, NAVY, font=FONT_BN)
    bullets(slide, payload["bullets"], top=2.85, size=17)
    notes(slide, note)


def build():
    prs = Presentation()
    prs.slide_width = W
    prs.slide_height = H
    total = len(SLIDES)
    for i, item in enumerate(SLIDES, 1):
        kind, kicker, title, payload, note = item
        if kind == "title":
            render_title(prs, payload, note, i, total)
        elif kind == "section":
            render_section(prs, kicker, title, payload, note, i, total)
        elif kind == "closer":
            render_closer(prs, payload, note, i, total)
        elif kind == "quote":
            render_quote(prs, kicker, title, payload, note, i, total)
        else:
            slide = prs.slides.add_slide(prs.slide_layouts[6])
            chrome_content(slide, kicker, title, i, total)
            if kind == "bullets":
                bullets(slide, payload, size=18 if len(payload) <= 6 else 16)
            elif kind == "two_col":
                two_col_bullets(slide, payload[0], payload[1])
            elif kind == "table":
                rows = payload
                n_cols = len(rows[0])
                width = 12.2
                if n_cols == 2:
                    add_table(slide, rows, col_w=[4.2, 8.0])
                elif n_cols == 3:
                    add_table(slide, rows, col_w=[1.6, 5.5, 5.1])
                else:
                    add_table(slide, rows)
            notes(slide, note)
    prs.save(str(OUT))
    print(f"Wrote {total} slides -> {OUT}")


if __name__ == "__main__":
    build()
