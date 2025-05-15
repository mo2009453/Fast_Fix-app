import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const DEVICE_OPTIONS = ["غسالة", "ثلاجة", "مكيف", "سخان", "بوتاجاز"];

export default function TechnicianRegistrationScreen() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    phone: "",
    devices: [],
    nationalIdImage: null,
    certificateImage: null,
  });

  const handleNextStep = () => setStep(2);
  const handlePrevStep = () => setStep(1);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleDeviceSelect = (device) => {
    setFormData(prev => {
      const newDevices = prev.devices.includes(device)
        ? prev.devices.filter(d => d !== device)
        : [...prev.devices, device];
      return { ...prev, devices: newDevices };
    });
  };

  const handleFileChange = (field, file) => {
    setFormData(prev => ({ ...prev, [field]: file }));
  };

  const uploadFile = async (file, path) => {
    const { data, error } = await supabase.storage
      .from("technician_files")
      .upload(path, file, { upsert: true });
    if (error) throw error;
    return data.path;
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const nationalIdPath = await uploadFile(
        formData.nationalIdImage,
        `national_ids/${Date.now()}_${formData.nationalIdImage.name}`
      );
      const certificatePath = await uploadFile(
        formData.certificateImage,
        `certificates/${Date.now()}_${formData.certificateImage.name}`
      );

      const { error } = await supabase.from("technicians_pending").insert({
        full_name: formData.fullName,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        devices: formData.devices,
        national_id_image: nationalIdPath,
        certificate_image: certificatePath,
        status: "pending",
      });

      if (error) throw error;

      navigate("/technician-pending-review");
    } catch (err) {
      console.error(err);
      alert("حدث خطأ أثناء التسجيل. حاول مرة أخرى.");
    }
    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto mt-10">
      <Card>
        <CardContent className="space-y-4 pt-6">
          {step === 1 ? (
            <>
              <h2 className="text-xl font-bold text-center mb-2">تسجيل فني - الخطوة 1</h2>
              <Input
                placeholder="الاسم الكامل"
                value={formData.fullName}
                onChange={e => handleChange("fullName", e.target.value)}
              />
              <Input
                placeholder="البريد الإلكتروني"
                value={formData.email}
                onChange={e => handleChange("email", e.target.value)}
              />
              <Input
                type="password"
                placeholder="كلمة المرور"
                value={formData.password}
                onChange={e => handleChange("password", e.target.value)}
              />
              <Input
                placeholder="رقم الهاتف"
                value={formData.phone}
                onChange={e => handleChange("phone", e.target.value)}
              />
              <div>
                <label className="block mb-1 font-medium">الأجهزة المتخصصة</label>
                <div className="flex flex-wrap gap-2">
                  {DEVICE_OPTIONS.map(device => (
                    <button
                      type="button"
                      key={device}
                      onClick={() => handleDeviceSelect(device)}
                      className={`px-3 py-1 rounded border ${
                        formData.devices.includes(device)
                          ? "bg-blue-600 text-white"
                          : "bg-white"
                      }`}
                    >
                      {device}
                    </button>
                  ))}
                </div>
              </div>
              <Button onClick={handleNextStep} className="w-full mt-4">
                التالي
              </Button>
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold text-center mb-2">تسجيل فني - الخطوة 2</h2>
              <div>
                <label className="block mb-1 font-medium">صورة الهوية الوطنية</label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={e => handleFileChange("nationalIdImage", e.target.files[0])}
                />
              </div>
              <div>
                <label className="block mb-1 font-medium">شهادة الخبرة</label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={e => handleFileChange("certificateImage", e.target.files[0])}
                />
              </div>
              <div className="flex gap-2 mt-4">
                <Button variant="outline" onClick={handlePrevStep} className="w-1/2">
                  رجوع
                </Button>
                <Button onClick={handleSubmit} className="w-1/2" disabled={loading}>
                  {loading ? "جارٍ التسجيل..." : "تسجيل"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}