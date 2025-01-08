import React from 'react';

interface ShareButtonProps {
  url: string;
  title: string;
  className?: string; // Add this line
}

const ShareButton: React.FC<ShareButtonProps> = ({ url, title, className }) => {
  const shareData = {
    title: 'Check out this amazing AI-generated podcast!',
    text: `🎧 Check out this amazing AI-generated podcast "${title}" made on NotebookAI Podcast! 😎 #AI #Podcast`,
    url: url,
  };

  const handleShare = async () => {
    try {
      // if (navigator.share) {
      //   await navigator.share(shareData);
      // } else {
      
        // Fallback for browsers that don't support the Web Share API
        const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareData.text)}&url=${encodeURIComponent(shareData.url)}`;
        window.open(shareUrl, '_blank');
      
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  return (
    <button
      onClick={handleShare}
      className={`bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded ${className || ''}`}
    >
      Share this Podcast on Twitter!
    </button>
  );
};

export default ShareButton;
