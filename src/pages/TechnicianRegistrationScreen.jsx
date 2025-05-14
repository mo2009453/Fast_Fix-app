import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';

const TechnicianRegistrationScreen = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    phone: '',
    specialties: [],
    id_image: null,
    certificates: null,
  });

  const navigate = useNavigate();
  const specialtiesOptions = ['Refrigerator', 'Washing Machine', 'Air Conditioner'];

  const handleChange = (e) => {
    const { name, value, files, type } = e.target;
    if (type === 'file') {
      setFormData({ ...formData, [name]: files[0] });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSpecialtiesChange = (value) => {
    const isSelected = formData.specialties.includes(value);
    setFormData({
      ...formData,
      specialties: isSelected
        ? formData.specialties.filter((s) => s !== value)
        : [...formData.specialties, value],
    });
  };

  const uploadFile = async (file, path) => {
    const { data, error } = await supabase.storage.from('technician_files').upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });
    if (error) throw error;
    return data.path;
  };

  const handleSubmit = async () => {
    try {
      const idImagePath = await uploadFile(formData.id_image, `ids/${Date.now()}_${formData.id_image.name}`);
      const certPath = await uploadFile(formData.certificates, `certificates/${Date.now()}_${formData.certificates.name}`);

      const { error } = await supabase.from('technicians_pending').insert({
        full_name: formData.full_name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        specialties: formData.specialties,
        id_image_url: idImagePath,
        certificate_url: certPath,
        status: 'pending',
        created_at: new Date().toISOString(),
      });

      if (error) throw error;

      navigate('/technician-pending');
    } catch (err) {
      console.error('Error submitting form:', err.message);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl">Technician Registration</CardTitle>
        </CardHeader>
        <CardContent>
          {step === 1 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="space-y-4">
                <Input name="full_name" placeholder="Full Name" onChange={handleChange} />
                <Input name="email" placeholder="Email" onChange={handleChange} />
                <Input name="password" placeholder="Password" type="password" onChange={handleChange} />
                <Input name="phone" placeholder="Phone Number" onChange={handleChange} />
                <div>
                  <p className="mb-2 font-medium">Select Specialties:</p>
                  <div className="flex flex-wrap gap-2">
                    {specialtiesOptions.map((item) => (
                      <Button
                        key={item}
                        variant={formData.specialties.includes(item) ? 'default' : 'outline'}
                        onClick={() => handleSpecialtiesChange(item)}
                        type="button"
                      >
                        {item}
                      </Button>
                    ))}
                  </div>
                </div>
                <Button onClick={() => setStep(2)} className="mt-4 w-full">
                  Next
                </Button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="space-y-4">
                <div>
                  <label>ID Image</label>
                  <Input name="id_image" type="file" accept="image/*" onChange={handleChange} />
                </div>
                <div>
                  <label>Certificates</label>
                  <Input name="certificates" type="file" accept="image/*,application/pdf" onChange={handleChange} />
                </div>
                <div className="flex justify-between mt-6">
                  <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                  <Button onClick={handleSubmit}>Submit</Button>
                </div>
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TechnicianRegistrationScreen;