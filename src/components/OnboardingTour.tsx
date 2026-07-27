import { useState, useEffect } from 'react';
import { Joyride } from 'react-joyride';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';

export function OnboardingTour() {
  const [run, setRun] = useState(false);
  const items = useLiveQuery(() => db.items.toArray());

  useEffect(() => {
    const hasCompleted = localStorage.getItem('hasCompletedOnboarding') === 'true';
    if (items !== undefined && items.length === 0 && !hasCompleted) {
      // Small delay to let the DOM settle
      setTimeout(() => setRun(true), 500);
    }
  }, [items]);

  const steps = [
    {
      target: 'body',
      placement: 'center' as const,
      content: 'Welcome to Stash! Let\'s take a quick tour to help you get started. You can skip at any time.',
    },
    {
      target: '#tour-add-item-desktop',
      content: 'Start here! Add items by typing naturally, scanning a barcode, or snapping a receipt photo.',
      placement: 'right' as const,
    },
    {
      target: '#tour-search',
      content: 'Before you buy something new, search here to instantly check if you already own it.',
      placement: 'bottom' as const,
    },
    {
      target: '#tour-compare',
      content: 'Use Compare to put an item you own side-by-side with one you\'re considering buying.',
      placement: 'right' as const,
    },
    {
      target: '#tour-insights',
      content: 'Insights shows your spending breakdown, cost-per-use, low stock alerts, and expiring items.',
      placement: 'right' as const,
    },
    {
      target: '#tour-history',
      content: 'When you finish using an item, it moves here — keeping your active list clean.',
      placement: 'right' as const,
    },
  ].map(step => ({ ...step, disableBeacon: true, disableOverlayClose: true }));

  const handleCallback = (data: any) => {
    const { status, action } = data;
    if (['finished', 'skipped'].includes(status) || action === 'close') {
      setRun(false);
      localStorage.setItem('hasCompletedOnboarding', 'true');
    }
  };

  return (
    <Joyride
      callback={handleCallback}
      continuous
      run={run}
      scrollToFirstStep
      showProgress
      showSkipButton
      steps={steps}
      styles={{
        options: {
          zIndex: 10000,
          primaryColor: 'var(--accent-primary)',
          backgroundColor: 'var(--bg-color)',
          textColor: 'var(--text-primary)',
          arrowColor: 'var(--bg-color)',
        },
        buttonNext: {
          backgroundColor: 'var(--accent-primary)',
          borderRadius: '8px',
        },
        buttonBack: {
          color: 'var(--text-secondary)',
        },
        buttonSkip: {
          color: 'var(--text-secondary)',
        },
      }}
    />
  );
}
