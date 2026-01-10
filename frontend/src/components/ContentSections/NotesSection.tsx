import React from 'react';
import { MarkdownRenderer } from '../MarkdownRenderer/MarkdownRenderer';

interface NotesSectionProps {
  notes: string;
  isAdmin: boolean;
  onEditNotes?: () => void;
}

export const NotesSection: React.FC<NotesSectionProps> = ({
  notes,
  isAdmin,
  onEditNotes
}) => {
  return (
    <section className="section notes" key="notes">
      <div className="section-header">
        <h2 className="section-title">Notes</h2>
        {isAdmin && (
          <button
            className="section-edit-btn"
            onClick={onEditNotes}
            title="Edit notes"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
        )}
      </div>

      <div className="notes-content">
        <MarkdownRenderer content={notes} />
      </div>
    </section>
  );
};