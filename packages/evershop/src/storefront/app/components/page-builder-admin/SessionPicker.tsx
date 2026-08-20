import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

import { Button } from '~/components/ui/button.js';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '~/components/ui/dialog.js';
import { pageBuilderApi, type RolloutPlan } from '~/lib/page-builder-admin/api.js';

/**
 * Shown once per editor mount (only when not already inside a rollout
 * session via `?session=`) if the route has active/upcoming rollout plans —
 * EverShop's stand-in for multi-session collaboration: there's one draft
 * changeset per admin, and a scheduled rollout is the mechanism for a
 * second concurrent "session" someone might also be editing.
 */
export function SessionPicker({ routeId, active }: { routeId: string; active: boolean }) {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<RolloutPlan[] | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!active) return;
    Promise.all([pageBuilderApi.listRolloutPlans('active'), pageBuilderApi.listRolloutPlans('upcoming')])
      .then(([a, u]) => setPlans([...a.rolloutPlans, ...u.rolloutPlans].filter((p) => !p.changeset.publishedAt)))
      .catch(() => setPlans([]));
  }, [active]);

  if (!active || dismissed || !plans || plans.length === 0) return null;

  return (
    <Dialog open onOpenChange={(open) => !open && setDismissed(true)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Resume a session</DialogTitle>
          <DialogDescription>
            There {plans.length === 1 ? 'is' : 'are'} {plans.length} scheduled rollout {plans.length === 1 ? 'plan' : 'plans'} for this store. Continue your own draft, or open a rollout's changeset to keep editing it.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {plans.map((plan) => (
            <button
              key={plan.rolloutPlanId}
              type="button"
              className="flex w-full flex-col items-start gap-0.5 rounded-md border border-border p-3 text-left hover:bg-accent"
              onClick={() => navigate(`/admin/page-builder/edit/${routeId}?session=${plan.uuid}`)}
            >
              <span className="text-sm font-medium">{plan.name}</span>
              <span className="text-xs text-muted-foreground">
                {new Date(plan.startTime).toLocaleString()} {plan.endTime ? `– ${new Date(plan.endTime).toLocaleString()}` : '(indefinite)'} · {plan.changeset.operationCount} change
                {plan.changeset.operationCount === 1 ? '' : 's'}
              </span>
            </button>
          ))}
        </div>
        <Button variant="outline" onClick={() => setDismissed(true)}>
          Continue my draft
        </Button>
      </DialogContent>
    </Dialog>
  );
}
