'use client';

import React, { useRef, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { Toggle } from '@/components/ui/toggle';
import { Button } from '@/components/ui/button';
import { Bold, Italic, List, ListOrdered, Image as ImageIcon, Link as LinkIcon } from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function compressImageFile(file: File, maxWidth = 1000, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = document.createElement('img');
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };
      img.onerror = () => resolve(e.target?.result as string);
      img.src = e.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

export function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Image.configure({
        inline: true,
        allowBase64: true,
        HTMLAttributes: {
          class: 'max-h-64 my-2 border rounded border-gray-300 object-contain inline-block',
        },
      }),
    ],
    content: value || '',
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[120px] p-4',
      },
    },
  });

  // Keep content synced if external value changes (e.g., attaching option image)
  useEffect(() => {
    if (editor && value !== undefined && editor.getHTML() !== value) {
      editor.commands.setContent(value || '');
    }
  }, [value, editor]);

  if (!editor) {
    return null;
  }

  const handleImageFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      alert('Image file size must be less than 15MB');
      return;
    }

    try {
      const dataUrl = await compressImageFile(file);
      if (dataUrl && editor) {
        editor.chain().focus().setImage({ src: dataUrl }).run();
      }
    } catch (err) {
      console.error('Image compression error:', err);
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAddImageUrl = () => {
    const url = prompt('Enter Image URL:');
    if (url && url.trim()) {
      editor.chain().focus().setImage({ src: url.trim() }).run();
    }
  };

  return (
    <div className="border border-muted bg-background rounded-none overflow-hidden flex flex-col focus-within:ring-1 focus-within:ring-primary">
      {/* Hidden file picker */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageFileSelect}
        accept="image/*"
        className="hidden"
      />

      <div className="border-b border-muted bg-muted/10 p-1 flex flex-wrap items-center gap-1">
        <Toggle
          size="sm"
          pressed={editor.isActive('bold')}
          onPressedChange={() => editor.chain().focus().toggleBold().run()}
          className="rounded-none h-8 px-2"
          title="Bold"
        >
          <Bold className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('italic')}
          onPressedChange={() => editor.chain().focus().toggleItalic().run()}
          className="rounded-none h-8 px-2"
          title="Italic"
        >
          <Italic className="h-4 w-4" />
        </Toggle>
        <div className="w-px h-6 bg-muted mx-1 self-center" />
        <Toggle
          size="sm"
          pressed={editor.isActive('bulletList')}
          onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
          className="rounded-none h-8 px-2"
          title="Bullet List"
        >
          <List className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('orderedList')}
          onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
          className="rounded-none h-8 px-2"
          title="Numbered List"
        >
          <ListOrdered className="h-4 w-4" />
        </Toggle>
        
        <div className="w-px h-6 bg-muted mx-1 self-center" />
        
        {/* Image Upload & URL Buttons */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          className="rounded-none h-8 px-2 text-xs gap-1 font-semibold hover:bg-muted/50"
          title="Upload Image from computer"
        >
          <ImageIcon className="h-4 w-4 text-blue-600" />
          <span>Upload Image</span>
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleAddImageUrl}
          className="rounded-none h-8 px-2 text-xs gap-1 text-muted-foreground hover:bg-muted/50"
          title="Insert Image by URL"
        >
          <LinkIcon className="h-3.5 w-3.5" />
          <span>Image URL</span>
        </Button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
