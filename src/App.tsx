/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Search, Wind, Droplets, Eye, Gauge, Sun, Thermometer, 
  Cloud, CloudRain, CloudSnow, CloudLightning, 
  History, X, Loader2, AlertCircle, MapPin, 
  Navigation, Sunrise, Sunset
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ForecastItem {
  time: string;
  temp: number;
  condition: string;
  icon: string;
  pop: number; // Probability of precipitation
  date: string;
}

interface DailyForecast {
  day: string;
  temp: number;
  condition: string;
  icon: string;
  date: string;
}

interface WeatherData {
  city: string;
  temperature: number;
  feelsLike: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  windDeg: number;
  visibility: number;
  pressure: number;
  description: string;
  icon: string;
  localTime: string;
  istTime: string;
  isDifferentTimezone: boolean;
  isDay: boolean;
  sunrise: string;
  sunset: string;
  uvIndex: number; 
  dewPoint: number;
  daily: DailyForecast[];
  allForecasts: ForecastItem[];
}

const RECENT_SEARCHES_KEY = 'weather_recent_searches';
const API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY;

export default function App() {
  const [city, setCity] = useState('');
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [selectedDay, setSelectedDay] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  const saveRecentSearch = (cityName: string) => {
    const updated = [cityName, ...recentSearches.filter(c => c.toLowerCase() !== cityName.toLowerCase())].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  };

  const fetchWeather = async (searchCity: string) => {
    if (!searchCity.trim()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Fetch current weather
      const weatherRes = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(searchCity)}&appid=${API_KEY}&units=metric`
      );

      if (!weatherRes.ok) {
        if (weatherRes.status === 404) {
          throw new Error("City not found. Please check the spelling.");
        }
        throw new Error("Failed to fetch weather data. Please try again later.");
      }

      const currentData = await weatherRes.json();

      // Fetch forecast
      const forecastRes = await fetch(
        `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(searchCity)}&appid=${API_KEY}&units=metric`
      );

      if (!forecastRes.ok) {
        throw new Error("Failed to fetch forecast data.");
      }

      const forecastData = await forecastRes.json();

      // Timezone logic
      const timezoneOffset = currentData.timezone; // in seconds
      const istOffset = 5.5 * 3600; // 19800 seconds
      const isDifferentTimezone = Math.abs(timezoneOffset - istOffset) > 60; // More than 1 minute difference

      const getLocalTime = (offset: number) => {
        const now = new Date();
        const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
        return new Date(utc + (offset * 1000));
      };

      const localDate = getLocalTime(timezoneOffset);
      const istDate = getLocalTime(istOffset);

      const formatTime = (date: Date) => date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });

      const formatUnixTime = (unix: number, offset: number) => {
        const date = new Date((unix + offset) * 1000);
        const utc = new Date(unix * 1000).getTime() + (new Date().getTimezoneOffset() * 60000);
        const local = new Date(utc + (offset * 1000));
        return local.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
      };

      // Day/Night logic based on API icon or sunrise/sunset
      const isDay = currentData.weather[0].icon.endsWith('d');

      // Process all forecast intervals
      const allForecasts: ForecastItem[] = forecastData.list.map((item: any) => ({
        time: new Date(item.dt * 1000).toLocaleTimeString([], { hour: 'numeric', hour12: true }).toLowerCase(),
        temp: item.main.temp,
        condition: item.weather[0].main,
        icon: item.weather[0].icon,
        pop: Math.round((item.pop || 0) * 100),
        date: new Date(item.dt * 1000).toDateString()
      }));

      // Process Daily (next 5-6 days)
      const dailyMap: { [key: string]: any } = {};
      forecastData.list.forEach((item: any) => {
        const date = new Date(item.dt * 1000).toDateString();
        if (!dailyMap[date]) {
          dailyMap[date] = {
            day: new Date(item.dt * 1000).toLocaleDateString([], { weekday: 'short' }),
            temp: item.main.temp,
            condition: item.weather[0].main,
            icon: item.weather[0].icon,
            date: date
          };
        }
      });
      const daily: DailyForecast[] = Object.values(dailyMap).slice(0, 7);

      const mockUv = Math.floor(Math.random() * 10) + 1;
      const mockDewPoint = Math.round(currentData.main.temp - ((100 - currentData.main.humidity) / 5));

      const weatherInfo: WeatherData = {
        city: currentData.name,
        temperature: currentData.main.temp,
        feelsLike: currentData.main.feels_like,
        condition: currentData.weather[0].main,
        humidity: currentData.main.humidity,
        windSpeed: currentData.wind.speed,
        windDeg: currentData.wind.deg,
        visibility: currentData.visibility / 1000,
        pressure: currentData.main.pressure,
        description: currentData.weather[0].description,
        icon: currentData.weather[0].icon,
        localTime: formatTime(localDate),
        istTime: formatTime(istDate),
        isDifferentTimezone,
        isDay,
        sunrise: formatUnixTime(currentData.sys.sunrise, timezoneOffset),
        sunset: formatUnixTime(currentData.sys.sunset, timezoneOffset),
        uvIndex: mockUv,
        dewPoint: mockDewPoint,
        daily,
        allForecasts
      };

      setWeather(weatherInfo);
      saveRecentSearch(currentData.name);
      setSelectedDay(0);
    } catch (err) {
      console.error("Fetch error:", err);
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchWeather(city);
  };

  const getWeatherIcon = (condition: string, size: string = "w-8 h-8") => {
    const c = condition.toLowerCase();
    if (c.includes('clear')) return <Sun className={`${size} text-yellow-400`} />;
    if (c.includes('rain') || c.includes('drizzle')) return <CloudRain className={`${size} text-blue-400`} />;
    if (c.includes('snow')) return <CloudSnow className={`${size} text-blue-100`} />;
    if (c.includes('thunderstorm')) return <CloudLightning className={`${size} text-purple-400`} />;
    return <Cloud className={`${size} text-slate-400`} />;
  };

  const clearRecent = () => {
    setRecentSearches([]);
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  };

  const resetWeather = () => {
    setWeather(null);
    setCity('');
    setError(null);
  };

  // ONLY showing changed parts + full structure (rest unchanged)

// 🔥 UPDATED FUNCTIONS

const getBackgroundImage = (condition: string, isDay: boolean) => {
  const cond = condition.toLowerCase();

  if (cond.includes('thunderstorm') || cond.includes('lightning')) {
    return "https://images.unsplash.com/photo-1605727216801-e27ce1d0cc28?q=80&w=2000&auto=format&fit=crop";
  }

  if (cond.includes('rain') || cond.includes('drizzle')) {
    return "https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?q=80&w=2000&auto=format&fit=crop";
  }

  // ✅ CLOUD FIX
  if (cond.includes('cloud') || cond.includes('overcast')) {
    return isDay 
      ? "https://images.unsplash.com/photo-1501630834273-4b5604d2ee31?q=80&w=2000&auto=format&fit=crop"
      : "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?q=80&w=2000&auto=format&fit=crop";
  }

  if (cond.includes('snow')) {
    return "https://images.unsplash.com/photo-1491002052546-bf38f186af56?q=80&w=2000&auto=format&fit=crop";
  }

  if (cond.includes('mist') || cond.includes('fog') || cond.includes('haze')) {
    return "https://images.unsplash.com/photo-1485236715598-ad2400ca5f04?q=80&w=2000&auto=format&fit=crop";
  }

  return isDay 
    ? "https://images.unsplash.com/photo-1513002749550-c59d786b8e6c?q=80&w=2000&auto=format&fit=crop"
    : "https://images.unsplash.com/photo-1532973330544-84695626070e?q=80&w=2000&auto=format&fit=crop";
};

const getCardBackgroundImage = (condition: string, isDay: boolean) => {
  const cond = condition.toLowerCase();

  if (cond.includes('thunderstorm') || cond.includes('lightning')) {
    return "https://images.unsplash.com/photo-1516912403328-e9997f630ad7?q=80&w=1000&auto=format&fit=crop";
  }

  if (cond.includes('rain') || cond.includes('drizzle')) {
    return "https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?q=80&w=1000&auto=format&fit=crop";
  }

  // ✅ CLOUD FIX
  if (cond.includes('cloud') || cond.includes('overcast')) {
    return isDay 
      ? "https://images.unsplash.com/photo-1501630834273-4b5604d2ee31?q=80&w=1000&auto=format&fit=crop"
      : "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?q=80&w=1000&auto=format&fit=crop";
  }

  if (cond.includes('snow')) {
    return "https://images.unsplash.com/photo-1483921020237-2ff51e8e4b22?q=80&w=1000&auto=format&fit=crop";
  }

  return isDay 
    ? "https://images.unsplash.com/photo-1513002749550-c59d786b8e6c?q=80&w=1000&auto=format&fit=crop"
    : "https://images.unsplash.com/photo-1505322022379-7c3353ee6291?q=80&w=1000&auto=format&fit=crop";
};
  return (
    <div className={`min-h-screen ${weather ? (weather.isDay ? 'bg-sky-500' : 'bg-slate-950') : 'bg-[#111]'} text-white flex flex-col items-center p-4 md:p-6 font-sans selection:bg-orange-500/30 transition-colors duration-1000`}>
      {/* Background Image Placeholder */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <img 
          src={weather 
            ? getBackgroundImage(selectedDay === 0 ? weather.condition : weather.daily[selectedDay].condition, weather.isDay)
            : "https://images.unsplash.com/photo-1513002749550-c59d786b8e6c?q=80&w=2000&auto=format&fit=crop"
          } 
          className={`w-full h-full object-cover blur-sm transition-all duration-1000 ${weather?.isDay ? 'opacity-20' : 'opacity-40'}`}
          alt="background"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#111]" />
      </div>

      <div className="w-full max-w-7xl relative z-10 flex flex-col flex-grow">
        {/* Header / Search Bar */}
        <div className={`flex flex-col transition-all duration-700 ${weather ? 'md:flex-row justify-between items-center gap-4 mb-6' : 'flex-grow justify-center items-center gap-8'}`}>
          <div className={`flex items-center gap-3 cursor-pointer group`} onClick={resetWeather}>
            <div className="bg-orange-600 p-2 rounded-xl group-hover:rotate-12 transition-transform shadow-lg shadow-orange-600/20">
              <MapPin className="w-6 h-6 text-white" />
            </div>
            <h1 className={`${weather ? 'text-2xl' : 'text-5xl'} font-black tracking-tighter transition-all`}>SkyCast</h1>
          </div>
          
          <div className={`w-full max-w-md flex flex-col gap-4`}>
            {!weather && (
              <p className="text-center text-white/40 font-medium tracking-wide uppercase text-xs">Enter a city to get started</p>
            )}
            <form onSubmit={handleSearch} className="relative group w-full">
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Search city (e.g. London, Tokyo)..."
                className="w-full bg-white/10 border border-white/10 rounded-2xl py-4 px-6 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all backdrop-blur-md placeholder:text-white/20"
              />
              <button
                type="submit"
                disabled={loading || !city.trim()}
                className="absolute right-2 top-2 bottom-2 px-6 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 rounded-xl transition-all flex items-center justify-center shadow-lg shadow-orange-600/20 active:scale-95"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
              </button>
            </form>

            {!weather && recentSearches.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2">
                {recentSearches.map((search) => (
                  <button
                    key={search}
                    onClick={() => fetchWeather(search)}
                    className="bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-full text-xs font-medium transition-all"
                  >
                    {search}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-red-500/20 border border-red-500/30 text-red-400 p-4 rounded-2xl flex items-center gap-3 mb-6 backdrop-blur-sm mx-auto max-w-md w-full"
            >
              <AlertCircle className="w-5 h-5" />
              <p className="text-sm font-medium">{error}</p>
              <button onClick={() => setError(null)} className="ml-auto hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {weather && !loading && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-6"
            >
              {/* Top Day Selector */}
              <div className="flex overflow-x-auto gap-3 pb-2 no-scrollbar">
                {weather.daily.map((day, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedDay(idx)}
                    className={`flex items-center gap-3 px-6 py-3 rounded-2xl border transition-all whitespace-nowrap backdrop-blur-md ${
                      selectedDay === idx 
                        ? 'bg-orange-600 border-orange-500 shadow-lg shadow-orange-600/20' 
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <span className="font-bold">{idx === 0 ? 'Today' : day.day}</span>
                    <span className="text-lg font-medium">{Math.round(day.temp)}°</span>
                    {getWeatherIcon(day.condition, "w-5 h-5")}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column: Current Weather & Details */}
                <div className="lg:col-span-4 flex flex-col gap-6">
                  {/* Main Weather Card */}
                  <div className="relative overflow-hidden rounded-[2rem] bg-white/5 border border-white/10 p-8 min-h-[400px] flex flex-col justify-between backdrop-blur-xl group">
                    <div className="absolute inset-0 z-0">
                      <img 
                        src={getCardBackgroundImage(selectedDay === 0 ? weather.condition : weather.daily[selectedDay].condition, weather.isDay)} 
                        className="w-full h-full object-cover opacity-30 group-hover:scale-110 transition-transform duration-1000"
                        alt="weather-bg"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#111] via-transparent to-transparent" />
                    </div>
                    
                    <div className="relative z-10 flex justify-between items-start">
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-col">
                          <h2 className="text-2xl font-bold">{weather.city}</h2>
                          <p className="text-white/60 text-sm">
                            {selectedDay === 0 ? new Date().toDateString() : weather.daily[selectedDay].date}
                          </p>
                        </div>
                        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider w-fit backdrop-blur-md ${weather.isDay ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'}`}>
                          {weather.isDay ? <Sun className="w-3 h-3" /> : <Sunset className="w-3 h-3" />}
                          {selectedDay === 0 ? (weather.isDay ? 'Day' : 'Night') : 'Forecast'}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-sm font-bold bg-black/40 px-3 py-1 rounded-full backdrop-blur-md">
                          {selectedDay === 0 ? `Local: ${weather.localTime}` : 'Forecast Mode'}
                        </span>
                        {selectedDay === 0 && weather.isDifferentTimezone && (
                          <span className="text-[10px] font-bold bg-orange-600/40 px-2 py-0.5 rounded-full backdrop-blur-md border border-orange-500/30">
                            IST: {weather.istTime}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="relative z-10">
                      <div className="flex items-baseline gap-1 mb-2">
                        <span className="text-8xl font-black tracking-tighter">
                          {Math.round(selectedDay === 0 ? weather.temperature : weather.daily[selectedDay].temp)}
                        </span>
                        <span className="text-4xl font-light text-white/40">°</span>
                      </div>
                      <div className="flex flex-col">
                        <h3 className="text-2xl font-bold capitalize">
                          {selectedDay === 0 ? weather.description : weather.daily[selectedDay].condition}
                        </h3>
                        <p className="text-white/60">
                          {selectedDay === 0 ? `Feels like ${Math.round(weather.feelsLike)}°` : 'Day Average'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-2 gap-3">
                    <DetailItem icon={<Wind className="w-4 h-4 text-orange-400" />} label="Wind" value={`${weather.windSpeed} m/s`} subValue="SE" />
                    <DetailItem icon={<Droplets className="w-4 h-4 text-blue-400" />} label="Humidity" value={`${weather.humidity}%`} />
                    <DetailItem icon={<Sunrise className="w-4 h-4 text-yellow-400" />} label="Sunrise" value={weather.sunrise} />
                    <DetailItem icon={<Sunset className="w-4 h-4 text-orange-400" />} label="Sunset" value={weather.sunset} />
                    <DetailItem icon={<Sun className="w-4 h-4 text-yellow-400" />} label="UV Index" value={`${weather.uvIndex} UV`} />
                    <DetailItem icon={<Thermometer className="w-4 h-4 text-red-400" />} label="Dew Point" value={`${weather.dewPoint}°C`} />
                  </div>
                </div>

                {/* Right Column: Hourly Forecast */}
                <div className="lg:col-span-8 bg-white/5 border border-white/10 rounded-[2rem] p-8 backdrop-blur-xl">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xl font-bold">
                      {selectedDay === 0 ? 'Hourly forecast' : `${weather.daily[selectedDay].day} Forecast`}
                    </h3>
                  </div>
                  
                  {/* Hourly Cards Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3">
                    {weather.allForecasts
                      .filter(item => item.date === weather.daily[selectedDay].date)
                      .slice(0, 8)
                      .map((item, idx) => (
                        <div key={idx} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center gap-3 hover:bg-white/10 transition-all group">
                          <span className="text-xs font-bold text-white/40 uppercase">{item.time}</span>
                          <div className="group-hover:scale-110 transition-transform">
                            {getWeatherIcon(item.condition, "w-8 h-8")}
                          </div>
                          <span className="text-xs font-bold text-blue-400">{item.pop}%</span>
                          <span className="text-lg font-black">{Math.round(item.temp)}°</span>
                        </div>
                      ))}
                  </div>

                  {/* Recent Searches */}
                  {recentSearches.length > 0 && (
                    <div className="mt-12 pt-8 border-t border-white/10">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2 text-white/40">
                          <History className="w-4 h-4" />
                          <h3 className="text-xs font-bold uppercase tracking-widest">Recent Activity</h3>
                        </div>
                        <button onClick={clearRecent} className="text-[10px] font-bold uppercase text-white/20 hover:text-red-400 transition-colors">Clear</button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {recentSearches.map((search) => (
                          <button
                            key={search}
                            onClick={() => fetchWeather(search)}
                            className="bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-1.5 rounded-full text-xs font-medium transition-all"
                          >
                            {search}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <footer className="mt-12 pb-8 text-white/20 text-[10px] font-bold uppercase tracking-[0.3em] text-center">
        SkyCast Dashboard • Accurate Data via OpenWeatherMap
      </footer>
    </div>
  );
}

function DetailItem({ icon, label, value, subValue }: { icon: React.ReactNode, label: string, value: string, subValue?: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-1 hover:bg-white/10 transition-all">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-lg font-black">{value}</span>
        {subValue && <span className="text-[10px] font-bold text-white/40">{subValue}</span>}
      </div>
    </div>
  );
}
