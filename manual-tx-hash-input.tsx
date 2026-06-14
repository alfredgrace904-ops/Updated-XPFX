import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ManualTxHashInputProps {
  value: string;
  onChange: (value: string) => void;
  testId?: string;
}

export function ManualTxHashInput({ value, onChange, testId }: ManualTxHashInputProps) {
  return (
    <div className="space-y-1 rounded-md border border-dashed border-border bg-background/50 p-3 text-xs">
      <Label className="text-xs flex items-center justify-between">
        <span>Already sent on-chain?</span>
        {value.trim() ? (
          <span className="text-success font-mono">
            using {value.trim().slice(0, 10)}…
          </span>
        ) : null}
      </Label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0x… paste tx hash to settle without re-broadcasting"
        className="font-mono text-xs"
        data-testid={testId}
      />
      <p className="text-muted-foreground">
        Paste a previously broadcast tx hash to settle directly. Leave empty to
        broadcast a new on-chain transfer.
      </p>
    </div>
  );
}
