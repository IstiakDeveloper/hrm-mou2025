import { format } from 'date-fns';
import { DatePicker } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';
import { DISPLAY_DATE_FMT, parseFormDateValue } from '@/lib/display-date';

type Props = {
    label: string;
    value: string;
    onChange: (value: string) => void;
    required?: boolean;
    disabled?: boolean;
    error?: string;
};

export function FormDateField({ label, value, onChange, required, disabled, error }: Props) {
    return (
        <div>
            <Label>
                {label}
                {required ? ' *' : ''}
            </Label>
            <DatePicker
                selected={parseFormDateValue(value)}
                onSelect={(d) => onChange(d ? format(d, DISPLAY_DATE_FMT) : '')}
                disabled={disabled}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
    );
}
