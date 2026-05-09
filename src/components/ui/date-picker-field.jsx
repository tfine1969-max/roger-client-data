import React from 'react';
import { format, isValid, parse } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const FORMATS = ['yyyy-MM-dd', 'dd-MM-yyyy'];

const parseDateValue = (value) => {
  if (!value) return undefined;
  for (const fmt of FORMATS) {
    const parsed = parse(value, fmt, new Date());
    if (isValid(parsed)) return parsed;
  }
  const parsed = new Date(value);
  return isValid(parsed) ? parsed : undefined;
};

export default function DatePickerField({
  value,
  onChange,
  outputFormat = 'yyyy-MM-dd',
  placeholder = 'dd-mm-yyyy',
  className,
  fromYear = 1900,
  toYear = new Date().getFullYear() + 10,
}) {
  const selected = parseDateValue(value);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex h-8 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 text-sm shadow-sm hover:bg-accent/10 transition-colors',
            className
          )}
        >
          <span className={value ? 'text-foreground' : 'text-muted-foreground'}>
            {selected ? format(selected, 'dd-MM-yyyy') : (value || placeholder)}
          </span>
          <CalendarIcon className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={date => onChange(date ? format(date, outputFormat) : '')}
          captionLayout="dropdown-buttons"
          fromYear={fromYear}
          toYear={toYear}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
