/**
 * Database Seeding Script
 * 
 * This script generates realistic mock data for the SupportAI application.
 * It uses real users from Supabase auth and creates tickets, messages, reviews, etc.
 * 
 * Usage:
 *   pnpm seed
 *   or
 *   pnpm tsx scripts/seed-database.ts
 * 
 * Make sure your .env.local file has:
 *   NEXT_PUBLIC_SUPABASE_URL=...
 *   SUPABASE_SERVICE_ROLE_KEY=...
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { join } from "path";

// Load .env.local if it exists
try {
  const envPath = join(process.cwd(), ".env.local");
  const envFile = readFileSync(envPath, "utf-8");
  envFile.split("\n").forEach((line) => {
    const [key, ...valueParts] = line.split("=");
    if (key && valueParts.length > 0) {
      const value = valueParts.join("=").trim().replace(/^["']|["']$/g, "");
      if (!process.env[key.trim()]) {
        process.env[key.trim()] = value;
      }
    }
  });
} catch (error) {
  // .env.local not found, that's okay - user might have env vars set differently
}

// Configuration - these should match your .env.local
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Error: Missing environment variables!");
  console.error("Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Mock data templates
const CUSTOMER_NAMES = [
  { first: "Sarah", last: "Johnson", email: "sarah.johnson@example.com" },
  { first: "Michael", last: "Chen", email: "michael.chen@example.com" },
  { first: "Emily", last: "Rodriguez", email: "emily.rodriguez@example.com" },
  { first: "David", last: "Thompson", email: "david.thompson@example.com" },
  { first: "Jessica", last: "Williams", email: "jessica.williams@example.com" },
  { first: "James", last: "Anderson", email: "james.anderson@example.com" },
  { first: "Lisa", last: "Martinez", email: "lisa.martinez@example.com" },
  { first: "Robert", last: "Taylor", email: "robert.taylor@example.com" },
  { first: "Amanda", last: "Brown", email: "amanda.brown@example.com" },
  { first: "Christopher", last: "Davis", email: "christopher.davis@example.com" },
];

const TICKET_SUBJECTS = [
  "Unable to log into my account",
  "Payment not processing correctly",
  "Feature request: Dark mode support",
  "Bug: App crashes on iOS",
  "Question about subscription pricing",
  "Need help with API integration",
  "Account deletion request",
  "Forgot password - email not received",
  "Report: Incorrect data in dashboard",
  "Request: Export data functionality",
  "Issue: Slow loading times",
  "Question: How to cancel subscription?",
  "Bug: Notification not appearing",
  "Feature request: Mobile app",
  "Unable to upload files",
];

const TICKET_MESSAGES = {
  "Unable to log into my account": [
    "Hi, I'm having trouble logging into my account. I've tried resetting my password but haven't received the email.",
    "I've checked my spam folder and nothing is there. Can you help me regain access?",
  ],
  "Payment not processing correctly": [
    "My payment was charged twice for the same subscription. Can you please refund the duplicate charge?",
    "I've attached the transaction IDs from my bank statement for reference.",
  ],
  "Feature request: Dark mode support": [
    "I love using your product, but I wish there was a dark mode option. It would be great for late-night use!",
    "Would you consider adding this in a future update?",
  ],
  "Bug: App crashes on iOS": [
    "The app keeps crashing when I try to open the settings page on my iPhone 13 running iOS 17.",
    "It happens every time I tap the settings icon. Here's a screenshot of the error.",
  ],
  "Question about subscription pricing": [
    "I'm interested in upgrading to the Pro plan. What features are included?",
    "Also, is there a discount for annual billing?",
  ],
  "Need help with API integration": [
    "I'm trying to integrate your API into my application but keep getting authentication errors.",
    "I've followed the documentation but something seems off. Can you provide an example?",
  ],
  "Account deletion request": [
    "I would like to delete my account and all associated data. Please confirm this will be done within 30 days as per your privacy policy.",
  ],
  "Forgot password - email not received": [
    "I clicked 'forgot password' but haven't received the reset email. I've checked spam as well.",
  ],
  "Report: Incorrect data in dashboard": [
    "The analytics dashboard is showing incorrect numbers. Yesterday's stats don't match what I recorded manually.",
  ],
  "Request: Export data functionality": [
    "I'd like to export all my data in CSV format. Is this feature available?",
  ],
  "Issue: Slow loading times": [
    "The application has been very slow lately, especially when loading reports. It takes 30+ seconds sometimes.",
  ],
  "Question: How to cancel subscription?": [
    "I need to cancel my subscription. Can you guide me through the process?",
  ],
  "Bug: Notification not appearing": [
    "I'm not receiving push notifications even though they're enabled in my settings.",
  ],
  "Feature request: Mobile app": [
    "Do you have plans to release a mobile app? The web version works but a native app would be amazing!",
  ],
  "Unable to upload files": [
    "I'm trying to upload a CSV file but keep getting an error message saying 'File too large' even though it's only 2MB.",
  ],
};

const AI_RESPONSES = [
  "I understand your concern. Let me help you with that right away.",
  "Thanks for reaching out! I can definitely assist you with this issue.",
  "I apologize for the inconvenience. Let me look into this for you.",
  "That's a great question! Here's what I can tell you about that.",
  "I see what you're experiencing. Let me provide some guidance on this.",
  "Thanks for reporting this! I'll make sure this gets the attention it needs.",
  "I appreciate you bringing this to our attention. Let me help resolve this.",
];

const AGENT_RESPONSES = [
  "I've reviewed your case and I can help you with this. Here's what we can do...",
  "Thank you for your patience. I've investigated the issue and found that...",
  "I understand your frustration. I've escalated this to our technical team and they're working on it.",
  "I've processed your refund request. You should see the credit in 3-5 business days.",
  "I've reset your account access. Please try logging in again with your new password.",
];

const REVIEW_COMMENTS = {
  customer: [
    "Great support, issue resolved quickly!",
    "Very helpful and responsive team.",
    "Solved my problem in minutes. Thank you!",
    "Could have been faster, but the solution worked.",
    "The AI assistant was helpful but needed human intervention for my complex issue.",
  ],
  admin: [
    "Standard technical issue, resolved efficiently.",
    "Customer was satisfied with the resolution.",
    "Required escalation to technical team.",
    "Payment issue resolved, customer happy.",
    "Feature request logged for product team review.",
  ],
};

const TAGS = [
  "billing",
  "technical",
  "feature-request",
  "bug",
  "account",
  "api",
  "performance",
  "ui/ux",
  "mobile",
  "security",
];

const LANGUAGES = ["English", "Spanish", "French", "German", "Arabic"];

// Helper functions
function randomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDateInPast(daysAgo: number): Date {
  const now = new Date();
  const past = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
  return new Date(past.getTime() + Math.random() * (now.getTime() - past.getTime()));
}

function randomDateBetween(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

async function getRandomUser(): Promise<string | null> {
  const { data: users, error } = await supabase.auth.admin.listUsers();
  
  if (error || !users || users.users.length === 0) {
    console.warn("Warning: No users found in auth. Using null for assignee_id.");
    return null;
  }
  
  return randomElement(users.users).id;
}

async function seedDatabase() {
  console.log("🌱 Starting database seeding...\n");

  // Get users for assignments
  console.log("📋 Fetching users from auth...");
  const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
  
  if (usersError) {
    console.error("Error fetching users:", usersError);
    process.exit(1);
  }

  if (!users || users.users.length === 0) {
    console.error("❌ No users found in Supabase auth. Please create at least one user first.");
    process.exit(1);
  }

  console.log(`✅ Found ${users.users.length} user(s)\n`);

  // Create business settings for each user
  console.log("⚙️  Creating business settings...");
  for (const user of users.users) {
    const { error } = await supabase
      .from("business_settings")
      .upsert({
        owner_user_id: user.id,
        business_name: `${user.user_metadata?.full_name || user.email?.split("@")[0] || "Company"}'s Business`,
        primary_language: randomElement(LANGUAGES),
        ai_tone: randomElement(["friendly", "professional", "formal", "casual"]),
        business_context: "We are a SaaS company providing customer support solutions. Our product helps businesses automate their support workflows and improve customer satisfaction.",
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "owner_user_id",
      });

    if (error) {
      console.error(`Error creating business settings for user ${user.id}:`, error);
    }
  }
  console.log("✅ Business settings created\n");

  // Create tickets
  console.log("🎫 Creating tickets...");
  const tickets = [];
  const ticketCount = 30; // Adjust this number as needed

  for (let i = 0; i < ticketCount; i++) {
    const subject = randomElement(TICKET_SUBJECTS);
    const customer = randomElement(CUSTOMER_NAMES);
    const createdAt = randomDateInPast(30); // Last 30 days
    const status = randomElement(["open", "needs_human_assistance", "closed", "ai_resolved"]);
    const assigneeId = status === "closed" || status === "needs_human_assistance" 
      ? await getRandomUser() 
      : null;
    
    const { data: ticket, error: ticketError } = await supabase
      .from("tickets")
      .insert({
        subject,
        status,
        created_at: createdAt.toISOString(),
        customer_first_name: customer.first,
        customer_last_name: customer.last,
        customer_email: customer.email,
        assignee_id: assigneeId,
        language: randomElement(LANGUAGES),
        tags: [randomElement(TAGS), ...(Math.random() > 0.7 ? [randomElement(TAGS)] : [])],
        ai_token_usage: randomInt(500, 5000),
      })
      .select()
      .single();

    if (ticketError) {
      console.error(`Error creating ticket ${i + 1}:`, ticketError);
      continue;
    }

    tickets.push(ticket);

    // Create initial status
    await supabase.from("ticket_statuses").insert({
      ticket_id: ticket.id,
      status: "open",
      created_at: createdAt.toISOString(),
    });

    // Create messages
    const customerMessages = TICKET_MESSAGES[subject as keyof typeof TICKET_MESSAGES] || [
      "Hello, I need help with this issue.",
    ];

    let messageTime = new Date(createdAt);

    // Customer messages
    for (const messageText of customerMessages) {
      await supabase.from("messages").insert({
        ticket_id: ticket.id,
        sender: "customer",
        text: messageText,
        created_at: messageTime.toISOString(),
      });

      // Audit log for customer message
      await supabase.from("audit_logs").insert({
        ticket_id: ticket.id,
        action_type: "customer_message",
        actor_type: "customer",
        details: { message: messageText },
        created_at: messageTime.toISOString(),
      });

      messageTime = new Date(messageTime.getTime() + randomInt(5, 30) * 60 * 1000); // 5-30 min later
    }

    // AI responses (if not immediately closed)
    if (status !== "closed") {
      const aiResponseCount = randomInt(2, 5);
      for (let j = 0; j < aiResponseCount; j++) {
        const aiResponse = randomElement(AI_RESPONSES);
        await supabase.from("messages").insert({
          ticket_id: ticket.id,
          sender: "ai",
          text: aiResponse,
          created_at: messageTime.toISOString(),
        });

        // Audit log for AI response
        const tokens = randomInt(100, 500);
        await supabase.from("audit_logs").insert({
          ticket_id: ticket.id,
          action_type: "ai_response",
          actor_type: "ai",
          details: {
            message: aiResponse,
            prompt_tokens: Math.floor(tokens * 0.7),
            completion_tokens: Math.floor(tokens * 0.3),
            total_tokens: tokens,
          },
          created_at: messageTime.toISOString(),
        });

        messageTime = new Date(messageTime.getTime() + randomInt(2, 15) * 60 * 1000); // 2-15 min later
      }

      // Status change to needs_human_assistance (if applicable)
      if (status === "needs_human_assistance" || status === "closed") {
        const humanAssistanceTime = new Date(messageTime);
        await supabase.from("ticket_statuses").insert({
          ticket_id: ticket.id,
          status: "needs_human_assistance",
          created_at: humanAssistanceTime.toISOString(),
        });

        // Agent response
        const agentResponse = randomElement(AGENT_RESPONSES);
        const agentId = await getRandomUser();
        await supabase.from("messages").insert({
          ticket_id: ticket.id,
          sender: "agent",
          text: agentResponse,
          created_at: humanAssistanceTime.toISOString(),
        });

        // Audit log for agent response
        await supabase.from("audit_logs").insert({
          ticket_id: ticket.id,
          action_type: "agent_response",
          actor_type: "agent",
          actor_id: agentId,
          details: { message: agentResponse },
          created_at: humanAssistanceTime.toISOString(),
        });

        messageTime = new Date(humanAssistanceTime.getTime() + randomInt(10, 60) * 60 * 1000);
      }
    }

    // Final status (if closed or ai_resolved)
    if (status === "closed" || status === "ai_resolved") {
      await supabase.from("ticket_statuses").insert({
        ticket_id: ticket.id,
        status,
        created_at: messageTime.toISOString(),
      });

      // Update ticket summary
      await supabase
        .from("tickets")
        .update({
          summary: `Customer ${customer.first} ${customer.last} reported: ${subject}. Issue was ${status === "ai_resolved" ? "resolved by AI" : "resolved by agent"}.`,
        })
        .eq("id", ticket.id);

      // Create reviews (70% chance)
      if (Math.random() > 0.3) {
        // Customer review
        await supabase.from("ticket_reviews").insert({
          ticket_id: ticket.id,
          reviewer_type: "customer",
          rating: randomInt(3, 5), // Mostly positive
          comment: randomElement(REVIEW_COMMENTS.customer),
          created_at: new Date(messageTime.getTime() + randomInt(1, 24) * 60 * 60 * 1000).toISOString(),
        });

        // Admin review (50% chance)
        if (Math.random() > 0.5 && assigneeId) {
          await supabase.from("ticket_reviews").insert({
            ticket_id: ticket.id,
            reviewer_type: "admin",
            reviewer_id: assigneeId,
            rating: randomInt(4, 5),
            comment: randomElement(REVIEW_COMMENTS.admin),
            created_at: new Date(messageTime.getTime() + randomInt(1, 48) * 60 * 60 * 1000).toISOString(),
          });
        }
      }

      // Audit log for ticket closure
      await supabase.from("audit_logs").insert({
        ticket_id: ticket.id,
        action_type: "ticket_closed",
        actor_type: status === "ai_resolved" ? "ai" : "agent",
        actor_id: assigneeId,
        details: { status, resolution: status === "ai_resolved" ? "AI resolved" : "Agent resolved" },
        created_at: messageTime.toISOString(),
      });
    }

    // Update ticket status
    await supabase
      .from("tickets")
      .update({ status })
      .eq("id", ticket.id);

    if ((i + 1) % 10 === 0) {
      console.log(`  ✅ Created ${i + 1}/${ticketCount} tickets...`);
    }
  }

  console.log(`✅ Created ${tickets.length} tickets with messages, statuses, and reviews\n`);

  // Create product insights (optional)
  console.log("📊 Creating product insights...");
  const { error: insightsError } = await supabase.from("product_insights").insert({
    summary: "Analysis of customer support tickets reveals that payment issues and account access problems are the most common concerns. Customers appreciate quick AI responses but often need human intervention for complex billing inquiries. Feature requests for dark mode and mobile app are trending.",
    recurring_issues: [
      "Payment processing errors and duplicate charges",
      "Account login and password reset issues",
      "Slow application performance during peak hours",
      "File upload size limitations causing confusion",
      "Notification delivery problems",
    ],
    requested_features: [
      "Dark mode theme option",
      "Native mobile applications (iOS and Android)",
      "CSV data export functionality",
      "Enhanced API documentation with code examples",
      "Bulk operations for ticket management",
    ],
    created_at: new Date().toISOString(),
  });

  if (insightsError) {
    console.error("Error creating product insights:", insightsError);
  } else {
    console.log("✅ Product insights created\n");
  }

  console.log("🎉 Database seeding completed successfully!");
  console.log(`\n📈 Summary:`);
  console.log(`   - Tickets created: ${tickets.length}`);
  console.log(`   - Users: ${users.users.length}`);
  console.log(`   - Business settings: ${users.users.length}`);
}

// Run the seeding
seedDatabase()
  .then(() => {
    console.log("\n✨ All done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Error seeding database:", error);
    process.exit(1);
  });

