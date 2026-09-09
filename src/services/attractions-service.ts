import { API_BASE_URL, API_ENDPOINTS } from '@/constants/config';
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

/** 前端大类到后端景点标签的映射 */
export const CATEGORY_TAG_MAP: Record<string, string> = {
  全部: '',
  自然风光: '自然',
  历史人文: '历史',
  特色美食: '美食',
  拍照打卡: '摄影',
};

/** 解析图片地址，若为以 / 开头的后端静态资源相对路径则拼接 API_BASE_URL */
export function resolveImageUrl(rawImg?: string): string {
  if (!rawImg) {
    return 'https://images.unsplash.com/photo-1599571234909-29ed5d1321d6?w=600';
  }
  if (rawImg.startsWith('http://') || rawImg.startsWith('https://')) {
    return rawImg;
  }
  if (rawImg.startsWith('/')) {
    return `${API_BASE_URL.replace(/\/$/, '')}${rawImg}`;
  }
  return rawImg;
}

export const AttractionsService = {
  /** 获取可选城市列表 */
  async getCities(): Promise<string[]> {
    try {
      const res = await apiClient.get<any>(API_ENDPOINTS.ATTRACTIONS, undefined, {
        skipAuth: true,
      });
      if (Array.isArray(res?.data?.cities) && res.data.cities.length > 0) {
        return ['全部', ...res.data.cities];
      }
      if (Array.isArray(res?.data) && res.data.length > 0) {
        return [
          '全部',
          ...res.data.map((c: any) => (typeof c === 'string' ? c : c.name)),
        ];
      }
      return [
        '全部',
        '北京',
        '上海',
        '杭州',
        '成都',
        '西安',
        '三亚',
        '丽江',
        '南京',
        '厦门',
        '大理',
      ];
    } catch {
      return [
        '全部',
        '北京',
        '上海',
        '杭州',
        '成都',
        '西安',
        '三亚',
        '丽江',
        '南京',
        '厦门',
        '大理',
      ];
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
      if (params?.city && params.city !== '全部') {
        cleanParams.city = params.city;
      }
      if (params?.category && params.category !== '全部') {
        cleanParams.tag =
          CATEGORY_TAG_MAP[params.category] || params.category;
      }
      if (params?.keyword?.trim()) {
        cleanParams.keyword = params.keyword.trim();
      }
      if (params?.limit) {
        cleanParams.pageSize = params.limit;
      }

      const res = await apiClient.get<any>(
        API_ENDPOINTS.ATTRACTIONS,
        cleanParams,
        {
          skipAuth: true,
        },
      );

      // 后端返回结构为 { data: { items: [...], cities: [...], tags: [...] } }
      const list =
        res?.data?.items ||
        res?.data?.list ||
        (Array.isArray(res?.data) ? res.data : null) ||
        res?.attractions ||
        (Array.isArray(res) ? res : []);

      if (Array.isArray(list)) {
        return list.map((item: any) => {
          const rawImg =
            item.coverImage ||
            item.imageUrl ||
            item.image ||
            item.cover;
          const imageUrl = resolveImageUrl(rawImg);

          const price =
            item.priceText ||
            (typeof item.price === 'number' ? `¥${item.price}` : item.price) ||
            '免费开放';

          const category =
            item.category ||
            (Array.isArray(item.tags) && item.tags.length > 0
              ? item.tags[0]
              : '自然风光');

          const tips = Array.isArray(item.tips)
            ? item.tips.join('；')
            : item.tips || '建议清晨前往，避开人流。';

          return {
            id: String(item.id || item._id),
            name: item.name || '景点名称',
            city: item.city || '国内',
            category,
            rating: typeof item.rating === 'number' ? item.rating : 4.8,
            price,
            imageUrl,
            description:
              item.description ||
              item.summary ||
              item.intro ||
              '历史悠久，景色秀丽。',
            address: item.address || `${item.city || ''}核心风景区`,
            openingHours: item.openingHours || '08:30 - 17:30',
            recommendedDuration: item.recommendedDuration || '2-3 小时',
            tips,
            isFavorite: !!item.isFavorite,
          };
        });
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
        { skipAuth: true },
      );
      const data = res?.data?.attraction || res?.data || res;
      if (!data) return null;

      const rawImg =
        data.coverImage ||
        data.imageUrl ||
        data.image ||
        data.cover;
      const imageUrl = resolveImageUrl(rawImg);

      const price =
        data.priceText ||
        (typeof data.price === 'number' ? `¥${data.price}` : data.price) ||
        '免费开放';

      const category =
        data.category ||
        (Array.isArray(data.tags) && data.tags.length > 0
          ? data.tags[0]
          : '自然风光');

      const tips = Array.isArray(data.tips)
        ? data.tips.join('；')
        : data.tips || '';

      return {
        id: String(data.id || id),
        name: data.name,
        city: data.city || '城市',
        category,
        rating: typeof data.rating === 'number' ? data.rating : 4.8,
        price,
        imageUrl,
        description: data.description || data.summary,
        address: data.address,
        openingHours: data.openingHours,
        recommendedDuration: data.recommendedDuration,
        tips,
        isFavorite: !!(res?.data?.isFavorite ?? data.isFavorite),
      };
    } catch {
      return null;
    }
  },

  /** 切换景点收藏状态 (需要 Bearer Token) */
  async toggleFavorite(id: string): Promise<boolean> {
    try {
      const res = await apiClient.post<any>(
        API_ENDPOINTS.ATTRACTION_FAVORITE(id),
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
      const items =
        res?.data?.items ||
        (Array.isArray(res?.data) ? res.data : []) ||
        res?.items ||
        [];
      if (Array.isArray(items)) {
        return items.map((item: any) => String(item.id || item._id || item));
      }
      return [];
    } catch {
      return [];
    }
  },

  /** 获取当前登录用户收藏的完整景点列表 */
  async getFavoriteAttractions(): Promise<AttractionItem[]> {
    try {
      const res = await apiClient.get<any>(API_ENDPOINTS.FAVORITES);
      const items =
        res?.data?.items ||
        (Array.isArray(res?.data) ? res.data : []) ||
        res?.items ||
        [];

      if (Array.isArray(items)) {
        return items.map((item: any) => {
          const rawImg =
            item.coverImage ||
            item.imageUrl ||
            item.image ||
            item.cover;
          const imageUrl = resolveImageUrl(rawImg);

          const price =
            item.priceText ||
            (typeof item.price === 'number' ? `¥${item.price}` : item.price) ||
            '免费开放';

          const category =
            item.category ||
            (Array.isArray(item.tags) && item.tags.length > 0
              ? item.tags[0]
              : '自然风光');

          const tips = Array.isArray(item.tips)
            ? item.tips.join('；')
            : item.tips || '';

          return {
            id: String(item.id || item._id),
            name: item.name || '景点名称',
            city: item.city || '国内',
            category,
            rating: typeof item.rating === 'number' ? item.rating : 4.8,
            price,
            imageUrl,
            description:
              item.description || item.summary || '历史悠久，景色秀丽。',
            address: item.address || `${item.city || ''}风景名胜区`,
            openingHours: item.openingHours || '08:30 - 17:30',
            recommendedDuration: item.recommendedDuration || '2-3 小时',
            tips,
            isFavorite: true,
          };
        });
      }
      return [];
    } catch {
      return [];
    }
  },
};
