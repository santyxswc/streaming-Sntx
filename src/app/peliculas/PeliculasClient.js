'use client';
import Navbar from '@/components/layout/Navbar';
import PageLoader from '@/components/ui/PageLoader';
import FeedError from '@/components/ui/FeedError';
import Banner from '@/features/catalog/components/Banner';
import FeedRows from '@/features/catalog/components/FeedRows';
import DonateStrip from '@/features/donations/components/DonateStrip';
import { useFeed } from '@/features/catalog/hooks/useFeed';

export default function PeliculasClient() {
  const { sections, featured, loading, error } = useFeed('movies');

  if (loading) return <PageLoader />;

  return (
    <main className="relative min-h-screen bg-background">
      <Navbar />
      <div className="relative pb-24 pt-20">
        <Banner movie={featured} />
        <DonateStrip />
        <div className="space-y-8 -mt-24 md:-mt-32 relative z-10">
          {error ? <FeedError /> : <FeedRows sections={sections} />}
        </div>
      </div>
    </main>
  );
}
