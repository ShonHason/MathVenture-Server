// import React, { useState } from "react";
// import "./HomePageContent.css";

// const predefinedTopics = [
//   "חיבור עד 10",
//   "חיסור עד 10",
//   "כפל עד 10",
//   "חלוקה עד 10",
// ];

// const HomePageContent: React.FC = () => {
//   const [topics, setTopics] = useState<string[]>([]); // State for storing topics
//   const [selectedTopic, setSelectedTopic] = useState<string>(""); // State for selected topic

//   const handleAddTopic = () => {
//     if (selectedTopic && !topics.includes(selectedTopic)) {
//       setTopics([...topics, selectedTopic]); // Add selected topic to the list
//       setSelectedTopic(""); // Clear selection
//     }
//   };

//   return (
//     <div className="content">
//       <p className="section-title">:השיעורים שלי</p>
//       <div className={`my-lessons ${topics.length === 0 ? "empty" : ""}`}>
//         {topics.length === 0 ? <p>כרגע אין שיעורים</p> : null}
//       </div>

//       <p className="section-title">:נושאים לשיעור</p>
//       <div className={`lesson-topics ${topics.length === 0 ? "empty" : ""}`}>
//         {topics.length === 0 ? (
//           <p>כרגע אין נושאים</p>
//         ) : (
//           topics.map((topic, index) => (
//             <div key={index} className="topic-item">
//               {topic}
//             </div>
//           ))
//         )}
//       </div>

//       <div className="add-topic-container">
//         <select
//           value={selectedTopic}
//           onChange={(e) => setSelectedTopic(e.target.value)}
//           className="topic-select"
//         >
//           <option value="">בחר נושא</option>
//           {predefinedTopics.map((topic, index) => (
//             <option key={index} value={topic}>
//               {topic}
//             </option>
//           ))}
//         </select>
//         <button onClick={handleAddTopic} className="add-topic-button">
//           להוספת נושא
//         </button>
//       </div>
//     </div>
//   );
// };

// export default HomePageContent;
import React, { useContext, useState } from "react";
import "./HomePageContent.css";
import LessonsContext from "../context/LessonsContext";
const predefinedTopics = [
  "חיבור עד 10",
  "חיסור עד 10",
  "כפל עד 10",
  "חלוקה עד 10",
];

// interface HomePageContentProps {}

const HomePageContent: React.FC = () => {
  //   const [topics, setTopics] = useState<string[]>([]); // נושאים בחלון הראשי
  const [draftTopics, setDraftTopics] = useState<string[]>([]); // נושאים זמניים בקופסה הכתומה
  const [selectedTopic, setSelectedTopic] = useState<string>(""); // נושא שנבחר להוספה
  const [showAddTopicModal, setShowAddTopicModal] = useState<boolean>(false); // מצב החלון הכתום
  const lessonsContext = useContext(LessonsContext);
  if (!lessonsContext) {
    throw new Error(
      "HomePageContent must be used within a LessonsContext.Provider"
    );
  }
  const { topics, setTopics } = lessonsContext;
  const handleAddDraftTopic = () => {
    if (selectedTopic && !draftTopics.includes(selectedTopic)) {
      setDraftTopics([...draftTopics, selectedTopic]); // מוסיף את הנושא לנושאים הזמניים
      setSelectedTopic(""); // מנקה את הבחירה
    }
  };

  const handleSaveTopics = () => {
    setTopics([...topics, ...draftTopics]); // מעתיק את הנושאים הזמניים לנושאים הראשיים
    setDraftTopics([]); // מנקה את הנושאים הזמניים
    setShowAddTopicModal(false); // סוגר את החלון הכתום
  };

  const handleCancel = () => {
    setDraftTopics([]); // מנקה את הנושאים הזמניים בעת ביטול
    setShowAddTopicModal(false); // סוגר את החלון הכתום
  };

  return (
    <div className="content">
      {/* החלק של השיעורים שלי */}
      <p className="section-title">:השיעורים שלי</p>
      <div className={`my-lessons ${topics.length === 0 ? "empty" : ""}`}>
        {topics.length === 0 ? (
          <p>כרגע אין שיעורים</p>
        ) : (
          topics.map((topic, index) => (
            <div key={index} className="lesson-item">
              {topic}
            </div>
          ))
        )}
      </div>

      {/* החלק של נושאים לשיעור */}
      <button
        onClick={() => setShowAddTopicModal(true)}
        className="add-topic-button"
      >
        להוספת נושא
      </button>

      {showAddTopicModal && (
        <div className="modal-overlay">
          <div className="add-topic-modal">
            <p className="modal-title">הוספה בנושאי שיעורים :</p>
            <select
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              className="topic-select"
            >
              <option value="">בחר נושא</option>
              {predefinedTopics.map((topic, index) => (
                <option key={index} value={topic}>
                  {topic}
                </option>
              ))}
            </select>

            <button onClick={handleAddDraftTopic} className="add-topic-button">
              הוספה לנושאים זמניים
            </button>

            {/* הצגת נושאים זמניים */}
            <div className="draft-topics">
              <p className="section-title">:נושאים </p>
              {draftTopics.length > 0 ? (
                draftTopics.map((topic, index) => (
                  <div key={index} className="topic-item">
                    {topic}
                  </div>
                ))
              ) : (
                <p>אין נושאים </p>
              )}
            </div>

            <div className="modal-buttons">
              <button onClick={handleSaveTopics} className="add-topic-button">
                שמירה
              </button>
              <button onClick={handleCancel} className="cancel-button">
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePageContent;
