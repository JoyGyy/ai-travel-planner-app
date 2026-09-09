import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ItineraryNode {
  id: string;
  time: string;
  placeName: string;
  description: string;
  transport?: string;
  visited?: boolean;
}

export interface ItineraryDay {
  day: number;
  theme: string;
  nodes: ItineraryNode[];
}

export interface ItineraryPlan {
  id: string;
  title: string;
  destination: string;
  totalDays: number;
  estimatedBudget?: string | number;
  summary?: string;
  days: ItineraryDay[];
  luggageChecklist?: string[];
  createdAt: number;
}

/** 构造默认天数与节点数据 */
export function generateDefaultDays(
  dest: string,
  total: number,
): ItineraryDay[] {
  return Array.from({ length: total }, (_, i) => ({
    day: i + 1,
    theme:
      i === 0
        ? '初见江南 · 经典漫步'
        : i === 1
          ? '烟火寻味 · 文化探秘'
          : '慢调归途 · 惬意小憩',
    nodes: [
      {
        id: `d${i + 1}_n1`,
        time: '09:30',
        placeName: i === 0 ? `${dest}核心地标游` : '文化街区与老字号',
        description: '早晨空气清爽，适合步行拍照打卡，避开下午人流高峰。',
        transport: '地铁 / 步行 800 米',
        visited: false,
      },
      {
        id: `d${i + 1}_n2`,
        time: '12:30',
        placeName: '地道风味私房菜',
        description: '品尝当地老饕推荐特色菜，小憩充电。',
        transport: '步行 5 分钟',
        visited: false,
      },
      {
        id: `d${i + 1}_n3`,
        time: '15:00',
        placeName: '自然风光与小众秘境',
        description: '依山傍水，感受独具一格的旅行慢节奏与手账留白。',
        transport: '打车约 15 分钟',
        visited: false,
      },
    ],
  }));
}

/** 将外部/AI返回的非标准 plan 数据格式化为标准 ItineraryPlan */
export function normalizeItineraryPlan(raw: any): ItineraryPlan {
  if (!raw) {
    return {
      id: `plan_${Date.now()}`,
      title: '旅行手账行程',
      destination: '旅行目的地',
      totalDays: 3,
      estimatedBudget: '¥1,500 ~ ¥2,500',
      summary: 'AI 深度定制的手账旅行路线，不赶路，更惬意。',
      days: generateDefaultDays('旅行目的地', 3),
      createdAt: Date.now(),
    };
  }

  const dest = raw.destination || '旅行目的地';
  const totalDays =
    raw.totalDays ||
    (Array.isArray(raw.days)
      ? raw.days.length
      : typeof raw.days === 'number'
        ? raw.days
        : 3);

  const days =
    Array.isArray(raw.days) && raw.days[0]?.nodes
      ? raw.days
      : generateDefaultDays(dest, totalDays);

  return {
    id: raw.id || `plan_${Date.now()}`,
    title: raw.title || `${dest}手账行程`,
    destination: dest,
    totalDays,
    estimatedBudget: raw.estimatedBudget || raw.budget || '¥1,500 ~ ¥2,500',
    summary: raw.summary || 'AI 深度定制的手账旅行路线，不赶路，更惬意。',
    days,
    luggageChecklist: raw.luggageChecklist || [],
    createdAt: raw.createdAt || Date.now(),
  };
}

const STORAGE_KEY = '@saved_itineraries';

export interface ItineraryState {
  savedPlans: ItineraryPlan[];
  isLoading: boolean;

  /** 从本地 AsyncStorage 加载保存的行程 */
  loadSavedPlans: () => Promise<void>;

  /** 保存或更新行程手账 */
  savePlan: (plan: ItineraryPlan) => Promise<void>;

  /** 删除本地行程手账 */
  removePlan: (id: string) => Promise<void>;

  /** 切换行程某个节点的打卡状态 */
  toggleNodeVisited: (
    planId: string,
    dayNumber: number,
    nodeId: string,
  ) => Promise<void>;

  /** 获取指定 ID 的行程（优先内存，再查本地） */
  getPlanById: (id: string) => ItineraryPlan | undefined;
}

export const useItineraryStore = create<ItineraryState>((set, get) => ({
  savedPlans: [],
  isLoading: false,

  loadSavedPlans: async () => {
    set({ isLoading: true });
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const plans = JSON.parse(raw) as ItineraryPlan[];
        set({ savedPlans: plans });
      }
    } catch (e) {
      console.warn('loadSavedPlans error:', e);
    } finally {
      set({ isLoading: false });
    }
  },

  savePlan: async (plan: ItineraryPlan) => {
    const normalized = normalizeItineraryPlan(plan);
    const plans = get().savedPlans;
    const existsIdx = plans.findIndex((p) => p.id === normalized.id);
    let nextPlans: ItineraryPlan[];

    if (existsIdx !== -1) {
      nextPlans = [...plans];
      nextPlans[existsIdx] = normalized;
    } else {
      nextPlans = [normalized, ...plans];
    }

    set({ savedPlans: nextPlans });
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextPlans));
    } catch (e) {
      console.warn('savePlan storage error:', e);
    }
  },

  removePlan: async (id: string) => {
    const nextPlans = get().savedPlans.filter((p) => p.id !== id);
    set({ savedPlans: nextPlans });
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextPlans));
    } catch (e) {
      console.warn('removePlan storage error:', e);
    }
  },

  toggleNodeVisited: async (
    planId: string,
    dayNumber: number,
    nodeId: string,
  ) => {
    const plans = get().savedPlans;
    const plan = plans.find((p) => p.id === planId);
    if (!plan) return;

    const updatedDays = plan.days.map((d) => {
      if (d.day !== dayNumber) return d;
      return {
        ...d,
        nodes: d.nodes.map((n) =>
          n.id === nodeId ? { ...n, visited: !n.visited } : n,
        ),
      };
    });

    const updatedPlan = { ...plan, days: updatedDays };
    await get().savePlan(updatedPlan);
  },

  getPlanById: (id: string) => {
    return get().savedPlans.find((p) => p.id === id);
  },
}));
