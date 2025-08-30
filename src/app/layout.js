import Navigation from '@/components/Navigation';
import "./globals.css";

export const metadata = {
  title: "Social Media Analyzer - AI-Powered Social Content Analysis",
  description: "Transform your social media content into actionable insights with AI technology. Upload screenshots, analyze trends, and get detailed social media analytics in seconds.",
  keywords: "social media analysis, AI content analysis, sentiment analysis, social media insights, trend analysis",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="theme-color" content="#2563eb" />
      </head>
      <body>
        <Navigation />
        <main className="main-content">
          {children}
        </main>
      </body>
    </html>
  );
}
