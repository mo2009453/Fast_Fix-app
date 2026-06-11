import React from 'react';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';

const CancelVisitModal = ({ open, onClose, onSubmit, reason, setReason }) => {
  if (!open) return null;
  return (
    <dialog open className="p-4 rounded-xl shadow-xl fixed inset-0 m-auto z-50">
      <h3 className="font-bold mb-2">سبب إلغاء الزيارة</h3>
      <Input value={reason} onChange={e => setReason(e.target.value)} placeholder="سبب الإلغاء..." />
      <div className="flex gap-2 mt-3">
        <Button size="sm" onClick={onSubmit}>تأكيد</Button>
        <Button size="sm" variant="ghost" onClick={onClose}>إلغاء</Button>
      </div>
    </dialog>
  );
};

export default CancelVisitModal;