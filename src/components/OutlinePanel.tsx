import React, { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  X,
  RefreshCw,
  FileText,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

type DocType = 'essay' | 'research_paper' | 'report' | 'general';
type Tone = 'academic' | 'persuasive' | 'analytical' | 'descriptive';

interface OutlinePanelProps {
  docType: DocType;
  onInsert: (html: string) => void;
  onClose: () => void;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

const TONE_OPTIONS: { value: Tone; label: string }[] = [
  { value: 'academic', label: 'Academic' },
  { value: 'persuasive', label: 'Persuasive' },
  { value: 'analytical', label: 'Analytical' },
  { value: 'descriptive', label: 'Descriptive' },
];

const DOC_LABELS: Record<DocType, string> = {
  essay: 'Essay',
  research_paper: 'Research Paper',
  report: 'Report',
  general: 'General',
};

const OutlinePanel: React.FC<OutlinePanelProps> = ({ docType, onInsert, onClose }) => {
  const [step, setStep] = useState<'input' | 'review'>('input');
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState<Tone>('academic');
  const [selectedDocType, setSelectedDocType] = useState<DocType>(docType);
  const [generating, setGenerating] = useState(false);
  const [generatedHtml, setGeneratedHtml] = useState('');
  const contentRef = useRef<HTMLDivElement>(null);

  const buildPrompt = useCallback(
    () =>
      `Write a complete, fully structured ${DOC_LABELS[selectedDocType]} about: "${topic}".
Tone: ${tone}.

Requirements:
- Write complete paragraphs with well-developed arguments, evidence, and analysis
- Use proper headings (## for main sections) and sub-sections where appropriate
- Include an introduction with a clear thesis statement
- Develop body paragraphs with topic sentences, supporting details, and transitions
- Include a conclusion that synthesizes the key points
- Use markdown formatting throughout
- The document should be 800-1500 words
- Make it publication-ready with proper academic/professional language appropriate for the tone

Write the full document now. Do not include meta-commentary or instructions.`,
    [topic, tone, selectedDocType],
  );

  const callAI = async (prompt: string): Promise<string> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Not authenticated');

    const resp = await fetch(CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!resp.ok) throw new Error('AI request failed');

    const reader = resp.body?.getReader();
    if (!reader) throw new Error('No stream');
    const decoder = new TextDecoder();
    let result = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      for (const line of chunk.split('\n')) {
        if (!line.startsWith('data: ') || line.includes('[DONE]')) continue;
        try {
          const parsed = JSON.parse(line.slice(6));
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) result += content;
        } catch { /* skip */ }
      }
    }
    return result;
  };

  // Escape raw AI text before markdown conversion to prevent XSS.
  // Any HTML tags or event handlers in the AI response become plain text.
  const escapeRawHtml = (str: string): string => {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  const markdownToHtml = (md: string): string => {
    // Escape first — then our converter adds only known-safe tags
    const safe = escapeRawHtml(md);
    return safe
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/^[-*] (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`)
      .replace(/\n{2,}/g, '</p><p>')
      .replace(/^(?!<[hul])/gm, (line) => line ? `<p>${line}</p>` : '')
      .replace(/<p><\/p>/g, '')
      .replace(/<p>(<h[123]>)/g, '$1')
      .replace(/(<\/h[123]>)<\/p>/g, '$1')
      .replace(/<p>(<ul>)/g, '$1')
      .replace(/(<\/ul>)<\/p>/g, '$1');
  };

  const generateDocument = async () => {
    if (!topic.trim()) {
      toast.error('Enter a topic first');
      return;
    }
    setGenerating(true);
    setStep('review');
    setGeneratedHtml('');
    try {
      const text = await callAI(buildPrompt());
      if (!text.trim()) throw new Error('Empty response from AI');
      setGeneratedHtml(markdownToHtml(text));
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate document');
      setStep('input');
    } finally {
      setGenerating(false);
    }
  };

  const regenerate = async () => {
    setGenerating(true);
    setGeneratedHtml('');
    try {
      const text = await callAI(buildPrompt());
      setGeneratedHtml(markdownToHtml(text));
    } catch (err: any) {
      toast.error(err.message || 'Failed to regenerate');
    } finally {
      setGenerating(false);
    }
  };

  const insertDocument = () => {
    const content = contentRef.current?.innerHTML || generatedHtml;
    onInsert(content);
    toast.success('Document inserted into editor');
    onClose();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-border flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground">Document Generator</span>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Input Step */}
      {step === 'input' && (
        <div className="p-4 space-y-4 overflow-y-auto flex-1 scrollbar-dark">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Topic</label>
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. The impact of AI on modern education"
              className="text-sm focus-glow"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Tone</label>
            <div className="grid grid-cols-2 gap-1.5">
              {TONE_OPTIONS.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setTone(t.value)}
                  className={`py-1.5 text-xs rounded-lg capitalize transition-all ${
                    tone === t.value
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Document Type</label>
            <div className="grid grid-cols-2 gap-1.5">
              {(Object.entries(DOC_LABELS) as [DocType, string][]).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setSelectedDocType(value)}
                  className={`py-1.5 text-xs rounded-lg transition-all ${
                    selectedDocType === value
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <Button onClick={generateDocument} disabled={generating} className="w-full btn-glow">
            <Sparkles className="w-4 h-4 mr-1.5" />
            Generate Document
          </Button>
        </div>
      )}

      {/* Review Step */}
      {step === 'review' && (
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 scrollbar-dark">
            {generating ? (
              <div className="space-y-4 pt-2">
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-6 w-1/2 mt-4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-6 w-2/3 mt-4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            ) : (
              <div
                ref={contentRef}
                contentEditable
                suppressContentEditableWarning
                className="prose prose-sm prose-invert max-w-none text-foreground focus:outline-none min-h-[200px]"
                dangerouslySetInnerHTML={{ __html: generatedHtml }}
              />
            )}
          </div>

          {!generating && generatedHtml && (
            <div className="p-3 border-t border-border space-y-2 shrink-0">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={regenerate} className="flex-1">
                  <RefreshCw className="w-3 h-3 mr-1" /> Regenerate
                </Button>
              </div>
              <Button onClick={insertDocument} className="w-full btn-glow">
                <ArrowRight className="w-4 h-4 mr-1.5" /> Insert into Editor
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setStep('input')} className="w-full text-xs">
                ← Back to inputs
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OutlinePanel;
