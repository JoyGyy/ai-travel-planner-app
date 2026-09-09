import { API_ENDPOINTS } from '@/constants/config';
import { apiClient } from './api-client';

export interface AttractionItem {
  id: string;
  name: string;
  city: string;
  category?: string;
  rating?: number;
  price?: string | number;
  imageUrl?: string;
  description?: string;
  address?: string;
  openingHours?: string;
  recommendedDuration?: string;
  tips?: string;
  isFavorite?: boolean;
}

export const AttractionsService = {
  /** 获取可选城市列表 */
  async getCities(): Promise<string[]> {
    try {
      const res = await apiClient.get<any>(API_ENDPOINTS.CITIES, undefined, {
        skipAuth: true,
      });
      if (Array.isArray(res?.data)) {
        return res.data.map((c: any) => (typeof c === 'string' ? c : c.name));
      }
      if (Array.isArray(res)) {
        return res.map((c: any) => (typeof c === 'string' ? c : c.name));
      }
      return ['全部', '北京', '上海', '杭州', '成都', '三亚', '西安', '厦门'];
    } catch {
      return ['全部', '北京', '上海', '杭州', '成都', '三亚', '西安', '厦门'];
    }
  },

  /** 分页或筛选获取景点列表 */
  async getAttractions(params?: {
    city?: string;
    category?: string;
    keyword?: string;
    limit?: number;
  }): Promise<AttractionItem[]> {
    try {
      const cleanParams: Record<string, string | number> = {};
      if (params?.city && params.city !== '全部') cleanParams.city = params.city;
      if (params?.category && params.category !== '全部')
        cleanParams.category = params.category;
      if (params?.keyword?.trim()) cleanParams.keyword = params.keyword.trim();
      if (params?.limit) cleanParams.limit = params.limit;

      const res = await apiClient.get<any>(API_ENDPOINTS.ATTRACTIONS, cleanParams, {
        skipAuth: true,
      });

      const list = res?.data?.list || res?.data || res?.attractions || res;
      if (Array.isArray(list)) {
        return list.map((item: any) => ({
          id: String(item.id || item._id),
          name: item.name || '景点名称',
          city: item.city || '国内',
          category: item.category || '自然风光',
          rating: typeof item.rating === 'number' ? item.rating : 4.8,
          price: item.price !== undefined ? item.price : '免费',
          imageUrl:
            item.imageUrl ||
            item.image ||
            item.cover ||
            'https://images.unsplash.com/photo-1599571234909-29ed5d1321d6?w=600',
          description: item.description || item.intro || '历史悠久，景色秀丽。',
          address: item.address || '城市核心风景区',
          openingHours: item.openingHours || '08:30 - 17:30',
          recommendedDuration: item.recommendedDuration || '2-3 小时',
          tips: item.tips || '建议清晨前往，避开人流。',
          isFavorite: !!item.isFavorite,
        }));
      }
      return [];
    } catch {
      return [];
    }
  },

  /** 获取景点详情 */
  async getAttractionDetail(id: string): Promise<AttractionItem | null> {
    try {
      const res = await apiClient.get<any>(
        API_ENDPOINTS.ATTRACTION_DETAIL(id),
        undefined,
        { skipAuth: true }
      );
      const data = res?.data || res;
      if (!data) return null;
      return {
        id: String(data.id || id),
        name: data.name,
        city: data.city || '城市',
        category: data.category,
        rating: data.rating || 4.8,
        price: data.price !== undefined ? data.price : '免费',
        imageUrl: data.imageUrl || data.image,
        description: data.description,
        address: data.address,
        openingHours: data.openingHours,
        recommendedDuration: data.recommendedDuration,
        tips: data.tips,
        isFavorite: !!data.isFavorite,
      };
    } catch {
      return null;
    }
  },

  /** 切换景点收藏状态 (需要 Bearer Token) */
  async toggleFavorite(id: string): Promise<boolean> {
    try {
      const res = await apiClient.post<any>(
        API_ENDPOINTS.ATTRACTION_FAVORITE(id)
      );
      return res?.isFavorite ?? true;
    } catch (e) {
      throw e;
    }
  },

  /** 获取当前登录用户的收藏景点 ID 列表 */
  async getFavoriteIds(): Promise<string[]> {
    try {
      const res = await apiClient.get<any>(API_ENDPOINTS.FAVORITES);
      if (Array.isArray(res?.data)) {
        return res.data.map((item: any) => String(item.id || item));
      }
      return [];
    } catch {
      return [];
    }
  },
};
