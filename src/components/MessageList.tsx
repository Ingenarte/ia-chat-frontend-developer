'use client';

type ChatMsg = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
};

export function MessageList({ messages }: { messages: ChatMsg[] }) {
  return (
    <div
      style={{
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      {messages.map((m) => (
        <div
          key={m.id}
          style={{
            alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '92%',
            background:
              m.role === 'user'
                ? 'linear-gradient(180deg,#1b2735,#10151b)'
                : '#0d131a',
            border: '1px solid #1f2933',
            color: '#dbe3ec',
            padding: '10px 12px',
            borderRadius: 10,
            boxShadow: '0 8px 20px rgba(0,0,0,0.35)',
            whiteSpace: 'pre-wrap',
          }}
        >
          {m.text}
        </div>
      ))}
    </div>
  );
}
