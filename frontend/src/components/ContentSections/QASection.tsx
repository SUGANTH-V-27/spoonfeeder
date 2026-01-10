import React, { useState } from 'react';
import { MarkdownRenderer } from '../MarkdownRenderer/MarkdownRenderer';

interface QAItem {
  id: number;
  question: string;
  answer: string;
  metadata?: {
    format?: string;
  };
}

interface QASectionProps {
  questions: QAItem[];
  isAdmin: boolean;
  onDeleteQuestion?: (questionId: number) => void;
  onAddQuestion?: () => void;
  onEditQuestion?: (questionId: number) => void;
}

export const QASection: React.FC<QASectionProps> = ({
  questions,
  isAdmin,
  onDeleteQuestion,
  onAddQuestion,
  onEditQuestion
}) => {
  const [_openQuestions, _setOpenQuestions] = useState<Set<number>>(new Set());

  return (
    <section className="section questions" key="questions">
      <div className="section-header">
        <h2 className="section-title">Questions & Answers</h2>
        {isAdmin && questions.length > 0 && (
          <button
            className="section-delete-btn"
            onClick={() => {/* Delete all questions */}}
            title="Delete all questions"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
          </button>
        )}
      </div>

      <div className="qa-widget">
        {questions.map((q, _index) => (
          <details key={q.id} className="qa-item">
            <summary className="qa-widget-question">
              <div className="question-content">
                <MarkdownRenderer content={q.question} />
              </div>
              <div className="question-controls">
                {isAdmin && (
                  <>
                    <button
                      className="question-edit-btn"
                      onClick={(e) => {
                        e.preventDefault();
                        onEditQuestion?.(q.id);
                      }}
                      title="Edit question"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                    <button
                      className="question-delete-btn"
                      onClick={(e) => {
                        e.preventDefault();
                        onDeleteQuestion?.(q.id);
                      }}
                      title="Delete question"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                    </button>
                  </>
                )}
                <div className="question-toggle">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 18l6-6-6-6"/>
                  </svg>
                </div>
              </div>
            </summary>
            <div className="qa-widget-answer">
              <div className="answer-content">
                <MarkdownRenderer content={q.answer} />
              </div>
            </div>
          </details>
        ))}
      </div>

      {isAdmin && (
        <div className="content-add-section">
          <button
            className="content-add-btn"
            onClick={onAddQuestion}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
              <path d="M12 17h.01"/>
            </svg>
            Add Question
          </button>
        </div>
      )}
    </section>
  );
};