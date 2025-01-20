import React, { useState } from "react";
import "./HelpPage.css";

interface HelpPageProps {}

const HelpPage: React.FC<HelpPageProps> = () => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const faqs = [
    {
      question: "איך אני מתחיל ללמוד עם המורה הווירטואלי?",
      answer:
        "כדי להתחיל ללמוד, פשוט נכנס לממשק המשתמש, בחר בנושא הלימוד הרצוי והתחל לעבוד עם התרגילים שהמורה הווירטואלי מציע.",
    },
    {
      question: "איך אני יכול לקבל פידבק על התרגילים שלי?",
      answer:
        "המורה הווירטואלי ינתח את תשובותיך בזמן אמת ויספק לך משוב על כל תשובה, כולל הסברים על שגיאות והצעות לשיפור.",
    },
    {
      question: "מה לעשות אם נתקעתי בתרגיל?",
      answer:
        "אם נתקעת, תוכל לבקש עזרה נוספת מהמורה הווירטואלי או להשתמש בכלי 'עזרה' שמציע הסברים וטיפים לפתרון הבעיה.",
    },
    {
      question: "איך אני יכול לעקוב אחרי התקדמותי?",
      answer:
        "בדף הראשי יש פאנל שמציג את התקדמותך, כולל סטטיסטיקות על התרגילים שביצעת, ציונים והמלצות לנושאים לשיפור.",
    },
    {
      question: "איך אני מוסיף נושאים חדשים ללימוד?",
      answer:
        "באזור הניהול של המשתמש תוכל לבחור נושאים חדשים ללימוד מתוך קטלוג הנושאים המוצעים על ידי המערכת.",
    },
    {
      question: "מה קורה אם אני רוצה לשנות את רמת הקושי של השיעורים?",
      answer:
        "ניתן לשנות את רמת הקושי של השיעורים בהגדרות הפרופיל שלך, תחת האפשרות 'הגדרות לימוד'.",
    },
  ];

  const toggleAnswer = (index: number) => {
    setActiveIndex((prevIndex) => (prevIndex === index ? null : index));
  };

  return (
    <div className="help-page">
      <h1 className="help-title">עזרה</h1>
      <div className="faq-container">
        {faqs.map((faq, index) => (
          <div key={index} className="faq-item">
            <div className="faq-question" onClick={() => toggleAnswer(index)}>
              {faq.question}
              <span className="faq-toggle">
                {activeIndex === index ? "−" : "+"}
              </span>
            </div>
            {activeIndex === index && (
              <div className="faq-answer">{faq.answer}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default HelpPage;
