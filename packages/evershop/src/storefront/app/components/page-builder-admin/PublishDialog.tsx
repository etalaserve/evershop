import { Button } from '~/components/ui/button.js';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '~/components/ui/dialog.js';

export function PublishDialog({
  open,
  operationCount,
  isBusy,
  onOpenChange,
  onConfirm
}: {
  open: boolean;
  operationCount: number;
  isBusy: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Publish changes</DialogTitle>
          <DialogDescription>
            {operationCount === 0
              ? 'There are no pending changes on this page.'
              : `This will apply ${operationCount} pending ${operationCount === 1 ? 'change' : 'changes'} on this page to the live storefront immediately.`}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isBusy}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={isBusy || operationCount === 0}>
            Publish
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
