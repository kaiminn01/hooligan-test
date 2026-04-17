export const metadata = { title: 'Google Ads Generator v2' };
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#f5f5f5', fontFamily: 'system-ui, sans-serif' }}>{children}</body>
    </html>
  );
}
