import React from 'react';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { MapPin, Settings } from 'lucide-react';

const VISIT_FEE = 100;

const deviceTypes = [
  { value: 'washingMachine', label: 'غسالة' },
  { value: 'heater', label: 'سخان' },
  { value: 'oven', label: 'فرن' },
  { value: 'refrigerator', label: 'ثلاجة' },
  { value: 'airConditioner', label: 'تكييف' },
];

const RequestForm = ({ reqForm, onFieldChange, onGetLocation, onCreate, submitting, gettingLoc }) => {
  return (
    <div className="bg-card p-6 rounded-2xl shadow mb-8">
      <h2 className="text-2xl font-bold mb-4"><Settings className="inline text-primary" /> طلب صيانة جديد</h2>
      <div className="space-y-4">
        <div>
          <Label>نوع الجهاز</Label>
          <select value={reqForm.deviceType} onChange={e => onFieldChange('deviceType', e.target.value)} className="w-full rounded-md border p-2">
            <option value="">اختر...</option>
            {deviceTypes.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
        </div>
        <div>
          <Label>وصف العطل</Label>
          <Input value={reqForm.issueDescription} onChange={e => onFieldChange('issueDescription', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>رقم الهاتف</Label><Input value={reqForm.phoneNumber} onChange={e => onFieldChange('phoneNumber', e.target.value)} /></div>
          <div><Label>العنوان</Label><Input value={reqForm.address} onChange={e => onFieldChange('address', e.target.value)} placeholder="الشارع، المنطقة..." /></div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onGetLocation} disabled={gettingLoc}><MapPin size={16} /> تحديد الموقع</Button>
          {reqForm.lat != null && <span className="text-green-500 text-sm">✓ تم</span>}
        </div>
        <Button className="w-full" onClick={onCreate} disabled={submitting}>إرسال الطلب (خصم {VISIT_FEE} جنيه)</Button>
      </div>
    </div>
  );
};

export default RequestForm;