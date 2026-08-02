import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { supabase } from '@/lib/supabase';
import type { Assistant, AssistantPermissions } from '@/lib/types';
import {
  ASSISTANT_SESSION_KEY,
  DEFAULT_MASTER_PIN,
  MASTER_PIN_KEY,
} from '@/lib/constants';

type AuthRole = 'master' | 'assistant' | null;

type AuthSession = {
  role: AuthRole;
  assistant: Assistant | null;
};

type AuthContextValue = {
  role: AuthRole;
  assistant: Assistant | null;
  loading: boolean;
  loginMaster: (pin: string) => Promise<{ ok: boolean; error?: string }>;
  loginAssistant: (
    username: string,
    pin: string
  ) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  can: (perm: keyof AssistantPermissions) => boolean;
  isMaster: boolean;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession>({
    role: null,
    assistant: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    restoreSession();
  }, []);

  async function restoreSession() {
    try {
      const savedAssistant = localStorage.getItem(ASSISTANT_SESSION_KEY);
      if (savedAssistant) {
        const parsed = JSON.parse(savedAssistant) as Assistant;
        const { data } = await supabase
          .from('assistants')
          .select('*')
          .eq('id', parsed.id)
          .eq('is_active', true)
          .maybeSingle();
        if (data) {
          setSession({ role: 'assistant', assistant: data });
          setLoading(false);
          return;
        }
      }

      const savedPin = localStorage.getItem(MASTER_PIN_KEY);
      if (savedPin) {
        setSession({ role: 'master', assistant: null });
        setLoading(false);
        return;
      }
    } catch {
      // ignore corrupt localStorage
    }
    setLoading(false);
  }

  async function loginMaster(
    pin: string
  ): Promise<{ ok: boolean; error?: string }> {
    const { data } = await supabase
      .from('settings')
      .select('master_pin, default_pin_active')
      .maybeSingle();
    const dbPin = data?.master_pin ?? '0000';
    const defaultActive = data?.default_pin_active ?? true;

    if (pin === '0000' && !defaultActive) {
      return { ok: false, error: 'تم تغيير الرقم السري الافتراضي. استخدم الرقم السري الجديد.' };
    }

    if (pin === dbPin) {
      localStorage.setItem(MASTER_PIN_KEY, pin);
      setSession({ role: 'master', assistant: null });
      return { ok: true };
    }

    const storedPin = localStorage.getItem(MASTER_PIN_KEY) || DEFAULT_MASTER_PIN;
    if (pin === storedPin && !(pin === '0000' && !defaultActive)) {
      localStorage.setItem(MASTER_PIN_KEY, storedPin);
      setSession({ role: 'master', assistant: null });
      return { ok: true };
    }
    return { ok: false, error: 'الرقم السري غير صحيح' };
  }

  async function loginAssistant(
    username: string,
    pin: string
  ): Promise<{ ok: boolean; error?: string }> {
    const { data, error } = await supabase
      .from('assistants')
      .select('*')
      .eq('username', username.trim())
      .eq('pin', pin.trim())
      .eq('is_active', true)
      .maybeSingle();

    if (error) return { ok: false, error: 'حدث خطأ في الاتصال' };
    if (!data) return { ok: false, error: 'اسم المستخدم أو الرقم السري غير صحيح' };

    localStorage.setItem(ASSISTANT_SESSION_KEY, JSON.stringify(data));
    setSession({ role: 'assistant', assistant: data });

    // Track login
    (async () => {
      await supabase
        .from('assistants')
        .update({
          logins_count: (data.logins_count ?? 0) + 1,
          last_login_at: new Date().toISOString(),
        })
        .eq('id', data.id);
    })();

    return { ok: true };
  }

  function logout() {
    localStorage.removeItem(ASSISTANT_SESSION_KEY);
    localStorage.removeItem(MASTER_PIN_KEY);
    setSession({ role: null, assistant: null });
  }

  function can(perm: keyof AssistantPermissions): boolean {
    if (session.role === 'master') return true;
    if (session.role === 'assistant' && session.assistant) {
      return session.assistant[perm] ?? false;
    }
    return false;
  }

  const isMaster = session.role === 'master';

  return (
    <AuthContext.Provider
      value={{
        role: session.role,
        assistant: session.assistant,
        loading,
        loginMaster,
        loginAssistant,
        logout,
        can,
        isMaster,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
