import React from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import Svg, {
  Rect,
  Line,
  Circle,
  Path,
  Text as SvgText,
} from "react-native-svg";
import { colors, spacing, radii } from "../theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Bar Chart Component
export function BarChart({ data, title, height = 200 }) {
  if (!data || data.length === 0) return null;

  const chartWidth = SCREEN_WIDTH - spacing.lg * 4;
  const chartHeight = height - 60;
  const barWidth = chartWidth / data.length - spacing.sm;
  const maxValue = Math.max(...data.map((d) => d.value));

  return (
    <View style={styles.chartContainer}>
      {title && <Text style={styles.chartTitle}>{title}</Text>}
      <Svg width={chartWidth + spacing.lg * 2} height={height}>
        {/* Bars */}
        {data.map((item, index) => {
          const barHeight = (item.value / maxValue) * chartHeight;
          const x = index * (barWidth + spacing.sm) + spacing.lg;
          const y = chartHeight - barHeight + 20;

          return (
            <React.Fragment key={index}>
              {/* Bar */}
              <Rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                fill={item.color || colors.primary}
                rx={radii.sm}
              />
              {/* Value on top */}
              <SvgText
                x={x + barWidth / 2}
                y={y - 5}
                fontSize={12}
                fill={colors.textPrimary}
                textAnchor="middle"
                fontWeight="600">
                {item.value}
              </SvgText>
              {/* Label */}
              <SvgText
                x={x + barWidth / 2}
                y={chartHeight + 35}
                fontSize={11}
                fill={colors.textSecondary}
                textAnchor="middle">
                {item.label.length > 8
                  ? item.label.substring(0, 8) + "..."
                  : item.label}
              </SvgText>
            </React.Fragment>
          );
        })}
        {/* Base line */}
        <Line
          x1={spacing.lg}
          y1={chartHeight + 20}
          x2={chartWidth + spacing.lg}
          y2={chartHeight + 20}
          stroke={colors.border}
          strokeWidth={2}
        />
      </Svg>
    </View>
  );
}

// Line Chart Component
export function LineChart({ data, title, height = 200 }) {
  if (!data || data.length === 0) return null;

  const chartWidth = SCREEN_WIDTH - spacing.lg * 4;
  const chartHeight = height - 60;
  const pointSpacing = chartWidth / (data.length - 1 || 1);
  const maxValue = Math.max(...data.map((d) => d.value));
  const minValue = Math.min(...data.map((d) => d.value));

  // Create path for line
  const pathData = data
    .map((item, index) => {
      const x = index * pointSpacing + spacing.lg;
      const y =
        chartHeight -
        ((item.value - minValue) / (maxValue - minValue || 1)) * chartHeight +
        20;
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  return (
    <View style={styles.chartContainer}>
      {title && <Text style={styles.chartTitle}>{title}</Text>}
      <Svg width={chartWidth + spacing.lg * 2} height={height}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((percent, index) => {
          const y = chartHeight * (1 - percent) + 20;
          return (
            <Line
              key={index}
              x1={spacing.lg}
              y1={y}
              x2={chartWidth + spacing.lg}
              y2={y}
              stroke={colors.border}
              strokeWidth={1}
              opacity={0.3}
            />
          );
        })}

        {/* Line */}
        <Path
          d={pathData}
          stroke={colors.primary}
          strokeWidth={3}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Points and labels */}
        {data.map((item, index) => {
          const x = index * pointSpacing + spacing.lg;
          const y =
            chartHeight -
            ((item.value - minValue) / (maxValue - minValue || 1)) *
              chartHeight +
            20;

          return (
            <React.Fragment key={index}>
              {/* Point */}
              <Circle cx={x} cy={y} r={5} fill={colors.primary} />
              <Circle cx={x} cy={y} r={3} fill={colors.card} />

              {/* Value */}
              <SvgText
                x={x}
                y={y - 12}
                fontSize={11}
                fill={colors.textPrimary}
                textAnchor="middle"
                fontWeight="600">
                {item.value}
              </SvgText>

              {/* Label */}
              <SvgText
                x={x}
                y={chartHeight + 35}
                fontSize={10}
                fill={colors.textSecondary}
                textAnchor="middle">
                {item.label}
              </SvgText>
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
}

// Donut Chart Component
export function DonutChart({ data, title, size = 180 }) {
  if (!data || data.length === 0) return null;

  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size / 2 - 20;
  const innerRadius = radius * 0.6;

  const total = data.reduce((sum, item) => sum + item.value, 0);
  let currentAngle = -90;

  // Calculate arc path
  const getArcPath = (startAngle, endAngle, outerR, innerR) => {
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const x1 = centerX + outerR * Math.cos(startRad);
    const y1 = centerY + outerR * Math.sin(startRad);
    const x2 = centerX + outerR * Math.cos(endRad);
    const y2 = centerY + outerR * Math.sin(endRad);
    const x3 = centerX + innerR * Math.cos(endRad);
    const y3 = centerY + innerR * Math.sin(endRad);
    const x4 = centerX + innerR * Math.cos(startRad);
    const y4 = centerY + innerR * Math.sin(startRad);

    const largeArc = endAngle - startAngle > 180 ? 1 : 0;

    return `M ${x1} ${y1} A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerR} ${innerR} 0 ${largeArc} 0 ${x4} ${y4} Z`;
  };

  return (
    <View style={styles.chartContainer}>
      {title && <Text style={styles.chartTitle}>{title}</Text>}
      <View style={styles.donutContainer}>
        <Svg width={size} height={size}>
          {data.map((item, index) => {
            const percentage = (item.value / total) * 100;
            const angle = (percentage / 100) * 360;
            const endAngle = currentAngle + angle;
            const path = getArcPath(
              currentAngle,
              endAngle,
              radius,
              innerRadius
            );
            currentAngle = endAngle;

            return (
              <Path key={index} d={path} fill={item.color || colors.primary} />
            );
          })}

          {/* Center text */}
          <SvgText
            x={centerX}
            y={centerY - 8}
            fontSize={24}
            fill={colors.textPrimary}
            textAnchor="middle"
            fontWeight="700">
            {total}
          </SvgText>
          <SvgText
            x={centerX}
            y={centerY + 12}
            fontSize={12}
            fill={colors.textSecondary}
            textAnchor="middle">
            Total
          </SvgText>
        </Svg>

        {/* Legend */}
        <View style={styles.legend}>
          {data.map((item, index) => (
            <View key={index} style={styles.legendItem}>
              <View
                style={[
                  styles.legendColor,
                  { backgroundColor: item.color || colors.primary },
                ]}
              />
              <Text style={styles.legendLabel}>{item.label}</Text>
              <Text style={styles.legendValue}>{item.value}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chartContainer: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  donutContainer: {
    alignItems: "center",
  },
  legend: {
    marginTop: spacing.lg,
    width: "100%",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: spacing.sm,
  },
  legendLabel: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
  },
  legendValue: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
  },
});
