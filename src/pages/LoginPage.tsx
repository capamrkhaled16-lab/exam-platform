import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import LoginLayout, { PinInput } from '@/components/auth/LoginLayout';
import Button from '@/components/ui/Button';
import { LogIn } from 'lucide-react';

export default function LoginPage() {
  const { loginMaster } = useAuth();
  const navigate = useNavigate();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const result = await loginMaster(pin);
    setLoading(false);
    if (result.ok) {
      navigate('/dashboard');
    } else {
      setError(result.error ?? 'فشل تسجيل الدخول');
    }
  }

  return (
    <LoginLayout
      title="تسجيل دخول المعلم"
      subtitle="الوصول إلى لوحة تحكم منصة الخالد"
      error={error}
      primaryLabel="للمساعدين؟"
      primaryHref="/assistant/login"
      primaryText="دخول المساعد"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-slate-400 mb-2">
            رقم المستخدم / الهاتف
          </label>
          <input
            type="text"
            value="المعلم"
            disabled
            className="w-full glass-light rounded-xl py-3 px-4 text-slate-300 border border-white/10 cursor-not-allowed"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-2">
            الرقم السري (PIN)
          </label>
          <PinInput value={pin} onChange={setPin} />
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          <LogIn size={18} />
          {loading ? 'جارٍ الدخول...' : 'تسجيل الدخول'}
        </Button>
        <p className="text-xs text-slate-600 text-center">
          الرقم السري الافتراضي: 0000 (يمكن تغييره من الإعدادات)
        </p>
      </form>
    </LoginLayout>
  );
}
