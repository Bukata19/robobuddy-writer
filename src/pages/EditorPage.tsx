import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Save,
  Download,
  FileText,
  Bot,
  Sparkles,
  ShieldCheck,
  MessageCircle,
  X,
  ChevronDown,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  Heading1,
  Heading2,
} from 'lucide-react';
import type { Json } from '@/integrations/supabase/types';

type DocType = 'essay' | 'research_paper' | 'report' | 'general';

interface DocumentData {
  id: string;
  title: string;
  content: Json | null;
  doc_type: DocType;
  plagiarism_score: number | null;
}

const templates: Record<DocType, string> = {
  essay: `<h1>Essay Title</h1>
<h2>Introduction</h2>
<p><em>Write your thesis statement and introduce the topic here...</em></p>
<h2>Body Paragraph 1</h2>
<p><em>Present your first main argument with supporting evidence...</em></p>
<h2>Body Paragraph 2</h2>
<p><em>Present your second main argument with supporting evidence...</em></p>
<h2>Body Paragraph 3</h2>
<p><em>Present your third main argument with supporting evidence...</em></p>
<h2>Conclusion</h2>
<p><em>Summarize your arguments and restate your thesis...</em></p>`,

  research_paper: `<h1>Research Paper Title</h1>
<h2>Abstract</h2>
<p><em>Provide a brief summary of the research (150-300 words)...</em></p>
<h2>Introduction</h2>
<p><em>Introduce the research problem, background, and objectives...</em></p>
<h2>Literature Review</h2>
<p><em>Review relevant existing research and identify gaps...</em></p>
<h2>Methodology</h2>
<p><em>Describe your research methods, data collection, and analysis approach...</em></p>
<h2>Results</h2>
<p><em>Present your findings with data, tables, or figures...</em></p>
<h2>Discussion</h2>
<p><em>Interpret results, compare with existing literature, discuss limitations...</em></p>
<h2>Conclusion</h2>
<p><em>Summarize key findings and suggest future research directions...</em></p>
<h2>References</h2>
<p><em>List all cited sources in proper format...</em></p>`,

  report: `<h1>Report Title</h1>
<h2>Executive Summary</h2>
<p><em>Provide a concise overview of the report...</em></p>
<h2>Introduction</h2>
<p><em>State the purpose and scope of the report...</em></p>
<h2>Findings</h2>
<p><em>Present your research findings and analysis...</em></p>
<h2>Recommendations</h2>
<p><em>Provide actionable recommendations based on findings...</em></p>
<h2>Conclusion</h2>
<p><em>Summarize the report and next steps...</em></p>`,

  general: `<h1>Document Title</h1>
<p><em>Start writing here...</em></p>`,
};

const EditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [doc, setDoc] = useState<DocumentData | null>(null);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [humanizerOpen, setHumanizerOpen] = useState(false);
  const [humanizerIntensity, setHumanizerIntensity] = useState<'subtle' | 'moderate' | 'full'>('moderate');
  const [showPlagiarism, setShowPlagiarism] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    fetchDocument();
  }, [id]);

  const fetchDocument = async () => {
    const { data, error } = await supabase
      .from('documents')
      .select('id, title, content, doc_type, plagiarism_score')
      .eq('id', id!)
      .single();

    if (error || !data) {
      toast.error('Document not found');
      navigate('/dashboard');
      return;
    }

    setDoc(data);
    setTitle(data.title);
    setLoading(false);

    // Load content into editor after render
    setTimeout(() => {
      if (editorRef.current) {
        if (data.content && typeof data.content === 'string') {
          editorRef.current.innerHTML = data.content;
        } else if (!data.content) {
          editorRef.current.innerHTML = templates[data.doc_type];
        }
      }
    }, 100);
  };

  const saveDocument = useCallback(async () => {
    if (!id || !editorRef.current) return;
    setSaving(true);

    const content = editorRef.current.innerHTML;
    const { error } = await supabase
      .from('documents')
      .update({ title, content: content as unknown as Json })
      .eq('id', id);

    if (error) {
      toast.error('Failed to save');
    } else {
      toast.success('Document saved!');
    }
    setSaving(false);
  }, [id, title]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveDocument();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [saveDocument]);

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Bar */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="flex items-center justify-between px-4 h-12">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-transparent border-none text-foreground font-display font-semibold text-sm h-8 w-48 md:w-72 focus-visible:ring-0 px-0"
            />
          </div>

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={saveDocument} disabled={saving}>
              <Save className="w-4 h-4 mr-1" />
              <span className="hidden md:inline">{saving ? 'Saving...' : 'Save'}</span>
            </Button>
            <Button variant="ghost" size="sm">
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Main Editor Area */}
        <div className="flex-1 overflow-auto bg-slate/20 scrollbar-dark">
          {/* Toolbar */}
          <div className="sticky top-0 z-10 bg-card/90 backdrop-blur-sm border-b border-border px-4 py-1.5 flex items-center gap-1 flex-wrap md:static md:flex-nowrap">
            <button onClick={() => execCommand('bold')} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
              <Bold className="w-4 h-4" />
            </button>
            <button onClick={() => execCommand('italic')} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
              <Italic className="w-4 h-4" />
            </button>
            <button onClick={() => execCommand('underline')} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
              <Underline className="w-4 h-4" />
            </button>
            <div className="w-px h-5 bg-border mx-1" />
            <button onClick={() => execCommand('formatBlock', 'h1')} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
              <Heading1 className="w-4 h-4" />
            </button>
            <button onClick={() => execCommand('formatBlock', 'h2')} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
              <Heading2 className="w-4 h-4" />
            </button>
            <div className="w-px h-5 bg-border mx-1" />
            <button onClick={() => execCommand('insertUnorderedList')} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
              <List className="w-4 h-4" />
            </button>
            <button onClick={() => execCommand('insertOrderedList')} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
              <ListOrdered className="w-4 h-4" />
            </button>
            <div className="w-px h-5 bg-border mx-1" />
            <button onClick={() => execCommand('justifyLeft')} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
              <AlignLeft className="w-4 h-4" />
            </button>
            <button onClick={() => execCommand('justifyCenter')} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
              <AlignCenter className="w-4 h-4" />
            </button>

            <div className="flex-1" />

            {/* AI Tools */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setHumanizerOpen(!humanizerOpen)}
              className={humanizerOpen ? 'text-teal' : ''}
            >
              <Sparkles className="w-4 h-4 mr-1" /> Humanizer
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPlagiarism(!showPlagiarism)}
              className={showPlagiarism ? 'text-destructive' : ''}
            >
              <ShieldCheck className="w-4 h-4 mr-1" /> Plagiarism
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setChatOpen(!chatOpen)}
              className={chatOpen ? 'text-teal' : ''}
            >
              <MessageCircle className="w-4 h-4 mr-1" /> Chat
            </Button>
          </div>

          {/* A4 Canvas */}
          <div className="p-4 md:p-8">
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              className="a4-canvas rounded-sm outline-none prose prose-sm max-w-none
                [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-4 [&_h1]:text-gray-900
                [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mb-3 [&_h2]:mt-6 [&_h2]:text-gray-800
                [&_p]:mb-3 [&_p]:leading-relaxed [&_p]:text-gray-700
                [&_em]:text-gray-400
                [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-3
                [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-3
                [&_li]:mb-1"
              spellCheck
            />
          </div>
        </div>

        {/* Humanizer Sidebar */}
        {humanizerOpen && (
          <div className="w-72 border-l border-border bg-card p-4 animate-slide-in-right overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold text-foreground text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-teal" /> Humanizer
              </h3>
              <button onClick={() => setHumanizerOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">Intensity</label>
                <div className="flex gap-1">
                  {(['subtle', 'moderate', 'full'] as const).map((level) => (
                    <button
                      key={level}
                      onClick={() => setHumanizerIntensity(level)}
                      className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors capitalize ${
                        humanizerIntensity === level
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              <Button className="w-full" size="sm">
                <Sparkles className="w-4 h-4 mr-1" /> Humanize Selected Text
              </Button>

              <p className="text-xs text-muted-foreground">
                Select text in the editor, then click humanize. Changes appear as teal highlights that you can accept or reject.
              </p>

              <div className="border-t border-border pt-3">
                <p className="text-xs text-muted-foreground">
                  <strong className="text-foreground">Tip:</strong> Use Ctrl+H to quickly trigger humanization on selected text.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Chat Sidebar */}
        {chatOpen && (
          <div className="w-80 border-l border-border bg-card flex flex-col animate-slide-in-right">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="font-display font-semibold text-foreground text-sm flex items-center gap-2">
                <Bot className="w-4 h-4 text-teal" /> AI Assistant
              </h3>
              <button onClick={() => setChatOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 p-4 overflow-auto scrollbar-dark">
              <div className="text-center text-muted-foreground text-sm py-8">
                <Bot className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p>Ask me about your document. I have full context of your content and plagiarism data.</p>
              </div>
            </div>

            <div className="p-3 border-t border-border">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ask about your document..."
                  className="flex-1 bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <Button size="sm">
                  Send
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile bottom toolbar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border px-2 py-1.5 flex items-center justify-around z-20">
        <button onClick={() => execCommand('bold')} className="p-2 text-muted-foreground">
          <Bold className="w-5 h-5" />
        </button>
        <button onClick={() => execCommand('italic')} className="p-2 text-muted-foreground">
          <Italic className="w-5 h-5" />
        </button>
        <button onClick={() => setHumanizerOpen(!humanizerOpen)} className="p-2 text-teal">
          <Sparkles className="w-5 h-5" />
        </button>
        <button onClick={() => setChatOpen(!chatOpen)} className="p-2 text-teal">
          <MessageCircle className="w-5 h-5" />
        </button>
        <button onClick={saveDocument} className="p-2 text-primary">
          <Save className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default EditorPage;
