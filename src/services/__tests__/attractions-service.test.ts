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

  it('getCities 成功从后端返回的 cities 数组提取城市列表', async () => {
    (apiClient.get as jest.Mock).mockResolvedValueOnce({
      data: { cities: ['北京', '杭州', '成都'] },
    });

    const cities = await AttractionsService.getCities();
    expect(cities).toEqual(['全部', '北京', '杭州', '成都']);
  });

  it('getAttractions 适配后端 items 结构，拼接相对图片路径并转换标签和价格', async () => {
    (apiClient.get as jest.Mock).mockResolvedValueOnce({
      data: {
        items: [
          {
            id: 'att_1',
            name: '束河古镇',
            city: '丽江',
            coverImage: '/images/attractions/lijiang/shuhe.webp',
            priceText: '免费开放，部分项目另收费',
            tags: ['历史', '文化'],
            tips: ['建议清晨前往', '注意防晒'],
          },
        ],
      },
    });

    const list = await AttractionsService.getAttractions({
      city: '丽江',
      category: '历史人文',
    });

    expect(list.length).toBe(1);
    expect(list[0].id).toBe('att_1');
    expect(list[0].name).toBe('束河古镇');
    expect(list[0].city).toBe('丽江');
    expect(list[0].category).toBe('历史');
    expect(list[0].price).toBe('免费开放，部分项目另收费');
    expect(list[0].imageUrl).toMatch(/\/images\/attractions\/lijiang\/shuhe\.webp$/);
    expect(list[0].tips).toBe('建议清晨前往；注意防晒');

    // 验证 category 被正确映射为 tag 参数
    expect(apiClient.get).toHaveBeenCalledWith(
      '/api/attractions',
      expect.objectContaining({
        city: '丽江',
        tag: '历史',
      }),
      expect.anything(),
    );
  });

  it('getAttractionDetail 成功解析后端嵌套的 attraction 对象', async () => {
    (apiClient.get as jest.Mock).mockResolvedValueOnce({
      data: {
        attraction: {
          id: 'att_1',
          name: '束河古镇',
          city: '丽江',
          coverImage: '/images/attractions/lijiang/shuhe.webp',
          priceText: '免费开放',
          tags: ['历史'],
          description: '宁静的纳西小镇',
        },
        isFavorite: true,
      },
    });

    const detail = await AttractionsService.getAttractionDetail('att_1');
    expect(detail).not.toBeNull();
    expect(detail?.name).toBe('束河古镇');
    expect(detail?.isFavorite).toBe(true);
    expect(detail?.description).toBe('宁静的纳西小镇');
  });

  it('toggleFavorite 调用收藏接口并返回收藏布尔状态', async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      success: true,
      isFavorite: true,
    });

    const status = await AttractionsService.toggleFavorite('att_1');
    expect(status).toBe(true);
    expect(apiClient.post).toHaveBeenCalledWith(
      '/api/attractions/att_1/favorite',
    );
  });

  it('getFavoriteIds 与 getFavoriteAttractions 正确解析后端返回的收藏 items', async () => {
    (apiClient.get as jest.Mock).mockResolvedValueOnce({
      data: {
        items: [
          {
            id: 'fav_1',
            name: '西湖',
            city: '杭州',
            priceText: '免费',
          },
        ],
      },
      success: true,
    });

    const ids = await AttractionsService.getFavoriteIds();
    expect(ids).toEqual(['fav_1']);

    (apiClient.get as jest.Mock).mockResolvedValueOnce({
      data: {
        items: [
          {
            id: 'fav_1',
            name: '西湖',
            city: '杭州',
            priceText: '免费',
          },
        ],
      },
      success: true,
    });

    const items = await AttractionsService.getFavoriteAttractions();
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe('西湖');
    expect(items[0].isFavorite).toBe(true);
  });
});
