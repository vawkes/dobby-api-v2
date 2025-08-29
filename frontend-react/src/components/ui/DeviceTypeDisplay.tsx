import React from 'react';
import { getDeviceTypeDescription } from '../../utils/deviceTypes.ts';

interface DeviceTypeDisplayProps {
  deviceType: string;
  className?: string;
  showTooltip?: boolean;
}

const DeviceTypeDisplay: React.FC<DeviceTypeDisplayProps> = ({ 
  deviceType, 
  className = '',
  showTooltip = true 
}) => {
  const { description, hexCode } = getDeviceTypeDescription(deviceType);
  
  // If we have a hex code, show it in a tooltip
  if (hexCode && showTooltip) {
    return (
      <div 
        className={`inline-block ${className}`}
        title={`${description} (${hexCode})`}
      >
        <span>{description}</span>
        <span className="text-xs text-muted-foreground ml-1">({hexCode})</span>
      </div>
    );
  }
  
  // For custom types or when tooltip is disabled, just show the description
  return (
    <span className={className}>
      {description}
    </span>
  );
};

export default DeviceTypeDisplay;