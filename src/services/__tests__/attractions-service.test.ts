import { apiClient } from '../api-client';
import { AttractionsService } from '../attractions-service';

jest.mock('../api-client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

describe('AttractionsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getCities 成功获取城市列表', async () => {
    (apiClient.get as jest.Mock).mockResolvedValueOnce({
      data: [{ name: '北京' }, { name: '杭州' }],
    });

    const cities = await AttractionsService.getCities();
    expect(cities).toEqual(['北京', '杭州']);
  });

  it('getAttractions 过滤并标准化景点字段', async () => {
    (apiClient.get as jest.Mock).mockResolvedValueOnce({
      data: {
        list: [
          {
            id: 'att_1',
            name: '西湖断桥',
            city: '杭州',
            rating: 4.9,
            price: '免费',
          },
        ],
      },
    });

    const list = await AttractionsService.getAttractions({ city: '杭州' });
    expect(list.length).toBe(1);
    expect(list[0].id).toBe('att_1');
    expect(list[0].name).toBe('西湖断桥');
    expect(list[0].rating).toBe(4.9);
  });

  it('toggleFavorite 调用收藏接口并返回收藏布尔状态', async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      success: true,
      isFavorite: true,
    });

    const status = await AttractionsService.toggleFavorite('att_1');
    expect(status).toBe(true);
    expect(apiClient.post).toHaveBeenCalledWith('/api/attractions/att_1/favorite');
  });
});
