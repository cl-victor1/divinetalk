import React from 'react';
import { FaPlayCircle, FaFileAlt, FaCalendarAlt } from 'react-icons/fa';

interface Podcast {
  id: string;
  audio_url: string;
  subtitles_url: string;
  created_at: string;
  title: string;
  slug: string;
}

interface GeneratedPodcastsProps {
  podcasts: Podcast[];
  subscription: 'Hobby' | 'Freelancer' | 'Professional' | 'Enterprise' | null;
}

export default function GeneratedPodcasts({ podcasts, subscription }: GeneratedPodcastsProps) {
  const getFileName = (url: string) => {
    const parts = url.split('/');
    return parts[parts.length - 1];
  };

  const getSubscriptionInfo = () => {
    switch (subscription) {
      case 'Hobby':
        return 'As a Hobby subscriber, you can see your 5 most recent podcasts.';
      case 'Freelancer':
        return 'As a Freelancer subscriber, you can see your 20 most recent podcasts.';
      case 'Professional':
        return 'As a Professional subscriber, you can see all your podcasts.';
      case 'Enterprise':
        return 'As an Enterprise subscriber, you can see all your podcasts.';
      default:
        return 'In trial mode, you can listen to your 5 most recent podcasts here.';
    }
  };

  return (
    <div className="mt-8 text-gray-800">
      <h1 className="text-2xl font-bold mb-6 text-indigo-700">Your Generated Podcasts</h1>
      <p className="text-lg text-gray-600 italic mb-4">{getSubscriptionInfo()}</p>
      {podcasts.length === 0 ? (
        <p className="text-lg text-gray-600 italic">You haven't generated any podcasts yet.</p>
      ) : (
        <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {podcasts.map((podcast) => (
            <li key={podcast.slug} className="bg-white shadow-md rounded-lg overflow-hidden transition-transform duration-300 hover:scale-105">
              <div className="p-6">
              <h3 className="font-semibold text-lg mb-2 truncate">
                  {podcast.title ?? getFileName(podcast.audio_url)}
                </h3>
                <p className="text-sm text-gray-500 mb-4 flex items-center">
                  <FaCalendarAlt className="mr-2" />
                  {new Date(podcast.created_at).toLocaleDateString()}
                </p>
                <div className="flex justify-between">
                  <a
                    href={podcast.slug 
                      ? `https://notebooklmpodcast.com/podcast/${podcast.slug}`
                      : podcast.audio_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-indigo-600 hover:text-indigo-800 transition-colors duration-300"
                  >
                    <FaPlayCircle className="mr-2" />
                    Listen
                  </a>
                  <a
                    href={podcast.subtitles_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-indigo-600 hover:text-indigo-800 transition-colors duration-300"
                  >
                    <FaFileAlt className="mr-2" />
                    Subtitles
                  </a>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
