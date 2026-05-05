import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DeviceSelectorProps {
  devices: MediaDeviceInfo[];
  value: string | null;
  onChange: (deviceId: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * Petit `<Select>` listant les périphériques média disponibles.
 * Masqué automatiquement si moins de 2 appareils sont détectés.
 */
export default function DeviceSelector({
  devices,
  value,
  onChange,
  placeholder = "Choisir un appareil",
  disabled,
}: DeviceSelectorProps) {
  if (devices.length < 2) return null;

  return (
    <Select value={value ?? undefined} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="h-9 text-xs">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {devices.map((d, i) => (
          <SelectItem key={d.deviceId || `dev-${i}`} value={d.deviceId || `dev-${i}`}>
            {d.label || `Appareil ${i + 1}`}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
