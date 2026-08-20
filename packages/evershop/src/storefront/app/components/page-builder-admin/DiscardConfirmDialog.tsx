import { Button } from '~/components/ui/button.js';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '~/components/ui/dialog.js';

export function DiscardConfirmDialog({
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
          <DialogTitle>Discard changes</DialogTitle>
          <DialogDescription>
            {operationCount === 0
              ? 'There are no pending changes on this page to discard.'
              : `This will permanently delete ${operationCount} pending ${operationCount === 1 ? 'change' : 'changes'} on this page. This cannot be undone.`}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isBusy}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isBusy || operationCount === 0}>
            Discard
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
