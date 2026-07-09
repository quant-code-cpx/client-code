import type { Theme, SxProps } from '@mui/material/styles';
import type {
  DatePickerProps,
  DatePickerSlotProps,
} from '@mui/x-date-pickers/DatePicker';

import { DatePicker as MuiDatePicker } from '@mui/x-date-pickers/DatePicker';

// ----------------------------------------------------------------------

const DEFAULT_FORMAT = 'YYYY-MM-DD';

const defaultDatePickerSx: SxProps<Theme> = {
  width: { xs: 1, sm: 200 },
  flexShrink: 0,
};

const defaultTextFieldSlotProps = {
  size: 'small',
  slotProps: {
    input: {
      sx: {
        width: 1,
        minWidth: 0,
        '& .MuiPickersInputBase-sectionsContainer': {
          width: 'auto',
          minWidth: 0,
        },
      },
    },
  },
};

type SlotPropFactory = (...args: any[]) => Record<string, any>;

function mergeSx(base?: SxProps<Theme>, override?: SxProps<Theme>): SxProps<Theme> {
  return [base, override].flat().filter(Boolean) as SxProps<Theme>;
}

function mergeNestedSlotProps(
  defaults: Record<string, any> | undefined,
  props: Record<string, any> | undefined
) {
  return {
    ...defaults,
    ...props,
    input: {
      ...defaults?.input,
      ...props?.input,
      sx: mergeSx(defaults?.input?.sx, props?.input?.sx),
    },
  };
}

function hasTextFieldLayoutSx(sx: SxProps<Theme> | undefined) {
  if (!sx || typeof sx === 'function' || Array.isArray(sx)) return Boolean(sx);

  return 'width' in sx || 'minWidth' in sx || 'maxWidth' in sx;
}

function hasTextFieldLayoutProps(props: DatePickerSlotProps['textField']) {
  if (typeof props === 'function') return true;

  return props?.fullWidth === true || hasTextFieldLayoutSx(props?.sx);
}

function mergeSlotProps(
  defaults: Record<string, any>,
  props: Record<string, any> | SlotPropFactory | undefined
) {
  if (typeof props === 'function') {
    return (...args: any[]) => {
      const resolvedProps = props(...args);

      return {
        ...defaults,
        ...resolvedProps,
        sx: mergeSx(defaults.sx, resolvedProps.sx),
        slotProps: mergeNestedSlotProps(defaults.slotProps, resolvedProps.slotProps),
      };
    };
  }

  return {
    ...defaults,
    ...props,
    sx: mergeSx(defaults.sx, props?.sx),
    slotProps: mergeNestedSlotProps(defaults.slotProps, props?.slotProps),
  };
}

function mergeFieldSlotProps(props: Record<string, any> | SlotPropFactory | undefined) {
  const defaults = { clearable: true };

  if (typeof props === 'function') {
    return (...args: any[]) => ({ ...defaults, ...props(...args) });
  }

  return { ...defaults, ...props };
}

export function DatePicker({ format, sx, slotProps, ...other }: DatePickerProps) {
  const sxDefaults = hasTextFieldLayoutProps(slotProps?.textField)
    ? { flexShrink: 0 }
    : defaultDatePickerSx;

  const mergedSlotProps: DatePickerSlotProps = {
    ...slotProps,
    field: mergeFieldSlotProps(slotProps?.field),
    textField: mergeSlotProps(defaultTextFieldSlotProps, slotProps?.textField),
  };

  return (
    <MuiDatePicker
      format={format ?? DEFAULT_FORMAT}
      slotProps={mergedSlotProps}
      sx={mergeSx(sxDefaults, sx)}
      {...other}
    />
  );
}
