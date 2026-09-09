import * as Location from 'expo-location';
import { API_ENDPOINTS } from '@/constants/config';
import { apiClient } from './api-client';

export interface WeatherData {
  city: string;
  temp: number;
  condition: string;
  wind?: string;
  humidity?: string;
  tips: string;
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
      return {
        city: data?.city || city,
        temp: typeof data?.temperature === 'number' ? data.temperature : 22,
        condition: data?.condition || data?.weather || '晴',
        wind: data?.wind,
        humidity: data?.humidity ? `${data.humidity}%` : undefined,
        tips: data?.tips || '今日天气适宜出行，开启一段好心情旅行吧！',
      };
    } catch {
      // 降级离线默认数据
      return {
        city,
        temp: 22,
        condition: '晴朗',
        tips: '微风不燥，阳光正好，适合出门走走。',
      };
    }
  },
};
