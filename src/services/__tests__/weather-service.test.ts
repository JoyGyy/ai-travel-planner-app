import { apiClient } from '../api-client';
import { WeatherService } from '../weather-service';

jest.mock('../api-client', () => ({
  apiClient: {
    get: jest.fn(),
  },
}));

describe('WeatherService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getCurrentCity 成功通过经纬度解析城市名', async () => {
    const city = await WeatherService.getCurrentCity();
    expect(city).toBe('北京');
  });

  it('getWeather 成功获取并格式化天气数据', async () => {
    (apiClient.get as jest.Mock).mockResolvedValueOnce({
      city: '杭州',
      temperature: 24,
      weather: '多云',
      wind: '东南风 2级',
      tips: '温度适宜，适合西湖漫步',
    });

    const result = await WeatherService.getWeather('杭州');

    expect(result.city).toBe('杭州');
    expect(result.temp).toBe(24);
    expect(result.condition).toBe('多云');
    expect(result.tips).toBe('温度适宜，适合西湖漫步');
  });

  it('getWeather 接口异常时返回兜底数据而不崩溃', async () => {
    (apiClient.get as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    const result = await WeatherService.getWeather('成都');

    expect(result.city).toBe('成都');
    expect(result.temp).toBe(22);
    expect(result.condition).toBe('晴朗');
  });
});
