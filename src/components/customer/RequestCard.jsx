import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button.jsx';
import { Clock, Wrench, XCircle, MessageSquare, ThumbsUp, MessageCircle, Star, User, CheckCircle, Truck } from 'lucide-react';

const statusSteps = [
  { key: 'pending', label: 'تم الإرسال', icon: <CheckCircle size={16} /> },
  { key: 'assigned', label: 'تم تعيين فني', icon: <User size={16} /> },
  { key: 'accepted', label: 'الفني قبل', icon: <CheckCircle size={16} /> },
  { key: 'on_the_way', label: 'في الطريق', icon: <Truck size={16} /> },
  { key: 'in_progress', label: 'جاري الإصلاح', icon: <Wrench size={16} /> },
  { key: 'completed', label: 'مكتمل', icon: <CheckCircle size={16} /> },
];

const getStatusIndex = (status) => {
  const mapping = { pending: 0, bidding: 0, assigned: 1, accepted: 2, on_the_way: 3, in_progress: 4, completed: 5 };
  return mapping[status] ?? -1;
};

const timeLeft = (exp) => {
  if (!exp) return '';
  const diff = new Date(exp) - new Date();
  if (diff <= 0) return 'انتهت';
  const m = Math.floor(diff / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

const RequestCard = ({ req, bidders, onSelect, onCancel, onCancelVisit, onComplaint, onFeedback, onChat, onRate }) => {
  const statusIdx = getStatusIndex(req.status);
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card p-6 rounded-2xl shadow mb-6">
      <div className="flex justify-between items-start">
        <h3 className="font-bold text-xl"><Wrench size={20} className="inline text-primary" /> {req.device_type}</h3>
        {req.status === 'cancelled' && <span className="text-sm text-red-600 flex items-center gap-1"><XCircle size={16} /> ملغي</span>}
      </div>
      <p className="text-sm mt-1">{req.issue_description}</p>
      <div className="flex gap-4 text-xs text-muted-foreground mt-2">
        <span>📞 {req.phone_number}</span>
        {req.address && <span>📍 {req.address}</span>}
      </div>

      {req.status !== 'cancelled' && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            {statusSteps.map((step, idx) => (
              <div key={step.key} className={`flex flex-col items-center ${idx <= statusIdx ? 'text-primary' : 'text-muted-foreground/40'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${idx <= statusIdx ? 'bg-primary text-white' : 'bg-muted'}`}>{step.icon}</div>
                <span className="text-[10px] mt-1">{step.label}</span>
              </div>
            ))}
          </div>
          <div className="w-full bg-muted h-2 rounded-full">
            <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${(statusIdx / (statusSteps.length - 1)) * 100}%` }} />
          </div>
          {req.expires_at && req.status === 'assigned' && (
            <p className="text-xs text-red-500 mt-1"><Clock size={12} /> الوقت المتبقي: {timeLeft(req.expires_at)}</p>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2 mt-4">
        {(req.status === 'pending' || req.status === 'bidding') && (
          <>
            <Button variant="destructive" size="sm" onClick={() => onCancel(req.id)}><XCircle size={14} className="mr-1" /> إلغاء الطلب</Button>
            {bidders && bidders.length > 0 && (
              <div className="w-full mt-2">
                <h4 className="font-semibold text-sm mb-1"><User size={14} className="inline" /> الفنيون المتقدمون:</h4>
                {bidders.map(tech => (
                  <div key={tech.id} className="flex justify-between items-center border rounded-lg p-2 mb-1">
                    <span>{tech.full_name} ({tech.specialization}) ⭐ {tech.avg_rating?.toFixed(1) || '0.0'}</span>
                    <Button size="sm" onClick={() => onSelect(req.id, tech.id)}>اختيار</Button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {['assigned', 'accepted', 'on_the_way', 'in_progress'].includes(req.status) && (
          <>
            <Button variant="outline" size="sm" onClick={() => onChat(req.id)}><MessageCircle size={14} className="mr-1" /> محادثة</Button>
            <Button variant="outline" size="sm" onClick={() => onCancelVisit(req.id)}><XCircle size={14} className="mr-1" /> إلغاء الزيارة</Button>
            <Button variant="outline" size="sm" onClick={() => onComplaint(req.id)}><MessageSquare size={14} className="mr-1" /> شكوى</Button>
            <Button variant="outline" size="sm" onClick={() => onFeedback(req.id)}><ThumbsUp size={14} className="mr-1" /> تعليق</Button>
          </>
        )}

        {req.status === 'completed' && (
          <Button variant="outline" size="sm" onClick={() => onRate(req.id)}><Star size={14} className="mr-1" /> تقييم الفني</Button>
        )}
      </div>
    </motion.div>
  );
};

export default RequestCard;