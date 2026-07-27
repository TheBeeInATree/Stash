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
      // Wait 2 seconds to ensure any cloud pulls have finished
      setTimeout(() => {
        if (items && items.length === 0 && localStorage.getItem('hasCompletedOnboarding') !== 'true') {
          setRun(true);
        }
      }, 2000);
    }
  }, [items]);

  const steps = [
    {
      target: 'body',
      placement: 'center' as const,
      content: (
        <div style={{ textAlign: 'center', padding: '1rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Welcome to Stash!</h2>
          <p style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>Let's take a quick tour to help you get started.</p>
          <button 
            onClick={() => {
              setRun(false);
              localStorage.setItem('hasCompletedOnboarding', 'true');
            }}
            style={{
              background: '#ef4444',
              color: 'white',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              fontWeight: 'bold',
              cursor: 'pointer',
              width: '100%'
            }}
          >
            Skip Tour Forever
          </button>
        </div>
      ),
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
