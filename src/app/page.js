import Link from 'next/link';
import Button from '@/components/Button';
import UploadArea from '@/components/UploadArea';

export default function HomePage() {
  return (
    <div className="homepage">
      <section className="hero-section">
        <div className="container">
          <div className="hero-content">
            <h1 className="hero-title">
              Transform Social Media into 
              <span className="hero-accent"> Smart Analytics</span>
            </h1>
            <p className="hero-description">
              Harness the power of AI to analyze social media content and trends. 
              Upload screenshots or text from social platforms and get deep insights in seconds.
            </p>
            
            <div className="hero-upload-section">
              <UploadArea variant="compact" />
              <div className="upload-divider">
                <span>or</span>
              </div>
              <div className="hero-actions">
                <Link href="/summarize">
                  <Button size="large" variant="outline">
                    View Examples
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      <section className="features-section">
        <div className="container">
          <h2 className="section-title">Why Choose Our Social Media AI?</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">�</div>
              <h3>Social Media Analysis</h3>
              <p>Advanced content analysis from social media posts, comments, and trends.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🤖</div>
              <h3>AI-Powered</h3>
              <p>Cutting-edge AI technology that understands social context and sentiment.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">⚡</div>
              <h3>Lightning Fast</h3>
              <p>Get your analysis in seconds, not minutes. Optimized for social data.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3>Multiple Insights</h3>
              <p>Sentiment analysis, trend detection, engagement metrics, and more.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
