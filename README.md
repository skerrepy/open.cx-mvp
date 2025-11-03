# SupportAI

An AI-powered customer support platform with an embeddable chat widget, ticketing dashboard, and real-time messaging capabilities.

## Features

- 🤖 **AI-Powered Chat**: GPT-4o-mini powered support assistant
- 💬 **Embeddable Widget**: Easy-to-integrate chat widget for your website
- 🎫 **Ticket Management**: Full-featured dashboard for support agents
- ⚡ **Real-Time Messaging**: Supabase Realtime for live conversations
- 🔐 **Authentication**: Supabase Auth for secure agent access
- 📊 **PostgreSQL Database**: Supabase PostgreSQL with real-time subscriptions
- 🚀 **React Query**: Optimistic updates and smart caching
- 🎨 **UI Components**: shadcn/ui with Framer Motion animations

## Tech Stack

- **Frontend**: Next.js 14+ (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Supabase PostgreSQL
- **Real-Time**: Supabase Realtime Subscriptions
- **Auth**: Supabase Auth
- **State Management**: React Query (TanStack Query)
- **AI**: OpenAI API (GPT-4o-mini)
- **Deployment**: Vercel (Full-stack)

## Getting Started

### Prerequisites

- Node.js 18+ and pnpm installed
- Supabase account and project
- OpenAI API key

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd support-ai
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up Supabase**
   
   Create a new Supabase project at https://supabase.com and run the following SQL in the SQL Editor:

   ```sql
   -- Create tickets table
   CREATE TABLE tickets (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     subject TEXT,
     status TEXT DEFAULT 'open',
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     customer_id UUID,
     assignee_id UUID
   );

   -- Create messages table
   CREATE TABLE messages (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
     sender TEXT NOT NULL,
     text TEXT NOT NULL,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- Enable Row Level Security
   ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
   ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

   -- Create policies (adjust based on your auth requirements)
   -- Allow anonymous reads and writes for tickets/messages
   CREATE POLICY "Allow public read access" ON tickets FOR SELECT USING (true);
   CREATE POLICY "Allow public insert" ON tickets FOR INSERT WITH CHECK (true);
   CREATE POLICY "Allow public update" ON tickets FOR UPDATE USING (true);

   CREATE POLICY "Allow public read access" ON messages FOR SELECT USING (true);
   CREATE POLICY "Allow public insert" ON messages FOR INSERT WITH CHECK (true);

   -- Enable Realtime for messages
   ALTER PUBLICATION supabase_realtime ADD TABLE messages;
   ALTER PUBLICATION supabase_realtime ADD TABLE tickets;
   ```

4. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` and add your:
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon/public key
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `NEXT_PUBLIC_BASE_URL`: Your app URL (e.g., `http://localhost:3000`)

5. **Start the development server**
   ```bash
   pnpm dev
   ```

6. **Open your browser**
   - Main app: http://localhost:3000
   - Login: http://localhost:3000/login
   - Register: http://localhost:3000/register
   - Dashboard: http://localhost:3000/dashboard (requires auth)
   - Widget preview: http://localhost:3000/widget

## Authentication

The dashboard is protected by Supabase Auth. To access it:

1. Visit http://localhost:3000/register to create a new account
2. Or visit http://localhost:3000/login to sign in with an existing account
3. After authentication, you'll be redirected to the dashboard

For production, configure email templates and auth providers in your Supabase dashboard.

## Embedding the Widget

### Option 1: Using the embed.js script

Add this script tag to your HTML:

```html
<script src="https://yourapp.vercel.app/embed.js"></script>
```

Or customize the widget URL:

```html
<script>
  window.SUPPORT_AI_URL = "https://yourapp.vercel.app/widget";
</script>
<script src="https://yourapp.vercel.app/embed.js"></script>
```

### Option 2: Direct iframe integration

```html
<iframe 
  src="https://yourapp.vercel.app/widget"
  style="width: 400px; height: 600px; border: none; border-radius: 16px;"
  allowtransparency="true">
</iframe>
```

## Testing the Flow

### 1. Customer Chat → AI Response

1. Visit http://localhost:3000/widget
2. Type a message (e.g., "How do I reset my password?")
3. The AI assistant will respond automatically via OpenAI
4. Messages are saved to Supabase and update in real-time

### 2. Request Human Support

1. After starting a conversation, click "Request human support"
2. The ticket status updates and is visible in the dashboard

### 3. Agent Response

1. Log in at http://localhost:3000/login
2. Go to http://localhost:3000/dashboard
3. Click on a ticket to view the conversation
4. Respond as an agent - messages sync in real-time via Supabase Realtime

## Project Structure

```
support-ai/
├── app/                      # Next.js App Router
│   ├── (auth)/              # Protected route group
│   │   └── dashboard/       # Dashboard routes (requires auth)
│   │       ├── page.tsx     # Tickets list
│   │       └── tickets/[id]/ # Individual ticket view
│   ├── widget/              # Widget route
│   │   └── page.tsx         # Embeddable widget UI
│   ├── login/               # Login page
│   │   └── page.tsx
│   ├── api/                 # API routes
│   │   ├── tickets/         # Ticket CRUD
│   │   ├── tickets/[id]/messages/  # Message endpoints
│   │   └── ai/reply/        # AI proxy endpoint
│   ├── layout.tsx           # Root layout with QueryProvider
│   └── page.tsx             # Home page
├── components/
│   ├── ui/                  # shadcn/ui components
│   ├── providers/           # React Query provider
│   ├── widget/              # Widget components
│   └── dashboard/           # Dashboard components
├── lib/
│   ├── supabaseClient.ts    # Supabase client (client-side)
│   ├── supabaseServer.ts    # Supabase client (server-side)
│   ├── utils.ts             # Utility functions (cn helper)
│   └── hooks/               # React Query hooks
│       ├── useTickets.ts    # Ticket queries
│       ├── useMessages.ts   # Message queries & mutations
│       └── useRealtimeMessages.ts # Realtime subscriptions
├── middleware.ts            # Auth middleware
└── README.md
```

## API Endpoints

### Tickets

- `GET /api/tickets` - List all tickets
- `POST /api/tickets` - Create a new ticket
- `GET /api/tickets/[id]` - Get ticket details
- `POST /api/tickets/[id]/messages` - Add message to ticket

### AI

- `POST /api/ai/reply` - Generate AI response
  - Body: `{ ticketId?: string, messages: Array<{ role: string, content: string }> }`
  - Returns: `{ reply: string, text: string }`

## Database Schema (Supabase)

### tickets

- `id` (UUID, primary key)
- `subject` (TEXT, nullable)
- `status` (TEXT, default: "open")
- `created_at` (TIMESTAMP)
- `customer_id` (UUID, nullable)
- `assignee_id` (UUID, nullable)

### messages

- `id` (UUID, primary key)
- `ticket_id` (UUID, foreign key → tickets.id)
- `sender` (TEXT: "customer", "agent", "ai")
- `text` (TEXT)
- `created_at` (TIMESTAMP)

## Real-Time Features

This project uses Supabase Realtime for live updates:

- **Message Updates**: New messages appear instantly in both widget and dashboard
- **Ticket Updates**: Ticket status changes propagate in real-time
- **Optimistic Updates**: React Query provides instant UI feedback before server confirmation

Real-time subscriptions are handled via:
- `useRealtimeMessages(ticketId)` - Subscribe to messages for a specific ticket
- `useRealtimeTickets()` - Subscribe to ticket list updates

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `OPENAI_API_KEY`
   - `NEXT_PUBLIC_BASE_URL` (your Vercel deployment URL)
4. Deploy!

### Environment Variables for Production

Make sure to set these in your deployment platform:

- `NEXT_PUBLIC_SUPABASE_URL` (from Supabase dashboard)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (from Supabase dashboard)
- `OPENAI_API_KEY`
- `NEXT_PUBLIC_BASE_URL` (your production URL)

## Development Commands

```bash
pnpm dev              # Start development server
pnpm build            # Build for production
pnpm start            # Start production server
pnpm lint             # Run linter
```

## React Query Features

- **Automatic Caching**: Query results are cached and reused
- **Optimistic Updates**: UI updates instantly on mutations
- **Background Refetching**: Data stays fresh automatically
- **Error Handling**: Built-in error states and retry logic

## License

MIT

## Support

For issues and questions, please open an issue on GitHub.
