'use client';

import { useEffect, useState } from 'react';
import UploadArea from '@/components/UploadArea';

// Inline DocumentViewer component for the left pane
function DocumentViewer({ fileData, fileName, fileType }) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [textContent, setTextContent] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!fileData) return;

    try {
      fetch(fileData)
        .then(res => res.blob())
        .then(blob => {
          const url = URL.createObjectURL(blob);
          setBlobUrl(url);

          // For text files, also extract text content
          if (isTextFile(fileType)) {
            blob.text().then(text => {
              setTextContent(text);
            }).catch(err => {
              console.error('Error reading text content:', err);
              setError('Failed to read text content');
            });
          }
        })
        .catch(err => {
          console.error('Error creating blob URL:', err);
          setError('Failed to load file');
        });
    } catch (err) {
      console.error('Error processing file data:', err);
      setError('Failed to process file');
    }

    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [fileData, fileType]);

  const isTextFile = (type) => {
    return type?.startsWith('text/') || 
           type === 'application/json' || 
           type === 'application/xml';
  };

  const isPDFFile = (type) => {
    return type === 'application/pdf';
  };

  const isImageFile = (type) => {
    return type?.startsWith('image/');
  };

  if (error) {
    return (
      <div className="document-viewer-error">
        <div className="error-icon">❌</div>
        <h3>Error Loading Document</h3>
        <p>{error}</p>
      </div>
    );
  }

  if (!blobUrl) {
    return (
      <div className="document-viewer-loading">
        <div className="loading-spinner"></div>
        <p>Loading document...</p>
      </div>
    );
  }

  // PDF Display
  if (isPDFFile(fileType)) {
    return (
      <iframe
        src={blobUrl}
        width="100%"
        height="100%"
        title={`PDF Viewer - ${fileName}`}
        style={{ border: 'none' }}
      />
    );
  }

  // Image Display
  if (isImageFile(fileType)) {
    return (
      <div className="inline-image-viewer">
        <img
          src={blobUrl}
          alt={fileName}
          style={{
            maxWidth: '100%',
            height: 'auto',
            display: 'block',
            margin: '0 auto'
          }}
        />
      </div>
    );
  }

  // Text File Display
  if (isTextFile(fileType) && textContent !== null) {
    const isJSON = fileType === 'application/json';
    
    return (
      <div className="inline-text-viewer">
        <pre className={`inline-text-content ${isJSON ? 'json' : ''}`}>
          {isJSON ? JSON.stringify(JSON.parse(textContent), null, 2) : textContent}
        </pre>
      </div>
    );
  }

  return (
    <div className="document-viewer-error">
      <div className="error-icon">📄</div>
      <h3>Preview Not Available</h3>
      <p>This file type cannot be displayed inline.</p>
    </div>
  );
}

export default function SummarizePage() {
  const [animationData, setAnimationData] = useState(null);
  const [isEntering, setIsEntering] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);
  const [summaryLength, setSummaryLength] = useState('medium');
  const [processingStage, setProcessingStage] = useState('');
  const [fileData, setFileData] = useState(null); // Store file data persistently
  const [currentStep, setCurrentStep] = useState('upload'); // 'upload', 'configure', 'processing', 'result'
  const [mobileView, setMobileView] = useState('summary'); // 'summary' or 'document' for mobile toggle

  // Utility function to truncate file names
  const truncateFileName = (fileName, maxLength = 30) => {
    if (!fileName || fileName.length <= maxLength) return fileName;
    
    const extension = fileName.split('.').pop();
    const nameWithoutExtension = fileName.substring(0, fileName.lastIndexOf('.'));
    const truncatedName = nameWithoutExtension.substring(0, maxLength - extension.length - 4) + '...';
    
    return truncatedName + '.' + extension;
  };

  useEffect(() => {
    // Check if we came from an upload animation
    const storedAnimation = sessionStorage.getItem('uploadAnimation');
    const storedFileData = sessionStorage.getItem('uploadedFileData');
    
    if (storedAnimation && storedFileData) {
      const data = JSON.parse(storedAnimation);
      setAnimationData(data);
      setFileData(storedFileData); // Store file data persistently
      setIsEntering(true);
      
      // Move to configuration step instead of immediately processing
      setCurrentStep('configure');
      
      // Remove entering state after animation
      setTimeout(() => {
        setIsEntering(false);
      }, 1000);
      
      // Clean up session storage after a delay
      setTimeout(() => {
        sessionStorage.removeItem('uploadAnimation');
        sessionStorage.removeItem('uploadedFileData');
      }, 1500);
    }
  }, []);

  // Listen for navigation reset events
  useEffect(() => {
    const handleReset = () => {
      // Reset all state to initial values
      setAnimationData(null);
      setIsEntering(false);
      setIsProcessing(false);
      setSummary(null);
      setError(null);
      setSummaryLength('medium');
      setProcessingStage('');
      setFileData(null);
      setCurrentStep('upload');
      setMobileView('summary');
      
      // Clear session storage
      sessionStorage.removeItem('uploadAnimation');
      sessionStorage.removeItem('uploadedFileData');
    };

    window.addEventListener('resetSummaryPage', handleReset);
    
    return () => {
      window.removeEventListener('resetSummaryPage', handleReset);
    };
  }, []);

  const startProcessing = async (selectedLength) => {
    if (!fileData || !animationData) return;
    
    setSummaryLength(selectedLength);
    setCurrentStep('processing');
    await processFileFromData(fileData, animationData, selectedLength);
  };

  const regenerateSummary = async (newLength) => {
    if (!fileData || !animationData) return;
    
    // Don't clear summary immediately and keep the result view
    setError(null);
    setSummaryLength(newLength);
    // Keep currentStep as 'result' to maintain the split view
    await processFileFromData(fileData, animationData, newLength);
  };

  const handleApiError = async (apiResponse, errorResult, retryCount, maxRetries, fileDataUrl, animData, length) => {
    // Extract meaningful error message from API response
    let errorMessage = errorResult.error || 'Unknown error';
    
    // Check if this is a Google AI service error and extract the meaningful part
    if (errorMessage.includes('The model is overloaded')) {
      errorMessage = 'The AI service is temporarily overloaded. Please try again in a few moments.';
    } else if (errorMessage.includes('Rate limit exceeded') || errorMessage.includes('429')) {
      errorMessage = 'Rate limit exceeded. Please wait a moment before trying again.';
    } else if (apiResponse.status === 503) {
      errorMessage = 'The AI service is temporarily overloaded. Please try again in a few moments.';
    } else if (apiResponse.status === 429) {
      errorMessage = 'Rate limit exceeded. Please wait a moment before trying again.';
    } else if (apiResponse.status >= 500) {
      errorMessage = 'The AI service is temporarily unavailable. Please try again later.';
    } else if (errorMessage.startsWith('Failed to generate summary: ')) {
      // Extract the core error message from API wrapper
      const coreMessage = errorMessage.replace('Failed to generate summary: ', '');
      if (coreMessage.includes('The model is overloaded')) {
        errorMessage = 'The AI service is temporarily overloaded. Please try again in a few moments.';
      } else if (coreMessage.includes('Rate limit')) {
        errorMessage = 'Rate limit exceeded. Please wait a moment before trying again.';
      } else {
        errorMessage = `Failed to process file (Error ${apiResponse.status})`;
      }
    }
    
    // Retry for service overload errors
    if ((apiResponse.status === 503 || errorMessage.includes('overloaded')) && retryCount < maxRetries) {
      console.log(`Service overloaded, retrying in 3 seconds... (${retryCount + 1}/${maxRetries})`);
      setProcessingStage(`Service busy, retrying in 3 seconds... (${retryCount + 1}/${maxRetries})`);
      
      // Wait 3 seconds before retrying
      await new Promise(resolve => setTimeout(resolve, 3000));
      return await processFileFromData(fileDataUrl, animData, length, retryCount + 1);
    } else if (retryCount >= maxRetries && (apiResponse.status === 503 || errorMessage.includes('overloaded'))) {
      errorMessage = errorMessage + ' All retry attempts failed.';
    }
    
    throw new Error(errorMessage);
  };

  const processFileFromData = async (fileDataUrl, animData, length = summaryLength, retryCount = 0) => {
    const maxRetries = 2;
    setIsProcessing(true);
    setError(null);
    setSummary(null); // Clear summary when processing starts
    setProcessingStage(retryCount > 0 ? `Retrying... (${retryCount}/${maxRetries})` : 'Preparing file...');

    try {
      console.log('Starting file processing...');
      
      // Convert data URL back to blob
      const response = await fetch(fileDataUrl);
      const blob = await response.blob();
      
      // Create file object
      const file = new File([blob], animData.fileName, { 
        type: animData.fileData.type || 'application/pdf',
        lastModified: animData.fileData.lastModified
      });

      console.log('File recreated:', file.name, file.size, file.type);

      // Send file directly to API for processing
      setProcessingStage(retryCount > 0 ? `Processing with Google AI... (Retry ${retryCount}/${maxRetries})` : 'Processing with Google AI...');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('summaryLength', length);
      formData.append('format', 'json');

      console.log('Sending file to API...');

      const apiResponse = await fetch('/api/summarize', {
        method: 'POST',
        body: formData,
      });

      console.log('API response status:', apiResponse.status);

      if (!apiResponse.ok) {
        const errorResult = await apiResponse.json().catch(() => ({ error: 'Unknown error' }));
        return await handleApiError(apiResponse, errorResult, retryCount, maxRetries, fileDataUrl, animData, length);
      }

      const result = await apiResponse.json();
      console.log('API result:', result);

      setSummary({
        ...result,
        fileName: animData.fileName,
        fileSize: animData.fileData.size || 0
      });
      
      setCurrentStep('result');
      
    } catch (err) {
      console.error('Processing error:', err);
      setError(err.message || 'An unknown error occurred');
    } finally {
      setIsProcessing(false);
      setProcessingStage('');
    }
  };

  const handleNewFileUpload = (file) => {
    // Convert file to data URL for storage
    const reader = new FileReader();
    reader.onload = function(e) {
      const fileDataUrl = e.target.result;
      
      // Create animation data
      const animData = {
        fileName: file.name,
        fileSize: file.size,
        fileData: {
          name: file.name,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified
        }
      };
      
      // Reset states
      setSummary(null);
      setError(null);
      
      // Store new file data
      setFileData(fileDataUrl);
      setAnimationData(animData);
      
      // Move to configuration step
      setCurrentStep('configure');
    };
    reader.readAsDataURL(file);
  };

  const isFileDisplayable = (fileType) => {
    if (!fileType) return false;
    return fileType === 'application/pdf' || 
           fileType.startsWith('image/') || 
           fileType.startsWith('text/') || 
           fileType === 'application/json' || 
           fileType === 'application/xml';
  };

  return (
    <div className={`summarize-page ${isEntering ? 'page-entering' : ''}`}>
      {/* Step 1: Upload (when no file uploaded yet) */}
      {currentStep === 'upload' && (
        <section className="summarize-hero">
          <div className="container">
            <div className="summarize-content upload-layout">
              <div className="upload-content-left">
                <h1 className="summarize-title">Upload Social Media Content</h1>
                <p className="summarize-description">
                  Drop your social media screenshots or content here. Supports images, text files, and social media exports. 
                  Our AI will analyze and provide deep insights about engagement, sentiment, and trends.
                </p>
                <div className="upload-features">
                  <div className="feature-item">
                    <span className="feature-icon">�</span>
                    <span>Screenshots, Images</span>
                  </div>
                  <div className="feature-item">
                    <span className="feature-icon">�</span>
                    <span>Social Media Data</span>
                  </div>
                  <div className="feature-item">
                    <span className="feature-icon">⚡</span>
                    <span>AI-powered analysis</span>
                  </div>
                </div>
              </div>
              <div className="upload-content-right">
                <UploadArea onFileUpload={handleNewFileUpload} />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Step 2: Configure summary options */}
      {currentStep === 'configure' && animationData && (
        <section className="summarize-hero">
          <div className="container">
            <div className="summarize-content configure-layout">
              <div className="configure-content-left">
                <h1 className="summarize-title">Choose Analysis Depth</h1>
                <p className="summarize-description">
                  Select how detailed you want your social media analysis to be. Our AI will examine your content and provide insights tailored to your needs.
                </p>
                
                <div className="file-preview">
                  <div className="file-icon-display">
                    <span className="file-type-icon">
                      {animationData.fileData?.type === 'application/pdf' && '📄'}
                      {animationData.fileData?.type?.startsWith('image/') && '🖼️'}
                      {(animationData.fileData?.type?.startsWith('text/') || animationData.fileData?.type === 'application/json') && '📝'}
                      {!animationData.fileData?.type?.startsWith('application/pdf') && 
                       !animationData.fileData?.type?.startsWith('image/') && 
                       !animationData.fileData?.type?.startsWith('text/') && 
                       animationData.fileData?.type !== 'application/json' && '📎'}
                    </span>
                  </div>
                  <div className="file-details-compact">
                    <span className="file-name-truncated" title={animationData.fileName}>
                      {truncateFileName(animationData.fileName)}
                    </span>
                    <span className="file-size-compact">{Math.round(animationData.fileSize / 1024)} KB</span>
                  </div>
                </div>

                <div className="summary-benefits">
                  <div className="benefit-item">
                    <span className="benefit-icon">⚡</span>
                    <span>Lightning fast processing</span>
                  </div>
                  <div className="benefit-item">
                    <span className="benefit-icon">🎯</span>
                    <span>Intelligent key point extraction</span>
                  </div>
                  <div className="benefit-item">
                    <span className="benefit-icon">📊</span>
                    <span>Structured and organized output</span>
                  </div>
                </div>

                <div className="configure-actions">
                  <button 
                    className="btn btn--outline btn--small back-btn"
                    onClick={() => setCurrentStep('upload')}
                  >
                    ← Choose Different File
                  </button>
                </div>
              </div>

              <div className="configure-content-right">
                <div className="summary-options-vertical">
                  <button 
                    className={`summary-option-card ${summaryLength === 'short' ? 'active' : ''}`}
                    onClick={() => startProcessing('short')}
                  >
                    <div className="option-content">
                      <div className="option-icon">⚡</div>
                      <div className="option-info">
                        <h3>Quick</h3>
                        <p>Brief insights (2-3 key points)</p>
                      </div>
                    </div>
                  </button>
                  <button 
                    className={`summary-option-card ${summaryLength === 'medium' ? 'active' : ''}`}
                    onClick={() => startProcessing('medium')}
                  >
                    <div className="option-content">
                      <div className="option-icon">�</div>
                      <div className="option-info">
                        <h3>Standard</h3>
                        <p>Detailed analysis (sentiment, trends, metrics)</p>
                      </div>
                    </div>
                  </button>
                  <button 
                    className={`summary-option-card ${summaryLength === 'long' ? 'active' : ''}`}
                    onClick={() => startProcessing('long')}
                  >
                    <div className="option-content">
                      <div className="option-icon">�</div>
                      <div className="option-info">
                        <h3>Deep Dive</h3>
                        <p>Comprehensive insights (engagement, audience, strategy)</p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Step 3: Processing */}
      {currentStep === 'processing' && animationData && (
        <section className="summarize-hero">
          <div className="container">
            <div className="summarize-content">
              <h1 className="summarize-title">Analyzing {animationData.fileName}</h1>
              {processingStage && (
                <p className="processing-stage-text" data-retry={processingStage.includes('Retry') || processingStage.includes('retrying')}>
                  {processingStage}
                </p>
              )}
              
              <div className="file-info">
                <div className="file-details">
                  <strong>{animationData.fileName}</strong>
                  <span>{Math.round(animationData.fileSize / 1024)} KB</span>
                </div>
              </div>

              <div className="processing-indicator">
                <div className="spinner"></div>
                <p>Generating {summaryLength} summary...</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Step 4: Split-pane Results Layout */}
      {currentStep === 'result' && animationData && (
        <div className={`split-layout ${mobileView === 'document' ? 'mobile-show-document' : 'mobile-show-summary'}`}>
          {/* Left Pane - Document Viewer */}
          <div className="document-pane">
            <div className="document-header">
              <div className="document-info">
                <span className="document-icon">
                  {animationData.fileData?.type === 'application/pdf' && '📄'}
                  {animationData.fileData?.type?.startsWith('image/') && '🖼️'}
                  {(animationData.fileData?.type?.startsWith('text/') || animationData.fileData?.type === 'application/json' || animationData.fileData?.type === 'application/xml') && '📝'}
                  {!isFileDisplayable(animationData.fileData?.type) && '📎'}
                </span>
                <span className="document-name">{animationData.fileName}</span>
                <span className="file-size">({Math.round(animationData.fileSize / 1024)} KB)</span>
              </div>
            </div>
            <div className="document-viewer">
              {isFileDisplayable(animationData.fileData?.type) ? (
                <DocumentViewer
                  fileData={fileData}
                  fileName={animationData.fileName}
                  fileType={animationData.fileData?.type}
                />
              ) : (
                <div className="document-not-displayable">
                  <div className="file-icon">📎</div>
                  <h3>{animationData.fileName}</h3>
                  <p>Preview not available for this file type</p>
                  <button 
                    className="btn btn--primary"
                    onClick={() => {
                      if (fileData) {
                        fetch(fileData)
                          .then(res => res.blob())
                          .then(blob => {
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = animationData.fileName;
                            a.click();
                            URL.revokeObjectURL(url);
                          });
                      }
                    }}
                  >
                    📥 Download File
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right Pane - Summary */}
          <div className="summary-pane">
            <div className="summary-header">
              <div className="summary-controls">
                <div className="length-buttons">
                  <button 
                    className={`btn btn--small ${summaryLength === 'short' ? 'btn--primary' : 'btn--outline'}`}
                    onClick={() => regenerateSummary('short')}
                    disabled={isProcessing}
                  >
                    Quick
                  </button>
                  <button 
                    className={`btn btn--small ${summaryLength === 'medium' ? 'btn--primary' : 'btn--outline'}`}
                    onClick={() => regenerateSummary('medium')}
                    disabled={isProcessing}
                  >
                    Standard
                  </button>
                  <button 
                    className={`btn btn--small ${summaryLength === 'long' ? 'btn--primary' : 'btn--outline'}`}
                    onClick={() => regenerateSummary('long')}
                    disabled={isProcessing}
                  >
                    Deep Dive
                  </button>
                </div>
                <button 
                  className="btn btn--outline btn--small new-file-btn"
                  onClick={() => setCurrentStep('upload')}
                >
                  New File
                </button>
              </div>
            </div>

            <div className="summary-content-area">
              {error && (
                <div className="error-message">
                  <h3>Error</h3>
                  <p>{error}</p>
                </div>
              )}

              <div className="summary-display-container">
                {isProcessing && (
                  <div className="processing-overlay">
                    <div className="spinner"></div>
                    <p>Generating {summaryLength} analysis...</p>
                    {processingStage && (
                      <p className="processing-stage-text" data-retry={processingStage.includes('Retry') || processingStage.includes('retrying')}>
                        {processingStage}
                      </p>
                    )}
                  </div>
                )}

                {summary && (
                  <div className="summary-result">
                    <div className="analysis-content">
                      {/* Summary Section */}
                      <div className="analysis-section">
                        <h3 className="analysis-heading">📝 Summary</h3>
                        <div className="analysis-text">
                          {summary.analysis?.summary || summary.summary}
                        </div>
                      </div>

                      {/* Sentiment Section */}
                      {summary.analysis?.sentiment && (
                        <div className="analysis-section">
                          <h3 className="analysis-heading">💭 Sentiment Analysis</h3>
                          <div className={`sentiment-badge sentiment-${summary.analysis.sentiment}`}>
                            {summary.analysis.sentiment.charAt(0).toUpperCase() + summary.analysis.sentiment.slice(1)}
                          </div>
                          {summary.analysis?.sentiment_breakdown && (
                            <div className="analysis-text">
                              {summary.analysis.sentiment_breakdown}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Themes/Hashtags Section */}
                      {summary.analysis?.themes && summary.analysis.themes.length > 0 && (
                        <div className="analysis-section">
                          <h3 className="analysis-heading">🏷️ Key Themes</h3>
                          <div className="themes-container">
                            {summary.analysis.themes.map((theme, index) => (
                              <span key={index} className="theme-tag">
                                {theme.startsWith('#') ? theme : `#${theme}`}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Engagement Score Section */}
                      {summary.analysis?.engagement_score && (
                        <div className="analysis-section">
                          <h3 className="analysis-heading">📊 Engagement Potential</h3>
                          <div className={`engagement-score engagement-${summary.analysis.engagement_score}`}>
                            {summary.analysis.engagement_score.charAt(0).toUpperCase() + summary.analysis.engagement_score.slice(1)}
                          </div>
                          {summary.analysis?.engagement_reasoning && (
                            <div className="analysis-text">
                              {summary.analysis.engagement_reasoning}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Improvement Suggestions */}
                      {summary.analysis?.improvement_suggestions && summary.analysis.improvement_suggestions.length > 0 && (
                        <div className="analysis-section">
                          <h3 className="analysis-heading">💡 Improvement Suggestions</h3>
                          <ul className="suggestions-list">
                            {summary.analysis.improvement_suggestions.map((suggestion, index) => (
                              <li key={index} className="suggestion-item">{suggestion}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Platform Strategy */}
                      {summary.analysis?.platform_strategy && (
                        <div className="analysis-section">
                          <h3 className="analysis-heading">🚀 Platform Strategy</h3>
                          <div className="platform-strategies">
                            {Object.entries(summary.analysis.platform_strategy).map(([platform, strategy]) => (
                              <div key={platform} className="platform-item">
                                <h4 className="platform-name">
                                  {platform === 'twitter' && '🐦 Twitter'}
                                  {platform === 'instagram' && '📸 Instagram'}
                                  {platform === 'linkedin' && '💼 LinkedIn'}
                                  {platform !== 'twitter' && platform !== 'instagram' && platform !== 'linkedin' && `📱 ${platform.charAt(0).toUpperCase() + platform.slice(1)}`}
                                </h4>
                                <div className="platform-strategy">{strategy}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {!summary && !isProcessing && !error && (
                  <div className="summary-placeholder">
                    <p>Select an analysis depth to generate insights</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Mobile Floating Navigation */}
          <div className="mobile-nav-floating">
            <div className="mobile-nav-container">
              <button 
                className={`mobile-nav-btn ${mobileView === 'summary' ? 'active' : ''}`}
                onClick={() => setMobileView('summary')}
              >
                <span className="mobile-nav-icon">�</span>
                <span className="mobile-nav-text">Analysis</span>
              </button>
              <button 
                className={`mobile-nav-btn ${mobileView === 'document' ? 'active' : ''}`}
                onClick={() => setMobileView('document')}
              >
                <span className="mobile-nav-icon">�</span>
                <span className="mobile-nav-text">Content</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
