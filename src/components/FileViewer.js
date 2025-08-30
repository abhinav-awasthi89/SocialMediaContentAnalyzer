'use client';

import { useState, useEffect } from 'react';

export default function FileViewer({ fileData, fileName, fileType, onClose }) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [textContent, setTextContent] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!fileData) return;

    try {
      // Convert data URL back to blob
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

    // Cleanup function to revoke blob URL
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [fileData, fileType]);

  const isTextFile = (type) => {
    return type.startsWith('text/') || 
           type === 'application/json' || 
           type === 'application/xml';
  };

  const isPDFFile = (type) => {
    return type === 'application/pdf';
  };

  const isImageFile = (type) => {
    return type.startsWith('image/');
  };

  const getFileIcon = (type) => {
    if (isPDFFile(type)) return '📄';
    if (isImageFile(type)) return '🖼️';
    if (isTextFile(type)) return '📝';
    return '📎';
  };

  const renderFileContent = () => {
    if (error) {
      return (
        <div className="file-viewer-error">
          <div className="error-icon">❌</div>
          <h3>Error Loading File</h3>
          <p>{error}</p>
        </div>
      );
    }

    if (!blobUrl) {
      return (
        <div className="file-viewer-loading">
          <div className="loading-spinner"></div>
          <p>Loading file...</p>
        </div>
      );
    }

    // PDF Display
    if (isPDFFile(fileType)) {
      return (
        <div className="pdf-viewer">
          <iframe
            src={blobUrl}
            width="100%"
            height="100%"
            title={`PDF Viewer - ${fileName}`}
            style={{ border: 'none', minHeight: '600px' }}
          />
        </div>
      );
    }

    // Image Display
    if (isImageFile(fileType)) {
      return (
        <div className="image-viewer">
          <img
            src={blobUrl}
            alt={fileName}
            style={{
              maxWidth: '100%',
              maxHeight: '80vh',
              objectFit: 'contain',
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
      const isXML = fileType === 'application/xml';
      const isMarkdown = fileType === 'text/markdown';

      return (
        <div className="text-viewer">
          <pre className={`text-content ${isJSON ? 'json' : ''} ${isXML ? 'xml' : ''} ${isMarkdown ? 'markdown' : ''}`}>
            {isJSON ? JSON.stringify(JSON.parse(textContent), null, 2) : textContent}
          </pre>
        </div>
      );
    }

    // Unsupported file type
    return (
      <div className="file-viewer-unsupported">
        <div className="file-icon">{getFileIcon(fileType)}</div>
        <h3>{fileName}</h3>
        <p>File type: {fileType}</p>
        <p>Preview not available for this file type</p>
        <button 
          className="btn btn--primary"
          onClick={() => {
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = fileName;
            a.click();
          }}
        >
          Download File
        </button>
      </div>
    );
  };

  return (
    <div className="file-viewer-overlay">
      <div className="file-viewer-modal">
        <div className="file-viewer-header">
          <div className="file-info">
            <span className="file-icon">{getFileIcon(fileType)}</span>
            <div className="file-details">
              <h3>{fileName}</h3>
              <span className="file-type">{fileType}</span>
            </div>
          </div>
          <div className="file-viewer-controls">
            <button 
              className="btn btn--outline btn--small"
              onClick={() => {
                if (blobUrl) {
                  const a = document.createElement('a');
                  a.href = blobUrl;
                  a.download = fileName;
                  a.click();
                }
              }}
              title="Download file"
            >
              📥 Download
            </button>
            <button 
              className="btn btn--outline btn--small close-button"
              onClick={onClose}
              title="Close viewer"
            >
              ✕
            </button>
          </div>
        </div>
        <div className="file-viewer-content">
          {renderFileContent()}
        </div>
      </div>
    </div>
  );
}
