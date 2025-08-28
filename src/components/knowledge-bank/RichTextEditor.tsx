import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Heading from '@tiptap/extension-heading';
import Image from '@tiptap/extension-image'; // Import Image extension
import Link from '@tiptap/extension-link'; // Import Link extension
import React from 'react';
import { Toggle } from '@/components/ui/toggle';
import { Bold, Italic, Strikethrough, Code, List, ListOrdered, Heading1, Heading2, Heading3, TextQuote, Image as ImageIcon, Link as LinkIcon, Minus } from 'lucide-react'; // Import new icons
import { Button } from '@/components/ui/button'; // Added missing import for Button
import { XCircle, FileText } from 'lucide-react'; // Added missing import for XCircle and FileText

interface RichTextEditorProps {
  content: string;
  onUpdate: (content: string) => void;
  onInsertImage: (url: string) => void; // New prop to handle image insertion
  onInsertPdf: (url: string) => void; // New prop to handle PDF insertion
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ content, onUpdate, onInsertImage, onInsertPdf }) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        // The Link extension is included in StarterKit, no need to add it separately
      }),
      Heading.configure({
        levels: [1, 2, 3],
      }),
      Image.configure({
        inline: true,
        allowBase64: true, // Allow base64 images if needed (e.g., paste from clipboard)
      }),
      // Remove explicit Link configuration as it's part of StarterKit
      // Link.configure({
      //   openOnClick: false,
      //   autolink: true,
      // }),
      // Placeholder for a custom PDF extension later
    ],
    content: content,
    onUpdate: ({ editor }) => {
      onUpdate(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none min-h-[200px] border rounded-md p-4 focus:outline-none',
      },
    },
  });

  if (!editor) {
    return null;
  }

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);

    // cancelled
    if (url === null) {
      return;
    }

    // empty
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    // update link
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  return (
    <div className="border rounded-md">
      <div className="flex flex-wrap items-center gap-1 border-b p-2">
        <Toggle
          onPressedChange={() => editor.chain().focus().toggleBold().run()}
          pressed={editor.isActive('bold')}
          aria-label="Toggle bold"
        >
          <Bold className="h-4 w-4" />
        </Toggle>
        <Toggle
          onPressedChange={() => editor.chain().focus().toggleItalic().run()}
          pressed={editor.isActive('italic')}
          aria-label="Toggle italic"
        >
          <Italic className="h-4 w-4" />
        </Toggle>
        <Toggle
          onPressedChange={() => editor.chain().focus().toggleStrike().run()}
          pressed={editor.isActive('strike')}
          aria-label="Toggle strikethrough"
        >
          <Strikethrough className="h-4 w-4" />
        </Toggle>
        <Toggle
          onPressedChange={() => editor.chain().focus().toggleCode().run()}
          pressed={editor.isActive('code')}
          aria-label="Toggle code"
        >
          <Code className="h-4 w-4" />
        </Toggle>
        <Toggle
          onPressedChange={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          pressed={editor.isActive('heading', { level: 1 })}
          aria-label="Toggle H1"
        >
          <Heading1 className="h-4 w-4" />
        </Toggle>
        <Toggle
          onPressedChange={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          pressed={editor.isActive('heading', { level: 2 })}
          aria-label="Toggle H2"
        >
          <Heading2 className="h-4 w-4" />
        </Toggle>
        <Toggle
          onPressedChange={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          pressed={editor.isActive('heading', { level: 3 })}
          aria-label="Toggle H3"
        >
          <Heading3 className="h-4 w-4" />
        </Toggle>
        <Toggle
          onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
          pressed={editor.isActive('bulletList')}
          aria-label="Toggle bullet list"
        >
          <List className="h-4 w-4" />
        </Toggle>
        <Toggle
          onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
          pressed={editor.isActive('orderedList')}
          aria-label="Toggle ordered list"
        >
          <ListOrdered className="h-4 w-4" />
        </Toggle>
        <Toggle
          onPressedChange={() => editor.chain().focus().toggleBlockquote().run()}
          pressed={editor.isActive('blockquote')}
          aria-label="Toggle blockquote"
        >
          <TextQuote className="h-4 w-4" />
        </Toggle>
        <Toggle
          onPressedChange={() => editor.chain().focus().setHorizontalRule().run()}
          aria-label="Horizontal Rule"
        >
          <Minus className="h-4 w-4" />
        </Toggle>
        <Toggle
          onPressedChange={setLink}
          pressed={editor.isActive('link')}
          aria-label="Set link"
        >
          <LinkIcon className="h-4 w-4" />
        </Toggle>
        <Toggle
          onPressedChange={() => editor.chain().focus().unsetLink().run()}
          disabled={!editor.isActive('link')}
          aria-label="Unset link"
        >
          <XCircle className="h-4 w-4" />
        </Toggle>
        {/* Image and PDF buttons - will call props from parent */}
        <Button variant="ghost" size="sm" onClick={() => onInsertImage('placeholder_image_url')} aria-label="Insert Image">
          <ImageIcon className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onInsertPdf('placeholder_pdf_url')} aria-label="Insert PDF">
          <FileText className="h-4 w-4" />
        </Button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
};

export default RichTextEditor;
