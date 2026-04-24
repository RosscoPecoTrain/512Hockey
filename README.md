# 512 Hockey - Austin Hockey Community Platform

Welcome to 512 Hockey! This is a modern web application designed to connect hockey enthusiasts in Austin. Built with Next.js 14, TypeScript, Tailwind CSS, and Supabase.

## 🎯 Project Overview

512 Hockey is a community-driven platform that enables Austin hockey players to:
- Connect with other players through a player directory
- Find and book ice time at local rinks
- Participate in a community forum
- Send direct messages to other players
- Manage their player profiles
- Support the community through donations

## 🏗️ Tech Stack

- **Frontend Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Backend/Database:** Supabase (PostgreSQL, Auth, Real-time)
- **Authentication:** OAuth 2.0 (Google, Apple via Supabase)
- **Payments:** Stripe (placeholder, ready to integrate)

## 📋 Project Structure

```
512hockey/
├── app/
│   ├── auth/
│   │   ├── signin/page.tsx          # OAuth sign-in page
│   │   └── callback/page.tsx        # OAuth callback handler
│   ├── directory/page.tsx           # Player directory with search/filter
│   ├── messages/page.tsx            # Direct messaging interface
│   ├── forum/page.tsx               # Community forum
│   ├── rinks/page.tsx               # Rink finder with local data
│   ├── donate/page.tsx              # Donation page (Stripe ready)
│   ├── admin/page.tsx               # Admin moderation panel
│   ├── profile/
│   │   ├── page.tsx                 # User's profile edit page
│   │   └── [id]/page.tsx            # Public player profile view
│   ├── layout.tsx                   # Root layout with Navbar/Footer
│   ├── page.tsx                     # Homepage
│   └── globals.css                  # Global styles
│
├── components/
│   ├── Navbar.tsx                   # Navigation component
│   ├── Footer.tsx                   # Footer component
│   └── AuthButton.tsx               # Auth state button
│
├── lib/
│   └── supabase.ts                  # Supabase client setup
│
├── types/
│   └── index.ts                     # TypeScript type definitions
│
├── supabase/
│   └── schema.sql                   # Database schema with seeded rinks
│
├── middleware.ts                    # Next.js middleware for protected routes
├── tsconfig.json                    # TypeScript configuration
├── tailwind.config.ts               # Tailwind CSS configuration
├── next.config.ts                   # Next.js configuration
├── .env.local.example               # Environment variables template
└── README.md                        # This file
```

## 🎨 Design System

**Color Scheme:**
- Primary Dark: `#0a1628` (Navy)
- Ice Blue: `#4fc3f7` (Accent)
- White: `#ffffff` (Text/Light)

**Typography:**
- Headings: Bold, clear hierarchy
- Body: Clean, readable
- Responsive design: Mobile-first

## 🚀 Getting Started

### Prerequisites

- Node.js 18.17+ (with npm or yarn)
- Supabase account ([supabase.com](https://supabase.com))
- Google/Apple OAuth credentials (optional, for full auth)

### Installation

1. **Clone and Navigate:**
```bash
cd 512hockey
npm install
```

2. **Set Up Supabase:**

   a. Create a new Supabase project at [supabase.com](https://supabase.com)
   
   b. In your Supabase project dashboard:
      - Go to SQL Editor
      - Create a new query
      - Copy and paste the contents of `supabase/schema.sql`
      - Run the query (this creates tables and seeds rink data)
   
   c. Enable OAuth providers:
      - Authentication → Providers
      - Enable "Google" and "Apple"
      - Add your OAuth credentials

3. **Configure Environment Variables:**

   a. Copy the template:
   ```bash
   cp .env.local.example .env.local
   ```
   
   b. Fill in your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```
   
   c. Get these from your Supabase project:
      - Project Settings → API
      - Copy the Project URL and anon key

4. **Run Development Server:**
```bash
npm run dev
```

The app will be available at `http://localhost:3000`

## 📱 Features

### ✅ Implemented (Phase 1)

- **Authentication:** Google & Apple OAuth via Supabase
- **Player Directory:** Browse and search players by name, position, skill level
- **Player Profiles:** View full profiles, message other players
- **Rinks:** Directory of Austin rinks with booking links (static data seeded)
- **Forum:** Community discussion threads with first-post moderation
- **Messaging:** Direct messages between logged-in players
- **Admin Panel:** Approve/reject forum posts in moderation queue
- **Donations:** Stripe-ready donation page
- **Responsive Design:** Mobile-first, works on all devices

### 🔮 Future Features (Phase 2+)

- Real-time messaging with presence indicators
- Game scheduling and RSVP system
- Player statistics and game history
- Integration with Stripe for donations
- Email notifications
- Team management
- League standings
- Advanced forum features (upvotes, pins, user badges)

## 🔐 Security Notes

- **Private Data:** Phone numbers are stored but never displayed publicly
- **Database:** Use Supabase's Row Level Security (RLS) policies in production
- **API Keys:** Never commit `.env.local` to version control
- **Middleware:** Protected routes redirect to sign-in if not authenticated (client-side)

## 📊 Database Schema

### Tables Created:

- **profiles:** Player information and preferences
- **messages:** Direct messages between players
- **forum_posts:** Forum discussion threads
- **forum_replies:** Replies to forum posts
- **rinks:** Ice rink locations and booking info

See `supabase/schema.sql` for full schema with relationships and indexes.

## 🧪 Development

### Running Tests
```bash
npm run test
```

### Building for Production
```bash
npm run build
npm start
```

### Code Format
```bash
npm run lint
```

## 🚢 Deployment

### Deploy to Vercel (Recommended)

1. Push code to GitHub
2. Connect repo to Vercel
3. Add environment variables in Vercel settings
4. Vercel automatically deploys on push

### Deploy to Other Platforms

Ensure the following are set:
- Node.js version: 18.17+
- Build command: `npm run build`
- Start command: `npm start`
- Environment variables configured

## 🤝 Contributing

Contributions are welcome! Please:

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see LICENSE file for details.

## 🆘 Support & Community

- **Issues:** Report bugs on GitHub Issues
- **Discussions:** Ask questions in GitHub Discussions
- **Email:** contact@512hockey.com (placeholder)

## 🎉 Credits

Built with ❤️ for Austin's hockey community.

---

**Happy coding, and go Sharks! 🏒**

## 📚 Useful Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
