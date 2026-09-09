import { Share } from 'react-native';
import { apiClient } from '../api-client';
import { ShareService } from '../share-service';
import { ItineraryPlan } from '@/stores/use-itinerary-store';

jest.mock('../api-client', () => ({
  apiClient: {
    post: jest.fn(),
  },
}));

jest.spyOn(Share, 'share').mockImplementation(
  jest.fn().mockResolvedValue({
    action: 'sharedAction',
    activityType: null,
  }),
);

const mockPlan: ItineraryPlan = {
  id: 'plan_1',
  title: '杭州西湖手账漫游',
  destination: '杭州',
  totalDays: 2,
  estimatedBudget: '¥1,500',
  summary: '感受西湖温润的江南烟雨',
  createdAt: 1700000000000,
  days: [
    {
      day: 1,
      theme: '环湖慢跑',
      nodes: [
        {
          id: 'n1',
          time: '09:00',
          placeName: '断桥残雪',
          description: '清晨看湖面薄雾',
        },
      ],
    },
  ],
};

describe('ShareService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('createCloudShare 成功调用 API 并返回 shareId 和 shareUrl', async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      shareId: 'share_xyz123',
      shareUrl: '/share/share_xyz123',
      success: true,
    });

    const result = await ShareService.createCloudShare(mockPlan);

    expect(result.shareId).toBe('share_xyz123');
    expect(result.shareUrl).toBe('/share/share_xyz123');
    expect(apiClient.post).toHaveBeenCalledWith(
      '/api/travel/share',
      expect.objectContaining({
        city: '杭州',
        days: 2,
      }),
    );
  });

  it('shareNativeItinerary 成功唤起原生 Share 并格式化手账文案', async () => {
    const success = await ShareService.shareNativeItinerary(
      mockPlan,
      '/share/xyz',
    );

    expect(success).toBe(true);
    expect(Share.share).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '杭州西湖手账漫游',
        message: expect.stringContaining('杭州西湖手账漫游'),
      }),
    );
  });
});
