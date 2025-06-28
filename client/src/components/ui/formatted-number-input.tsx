import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { formatNumberWithCommas, parseFormattedNumber } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface FormattedNumberInputProps extends Omit<React.ComponentProps<typeof Input>, 'value' | 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  showCommas?: boolean;
}

export function FormattedNumberInput({ 
  value, 
  onChange, 
  showCommas = true,
  className,
  onFocus,
  onBlur,
  ...props 
}: FormattedNumberInputProps) {
  const [displayValue, setDisplayValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  // Update display value when value prop changes
  useEffect(() => {
    if (isFocused) {
      // Show plain number when focused
      setDisplayValue(value);
    } else {
      // Show formatted number when not focused
      setDisplayValue(value && showCommas ? formatNumberWithCommas(value) : value);
    }
  }, [value, isFocused, showCommas]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    if (isFocused) {
      // When focused, allow only digits
      const numericValue = inputValue.replace(/\D/g, '');
      setDisplayValue(numericValue);
      onChange(numericValue);
    } else {
      // When not focused, parse formatted input
      const numericValue = parseFormattedNumber(inputValue);
      setDisplayValue(showCommas ? formatNumberWithCommas(numericValue) : numericValue);
      onChange(numericValue);
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    setDisplayValue(value); // Show plain number for editing
    onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    // Format the display value
    if (value && showCommas) {
      setDisplayValue(formatNumberWithCommas(value));
    }
    onBlur?.(e);
  };

  return (
    <Input
      {...props}
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      className={cn(className)}
    />
  );
}