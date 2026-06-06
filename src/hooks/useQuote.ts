import { useState, useEffect } from 'react';

interface Quote {
  q: string;
  a: string;
}

export const useQuote = () => {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getDailyQuote = async () => {
      try {
        const cached = localStorage.getItem('lifeos_quote');
        const cachedAt = localStorage.getItem('lifeos_quote_at');
        const ONE_DAY = 24 * 60 * 60 * 1000;

        if (cached && cachedAt && Date.now() - Number(cachedAt) < ONE_DAY) {
          setQuote(JSON.parse(cached));
          setLoading(false);
          return;
        }

        const res = await fetch(
          'https://api.allorigins.win/get?url=' +
            encodeURIComponent('https://zenquotes.io/api/today')
        );
        if (!res.ok) throw new Error('CORS proxy quote fetch failed');
        const json = await res.json();
        const parsedContents = JSON.parse(json.contents);
        const rawQuote = parsedContents[0];
        
        const quoteObj = {
          q: rawQuote.q || 'Make each day your masterpiece.',
          a: rawQuote.a || 'John Wooden',
        };

        localStorage.setItem('lifeos_quote', JSON.stringify(quoteObj));
        localStorage.setItem('lifeos_quote_at', String(Date.now()));
        setQuote(quoteObj);
      } catch (e) {
        console.error('Error fetching quote:', e);
        // Fallback quote
        setQuote({
          q: 'The only way to do great work is to love what you do.',
          a: 'Steve Jobs',
        });
      } finally {
        setLoading(false);
      }
    };

    getDailyQuote();
  }, []);

  return { quote, loading };
};
