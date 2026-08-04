'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Bold, Italic, List, ListOrdered, Link, Undo, Redo, Eye } from 'lucide-react';
import { useState, useEffect } from 'react';

interface InstructionsEditorProps {
  value: string;
  onChange: (html: string, text: string) => void;
  placeholder?: string;
  preview?: boolean;
}

export const InstructionsEditor: React.FC<InstructionsEditorProps> = ({
  value,
  onChange,
  placeholder = 'Enter instructions here...',
  preview = false,
}) => {
  const [showPreview, setShowPreview] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: placeholder,
      }),
    ],
    content: value,
    editable: !preview && !showPreview,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const text = editor.getText();
      onChange(html, text);
    },
  });

  useEffect(() => {
    if (editor && editor.getHTML() !== value && !editor.isFocused) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  if (!editor) return null;

  const togglePreview = () => {
    setShowPreview(!showPreview);
    editor.setEditable(!(!preview && !(!showPreview)));
  };

  return (
    <div className="border border-muted rounded-lg overflow-hidden bg-card">
      {/* Toolbar */}
      {!preview && (
        <div className="flex items-center gap-1 p-2 border-b border-muted bg-muted/20 flex-wrap">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-1.5 rounded hover:bg-muted transition-colors ${
              editor.isActive('bold') ? 'bg-muted' : ''
            }`}
            title="Bold"
          >
            <Bold className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-1.5 rounded hover:bg-muted transition-colors ${
              editor.isActive('italic') ? 'bg-muted' : ''
            }`}
            title="Italic"
          >
            <Italic className="h-4 w-4" />
          </button>
          <div className="w-px h-6 bg-muted mx-1" />
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-1.5 rounded hover:bg-muted transition-colors ${
              editor.isActive('bulletList') ? 'bg-muted' : ''
            }`}
            title="Bullet List"
          >
            <List className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`p-1.5 rounded hover:bg-muted transition-colors ${
              editor.isActive('orderedList') ? 'bg-muted' : ''
            }`}
            title="Numbered List"
          >
            <ListOrdered className="h-4 w-4" />
          </button>
          <div className="w-px h-6 bg-muted mx-1" />
          <button
            type="button"
            onClick={() => editor.chain().focus().undo().run()}
            className="p-1.5 rounded hover:bg-muted transition-colors"
            title="Undo"
          >
            <Undo className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().redo().run()}
            className="p-1.5 rounded hover:bg-muted transition-colors"
            title="Redo"
          >
            <Redo className="h-4 w-4" />
          </button>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={togglePreview}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                showPreview
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              <Eye className="h-3.5 w-3.5 inline mr-1" />
              {showPreview ? 'Edit' : 'Preview'}
            </button>
          </div>
        </div>
      )}

      {/* Editor Content */}
      <div className="p-4 min-h-[150px] prose prose-sm max-w-none dark:prose-invert">
        {showPreview ? (
          <div 
            dangerouslySetInnerHTML={{ __html: editor.getHTML() }}
          />
        ) : (
          <EditorContent editor={editor} className="focus:outline-none" />
        )}
      </div>

      {/* Character Counter */}
      <div className="px-4 py-2 border-t border-muted text-xs text-muted-foreground bg-muted/10 flex justify-between">
        <span>
          {editor.getText().length} characters
        </span>
        <span>
          {editor.getText().split(/\s+/).filter(w => w.length > 0).length} words
        </span>
      </div>
    </div>
  );
};
