import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Upload, User, Image as ImageIcon, Save, Check } from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import Button from '@/components/ui/Button';
import Navbar from '@/components/ui/Navbar';
import Watermark from '@/components/ui/Watermark';

export default function SettingsPage() {
  const { settings, update, refresh } = useSettings();
  const { logout } = useAuth();
  const [form, setForm] = useState({
    platform_name: settings.platform_name,
    management_name: settings.management_name,
    teacher_name: settings.teacher_name,
  });
  const [masterPin, setMasterPin] = useState(localStorage.getItem('alkhaled_master_pin') ?? '0000');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [saved, setSaved] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  async function handleSave() {
    await update({
      platform_name: form.platform_name || 'منصة الخالد التعليمية',
      management_name: form.management_name || 'تحت إدارة ومتابعة مستر عمرو خالد',
      teacher_name: form.teacher_name || 'مستر عمرو خالد',
    });
    if (masterPin.trim()) {
      const currentDefault = settings.default_pin_active ?? true;
      const isChangingFromDefault = currentDefault && masterPin.trim() !== '0000';
      const patch: Record<string, unknown> = {
        master_pin: masterPin.trim(),
      };
      if (isChangingFromDefault) {
        patch.default_pin_active = false;
      }
      await supabase.from('settings').update(patch).neq('id', '00000000-0000-0000-0000-000000000000');
      localStorage.setItem('alkhaled_master_pin', masterPin.trim());
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    await refresh();
  }

  async function uploadLogo(file: File) {
    setUploadingLogo(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      await update({ logo_url: dataUrl });
      await refresh();
      setUploadingLogo(false);
    };
    reader.readAsDataURL(file);
  }

  async function uploadPhoto(file: File) {
    setUploadingPhoto(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      await update({ teacher_photo_url: dataUrl });
      await refresh();
      setUploadingPhoto(false);
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="min-h-screen pb-12">
      <Navbar onLogout={logout} />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <h2 className="text-2xl font-bold text-white">الإعدادات</h2>

        {/* Profile Photo Upload */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-2xl p-6"
        >
          <h3 className="font-bold text-white mb-4 flex items-center gap-2">
            <User size={18} className="text-emerald-400" />
            صورة المعلم
          </h3>
          <div className="flex items-center gap-6">
            <div className={`w-24 h-24 rounded-full overflow-hidden flex items-center justify-center bg-emerald-600/15 ${settings.teacher_photo_url ? 'emerald-glow' : ''}`}>
              {settings.teacher_photo_url ? (
                <img src={settings.teacher_photo_url} alt="المعلم" className="w-full h-full object-cover" />
              ) : (
                <User size={36} className="text-emerald-400" />
              )}
            </div>
            <div>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPhoto(f); }}
              />
              <Button variant="secondary" onClick={() => photoInputRef.current?.click()} disabled={uploadingPhoto}>
                <Upload size={16} />
                {uploadingPhoto ? 'جارٍ الرفع...' : 'رفع صورة المعلم'}
              </Button>
              <p className="text-xs text-slate-500 mt-2">تظهر داخل حلقة زمردي مضيئة</p>
            </div>
          </div>
        </motion.div>

        {/* Logo Upload */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-2xl p-6"
        >
          <h3 className="font-bold text-white mb-4 flex items-center gap-2">
            <ImageIcon size={18} className="text-emerald-400" />
            لوجو الخالد
          </h3>
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-xl overflow-hidden flex items-center justify-center bg-emerald-600/15 ring-2 ring-emerald-500/30">
              {settings.logo_url ? (
                <img src={settings.logo_url} alt="اللوجو" className="w-full h-full object-cover" />
              ) : (
                <ImageIcon size={36} className="text-emerald-400" />
              )}
            </div>
            <div>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadLogo(f); }}
              />
              <Button variant="secondary" onClick={() => logoInputRef.current?.click()} disabled={uploadingLogo}>
                <Upload size={16} />
                {uploadingLogo ? 'جارٍ الرفع...' : 'رفع اللوجو'}
              </Button>
              <p className="text-xs text-slate-500 mt-2">يظهر في كل النوافذ والشهادات والتقارير</p>
            </div>
          </div>
        </motion.div>

        {/* Platform settings */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-2xl p-6 space-y-4"
        >
          <h3 className="font-bold text-white mb-2">إعدادات المنصة</h3>
          <Field label="اسم المنصة">
            <input type="text" value={form.platform_name} onChange={(e) => setForm({ ...form, platform_name: e.target.value })} className={inputCls} />
          </Field>
          <Field label="اسم الإدارة">
            <input type="text" value={form.management_name} onChange={(e) => setForm({ ...form, management_name: e.target.value })} className={inputCls} />
          </Field>
          <Field label="اسم المعلم">
            <input type="text" value={form.teacher_name} onChange={(e) => setForm({ ...form, teacher_name: e.target.value })} className={inputCls} />
          </Field>
          <Field label="الرقم السري للمعلم (PIN)">
            <input type="text" value={masterPin} onChange={(e) => setMasterPin(e.target.value)} className={`${inputCls} w-32`} inputMode="numeric" />
          </Field>
          <Button onClick={handleSave} className="w-full">
            {saved ? <><Check size={16} /> تم الحفظ</> : <><Save size={16} /> حفظ الإعدادات</>}
          </Button>
        </motion.div>
      </div>
      <Watermark />
    </div>
  );
}

const inputCls =
  'w-full glass-light rounded-xl py-2.5 px-4 text-white border border-white/10 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition text-sm';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm text-slate-400 mb-1.5">{label}</label>
      {children}
    </div>
  );
}
