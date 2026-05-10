import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import { Button } from "@/components/ui/button";
import { Bold, Italic, List, ListOrdered, Heading2, Heading3, Image as ImageIcon, Link2, Video, Undo, Redo, AlignLeft, AlignCenter, AlignRight } from "lucide-react";
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Props {
  value: any;
  onChange: (json: any) => void;
  projectId: string;
}

export function RichTextEditor({ value, onChange, projectId }: Props) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({ HTMLAttributes: { class: "rounded-lg my-4 max-w-full" } }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: "text-primary underline" } }),
    ],
    content: value && Object.keys(value).length ? value : "<p></p>",
    onUpdate: ({ editor }) => onChange(editor.getJSON()),
    editorProps: {
      attributes: {
        class: "prose prose-sm sm:prose max-w-none focus:outline-none min-h-[300px] p-4",
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = JSON.stringify(editor.getJSON());
    const incoming = JSON.stringify(value ?? {});
    if (current !== incoming && value && Object.keys(value).length) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) return null;

  const uploadImage = async (file: File) => {
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `public-pages/${projectId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("media").upload(path, file, { contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from("media").getPublicUrl(path);
      editor.chain().focus().setImage({ src: data.publicUrl }).run();
    } catch (e) {
      toast({ title: "Échec du téléversement", description: e instanceof Error ? e.message : "", variant: "destructive" });
    }
  };

  const addVideo = () => {
    const url = window.prompt("URL de la vidéo (YouTube, Vimeo ou MP4) :");
    if (!url) return;
    let embed = url;
    const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
    const vm = url.match(/vimeo\.com\/(\d+)/);
    if (yt) embed = `https://www.youtube.com/embed/${yt[1]}`;
    else if (vm) embed = `https://player.vimeo.com/video/${vm[1]}`;
    const html = url.endsWith(".mp4")
      ? `<video controls src="${url}" class="w-full rounded-lg my-4"></video>`
      : `<div class="aspect-video my-4"><iframe src="${embed}" class="w-full h-full rounded-lg" allowfullscreen></iframe></div>`;
    editor.chain().focus().insertContent(html).run();
  };

  const addLink = () => {
    const url = window.prompt("URL du lien :");
    if (!url) return;
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  return (
    <div className="rounded-md border bg-background">
      <div className="flex flex-wrap items-center gap-1 border-b p-2">
        <ToolbarBtn editor={editor} active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} icon={Bold} />
        <ToolbarBtn editor={editor} active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} icon={Italic} />
        <div className="mx-1 h-5 w-px bg-border" />
        <ToolbarBtn editor={editor} active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} icon={Heading2} />
        <ToolbarBtn editor={editor} active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} icon={Heading3} />
        <ToolbarBtn editor={editor} active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} icon={List} />
        <ToolbarBtn editor={editor} active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} icon={ListOrdered} />
        <div className="mx-1 h-5 w-px bg-border" />
        <ToolbarBtn editor={editor} active={editor.isActive("link")} onClick={addLink} icon={Link2} />
        <ToolbarBtn editor={editor} active={false} onClick={() => fileRef.current?.click()} icon={ImageIcon} />
        <ToolbarBtn editor={editor} active={false} onClick={addVideo} icon={Video} />
        <div className="mx-1 h-5 w-px bg-border" />
        <ToolbarBtn editor={editor} active={false} onClick={() => editor.chain().focus().undo().run()} icon={Undo} />
        <ToolbarBtn editor={editor} active={false} onClick={() => editor.chain().focus().redo().run()} icon={Redo} />
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) uploadImage(f);
            e.target.value = "";
          }}
        />
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

function ToolbarBtn({ active, onClick, icon: Icon }: { editor: Editor; active: boolean; onClick: () => void; icon: any }) {
  return (
    <Button type="button" variant={active ? "secondary" : "ghost"} size="sm" className="h-8 w-8 p-0" onClick={onClick}>
      <Icon className="h-4 w-4" />
    </Button>
  );
}
