import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

const TechnicianRegistrationScreen = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [specializedDevices, setSpecializedDevices] = useState([]);
  const [certFile, setCertFile] = useState(null);
  const [idFile, setIdFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleDeviceSelect = (value) => {
    setSpecializedDevices(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );
  };

  const uploadFile = async (file, path) => {
    const { data, error } = await supabase.storage
      .from('technician_files')
      .upload(path, file);

    if (error) throw error;

    return data.path;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const technicianId = uuidv4();

      const certPath = certFile ? await uploadFile(certFile, `${technicianId}/certificate_${certFile.name}`) : null;
      const idPath = idFile ? await uploadFile(idFile, `${technicianId}/id_${idFile.name}`) : null;

      const { error } = await supabase.from('technicians_pending').insert({
        id: technicianId,
        full_name: fullName,
        email,
        phone,
        devices: specializedDevices,
        certificate_path: certPath,
        id_path: idPath,
      });

      if (error) throw error;

      toast({ title: 'Success', description: 'Registration submitted successfully!' });
      navigate('/register/skill-assessment', {
        state: { devices: specializedDevices, technicianId },
      });
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: 'Registration failed. Try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div className="p-4 max-w-xl mx-auto" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <Card>
        <CardHeader>
          <CardTitle>Technician Registration</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Full Name</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} required />
            </div>
            <div>
              <Label>Specialized Devices</Label>
              <Select onValueChange={handleDeviceSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select devices" />
                </SelectTrigger>
                <SelectContent>
                  {['Device A', 'Device B', 'Device C'].map((device) => (
                    <SelectItem key={device} value={device}>{device}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="text-sm text-muted-foreground">Selected: {specializedDevices.join(', ')}</div>
            </div>
            <div>
              <Label>Upload Certificate</Label>
              <Input type="file" accept="application/pdf" onChange={(e) => setCertFile(e.target.files[0])} />
            </div>
            <div>
              <Label>Upload ID</Label>
              <Input type="file" accept="application/pdf" onChange={(e) => setIdFile(e.target.files[0])} />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Submitting...' : 'Submit'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default TechnicianRegistrationScreen;