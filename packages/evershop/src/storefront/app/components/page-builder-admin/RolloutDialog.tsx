import { useEffect, useState } from 'react';

import { Button } from '~/components/ui/button.js';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '~/components/ui/dialog.js';
import { Input } from '~/components/ui/input.js';
import { Label } from '~/components/ui/label.js';
import { pageBuilderApi, type RolloutPlan } from '~/lib/page-builder-admin/api.js';

/**
 * Create-or-edit a scheduled rollout plan for the current changeset — an
 * overlay applied during a time window instead of publishing immediately
 * (`RolloutPlan.startTime <= NOW() < endTime`, evaluated per-request server
 * side, no scheduler). Runs the same overlap check the server enforces so
 * the conflict is visible before submitting, not just after a rejected POST.
 */
export function RolloutDialog({
  open,
  changesetId,
  editingPlan,
  onOpenChange,
  onSaved
}: {
  open: boolean;
  changesetId: number;
  editingPlan: RolloutPlan | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [existingPlans, setExistingPlans] = useState<RolloutPlan[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(editingPlan?.name ?? '');
    setStartTime(editingPlan ? toLocalInput(editingPlan.startTime) : '');
    setEndTime(editingPlan?.endTime ? toLocalInput(editingPlan.endTime) : '');
    setError(null);
    pageBuilderApi
      .listRolloutPlans('all')
      .then((res) => setExistingPlans(res.rolloutPlans.filter((p) => !p.changeset.publishedAt)))
      .catch(() => setExistingPlans([]));
  }, [open, editingPlan]);

  function overlaps(): boolean {
    if (!startTime) return false;
    const start = new Date(startTime).getTime();
    const end = endTime ? new Date(endTime).getTime() : Infinity;
    return existingPlans.some((plan) => {
      if (editingPlan && plan.rolloutPlanId === editingPlan.rolloutPlanId) return false;
      const pStart = new Date(plan.startTime).getTime();
      const pEnd = plan.endTime ? new Date(plan.endTime).getTime() : Infinity;
      return start < pEnd && pStart < end;
    });
  }

  const hasOverlap = overlaps();

  async function handleSave() {
    if (!name.trim() || !startTime) {
      setError('Name and start time are required');
      return;
    }
    if (hasOverlap) {
      setError('This window overlaps an existing rollout plan');
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const startIso = new Date(startTime).toISOString();
      const endIso = endTime ? new Date(endTime).toISOString() : null;
      if (editingPlan) {
        await pageBuilderApi.updateRolloutPlan(editingPlan.rolloutPlanId, { name: name.trim(), startTime: startIso, endTime: endIso });
      } else {
        await pageBuilderApi.createRolloutPlan({ name: name.trim(), changesetId, startTime: startIso, endTime: endIso });
      }
      onSaved();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save rollout plan');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editingPlan ? 'Edit rollout plan' : 'Schedule a rollout'}</DialogTitle>
          <DialogDescription>
            Applies this changeset's pending changes during a time window instead of publishing them now. Leave end time empty for an indefinite rollout.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Summer sale launch" />
          </div>
          <div className="space-y-1.5">
            <Label>Start time</Label>
            <Input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>End time (optional)</Label>
            <Input type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </div>
          {hasOverlap && <p className="text-sm text-destructive">This window overlaps an existing rollout plan.</p>}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || hasOverlap}>
            {editingPlan ? 'Save' : 'Schedule'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
