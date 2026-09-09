import React from 'react';
import { Text } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { JournalCard } from '../JournalCard';
import { StampBadge } from '../StampBadge';
import { JournalButton } from '../JournalButton';
import { MarkdownText } from '../MarkdownText';

describe('Journal UI Components', () => {
  it('JournalCard 能正确渲染子组件', async () => {
    await render(
      <JournalCard>
        <Text>手账内容卡片</Text>
      </JournalCard>,
    );
    expect(screen.getByText('手账内容卡片')).toBeTruthy();
  });

  it('StampBadge 能正确显示印章文字，并支持 animated 动效属性', async () => {
    await render(<StampBadge label="已打卡" color="red" animated={true} />);
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

  it('MarkdownText 能正确格式化标题、加粗及列表', async () => {
    const sample = [
      '# 杭州旅行攻略',
      '## 第一天行程',
      '今日重点游览 **西湖风景区**',
      '- 漫步苏堤春晓',
      '> 出行贴士：建议清晨前往',
    ].join('\n');

    await render(<MarkdownText content={sample} />);

    expect(screen.getByText('杭州旅行攻略')).toBeTruthy();
    expect(screen.getByText('第一天行程')).toBeTruthy();
    expect(screen.getByText('西湖风景区')).toBeTruthy();
    expect(screen.getByText('漫步苏堤春晓')).toBeTruthy();
    expect(screen.getByText('出行贴士：建议清晨前往')).toBeTruthy();
  });
});
