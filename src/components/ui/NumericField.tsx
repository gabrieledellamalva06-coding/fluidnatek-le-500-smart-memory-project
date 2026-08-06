import {
  useEffect,
  useState,
} from "react";

interface NumericFieldProps {
  label: string;
  unit: string;
  value: number | undefined;

  onChange: (
    value: number | undefined
  ) => void;

  min?: number;
  max?: number;
  decimals?: number;
  placeholder?: string;
}

export default function NumericField({
  label,
  unit,
  value,
  onChange,
  min,
  max,
  decimals = 2,
  placeholder,
}: NumericFieldProps) {
  const [displayValue, setDisplayValue] =
    useState<string>(
      value === undefined
        ? ""
        : String(value)
    );

  useEffect(() => {
    if (value === undefined) {
      setDisplayValue("");
      return;
    }

    const parsedDisplayValue =
      parseNumericValue(displayValue);

    if (
      parsedDisplayValue === undefined ||
      parsedDisplayValue !== value
    ) {
      setDisplayValue(String(value));
    }
  }, [value, displayValue]);

  const handleChange = (
    rawValue: string
  ): void => {
    const normalizedValue =
      rawValue.replace(",", ".");

    if (
      !/^-?(?:\d+\.?\d*|\.\d*)?$/.test(
        normalizedValue
      )
    ) {
      return;
    }

    setDisplayValue(normalizedValue);

    const parsedValue =
      parseNumericValue(normalizedValue);

    onChange(parsedValue);
  };

  const handleBlur = (): void => {
    const parsedValue =
      parseNumericValue(displayValue);

    if (parsedValue === undefined) {
      setDisplayValue("");
      onChange(undefined);
      return;
    }

    const boundedValue = clampValue(
      parsedValue,
      min,
      max
    );

    const roundedValue = roundValue(
      boundedValue,
      decimals
    );

    setDisplayValue(String(roundedValue));
    onChange(roundedValue);
  };

  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
        {label}
      </span>

      <div className="relative">
        <input
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={displayValue}
          placeholder={placeholder}
          onChange={(event) =>
            handleChange(event.target.value)
          }
          onBlur={handleBlur}
          className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 pr-20 text-base font-semibold text-slate-950 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
        />

        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
          {unit}
        </span>
      </div>
    </label>
  );
}

function parseNumericValue(
  value: string
): number | undefined {
  const normalizedValue =
    value.trim().replace(",", ".");

  if (
    normalizedValue === "" ||
    normalizedValue === "-" ||
    normalizedValue === "." ||
    normalizedValue === "-."
  ) {
    return undefined;
  }

  const parsedValue =
    Number(normalizedValue);

  return Number.isFinite(parsedValue)
    ? parsedValue
    : undefined;
}

function clampValue(
  value: number,
  minimum: number | undefined,
  maximum: number | undefined
): number {
  let result = value;

  if (
    minimum !== undefined &&
    result < minimum
  ) {
    result = minimum;
  }

  if (
    maximum !== undefined &&
    result > maximum
  ) {
    result = maximum;
  }

  return result;
}

function roundValue(
  value: number,
  decimals: number
): number {
  const multiplier =
    10 ** decimals;

  return (
    Math.round(value * multiplier) /
    multiplier
  );
}
