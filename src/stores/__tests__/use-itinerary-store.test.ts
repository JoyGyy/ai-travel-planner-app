import AsyncStorage from '@react-native-async-storage/async-storage';
import { ItineraryPlan, useItineraryStore } from '../use-itinerary-store';

describe('useItineraryStore', () => {
  const mockPlan: ItineraryPlan = {
    id: 'plan_001',
    title: '杭州西湖慢游3日手账',
    destination: '杭州',
    totalDays: 3,
    createdAt: Date.now(),
    days: [
      {
        day: 1,
        theme: '西湖初见',
        nodes: [
          {
            id: 'node_1',
            time: '09:00',
            placeName: '断桥残雪',
            description: '漫步白堤，感受西湖湖光山色',
            visited: false,
          },
        ],
      },
    ],
  };

  beforeEach(async () => {
    await AsyncStorage.clear();
    useItineraryStore.setState({ savedPlans: [], isLoading: false });
  });

  it('savePlan 能够将行程保存至内存与 AsyncStorage', async () => {
    await useItineraryStore.getState().savePlan(mockPlan);

    expect(useItineraryStore.getState().savedPlans.length).toBe(1);
    expect(useItineraryStore.getState().savedPlans[0].id).toBe('plan_001');

    const storedRaw = await AsyncStorage.getItem('@saved_itineraries');
    expect(storedRaw).toBeTruthy();
    const parsed = JSON.parse(storedRaw!);
    expect(parsed[0].title).toBe('杭州西湖慢游3日手账');
  });

  it('toggleNodeVisited 能够更新节点的打卡状态', async () => {
    await useItineraryStore.getState().savePlan(mockPlan);

    await useItineraryStore
      .getState()
      .toggleNodeVisited('plan_001', 1, 'node_1');

    const plan = useItineraryStore.getState().getPlanById('plan_001');
    expect(plan?.days[0].nodes[0].visited).toBe(true);

    // 再次点击切换为未打卡
    await useItineraryStore
      .getState()
      .toggleNodeVisited('plan_001', 1, 'node_1');
    const planAfter = useItineraryStore.getState().getPlanById('plan_001');
    expect(planAfter?.days[0].nodes[0].visited).toBe(false);
  });

  it('removePlan 能够删除指定行程', async () => {
    await useItineraryStore.getState().savePlan(mockPlan);
    expect(useItineraryStore.getState().savedPlans.length).toBe(1);

    await useItineraryStore.getState().removePlan('plan_001');
    expect(useItineraryStore.getState().savedPlans.length).toBe(0);
  });

  it('loadSavedPlans 能够从本地缓存恢复行程数据', async () => {
    await AsyncStorage.setItem(
      '@saved_itineraries',
      JSON.stringify([mockPlan])
    );

    await useItineraryStore.getState().loadSavedPlans();
    expect(useItineraryStore.getState().savedPlans.length).toBe(1);
    expect(useItineraryStore.getState().savedPlans[0].id).toBe('plan_001');
  });
});

