import React, { useState, useEffect } from 'react';
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';

export function OnboardingTour() {
  const [run, setRun] = useState(false);
  const items = useLiveQuery(() => db.items.toArray());

  useEffect(() => {
    // Check if the user has already completed the tour
    const hasCompleted = localStorage.getItem('hasCompletedOnboarding') === 'true';
    
    // Only trigger if items have loaded, they have 0 items, and they haven't completed it
    if (items !== undefined && items.length === 0 && !hasCompleted) {
      setRun(true);
    }
  }, [items]);

  const steps: Step[] = [
    {
      target: 'body', // Fallback starting point
      placement: 'center',
      content: <h2>Welcome to Stash! Let's take a quick tour to get you started organizing your life.</h2>,
      disableBeacon: true,
    },
    {
      target: window.innerWidth > 768 ? '#tour-add-item-desktop' : '#tour-add-item-mobile',
      content: 'Start here! You can add items by typing, scanning a barcode, or snapping a picture of a receipt.',
      placement: window.innerWidth > 768 ? 'right' : 'top',
    },
    {
      target: '#tour-search',
      content: 'Before you buy something new, search here to instantly check if you already own it.',
      placement: 'bottom',
    },
    {
      target: '#tour-compare',
      content: 'Use Compare to pull up an item you own side-by-side with one you are considering buying to make smart decisions.',
      placement: 'right',
    },
    {
      target: '#tour-insights',
      content: 'Insights gives you a breakdown of your spending, alerts you to low stock, and shows expired items.',
      placement: 'right',
    },
    {
      target: '#tour-history',
      content: 'When you finish using an item, it moves here instead of cluttering up your active inventory.',
      placement: 'right',
    }
  ];

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      setRun(false);
      localStorage.setItem('hasCompletedOnboarding', 'true');
    }
  };

  return (
    <Joyride
      callback={handleJoyrideCallback}
      continuous
      hideCloseButton
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
        tooltipContainer: {
          textAlign: 'left',
        },
        buttonNext: {
          backgroundColor: 'var(--accent-primary)',
          borderRadius: '8px',
        },
        buttonBack: {
          marginRight: 10,
          color: 'var(--text-secondary)'
        },
        buttonSkip: {
          color: 'var(--text-secondary)'
        }
      }}
    />
  );
}
