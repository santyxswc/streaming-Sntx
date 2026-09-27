'use client';
import { Flame, Award, Tv, Sparkles, Clapperboard } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import PageLoader from '@/components/ui/PageLoader';
import FeedError from '@/components/ui/FeedError';
import Banner from '@/features/catalog/components/Banner';
import FeedRows from '@/features/catalog/components/FeedRows';
import DonateStrip from '@/features/donations/components/DonateStrip';
import AISearchHome from '@/features/ai-search/components/AISearchHome';
import { useFeed } from '@/features/catalog/hooks/useFeed';

const SECTION_ICONS = {
  'trending-movies': { icon: Flame, color: 'text-accent' },
  'acclaimed-movies': { icon: Award, color: 'text-secondary' },
  'binge-series': { icon: Tv, color: 'text-primary' },
  'new-movies': { icon: Clapperboard, color: 'text-secondary' },
  'acclaimed-series': { icon: Sparkles, color: 'text-primary' },
  'new-seasons': { icon: Tv, color: 'text-secondary' },
};

export default function HomeClient() {
  const { sections, featured, loading, error } = useFeed('home');

  if (loading) return <PageLoader />;

  return (
    <main className="relative min-h-screen bg-background overflow-x-hidden">
      <Navbar />
      <div className="relative">
        <Banner movie={featured} />
        <DonateStrip />
        <AISearchHome />
        <div className="relative z-10 py-8 md:py-12 space-y-12 md:space-y-20 pb-40">
          {error ? <FeedError /> : <FeedRows sections={sections} icons={SECTION_ICONS} />}
        </div>
      </div>
    </main>
  );
}
