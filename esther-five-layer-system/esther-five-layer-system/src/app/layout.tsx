export const metadata = {
  title: "Esther Five-Layer System",
  description: "Twilio + OpenAI + Supabase memory system",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
