import { createAdminClient } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { userIds } = await req.json();

    if (!userIds || !Array.isArray(userIds)) {
      return NextResponse.json(
        { error: "userIds array is required" },
        { status: 400 }
      );
    }

    // Use admin client to query auth.users (only if available)
    const adminClient = createAdminClient();
    const userInfoMap: Record<string, { email?: string; name?: string }> = {};

    if (adminClient) {
      // Fetch user info for each user ID
      for (const userId of userIds) {
        try {
          const { data: user, error } = await adminClient.auth.admin.getUserById(userId);
          if (!error && user?.user) {
            const email = user.user.email || "";
            const fullName = user.user.user_metadata?.full_name || 
                            user.user.user_metadata?.name || 
                            email.split("@")[0] || 
                            "";
            userInfoMap[userId] = {
              email: email,
              name: fullName,
            };
          }
        } catch (error) {
          console.error(`Error fetching user info for ${userId}:`, error);
          // Continue with other users even if one fails
        }
      }
    }

    return NextResponse.json({ users: userInfoMap });
  } catch (error) {
    console.error("Error fetching user info:", error);
    return NextResponse.json(
      { error: "Failed to fetch user info" },
      { status: 500 }
    );
  }
}

