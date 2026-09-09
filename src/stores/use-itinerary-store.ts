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
  toggleNodeVisited: (planId: string, dayNumber: number, nodeId: string) => Promise<void>;

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
    const plans = get().savedPlans;
    const existsIdx = plans.findIndex((p) => p.id === plan.id);
    let nextPlans: ItineraryPlan[];

    if (existsIdx !== -1) {
      nextPlans = [...plans];
      nextPlans[existsIdx] = plan;
    } else {
      nextPlans = [plan, ...plans];
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

  toggleNodeVisited: async (planId: string, dayNumber: number, nodeId: string) => {
    const plans = get().savedPlans;
    const plan = plans.find((p) => p.id === planId);
    if (!plan) return;

    const updatedDays = plan.days.map((d) => {
      if (d.day !== dayNumber) return d;
      return {
        ...d,
        nodes: d.nodes.map((n) =>
          n.id === nodeId ? { ...n, visited: !n.visited } : n
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

