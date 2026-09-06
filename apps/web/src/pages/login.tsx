/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { createSignal, onMount, Show } from 'solid-js';
import { toast } from 'somoto';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { TextField, TextFieldInput, TextFieldLabel } from '@/components/ui/text-field';
import { DevAuthCodeInput } from '@/components/dev-auth-code-input';
import { HeadlessIndicator } from '@/components/headless-indicator';
import { useAuth } from '@/context/auth';
import { mainBridge } from '@/lib/ipc';
import { MAIN_CHANNELS } from '@desktop/main-channels';

const FIRESTORE_USERS_URL =
  'https://firestore.googleapis.com/v1/projects/neuravibe-5a629/databases/(default)/documents/users/Vixa';

function parseExpiryDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const trimmed = dateStr.trim();

  // Format DD/MM/YYYY or DD-MM-YYYY
  const dmy = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) {
    const day = parseInt(dmy[1], 10);
    const month = parseInt(dmy[2], 10) - 1;
    const year = parseInt(dmy[3], 10);
    return new Date(year, month, day, 23, 59, 59, 999);
  }

  // Format YYYY-MM-DD or YYYY/MM/DD
  const ymd = trimmed.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (ymd) {
    const year = parseInt(ymd[1], 10);
    const month = parseInt(ymd[2], 10) - 1;
    const day = parseInt(ymd[3], 10);
    return new Date(year, month, day, 23, 59, 59, 999);
  }

  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }

  return null;
}

async function getCurrentDeviceId(): Promise<string> {
  try {
    if (window.desktop) {
      const id = await mainBridge.call(MAIN_CHANNELS.SYSTEM_GET_DEVICE_ID, undefined);
      if (id) return id.trim();
    }
  } catch (err) {
    console.warn('Failed to get desktop device id:', err);
  }

  let webId = localStorage.getItem('device_id');
  if (!webId) {
    webId = crypto.randomUUID().toUpperCase();
    localStorage.setItem('device_id', webId);
  }
  return webId.trim();
}

type OAuthButtonProps = {
  icon: string;
  label: string;
  onClick: () => void;
};

function OAuthButton(props: OAuthButtonProps) {
  return (
    <Button
      variant="secondary"
      class="w-full gap-0 px-0.5"
      onClick={props.onClick}
    >
      <Icon name={props.icon} class="size-6" />
      <span class="min-w-0 flex-1 text-center">{props.label}</span>
      <span class="size-6 shrink-0" aria-hidden="true" />
    </Button>
  );
}

export function LoginPage() {
  const auth = useAuth();
  const [email, setEmail] = createSignal('');
  const [otpSending, setOtpSending] = createSignal(false);

  // Form đăng nhập mới
  const [loginEmail, setLoginEmail] = createSignal('hoangkien0705@gmail.com');
  const [loginPassword, setLoginPassword] = createSignal('123456Aa@');
  const [showPassword, setShowPassword] = createSignal(false);
  const [loggingIn, setLoggingIn] = createSignal(false);
  const [copiedId, setCopiedId] = createSignal(false);

  const handleCopyDeviceId = async (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const id = await getCurrentDeviceId();
      if (id) {
        await navigator.clipboard.writeText(id);
        setCopiedId(true);
        toast.success('Đã sao chép ID vào clipboard!');
        setTimeout(() => setCopiedId(false), 2000);
      }
    } catch {
      toast.error('Không thể sao chép ID');
    }
  };

  const performLogin = async () => {
    const inputEmail = loginEmail().trim();
    const inputPassword = loginPassword();

    if (!inputEmail) {
      toast.error('Vui lòng nhập email');
      return;
    }

    if (!inputPassword) {
      toast.error('Vui lòng nhập mật khẩu');
      return;
    }

    setLoggingIn(true);

    try {
      const res = await fetch(FIRESTORE_USERS_URL);
      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(
          errJson?.error?.message || `Không thể kết nối đến máy chủ Firestore (${res.status})`,
        );
      }

      const data = await res.json();
      const rawValues = data.fields?.users?.arrayValue?.values || [];

      const users = rawValues.map((item: any) => {
        const fields = item.mapValue?.fields || {};
        return {
          email: (fields.email?.stringValue || '').trim(),
          password: fields.password?.stringValue || '',
          deviceId: (fields.deviceId?.stringValue || '').trim(),
          expired_at: (fields.expired_at?.stringValue || '').trim(),
        };
      });

      const matchedUser = users.find(
        (u: any) => u.email.toLowerCase() === inputEmail.toLowerCase(),
      );

      if (!matchedUser) {
        toast.error('Email không tồn tại trong hệ thống');
        return;
      }

      if (matchedUser.password !== inputPassword) {
        toast.error('Mật khẩu không chính xác');
        return;
      }

      // Đối chiếu Device ID
      const currentDeviceId = await getCurrentDeviceId();
      if (
        matchedUser.deviceId &&
        currentDeviceId &&
        matchedUser.deviceId.toLowerCase() !== currentDeviceId.toLowerCase()
      ) {
        toast.error(`Thiết bị không hợp lệ! Device ID của máy: ${currentDeviceId}`);
        return;
      }

      // Đối chiếu hạn sử dụng expired_at
      if (matchedUser.expired_at) {
        const expiryDate = parseExpiryDate(matchedUser.expired_at);
        if (expiryDate && new Date() > expiryDate) {
          toast.error(`Tài khoản đã hết hạn sử dụng (${matchedUser.expired_at})`);
          return;
        }
      }

      // Cho phép đăng nhập vào ứng dụng
      auth.loginWithCustomCredentials({
        email: matchedUser.email,
        deviceId: matchedUser.deviceId,
        expired_at: matchedUser.expired_at,
      });

      toast.success('Đăng nhập thành công!');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Đăng nhập thất bại';
      toast.error(msg);
    } finally {
      setLoggingIn(false);
    }
  };

  const handleCustomLogin = (e: SubmitEvent) => {
    e.preventDefault();
    void performLogin();
  };

  onMount(() => {
    void performLogin();
  });

  const handleOtpSubmit = async (e: SubmitEvent) => {
    e.preventDefault();

    const value = email().trim();
    if (!value) return;

    setOtpSending(true);
    const { error } = await auth.signInWithOtp(value);
    setOtpSending(false);

    if (error) {
      toast.error(error);
    } else {
      toast.success('Check your email for the login link');
    }
  };

  return (
    <div class="flex flex-col bg-background fixed inset-0 z-999">
      <HeadlessIndicator />

      <Show when={!window.desktop}>
        <div class="flex items-center gap-1 p-4">
          <Icon name="diffusion-logo" class="size-6" />
          <span class="text-sm font-450 text-foreground">Vixa</span>
        </div>
      </Show>

      <div class="flex flex-1 items-center justify-center pb-16">
        {/* Form Đăng nhập Email & Password mới */}
        <div class="flex w-80 flex-col gap-4 rounded-xl border border-border/70 bg-surface/80 p-5 shadow-xl backdrop-blur-sm">
          <div class="flex flex-col gap-1">
            <h2 class="text-sm font-semibold text-foreground">
              Đăng nhập
            </h2>
            <p class="text-xs text-muted-foreground">
              Nhập email và mật khẩu của bạn để tiếp tục
            </p>
          </div>

          <form
            class="flex flex-col gap-3.5"
            onSubmit={handleCustomLogin}
          >
            <TextField>
              <TextFieldLabel uiSize="compact" class="text-xs text-muted-foreground">
                Email
              </TextFieldLabel>
              <TextFieldInput
                uiSize="compact"
                type="email"
                placeholder="name@example.com"
                value={loginEmail()}
                onInput={(e) => setLoginEmail(e.currentTarget.value)}
                onKeyDown={(e) => e.stopPropagation()}
                onKeyUp={(e) => e.stopPropagation()}
              />
            </TextField>

            <TextField>
              <div class="flex items-center justify-between">
                <TextFieldLabel uiSize="compact" class="text-xs text-muted-foreground">
                  Mật khẩu
                </TextFieldLabel>
              </div>
              <div class="relative flex items-center">
                <TextFieldInput
                  uiSize="compact"
                  type={showPassword() ? "text" : "password"}
                  placeholder="••••••••"
                  value={loginPassword()}
                  onInput={(e) => setLoginPassword(e.currentTarget.value)}
                  onKeyDown={(e) => e.stopPropagation()}
                  onKeyUp={(e) => e.stopPropagation()}
                  class="pr-8"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword())}
                  class="absolute right-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <Icon name={showPassword() ? "eye-off" : "eye-on"} class="size-4" />
                </button>
              </div>
            </TextField>

            {/* ID (Device ID) masked */}
            <div class="flex flex-col gap-1.5">
              <span class="text-xs text-muted-foreground font-normal">ID</span>
              <div class="flex h-8 items-center justify-between gap-2 rounded-md border border-input bg-input/40 px-2.5">
                <div class="flex items-center gap-2 min-w-0 flex-1">
                  <Icon name="mac-device" class="size-4 text-muted-foreground shrink-0" />
                  <span class="text-xs font-mono tracking-wider text-muted-foreground select-none truncate">
                    ••••••••-••••-••••-••••-••••••••••••
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyDeviceId}
                  class="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors font-medium cursor-pointer shrink-0"
                >
                  <Icon name={copiedId() ? "confirm-check" : "copy"} class="size-3.5" />
                  <span>{copiedId() ? "Đã chép" : "Copy ID"}</span>
                </button>
              </div>
            </div>

            <Button
              type="submit"
              class="w-full mt-1 font-medium text-xs h-8"
              disabled={loggingIn()}
            >
              {loggingIn() ? 'Đang kiểm tra...' : 'Đăng nhập'}
            </Button>
          </form>
        </div>

        {/* Khung login cũ tạm thời ẩn đi (giữ nguyên toàn bộ code) */}
        <div class="hidden" style={{ display: 'none' }}>
          <div class="flex w-70 flex-col gap-3">
            <div class="flex flex-col gap-3 rounded-xl bg-accent/40 p-4">
              <div class="flex flex-col gap-4">
                <div class="flex flex-col gap-1">
                  <h2 class="text-[12px] font-450 text-foreground">
                    Sign in or sign up
                  </h2>
                  <p class="text-xs text-muted-foreground">
                    Choose your preferred method
                  </p>
                </div>

                <div class="flex flex-col gap-3">
                  <OAuthButton
                    icon="social.google"
                    label="Continue with Google"
                    onClick={() => auth.signInWithOAuth('google')}
                  />
                  <OAuthButton
                    icon="social.github"
                    label="Continue with GitHub"
                    onClick={() => auth.signInWithOAuth('github')}
                  />
                </div>

                <div class="flex items-center justify-center gap-3">
                  <div class="h-px flex-1 bg-border" />
                  <span class="text-xs text-muted-foreground">or</span>
                  <div class="h-px flex-1 bg-border" />
                </div>
              </div>

              <form class="flex flex-col gap-3" onSubmit={handleOtpSubmit}>
                <TextField>
                  <TextFieldLabel
                    uiSize="compact"
                    class="text-xs text-muted-foreground"
                  >
                    Email
                  </TextFieldLabel>
                  <TextFieldInput
                    uiSize="compact"
                    type="email"
                    placeholder="Enter your email"
                    value={email()}
                    onInput={(e) => setEmail(e.currentTarget.value)}
                    onKeyDown={(e) => e.stopPropagation()}
                    onKeyUp={(e) => e.stopPropagation()}
                  />
                </TextField>

                <Button
                  type="submit"
                  class="w-full"
                  disabled={otpSending() || !email().trim()}
                >
                  {otpSending() ? 'Sending...' : 'Send magic link'}
                </Button>
              </form>
            </div>

            <DevAuthCodeInput />

            <span class="px-1 text-center text-xs text-muted-foreground">
              By continuing, you agree to our{' '}
              <a
                href="https://www.diffusion.studio/legal/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
                class="underline hover:text-foreground"
              >
                Privacy Policy
              </a>{' '}
              and{' '}
              <a
                href="https://www.diffusion.studio/legal/terms-of-service"
                target="_blank"
                rel="noopener noreferrer"
                class="underline hover:text-foreground"
              >
                Terms of Service
              </a>
              .
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
