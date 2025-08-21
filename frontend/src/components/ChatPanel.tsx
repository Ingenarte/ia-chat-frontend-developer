// src/components/ChatPanel.tsx
'use client';
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
  useCallback,
} from 'react';
import styles from '@/styles/ChatPanel.module.css';
import Slider from '@/components/Slider';
import Tooltip from '@/components/Tooltip';
import { GenerateRequest } from '@/types/api';
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
const errorText =
  'I have made a mistake, I am not pretty sure what happened but I couldnt, please try again';

export type ChatPanelHandle = {
  /** Append a system message into the timeline */
  pushSystemMessage: (msg: string) => void;
  /** Programmatically send a user message immediately (does not clear the current input draft) */
  sendMessage: (msg: string) => Promise<void>;
  /** Set the current input box value (prefill) */
  setInputValue?: (msg: string) => void;
  /** Focus the input textarea */
  focusInput?: () => void;
  /** Trigger the same action as clicking the Send button (uses current input value) */
  clickSend?: () => Promise<void>;
};

type Props = {
  onHtml: (html: string) => void;
  currentHtml: string;
  onRequestStart?: (jobId?: string) => void;
  onRequestFinished?: (args: { success: boolean }) => void;
};

type GenerateJobResponse = {
  job_id?: string;
  error?: string;
};

const ChatPanel = forwardRef<ChatPanelHandle, Props>(
  ({ onHtml, currentHtml, onRequestStart, onRequestFinished }, ref) => {
    const [messages, setMessages] = useState<ChatMsg[]>([]);
    const [input, setInput] = useState('');
    const [temperature, setTemperature] = useState(0.9);
    const [topP, setTopP] = useState(1);
    const [loading, setLoading] = useState(false);

    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const scrollRef = useRef<HTMLDivElement | null>(null);
    const apiBase = process.env.NEXT_PUBLIC_AI_API_BASE || '';

    const handleSend = useCallback(
      async (msg?: string) => {
        if (loading) return;

        const fromUI = msg === undefined;
        const userText = (msg ?? input).trim();
        if (!userText) return;

        if (fromUI) setInput('');

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
            return;
          }

          const data: GenerateJobResponse = await res.json();
          if (data.error) {
            setMessages((prev) =>
              prev.map((m) => (m.id === idProc ? { ...m, text: errorText } : m))
            );
            onRequestFinished?.({ success: false });
          } else if (data.job_id) {
            onRequestStart?.(data.job_id);
          }
        } catch (err) {
          setMessages((prev) =>
            prev.map((m) => (m.id === idProc ? { ...m, text: errorText } : m))
          );
          onRequestFinished?.({ success: false });
        } finally {
          setLoading(false);
        }
      },
      [
        loading,
        input,
        currentHtml,
        temperature,
        topP,
        onRequestFinished,
        onRequestStart,
        apiBase,
      ]
    );
    // Imperative API exposed to parent
    useImperativeHandle(
      ref,
      () => ({
        pushSystemMessage: (msg: string) => {
          setMessages((prev) => [
            ...prev,
            { id: uid(), role: 'system', text: msg },
          ]);
        },
        sendMessage: async (msg: string): Promise<void> => {
          setInput(msg);
          await new Promise((resolve) => setTimeout(resolve, 200));
          await handleSend(msg);
        },
        setInputValue: (msg: string) => setInput(msg),
        focusInput: () => textareaRef.current?.focus(),
        clickSend: async (): Promise<void> => {
          await new Promise((resolve) => setTimeout(resolve, 200));
          await handleSend();
        },
      }),
      [handleSend]
    );

    // UX: focus input on mount
    useEffect(() => {
      textareaRef.current?.focus();
    }, []);

    // Always keep scroller pinned to bottom when messages change
    useEffect(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, [messages]);

    const canSend = useMemo(
      () => !loading && input.trim().length > 0,
      [loading, input]
    );

    /**
     * Unified send routine.
     * - If `msg` is provided, it is sent as-is and the input draft is preserved.
     * - If `msg` is omitted, it uses the current input value and clears the input.
     */

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
                    content="Controls randomness. Lower values are deterministic, higher values increase variance."
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
                    content="Keeps the smallest set of tokens with cumulative probability p."
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
                onClick={() => handleSend()}
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
);

ChatPanel.displayName = 'ChatPanel';
export default ChatPanel;
