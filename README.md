# 🚀 AI HTML Generator Frontend

This repository contains a **Next.js application** that connects to an AI backend for generating complete HTML5 pages from natural language prompts.  
It provides a **chat-driven interface**, secure HTML preview, and example prompts to inspire users.

---

## ✨ Features

- **Chat-based interface** with persistent history.
- **Prompt-to-HTML rendering** with safe iframe sandboxing.
- **Example prompts** (Portfolio, Friends Fan Page, Blog) for quick testing.
- **Preview panel** with modal-based examples and streaming job status.
- **Safe rendering**:
  - All `<a>` links open in a new tab or are disabled.
  - Buttons inside generated HTML only open/close modals, never redirect.
- **Configurable API endpoint** via environment variables (`.env.local`).

---

## 🛠️ Tech Stack

- [Next.js 14](https://nextjs.org/) (App Router)
- [React 18](https://react.dev/)
- TypeScript
- CSS Modules
- Cloudflare Tunnel (optional for backend exposure)

---

## 📂 Project Structure

```
src/
 ├─ components/
 │   ├─ ChatPanel.tsx        # Chat input + message list
 │   ├─ PreviewPane.tsx      # Safe iframe preview + modals
 │   ├─ PreviewModal.tsx     # Status modal (pairing/generating/done)
 │   └─ MessageList.tsx      # User & AI message rendering
 ├─ app/
 │   ├─ page.tsx             # Main entry point
 │   └─ globals.css          # Global styles
 └─ types/
     └─ api.ts               # Shared API request/response types
```

---

## ⚙️ Setup & Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/YOUR_USERNAME/ai-html-generator.git
   cd ai-html-generator
   ```

2. Install dependencies:

   ```bash
   npm install
   # or
   yarn install
   ```

3. Create a `.env.local` file:

   ```env
   NEXT_PUBLIC_AI_API_BASE=http://localhost:8000/api/ai
   ```

4. Run the development server:

   ```bash
   npm run dev
   ```

5. Open your browser at [http://localhost:3000](http://localhost:3000).

---

## 🚀 Deployment

### Vercel

This project is fully compatible with **Vercel**:

```bash
npm run build
npm run start
```

Push to GitHub, then import the repository into Vercel.

### Cloudflare Subdomain

If you want to expose the backend via Cloudflare Tunnel:

```bash
cloudflared tunnel --config ./config.yml run
```

Then point a subdomain (`ai.yourdomain.com`) to the tunnel.

---

## 🔒 Security Notes

- `.env.local` is ignored by Git (`.env.example` should be provided for reference).
- All untrusted HTML is sandboxed inside an `<iframe>` with sanitized links/buttons.
- No inline script execution is allowed in generated HTML.

---

## 📸 Screenshots

_(Add here preview images or GIFs of your app in action)_

---

## 📜 License

MIT License © 2025 Franco Mariano Rodrigo

---

## 👨‍💻 Author

**Franco Mariano Rodrigo**

- 🌐 [ingenarte.com](https://ingenarte.com)
- 💼 [LinkedIn](https://linkedin.com/in/fmrodrigo)
- 🛠️ Engineer | Fullstack | AI Integration | Frontend Specialist
