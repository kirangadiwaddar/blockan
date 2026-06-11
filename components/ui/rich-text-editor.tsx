"use client";

import * as React from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import ImageExtension from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  List, ListOrdered, ListTodo,
  AlignLeft, AlignCenter, AlignRight,
  Link2, ImageIcon, Code, Quote,
  Heading1, Heading2, Heading3,
  Undo2, Redo2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Lightbox, useLightbox } from "@/components/ui/lightbox";

/* ─── Toolbar button ─────────────────────────────────────── */
function ToolBtn({
  onClick, active, disabled, title, children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      className={cn(
        "size-7 flex items-center justify-center rounded-md text-sm transition-colors",
        "hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed",
        active ? "bg-muted text-foreground" : "text-muted-foreground",
      )}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-4 bg-border mx-0.5 shrink-0" />;
}

/* ─── Toolbar ────────────────────────────────────────────── */
function Toolbar({ editor, onImageInsert }: { editor: Editor; onImageInsert: () => void }) {
  const setLink = () => {
    const prev = editor.getAttributes("link").href ?? "";
    const url = window.prompt("Enter URL:", prev);
    if (url === null) return;
    if (url === "") { editor.chain().focus().extendMarkRange("link").unsetLink().run(); return; }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url, target: "_blank" }).run();
  };

  return (
    <div className="flex items-center flex-wrap gap-0.5 px-2 py-1.5 border-b bg-muted/30">
      {/* Undo / Redo */}
      <ToolBtn title="Undo" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>
        <Undo2 size={13} />
      </ToolBtn>
      <ToolBtn title="Redo" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>
        <Redo2 size={13} />
      </ToolBtn>

      <Divider />

      {/* Headings */}
      <ToolBtn title="Heading 1" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })}>
        <Heading1 size={13} />
      </ToolBtn>
      <ToolBtn title="Heading 2" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })}>
        <Heading2 size={13} />
      </ToolBtn>
      <ToolBtn title="Heading 3" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })}>
        <Heading3 size={13} />
      </ToolBtn>

      <Divider />

      {/* Inline marks */}
      <ToolBtn title="Bold" onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")}>
        <Bold size={13} />
      </ToolBtn>
      <ToolBtn title="Italic" onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")}>
        <Italic size={13} />
      </ToolBtn>
      <ToolBtn title="Underline" onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")}>
        <UnderlineIcon size={13} />
      </ToolBtn>
      <ToolBtn title="Strikethrough" onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")}>
        <Strikethrough size={13} />
      </ToolBtn>
      <ToolBtn title="Inline code" onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive("code")}>
        <Code size={13} />
      </ToolBtn>

      <Divider />

      {/* Alignment */}
      <ToolBtn title="Align left" onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })}>
        <AlignLeft size={13} />
      </ToolBtn>
      <ToolBtn title="Align center" onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })}>
        <AlignCenter size={13} />
      </ToolBtn>
      <ToolBtn title="Align right" onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })}>
        <AlignRight size={13} />
      </ToolBtn>

      <Divider />

      {/* Lists */}
      <ToolBtn title="Bullet list" onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")}>
        <List size={13} />
      </ToolBtn>
      <ToolBtn title="Numbered list" onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")}>
        <ListOrdered size={13} />
      </ToolBtn>
      <ToolBtn title="Task list" onClick={() => editor.chain().focus().toggleTaskList().run()} active={editor.isActive("taskList")}>
        <ListTodo size={13} />
      </ToolBtn>

      <Divider />

      {/* Block */}
      <ToolBtn title="Blockquote" onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")}>
        <Quote size={13} />
      </ToolBtn>

      <Divider />

      {/* Link & Image */}
      <ToolBtn title="Link" onClick={setLink} active={editor.isActive("link")}>
        <Link2 size={13} />
      </ToolBtn>
      <ToolBtn title="Insert image" onClick={onImageInsert}>
        <ImageIcon size={13} />
      </ToolBtn>
    </div>
  );
}

/* ─── RichTextEditor ─────────────────────────────────────── */
interface RichTextEditorProps {
  placeholder?: string;
  onSubmit?: (html: string) => void;
  submitLabel?: string;
  onCancel?: () => void;
  className?: string;
  minHeight?: number;
}

export function RichTextEditor({
  placeholder = "Add a comment…",
  onSubmit,
  submitLabel = "Save",
  onCancel,
  className,
  minHeight = 120,
}: RichTextEditorProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const editorWrapRef = React.useRef<HTMLDivElement>(null);
  const { lightbox, close: closeLightbox } = useLightbox(editorWrapRef);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      ImageExtension.configure({ inline: false, allowBase64: true }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: "text-primary underline cursor-pointer" } }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder }),
    ],
    editorProps: {
      attributes: {
        class: cn(
          "outline-none prose prose-sm dark:prose-invert max-w-none px-3 py-2.5",
          "prose-headings:font-semibold prose-headings:text-foreground",
          "prose-p:text-foreground prose-p:leading-relaxed",
          "prose-strong:text-foreground prose-a:text-primary",
          "prose-code:bg-muted prose-code:px-1 prose-code:rounded prose-code:text-sm prose-code:font-mono",
          "prose-blockquote:border-l-2 prose-blockquote:border-primary prose-blockquote:pl-3 prose-blockquote:text-muted-foreground",
          "prose-ul:text-foreground prose-ol:text-foreground",
          "[&_.task-list-item]:flex [&_.task-list-item]:items-start [&_.task-list-item]:gap-2",
          "[&_.task-list-item_input]:mt-1 [&_.task-list-item_input]:cursor-pointer",
        ),
      },
    },
  });

  const [hasContent, setHasContent] = React.useState(false);

  // Track content changes to update button state reactively
  React.useEffect(() => {
    if (!editor) return;
    const update = () => {
      const text = editor.getText().trim();
      const hasImg = editor.getHTML().includes("<img");
      setHasContent(text.length > 0 || hasImg);
    };
    editor.on("update", update);
    return () => { editor.off("update", update); };
  }, [editor]);

  const handleSubmit = () => {
    if (!editor || !hasContent) return;
    const html = editor.getHTML();
    onSubmit?.(html);
    editor.commands.clearContent();
    setHasContent(false);
  };

  const handleImageFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      if (src) editor?.chain().focus().setImage({ src, alt: file.name }).run();
    };
    reader.readAsDataURL(file);
  };

  const handleImageUrl = () => {
    const url = window.prompt("Image URL:");
    if (url) editor?.chain().focus().setImage({ src: url }).run();
  };

  const handleImageInsert = () => {
    fileInputRef.current?.click();
  };

  // Paste image from clipboard
  React.useEffect(() => {
    if (!editor) return;
    const handler = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) { e.preventDefault(); handleImageFile(file); }
        }
      }
    };
    document.addEventListener("paste", handler);
    return () => document.removeEventListener("paste", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  if (!editor) return null;

  return (
    <>
    {lightbox && <Lightbox src={lightbox.src} alt={lightbox.alt} onClose={closeLightbox} />}
    <div className={cn("rounded-xl border bg-background overflow-hidden", className)}>
      <Toolbar editor={editor} onImageInsert={handleImageInsert} />

      {/* Hidden file input for image upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImageFile(file);
          e.target.value = "";
        }}
      />

      {/* Editor area — images inside are clickable to open lightbox */}
      <div
        ref={editorWrapRef}
        className="[&_img]:cursor-zoom-in [&_img]:rounded-lg [&_img]:max-h-64 [&_img]:max-w-full [&_img]:object-contain [&_img]:my-2 [&_img]:hover:opacity-80 [&_img]:transition-opacity [&_img]:border [&_img]:border-border [&_img]:shadow-sm"
      >
        <EditorContent
          editor={editor}
          style={{ minHeight }}
          className="cursor-text"
          onClick={() => editor.commands.focus()}
        />
      </div>

      {/* Footer actions */}
      <div className="flex items-center justify-between px-3 py-2 border-t bg-muted/20">
        <p className="text-xs text-muted-foreground">
          Supports <strong>Markdown</strong> shortcuts · images paste supported
        </p>
        <div className="flex items-center gap-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1.5 text-sm text-muted-foreground rounded-lg hover:bg-muted transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!hasContent}
            className={cn(
              "px-3.5 py-1.5 text-sm font-medium rounded-lg transition-colors",
              hasContent
                ? "bg-primary text-primary-foreground hover:opacity-90 cursor-pointer"
                : "bg-muted text-muted-foreground cursor-not-allowed",
            )}
          >
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
    </>
  );
}
