import React from 'react';
import { Text } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { JournalCard } from '../JournalCard';
import { StampBadge } from '../StampBadge';
import { JournalButton } from '../JournalButton';

describe('Journal UI Components', () => {
  it('JournalCard 能正确渲染子组件', async () => {
    await render(
      <JournalCard>
        <Text>手账内容卡片</Text>
      </JournalCard>,
    );
    expect(screen.getByText('手账内容卡片')).toBeTruthy();
  });

  it('StampBadge 能正确显示印章文字', async () => {
    await render(<StampBadge label="已打卡" color="red" />);
    expect(screen.getByText('已打卡')).toBeTruthy();
  });

  it('JournalButton 点击时触发点击事件并调用 Haptics 振动', async () => {
    const onPressMock = jest.fn();
    await render(
      <JournalButton title="确认保存" onPress={onPressMock} haptic={true} />,
    );

    const button = screen.getByText('确认保存');
    fireEvent.press(button);

    expect(onPressMock).toHaveBeenCalledTimes(1);
    expect(Haptics.impactAsync).toHaveBeenCalledWith(
      Haptics.ImpactFeedbackStyle.Light,
    );
  });
});
