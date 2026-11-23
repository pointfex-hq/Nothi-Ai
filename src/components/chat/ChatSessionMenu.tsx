'use client';

import { useState, useRef, useEffect } from 'react';

interface ChatSessionMenuProps {
  sessionId: string;
  sessionTitle: string;
  onRename: (id: string, newTitle: string) => void;
  onDelete: (id: string) => void;
}

export function ChatSessionMenu({
  sessionId,
  sessionTitle,
  onRename,
  onDelete,
}: ChatSessionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [editTitle, setEditTitle] = useState(sessionTitle);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isRenaming) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isRenaming]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsConfirmingDelete(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleSaveRename = () => {
    if (editTitle.trim()) {
      onRename(sessionId, editTitle.trim());
    }
    setIsRenaming(false);
    setIsOpen(false);
  };

  if (isRenaming) {
    return (
      <div
        className="flex items-center gap-1 w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSaveRename();
            if (e.key === 'Escape') setIsRenaming(false);
          }}
          className="flex-1 px-1.5 py-0.5 text-xs bg-paper border border-brass rounded-xs text-ink outline-hidden"
        />
        <button
          type="button"
          onClick={handleSaveRename}
          className="p-1 text-xs text-green-deep hover:font-bold"
          title="Save"
        >
          ✓
        </button>
        <button
          type="button"
          onClick={() => setIsRenaming(false)}
          className="p-1 text-xs text-ink-muted hover:text-ink"
          title="Cancel"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <div
      ref={menuRef}
      className="relative shrink-0"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="p-1 rounded-sm text-ink-muted hover:text-ink hover:bg-paper-dark transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
        title="Chat options"
        aria-label="Chat options menu"
        aria-expanded={isOpen}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="5" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="12" cy="19" r="2" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-36 rounded-md bg-paper border border-border shadow-lg py-1 z-30 text-xs font-sans animate-in fade-in duration-100">
          {!isConfirmingDelete ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setIsRenaming(true);
                  setIsOpen(false);
                }}
                className="w-full px-3 py-1.5 text-left text-ink hover:bg-paper-light flex items-center gap-2 cursor-pointer"
              >
                <span>✏️</span>
                <span>Rename</span>
              </button>
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(true)}
                className="w-full px-3 py-1.5 text-left text-vermillion hover:bg-paper-light flex items-center gap-2 cursor-pointer"
              >
                <span>🗑</span>
                <span>Delete</span>
              </button>
            </>
          ) : (
            <div className="p-2 space-y-1.5 text-left">
              <div className="text-[11px] text-ink font-semibold">Delete chat?</div>
              <div className="flex items-center gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => onDelete(sessionId)}
                  className="px-2 py-0.5 rounded-xs bg-vermillion text-paper text-[10px] font-bold cursor-pointer"
                >
                  Confirm
                </button>
                <button
                  type="button"
                  onClick={() => setIsConfirmingDelete(false)}
                  className="px-2 py-0.5 rounded-xs border border-border text-ink text-[10px] cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
