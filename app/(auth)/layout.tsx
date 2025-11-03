// Auth layout - middleware handles all auth redirects
// We don't need to check auth here as it's already handled in middleware.ts
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
