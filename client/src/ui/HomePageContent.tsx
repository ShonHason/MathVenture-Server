import React, { useContext, useState } from "react";
import "./HomePageContent.css";
import LessonsContext from "../context/LessonsContext";
const predefinedTopics = [
  "חיבור עד 10",
  "חיסור עד 10",
  "כפל עד 10",
  "חלוקה עד 10",
];

const HomePageContent: React.FC = () => {
  const [draftTopics, setDraftTopics] = useState<string[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string>("");
  const [showAddTopicModal, setShowAddTopicModal] = useState<boolean>(false);
  const lessonsContext = useContext(LessonsContext);
  if (!lessonsContext) {
    throw new Error(
      "HomePageContent must be used within a LessonsContext.Provider"
    );
  }
  const { topics, setTopics } = lessonsContext;
  const handleAddDraftTopic = () => {
    if (selectedTopic && !draftTopics.includes(selectedTopic)) {
      setDraftTopics([...draftTopics, selectedTopic]);
      setSelectedTopic("");
    }
  };

  const handleSaveTopics = () => {
    setTopics([...topics, ...draftTopics]);
    setDraftTopics([]);
    setShowAddTopicModal(false);
  };

  const handleCancel = () => {
    setDraftTopics([]);
    setShowAddTopicModal(false);
  };

  return (
    <div className="content">
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
