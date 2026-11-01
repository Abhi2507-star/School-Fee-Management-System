import React, { createContext, useContext, useState, useEffect } from 'react';

export type AppLanguage = 'hi' | 'en';

export const DICTIONARY = {
  schoolName: {
    en: 'Swami Vivekanand Sikshan Sansthan',
    hi: 'स्वामी विवेकानन्द शिक्षण संस्थान',
  },
  schoolSub: {
    en: 'Haripur, Karaudi Kalan, Kadipur, Sultanpur (U.P.)',
    hi: 'हरीपुर, करौंदी कलां, कादीपुर, सुलतानपुर (उ.प्र.)',
  },
  tagline: {
    en: 'School Fee Register & Collection',
    hi: 'विद्यालय फीस रजिस्टर एवं संग्रह प्रणाली',
  },
  collectorRole: {
    en: 'Fee Collector',
    hi: 'फीस जमाकर्ता',
  },
  adminRole: {
    en: 'Principal / Admin',
    hi: 'प्रधानाचार्य / व्यवस्थापक',
  },
  switchRole: {
    en: 'Switch Role / Logout',
    hi: 'बदलें / लॉगआउट',
  },
  searchPlaceholder: {
    en: 'Search by Student Name, Father, Village, or Mobile...',
    hi: 'बच्चे का नाम, पिता का नाम, गाँव या मोबाइल नंबर खोजें...',
  },
  selectClass: {
    en: 'Select Class',
    hi: 'कक्षा चुनें',
  },
  rollNo: {
    en: 'Roll No',
    hi: 'क्रमांक',
  },
  studentName: {
    en: 'Student Name',
    hi: 'नाम',
  },
  fatherName: {
    en: "Father's Name",
    hi: 'पिता का नाम',
  },
  village: {
    en: 'Village',
    hi: 'पता (गाँव)',
  },
  mobile: {
    en: 'Mobile',
    hi: 'मोबाइल नं.',
  },
  admissionFee: {
    en: 'Admission Fee',
    hi: 'प्रवेश शुल्क',
  },
  oldBalance: {
    en: 'Previous Class Due',
    hi: 'पिछला बकाया',
  },
  joinedMonth: {
    en: 'Joined Month',
    hi: 'दाखिला माह',
  },
  actions: {
    en: 'Action',
    hi: 'कार्रवाई',
  },
  payFee: {
    en: 'Pay Fee',
    hi: 'फीस जमा करें',
  },
  paid: {
    en: 'Paid',
    hi: 'जमा',
  },
  pending: {
    en: 'Due',
    hi: 'बाकी',
  },
  free: {
    en: 'FREE',
    hi: 'निःशुल्क',
  },
  viewRegister: {
    en: 'View Register',
    hi: 'रजिस्टर देखें',
  },
  addStudent: {
    en: 'Add Student',
    hi: 'नया बच्चा जोड़ें',
  },
  promoteClass: {
    en: 'Promote to Next Class',
    hi: 'अगली कक्षा में भेजें',
  },
  manageFees: {
    en: 'Manage Fee Structure',
    hi: 'फीस दर तय करें',
  },
  reports: {
    en: 'Reports & Pending Dues',
    hi: 'रिपोर्ट व बकाया सूची',
  },
  exportExcel: {
    en: 'Export to Excel / CSV',
    hi: 'एक्सेल में निकालें',
  },
  saveAndPrint: {
    en: 'Save & Print Receipt',
    hi: 'जमा करें और रसीद निकालें',
  },
  printReceipt: {
    en: 'Print Receipt',
    hi: 'रसीद प्रिंट करें',
  },
  sendWhatsApp: {
    en: 'Send on WhatsApp',
    hi: 'व्हाट्सएप भेजें',
  },
  sendDueReminder: {
    en: 'Send Due Reminder',
    hi: 'व्हाट्सएप पर बकाया भेजें',
  },
  close: {
    en: 'Close',
    hi: 'बंद करें',
  },
  totalAmount: {
    en: 'Total Amount',
    hi: 'कुल राशि',
  },
  date: {
    en: 'Payment Date',
    hi: 'तारीख',
  },
  receiptNo: {
    en: 'Receipt No',
    hi: 'रसीद संख्या',
  },
  monthlyFee: {
    en: 'Monthly Fee',
    hi: 'मासिक शुल्क',
  },
  examFee: {
    en: 'Exam Fee',
    hi: 'परीक्षा शुल्क',
  },
  todayCollection: {
    en: "Today's Collection",
    hi: 'आज की कुल जमा',
  },
  monthCollection: {
    en: "This Month's Collection",
    hi: 'इस माह की कुल जमा',
  },
  totalStudents: {
    en: 'Active Students',
    hi: 'कुल सक्रिय बच्चे',
  },
  totalLeft: {
    en: 'Left Students',
    hi: 'स्कूल छोड़ चुके बच्चे',
  },
  totalDues: {
    en: 'Total Pending Dues',
    hi: 'कुल बकाया राशि',
  },
  activeStudents: {
    en: 'Active Students (Studying)',
    hi: 'पढ़ रहे बच्चे (सक्रिय)',
  },
  leftStudents: {
    en: 'Left Students (TC)',
    hi: 'स्कूल छोड़ चुके बच्चे (TC)',
  },
  allStudents: {
    en: 'All Students',
    hi: 'सभी बच्चे',
  },
  markLeft: {
    en: 'Mark Left (TC)',
    hi: 'स्कूल छोड़ दिया (TC)',
  },
  markActive: {
    en: 'Mark Active (Rejoin)',
    hi: 'पुनः सक्रिय करें',
  },
  deleteStudent: {
    en: 'Delete Permanently',
    hi: 'हमेशा के लिए हटाएं',
  },
  studentHistory: {
    en: 'Student Complete History',
    hi: 'बच्चे का पूरा रिकॉर्ड',
  },
  session: {
    en: 'Session',
    hi: 'सत्र',
  },
  pinTitle: {
    en: 'Enter 4-Digit Security PIN',
    hi: '4-अंकों का सुरक्षा पिन दर्ज करें',
  },
  pinCollectorDesc: {
    en: 'Fee submission & student lookup',
    hi: 'फीस जमा और रजिस्टर देखने हेतु',
  },
  pinAdminDesc: {
    en: 'Full school administration & management',
    hi: 'विद्यालय प्रबंधन एवं सेटिंग्स हेतु',
  },
};

interface LanguageContextValue {
  lang: AppLanguage;
  setLang: (l: AppLanguage) => void;
  toggleLang: () => void;
  t: (key: keyof typeof DICTIONARY) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: 'hi',
  setLang: () => {},
  toggleLang: () => {},
  t: (k) => DICTIONARY[k]?.hi || '',
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLang] = useState<AppLanguage>(() => {
    try {
      const saved = localStorage.getItem('svss_lang');
      if (saved === 'en' || saved === 'hi') return saved;
    } catch {}
    return 'hi';
  });

  useEffect(() => {
    try {
      localStorage.setItem('svss_lang', lang);
    } catch {}
  }, [lang]);

  const toggleLang = () => setLang((prev) => (prev === 'hi' ? 'en' : 'hi'));
  const t = (key: keyof typeof DICTIONARY) => DICTIONARY[key]?.[lang] || DICTIONARY[key]?.hi || '';

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
