"use client";

import PRScreen from '../screens/PRScreen';
import { formatNumber, formatWeight, formatPercentage } from '../../utils/formatUtils';

export default function PR() {
  const formatWeight = (value, unit) => {
    if (!value) return '';
    return `${formatNumber(value)} ${unit}`;
  };

  return <PRScreen />;
} 