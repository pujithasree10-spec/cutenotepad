import { useState, useEffect } from 'react';

interface WeatherData {
  temperature: number;
  weathercode: number;
  label: string;
  icon: string;
}

const weatherCondition = (code: number) => {
  if (code === 0) return { label: 'Clear sky', icon: '☀️' };
  if ([1, 2, 3].includes(code)) return { label: 'Partly cloudy', icon: '⛅' };
  if ([51, 53, 55, 61, 63, 65].includes(code)) return { label: 'Rainy', icon: '🌧️' };
  if ([71, 73, 75].includes(code)) return { label: 'Snowy', icon: '❄️' };
  if ([95, 96, 99].includes(code)) return { label: 'Thunderstorm', icon: '⛈️' };
  return { label: 'Cloudy', icon: '☁️' };
};

export const useWeather = () => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      fetchDefaultWeather();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${coords.latitude}&longitude=${coords.longitude}&current_weather=true`
          );
          if (!res.ok) throw new Error('Weather fetch failed');
          const data = await res.json();
          const current = data.current_weather;
          if (current) {
            const condition = weatherCondition(current.weathercode);
            setWeather({
              temperature: current.temperature,
              weathercode: current.weathercode,
              label: condition.label,
              icon: condition.icon,
            });
          }
        } catch (err: any) {
          setError(err.message || 'Error loading weather');
        } finally {
          setLoading(false);
        }
      },
      () => {
        fetchDefaultWeather();
      }
    );

    async function fetchDefaultWeather() {
      try {
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=40.7128&longitude=-74.0060&current_weather=true`
        );
        if (!res.ok) throw new Error('Default weather fetch failed');
        const data = await res.json();
        const current = data.current_weather;
        if (current) {
          const condition = weatherCondition(current.weathercode);
          setWeather({
            temperature: current.temperature,
            weathercode: current.weathercode,
            label: `${condition.label} (NYC)`,
            icon: condition.icon,
          });
        }
      } catch (err: any) {
        setError(err.message || 'Error loading weather');
      } finally {
        setLoading(false);
      }
    }
  }, []);

  return { weather, loading, error };
};
