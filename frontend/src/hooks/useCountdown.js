import { useState, useEffect } from 'react';

export function useCountdown(targetDateOrSeconds) {
  const calculateRemaining = () => {
    if (!targetDateOrSeconds) return 0;
    
    if (typeof targetDateOrSeconds === 'number') {
      return Math.max(0, Math.floor(targetDateOrSeconds));
    }

    const target = new Date(targetDateOrSeconds).getTime();
    const now = new Date().getTime();
    return Math.max(0, Math.floor((target - now) / 1000));
  };

  const [remainingSeconds, setRemainingSeconds] = useState(calculateRemaining);

  useEffect(() => {
    setRemainingSeconds(calculateRemaining());

    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDateOrSeconds]);

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const isExpired = remainingSeconds <= 0;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return {
    remainingSeconds,
    minutes,
    seconds,
    isExpired,
    formattedTime
  };
}

