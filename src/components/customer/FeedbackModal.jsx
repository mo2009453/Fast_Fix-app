import React from 'react';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';

const FeedbackModal = ({ open, onClose, onSubmit, text, setText }) => {
  if (!open) return null;
  return (
    <dialog open className="p-4 rounded-xl shadow-xl fixed inset-0 m-auto z-50">
      <h3 className="font-bold mb-2">تعليق / تقييم</h3>
      <Input value={text} onChange={e => setText(e.target.value)} placeholder="اكتب تعليقك..." />
      <div className="flex gap-2 mt-3">
        <Button size="sm" onClick={onSubmit}>إرسال</Button>
        <Button size="sm" variant="ghost" onClick={onClose}>إلغاء</Button>
      </div>
    </dialog>
  );
};

export default FeedbackModal;