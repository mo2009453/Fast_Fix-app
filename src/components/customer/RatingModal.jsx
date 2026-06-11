import React from 'react';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Star } from 'lucide-react';

const RatingModal = ({ open, onClose, onSubmit, stars, setStars, comment, setComment }) => {
  if (!open) return null;
  return (
    <dialog open className="p-4 rounded-xl shadow-xl fixed inset-0 m-auto z-50">
      <h3 className="font-bold mb-2">تقييم الفني</h3>
      <div className="flex gap-1 mb-4">
        {[1,2,3,4,5].map(i => (
          <Star key={i} size={32} className={`cursor-pointer ${i <= stars ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} onClick={() => setStars(i)} />
        ))}
      </div>
      <Input value={comment} onChange={e => setComment(e.target.value)} placeholder="تعليقك (اختياري)" />
      <div className="flex gap-2 mt-3">
        <Button size="sm" onClick={onSubmit}>إرسال</Button>
        <Button size="sm" variant="ghost" onClick={onClose}>إلغاء</Button>
      </div>
    </dialog>
  );
};

export default RatingModal;