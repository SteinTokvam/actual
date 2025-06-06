// @ts-strict-ignore
import React, { useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';

import { AlignedText } from '@actual-app/components/aligned-text';
import { theme } from '@actual-app/components/theme';
import { css } from '@emotion/css';
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

import {
  amountToCurrency,
  amountToCurrencyNoDecimal,
} from 'loot-core/shared/util';
import {
  type balanceTypeOpType,
  type DataEntity,
  type RuleConditionEntity,
} from 'loot-core/types/models';

import { Container } from '../Container';
import { getCustomTick } from '../getCustomTick';
import { numberFormatterTooltip } from '../numberFormatter';

import { showActivity } from './showActivity';

import { useAccounts } from '@desktop-client/hooks/useAccounts';
import { useCategories } from '@desktop-client/hooks/useCategories';
import { useNavigate } from '@desktop-client/hooks/useNavigate';
import { usePrivacyMode } from '@desktop-client/hooks/usePrivacyMode';

type PayloadItem = {
  dataKey: string;
  value: number;
  date: string;
  color: string;
  payload: {
    date: string;
  };
};

type CustomTooltipProps = {
  compact: boolean;
  tooltip: string;
  active?: boolean;
  payload?: PayloadItem[];
};

const CustomTooltip = ({
  compact,
  tooltip,
  active,
  payload,
}: CustomTooltipProps) => {
  const { t } = useTranslation();
  if (active && payload && payload.length) {
    let sumTotals = 0;
    return (
      <div
        className={css({
          zIndex: 1000,
          pointerEvents: 'none',
          borderRadius: 2,
          boxShadow: '0 1px 6px rgba(0, 0, 0, .20)',
          backgroundColor: theme.menuBackground,
          color: theme.menuItemText,
          padding: 10,
        })}
      >
        <div>
          <div style={{ marginBottom: 10 }}>
            <strong>{payload[0].payload.date}</strong>
          </div>
          <div style={{ lineHeight: 1.5 }}>
            {payload
              .sort((p1: PayloadItem, p2: PayloadItem) => p2.value - p1.value)
              .map((p: PayloadItem, index: number) => {
                sumTotals += p.value;
                return (
                  (compact ? index < 4 : true) && (
                    <AlignedText
                      key={index}
                      left={p.dataKey}
                      right={amountToCurrency(p.value)}
                      style={{
                        color: p.color,
                        textDecoration:
                          tooltip === p.dataKey ? 'underline' : 'inherit',
                      }}
                    />
                  )
                );
              })}
            {payload.length > 5 && compact && '...'}
            <AlignedText
              left={t('Total')}
              right={amountToCurrency(sumTotals)}
              style={{
                fontWeight: 600,
              }}
            />
          </div>
        </div>
      </div>
    );
  }
};

type LineGraphProps = {
  style?: CSSProperties;
  data: DataEntity;
  filters: RuleConditionEntity[];
  groupBy: string;
  compact?: boolean;
  balanceTypeOp: balanceTypeOpType;
  showHiddenCategories?: boolean;
  showOffBudget?: boolean;
  showTooltip?: boolean;
  interval?: string;
};

export function LineGraph({
  style,
  data,
  filters,
  groupBy,
  compact,
  balanceTypeOp,
  showHiddenCategories,
  showOffBudget,
  showTooltip = true,
  interval,
}: LineGraphProps) {
  const navigate = useNavigate();
  const categories = useCategories();
  const accounts = useAccounts();
  const privacyMode = usePrivacyMode();
  const [pointer, setPointer] = useState('');
  const [tooltip, setTooltip] = useState('');

  const largestValue = data.intervalData
    .map(c => c[balanceTypeOp])
    .reduce((acc, cur) => (Math.abs(cur) > Math.abs(acc) ? cur : acc), 0);

  const leftMargin = Math.abs(largestValue) > 1000000 ? 20 : 5;

  const onShowActivity = (item, id, payload) => {
    showActivity({
      navigate,
      categories,
      accounts,
      balanceTypeOp,
      filters,
      showHiddenCategories,
      showOffBudget,
      type: 'time',
      startDate: payload.payload.intervalStartDate,
      endDate: payload.payload.intervalEndDate,
      field: groupBy.toLowerCase(),
      id,
      interval,
    });
  };

  return (
    <Container
      style={{
        ...style,
        ...(compact && { height: 'auto' }),
      }}
    >
      {(width, height) =>
        data && (
          <ResponsiveContainer>
            <div>
              {!compact && <div style={{ marginTop: '15px' }} />}
              <LineChart
                width={width}
                height={height}
                data={data.intervalData}
                margin={{ top: 10, right: 10, left: leftMargin, bottom: 10 }}
                style={{ cursor: pointer }}
              >
                {showTooltip && (
                  <Tooltip
                    content={
                      <CustomTooltip compact={compact} tooltip={tooltip} />
                    }
                    formatter={numberFormatterTooltip}
                    isAnimationActive={false}
                  />
                )}
                {!compact && <CartesianGrid strokeDasharray="3 3" />}
                {!compact && (
                  <XAxis
                    dataKey="date"
                    tick={{ fill: theme.pageText }}
                    tickLine={{ stroke: theme.pageText }}
                  />
                )}
                {!compact && (
                  <YAxis
                    tickFormatter={value =>
                      getCustomTick(
                        amountToCurrencyNoDecimal(value),
                        privacyMode,
                      )
                    }
                    tick={{ fill: theme.pageText }}
                    tickLine={{ stroke: theme.pageText }}
                    tickSize={0}
                  />
                )}
                {data.legend.map((entry, index) => {
                  return (
                    <Line
                      key={index}
                      strokeWidth={2}
                      type="monotone"
                      dataKey={entry.name}
                      stroke={entry.color}
                      activeDot={{
                        r: entry.name === tooltip && !compact ? 8 : 3,
                        onMouseEnter: () => {
                          setTooltip(entry.name);
                          if (!['Group', 'Interval'].includes(groupBy)) {
                            setPointer('pointer');
                          }
                        },
                        onMouseLeave: () => {
                          setPointer('');
                          setTooltip('');
                        },
                        onClick: (e, payload) =>
                          ((compact && showTooltip) || !compact) &&
                          !['Group', 'Interval'].includes(groupBy) &&
                          onShowActivity(e, entry.id, payload),
                      }}
                    />
                  );
                })}
              </LineChart>
            </div>
          </ResponsiveContainer>
        )
      }
    </Container>
  );
}
