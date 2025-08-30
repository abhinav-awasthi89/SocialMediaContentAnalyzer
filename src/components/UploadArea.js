'use client';

import { useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function UploadArea({ variant = 'default', onFileUpload }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const fileInputRef = useRef(null);
  const uploadAreaRef = useRef(null);
  const router = useRouter();
  const pathname = usePathname();

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const isValidFileType = (file) => {
    const supportedTypes = [
      // Document types
      'application/pdf',
      'text/plain',
      'text/markdown',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      // Image types
      'image/jpeg',
      'image/png', 
      'image/gif',
      'image/webp',
      'image/bmp',
      'image/svg+xml',
      // Other text types
      'application/rtf',
      'text/csv',
      'application/json',
      'text/xml',
      'application/xml'
    ];
    
    return supportedTypes.includes(file.type);
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file && isValidFileType(file)) {
      handleFileUpload(file);
    } else if (file) {
      alert('Please select a supported file type: screenshots, images, text files, or social media data exports.');
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragOver(false);
    
    const file = event.dataTransfer.files[0];
    if (file && isValidFileType(file)) {
      handleFileUpload(file);
    } else if (file) {
      alert('Please select a supported file type: screenshots, images, text files, or social media data exports.');
    }
  };

  const handleFileUpload = async (file) => {
    if (!uploadAreaRef.current) return;

    // If we're on the summarize page and have an onFileUpload callback, use it directly
    if (pathname === '/summarize' && onFileUpload) {
      onFileUpload(file);
      return;
    }

    // Otherwise, use the original navigation flow for home page
    // Get the position and size of the upload area
    const rect = uploadAreaRef.current.getBoundingClientRect();
    
    // Store the file in a way we can access it on the next page
    const fileData = {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    };
    
    // Store animation data and file info in sessionStorage
    sessionStorage.setItem('uploadAnimation', JSON.stringify({
      startX: rect.left,
      startY: rect.top,
      startWidth: rect.width,
      startHeight: rect.height,
      fileName: file.name,
      fileSize: file.size,
      fileData: fileData
    }));

    // Store the actual file using a different approach
    const reader = new FileReader();
    reader.onload = function(e) {
      sessionStorage.setItem('uploadedFileData', e.target.result);
    };
    reader.readAsDataURL(file);

    // Set the fixed position to match current location before animation
    const uploadElement = uploadAreaRef.current;
    uploadElement.style.position = 'fixed';
    uploadElement.style.top = `${rect.top}px`;
    uploadElement.style.left = `${rect.left}px`;
    uploadElement.style.width = `${rect.width}px`;
    uploadElement.style.height = `${rect.height}px`;
    uploadElement.style.margin = '0';
    uploadElement.style.transformOrigin = 'center center';

    // Trigger animation state
    setIsAnimating(true);
    uploadElement.classList.add('upload-expanding');

    // Navigate immediately to summarize page - don't wait for processing
    setTimeout(() => {
      router.push('/summarize');
    }, 800);
  };

  const isCompact = variant === 'compact';

  return (
    <>
      <div
        ref={uploadAreaRef}
        className={`upload-area ${isCompact ? 'upload-area--compact' : ''} ${isDragOver ? 'dragover' : ''} ${isAnimating ? 'upload-expanding' : ''}`}
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="upload-placeholder">
          <div className="upload-icon">�</div>
          <h3>{isCompact ? 'Drop Social Media Content Here' : 'Upload Social Media Content'}</h3>
          <p>or click to browse files</p>
          {!isCompact && (
            <div className="upload-note">
              Supports screenshots, text files, images, and social media exports • Max 10MB
            </div>
          )}
        </div>
      </div>
      
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.txt,.md,.jpg,.jpeg,.png,.gif,.webp,.bmp,.svg,.rtf,.csv,.json,.xml"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
    </>
  );
}
