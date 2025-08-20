'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import styles from '@/styles/ChatPanel.module.css';
import Slider from '@/components/Slider';
import Tooltip from '@/components/Tooltip';
import { GenerateRequest, GenerateResponse } from '@/types/api';
import { MessageList } from '@/components/MessageList';

type ChatMsg = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
};

function uid() {
  return Math.random().toString(36).slice(2);
}

const processingText = 'I am processing your message, please wait...';
const doneText = 'Your request has been resolved.';
const errorText =
  'I have made a mistake, I am not pretty sure what happened but I couldnt, please try again';

export default function ChatPanel({
  onHtml,
  currentHtml,
  onRequestStart,
  onRequestFinished,
}: {
  onHtml: (html: string) => void;
  currentHtml: string;
  onRequestStart?: () => void;
  onRequestFinished?: (args: { success: boolean }) => void;
}) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [temperature, setTemperature] = useState(0.5);
  const [topP, setTopP] = useState(1);
  const [loading, setLoading] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const apiBase = process.env.NEXT_PUBLIC_AI_API_BASE || '';

  // focus on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const canSend = useMemo(
    () => !loading && input.trim().length > 0,
    [loading, input]
  );

  async function handleSend() {
    if (!canSend) return;

    onRequestStart?.(); // open pairing modal on preview

    const userText = input.trim();
    setInput('');
    const idUser = uid();
    const idProc = uid();

    setMessages((prev) => [
      ...prev,
      { id: idUser, role: 'user', text: userText },
      { id: idProc, role: 'assistant', text: processingText },
    ]);
    setLoading(true);

    try {
      const payload: GenerateRequest = {
        message: userText,
        previous_html: currentHtml || '',
        temperature,
        top_p: topP,
      };

      const res = await fetch(`${apiBase}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        setMessages((prev) =>
          prev.map((m) => (m.id === idProc ? { ...m, text: errorText } : m))
        );
        onRequestFinished?.({ success: false });
        setLoading(false);
        return;
      }

      const data = (await res.json()) as GenerateResponse;

      if (data.error) {
        setMessages((prev) =>
          prev.map((m) => (m.id === idProc ? { ...m, text: errorText } : m))
        );
        onRequestFinished?.({ success: false });
      } else {
        onHtml(data.html || '');
        setMessages((prev) =>
          prev.map((m) => (m.id === idProc ? { ...m, text: doneText } : m))
        );
        onRequestFinished?.({ success: true });
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) => (m.id === idProc ? { ...m, text: errorText } : m))
      );
      onRequestFinished?.({ success: false });
    } finally {
      setLoading(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className={`panel ${styles.wrapper}`}>
      <div className={styles.scroller} ref={scrollRef}>
        <MessageList messages={messages} />
      </div>
      <div className={styles.composer}>
        <div className={styles.inputs}>
          <div className={styles.sliders}>
            <Slider
              label="Temperature"
              value={temperature}
              onChange={setTemperature}
              rightAddon={
                <Tooltip
                  title="What is temperature?"
                  content="Controls randomness. Lower values produce more deterministic and safer outputs. Higher values increase creativity and variance."
                />
              }
            />
            <Slider
              label="Top-P (nucleus)"
              value={topP}
              onChange={setTopP}
              rightAddon={
                <Tooltip
                  title="What is top-p (nucleus)?"
                  content="Keeps the smallest set of tokens with cumulative probability mass p. Lower values restrict sampling to more likely tokens."
                />
              }
            />
          </div>
          <div className={styles.row}>
            <textarea
              ref={textareaRef}
              className={styles.textarea}
              placeholder="Type your instruction..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              disabled={loading}
            />
            <button
              className={styles.sendBtn}
              disabled={!canSend}
              onClick={handleSend}
            >
              {loading ? 'Sending...' : 'Send'}
            </button>
          </div>
          <div className={styles.hint}>
            Press Enter to send. Use Shift+Enter for a new line.
          </div>
        </div>
      </div>
    </div>
  );
}
