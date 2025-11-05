"use client";

import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

// Auth layout - middleware handles all auth redirects
// We don't need to check auth here as it's already handled in middleware.ts
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  
  // Define page headers
  const pageHeaders: Record<string, { title: string; description: string }> = {
    "/dashboard": {
      title: "Support Dashboard",
      description: "Manage customer support tickets and conversations",
    },
    "/admin": {
      title: "Admin & Analytics Dashboard",
      description: "Comprehensive insights and ticket management",
    },
    "/insights": {
      title: "Product Insights",
      description: "AI-generated insights from resolved tickets",
    },
    "/settings": {
      title: "Business Settings",
      description: "Configure how your AI assistant interacts with customers",
    },
  };

  const currentHeader = pageHeaders[pathname] || { title: "", description: "" };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-4 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <AnimatePresence mode="wait">
            {currentHeader.title && (
              <motion.div
                key={pathname}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="flex flex-col"
              >
                <motion.h1
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  transition={{ duration: 0.2, delay: 0.05, ease: "easeInOut" }}
                  className="text-lg font-semibold leading-none"
                >
                  {currentHeader.title}
                </motion.h1>
                {currentHeader.description && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    transition={{ duration: 0.2, delay: 0.1, ease: "easeInOut" }}
                    className="text-sm text-muted-foreground mt-1"
                  >
                    {currentHeader.description}
                  </motion.p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0 overflow-y-auto">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
