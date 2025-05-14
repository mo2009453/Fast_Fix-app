// TechnicianRegistrationScreen.jsx

"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function TechnicianRegistrationScreen() {
  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [selectedDevices, setSelectedDevices] = useState([]);
  const [idImage, setIdImage] = useState(null);
  const [certImage, setCertImage] = useState(null);
  const router = useRouter();

  const handleNext = () => {
    if (!selectedDevices.length) {
      alert("يرجى اختيار نوع جهاز واحد على الأقل");
      return;
    }
    setStep(step + 1);
  };

  const handleDeviceChange = (device) => {
    if (selectedDevices.includes(device)) {
      setSelectedDevices(selectedDevices.filter((d) => d !== device));
    } else {
      setSelectedDevices([...selectedDevices, device]);
    }
  };

  const handleSubmit = async () => {
    let idImageUrl = "";
    let certImageUrl = "";

    if (idImage) {
      const { data, error } = await supabase.storage
        .from("technician_documents")
        .upload(`ids/${Date.now()}_${idImage.name}`, idImage);
      if (error) {
        console.error("خطأ في رفع صورة الهوية:", error.message);
        return;
      }
      idImageUrl = supabase.storage
        .from("technician_documents")
        .getPublicUrl(data.path).data.publicUrl;
    }

    if (certImage) {
      const { data, error } = await supabase.storage
        .from("technician_documents")
        .upload(`certs/${Date.now()}_${certImage.name}`, certImage);
      if (error) {
        console.error("خطأ في رفع الشهادة:", error.message);
        return;
      }
      certImageUrl = supabase.storage
        .from("technician_documents")
        .getPublicUrl(data.path).data.publicUrl;
    }

    const { error } = await supabase.from("technicians_pending").insert([
      {
        full_name: fullName,
        email,
        phone,
        password,
        devices: selectedDevices,
        id_image_url: idImageUrl,
        cert_image_url: certImageUrl,
        status: "pending",
        created_at: new Date().toISOString(),
      },
    ]);

    if (error) {
      console.error("فشل حفظ البيانات:", error.message);
    } else {
      router.push("/technician/pending-review");
    }
  };

  return (
    <div className="flex justify-center items-center h-screen">
      <Card className="w-full max-w-md">
        <CardContent className="p-6">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 50 }}
                transition={{ duration: 0.3 }}
              >
                <h2 className="text-xl font-semibold mb-4">معلومات التسجيل</h2>
                <div className="space-y-4">
                  <div>
                    <Label>الاسم الكامل</Label>
                    <Input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>البريد الإلكتروني</Label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>رقم الجوال</Label>
                    <Input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>كلمة المرور</Label>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>الأجهزة المتخصصة</Label>
                    <div className="space-y-1">
                      {["غسالة", "ثلاجة", "مكيف", "سخان", "بوتاجاز"].map(
                        (device) => (
                          <label
                            key={device}
                            className="flex items-center space-x-2"
                          >
                            <input
                              type="checkbox"
                              checked={selectedDevices.includes(device)}
                              onChange={() => handleDeviceChange(device)}
                            />
                            <span>{device}</span>
                          </label>
                        )
                      )}
                    </div>
                  </div>
                  <Button onClick={handleNext} className="w-full mt-4">
                    التالي
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
              >
                <h2 className="text-xl font-semibold mb-4">المرفقات</h2>
                <div className="space-y-4">
                  <div>
                    <Label>صورة الهوية</Label>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setIdImage(e.target.files[0])}
                    />
                  </div>
                  <div>
                    <Label>شهادة الخبرة</Label>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setCertImage(e.target.files[0])}
                    />
                  </div>
                  <div className="flex justify-between mt-4">
                    <Button
                      variant="outline"
                      onClick={() => setStep(step - 1)}
                    >
                      رجوع
                    </Button>
                    <Button onClick={handleSubmit}>إرسال</Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  );
}