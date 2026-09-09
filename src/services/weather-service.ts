import * as Location from 'expo-location';
import { API_ENDPOINTS } from '@/constants/config';
import { apiClient } from './api-client';

export interface WeatherForecast {
  date: string;
  maxTemp: number;
  minTemp: number;
  weatherCode: number;
  weatherDesc: string;
}

export interface WeatherData {
  city: string;
  temp: number;
  condition: string;
  feelsLike?: number;
  wind?: string;
  windSpeed?: number;
  humidity?: string;
  tips: string;
  forecast?: WeatherForecast[];
}

export const WeatherService = {
  /**
   * 获取当前设备位置对应的城市名
   */
  async getCurrentCity(): Promise<string> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return '北京';
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const [geocode] = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (geocode?.city) {
        // 移除市/区后缀以匹配天气接口
        return geocode.city.replace(/市$/, '');
      }
      return '北京';
    } catch (error) {
      console.warn('getCurrentCity error, fallback to 北京:', error);
      return '北京';
    }
  },

  /**
   * 获取指定城市的天气信息
   */
  async getWeather(city: string): Promise<WeatherData> {
    try {
      const res = await apiClient.get<any>(API_ENDPOINTS.WEATHER, { city });
      // 适配后端返回结构
      const data = res?.data || res;
      const condition =
        data?.weatherDesc || data?.condition || data?.weather || '晴';
      const temp =
        typeof data?.temperature === 'number'
          ? data.temperature
          : typeof data?.temp === 'number'
            ? data.temp
            : 22;

      const forecast: WeatherForecast[] = Array.isArray(data?.forecast)
        ? data.forecast.map((f: any) => ({
            date: f.date || '',
            maxTemp: typeof f.maxTemp === 'number' ? f.maxTemp : 25,
            minTemp: typeof f.minTemp === 'number' ? f.minTemp : 15,
            weatherCode: f.weatherCode || 0,
            weatherDesc: f.weatherDesc || '晴',
          }))
        : [];

      return {
        city: data?.city || city,
        temp,
        condition,
        feelsLike: typeof data?.feelsLike === 'number' ? data.feelsLike : temp,
        wind:
          data?.wind ||
          (data?.windSpeed ? `${data.windSpeed} km/h` : undefined),
        windSpeed: data?.windSpeed,
        humidity: data?.humidity ? `${data.humidity}%` : undefined,
        tips:
          data?.tips ||
          (condition.includes('雨')
            ? '今日有雨，建议携带雨具，出行注意安全。'
            : '微风不燥，阳光正好，适合出门走走。'),
        forecast,
      };
    } catch {
      // 降级离线默认数据
      return {
        city,
        temp: 22,
        condition: '晴朗',
        feelsLike: 22,
        tips: '微风不燥，阳光正好，适合出门走走。',
        forecast: [
          {
            date: '明天',
            maxTemp: 24,
            minTemp: 16,
            weatherCode: 0,
            weatherDesc: '晴',
          },
          {
            date: '后天',
            maxTemp: 22,
            minTemp: 15,
            weatherCode: 1,
            weatherDesc: '多云',
          },
          {
            date: '大后天',
            maxTemp: 21,
            minTemp: 14,
            weatherCode: 3,
            weatherDesc: '阴',
          },
        ],
      };
    }
  },
};
