export const metadata = {
  title: 'IA Chat Frontend',
  description: 'Left chat + right live HTML preview',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
