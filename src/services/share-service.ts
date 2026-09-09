import { Share } from 'react-native';
import { API_BASE_URL, API_ENDPOINTS } from '@/constants/config';
import { ItineraryPlan } from '@/stores/use-itinerary-store';
import { apiClient } from './api-client';

export interface CloudShareResult {
  shareId: string;
  shareUrl: string;
}

export const ShareService = {
  /**
   * 将行程上传同步至云端，生成公开分享链接
   */
  async createCloudShare(plan: ItineraryPlan): Promise<CloudShareResult> {
    const payload = {
      city: plan.destination || '旅行目的地',
      days: plan.totalDays || plan.days?.length || 3,
      budget: String(plan.estimatedBudget || '¥1,500'),
      itinerary: {
        title: plan.title,
        destination: plan.destination,
        totalDays: plan.totalDays,
        budget: plan.estimatedBudget,
        summary: plan.summary,
        days: plan.days,
        createdAt: plan.createdAt,
      },
    };

    const res = await apiClient.post<any>(
      API_ENDPOINTS.TRAVEL_SHARE,
      payload,
    );

    const shareId = res?.shareId || `share_${Date.now()}`;
    const shareUrl = res?.shareUrl || `/share/${shareId}`;

    return {
      shareId,
      shareUrl,
    };
  },

  /**
   * 生成手账卡片文本排版并通过系统原生 Share Sheet 分享给好友/朋友圈
   */
  async shareNativeItinerary(
    plan: ItineraryPlan,
    shareUrl?: string,
  ): Promise<boolean> {
    const fullUrl = shareUrl
      ? shareUrl.startsWith('http')
        ? shareUrl
        : `${API_BASE_URL.replace(/\/$/, '')}${shareUrl}`
      : undefined;

    const daysSummary = plan.days
      .map((d) => {
        const spots = d.nodes.map((n) => n.placeName).join(' ➔ ');
        return `📅 Day ${d.day} [${d.theme}]: ${spots || '自由漫游'}`;
      })
      .join('\n');

    const message = [
      `📖【旅行家手账】${plan.title}`,
      `📍 目的地：${plan.destination || '精彩旅途'} · ${plan.totalDays} 日游`,
      `💰 预算建议：${plan.estimatedBudget || '¥1,500 ~ ¥2,500'}`,
      `🌿 行程亮点：${plan.summary || '慢节奏，享美景，品地道风味'}`,
      `------------------------`,
      daysSummary,
      fullUrl ? `\n🔗 点击查看完整在线手账: ${fullUrl}` : '',
      `\n✨ 来自「AI 旅行手账」APP 倾心定制`,
    ]
      .filter(Boolean)
      .join('\n');

    try {
      const result = await Share.share({
        title: plan.title,
        message,
      });
      return result.action === Share.sharedAction;
    } catch (e) {
      console.warn('Share error:', e);
      return false;
    }
  },
};

