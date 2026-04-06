import React from "react";
import { View, Text, StyleSheet, Dimensions, ScrollView } from "react-native";
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

  // Use dynamic width based on data length for better spacing
  const itemWidth = Math.max(60, 80);
  const dynamicChartWidth = Math.max(
    SCREEN_WIDTH - spacing.lg * 4,
    data.length * itemWidth,
  );
  const chartHeight = height - 80;
  const barWidth = Math.max(30, itemWidth - spacing.sm * 2);
  const maxValue = Math.max(...data.map((d) => d.value));

  // Format date labels
  const formatDateLabel = (label) => {
    try {
      const date = new Date(label);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
      }
      return label;
    } catch (e) {
      return label;
    }
  };

  return (
    <View style={styles.chartContainer}>
      {title && <Text style={styles.chartTitle}>{title}</Text>}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={true}
        style={styles.scrollView}
      >
        <Svg width={dynamicChartWidth + spacing.lg * 2} height={height}>
          {/* Bars */}
          {data.map((item, index) => {
            const barHeight = (item.value / maxValue) * chartHeight;
            const x =
              index * itemWidth + spacing.lg + (itemWidth - barWidth) / 2;
            const y = chartHeight - barHeight + 30;

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
                  fontSize={11}
                  fill={colors.textPrimary}
                  textAnchor="middle"
                  fontWeight="600"
                >
                  {item.value}
                </SvgText>
                {/* Label */}
                <SvgText
                  x={x + barWidth / 2}
                  y={chartHeight + 50}
                  fontSize={10}
                  fill={colors.textSecondary}
                  textAnchor="middle"
                >
                  {formatDateLabel(item.label)}
                </SvgText>
              </React.Fragment>
            );
          })}
          {/* Base line */}
          <Line
            x1={spacing.lg}
            y1={chartHeight + 30}
            x2={dynamicChartWidth + spacing.lg}
            y2={chartHeight + 30}
            stroke={colors.border}
            strokeWidth={1}
          />
        </Svg>
      </ScrollView>
    </View>
  );
}

// Line Chart Component
export function LineChart({ data, title, height = 250 }) {
  if (!data || data.length === 0) return null;

  // Use dynamic width based on data length for better spacing
  const itemWidth = Math.max(50, 70);
  const dynamicChartWidth = Math.max(
    SCREEN_WIDTH - spacing.lg * 4,
    data.length * itemWidth,
  );
  const chartHeight = height - 100;
  const padding = { top: 20, bottom: 50, left: 40, right: 20 };
  const plotWidth = dynamicChartWidth - padding.left - padding.right;
  const plotHeight = chartHeight;

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const minValue = 0;

  // Format date labels
  const formatDateLabel = (label) => {
    try {
      const date = new Date(label);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
      }
      return label;
    } catch (e) {
      return label;
    }
  };

  // Generate points for the line
  const points = data
    .map((item, index) => {
      const x =
        padding.left + (index / Math.max(data.length - 1, 1)) * plotWidth;
      const normalizedValue = Math.max(
        0,
        (item.value - minValue) / (maxValue - minValue),
      );
      const y = padding.top + plotHeight - normalizedValue * plotHeight;
      return { x, y, ...item };
    })
    .filter(Boolean);

  const pathData =
    points.length > 0
      ? `M ${points.map((p) => `${p.x} ${p.y}`).join(" L ")}`
      : "";

  return (
    <View style={styles.chartContainer}>
      {title && <Text style={styles.chartTitle}>{title}</Text>}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={true}
        style={styles.scrollView}
      >
        <Svg
          width={dynamicChartWidth + spacing.lg * 2}
          height={height}
          style={{ backgroundColor: "transparent" }}
        >
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
            const y = padding.top + (1 - ratio) * plotHeight;
            return (
              <Line
                key={`grid-${idx}`}
                x1={padding.left}
                y1={y}
                x2={padding.left + plotWidth}
                y2={y}
                stroke={colors.border}
                strokeWidth={0.5}
                opacity={0.3}
              />
            );
          })}

          {/* Y-axis label */}
          <SvgText
            x={10}
            y={padding.top + 10}
            fontSize={9}
            fill={colors.textSecondary}
            textAnchor="start"
          >
            {Math.round(maxValue)}
          </SvgText>
          <SvgText
            x={10}
            y={padding.top + plotHeight}
            fontSize={9}
            fill={colors.textSecondary}
            textAnchor="start"
          >
            0
          </SvgText>

          {/* Line */}
          {pathData && (
            <Path
              d={pathData}
              stroke={colors.primary}
              strokeWidth={2}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Points and labels */}
          {points.map((point, index) => (
            <React.Fragment key={index}>
              {/* Point circle */}
              <Circle cx={point.x} cy={point.y} r={4} fill={colors.primary} />
              {/* Value label */}
              <SvgText
                x={point.x}
                y={point.y - 12}
                fontSize={10}
                fill={colors.textPrimary}
                textAnchor="middle"
                fontWeight="600"
              >
                {point.value}
              </SvgText>
              {/* Date label - show every nth to avoid crowding */}
              {index % Math.ceil(data.length / 8) === 0 && (
                <SvgText
                  x={point.x}
                  y={padding.top + plotHeight + 25}
                  fontSize={10}
                  fill={colors.textSecondary}
                  textAnchor="middle"
                >
                  {formatDateLabel(point.label)}
                </SvgText>
              )}
            </React.Fragment>
          ))}

          {/* Base line */}
          <Line
            x1={padding.left}
            y1={padding.top + plotHeight}
            x2={padding.left + plotWidth}
            y2={padding.top + plotHeight}
            stroke={colors.textSecondary}
            strokeWidth={1}
          />
        </Svg>
      </ScrollView>
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
              innerRadius,
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
            fontWeight="700"
          >
            {total}
          </SvgText>
          <SvgText
            x={centerX}
            y={centerY + 12}
            fontSize={12}
            fill={colors.textSecondary}
            textAnchor="middle"
          >
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
