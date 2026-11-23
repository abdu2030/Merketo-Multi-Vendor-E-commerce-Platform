"use client";

import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { ArrowRight, BadgeCheck, Eye, EyeOff } from "@/components/imported/design-icons";
import { ApiError } from "@/lib/api";
import type { RegisterInput } from "@/lib/auth";

type FieldErrors = Partial<Record<keyof RegisterInput, string>>;

const passwordHint = "Use 12–128 characters with an uppercase letter, a lowercase letter, and a number.";

function passwordError(password: string) {
  const length = Array.from(password).length;
  if (length < 12) return "Use at least 12 characters for your password.";
  if (length > 128) return "Shorten your password to 128 characters or fewer.";
  if (/[\r\n\u2028\u2029]/.test(password)) return "Remove the line breaks from your password.";

  const missing = [];
  if (!/[A-Z]/.test(password)) missing.push("an uppercase letter (A–Z)");
  if (!/[a-z]/.test(password)) missing.push("a lowercase letter (a–z)");
  if (!/[0-9]/.test(password)) missing.push("a number (0–9)");
  return missing.length ? `Add ${missing.join(" and ")} to your password.` : undefined;
}

function FieldError({ field, errors }: { field: keyof RegisterInput; errors: FieldErrors }) {
  return errors[field] ? (
    <span id={`${field}-error`} className="text-sm font-medium text-red-700">{errors[field]}</span>
  ) : null;
}

export default function RegisterPage() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordFeedback = fieldErrors.password ?? (password ? passwordError(password) : undefined);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const input = { fullName: fullName.trim(), email: email.trim(), phone: phone.trim() || undefined, password };
    const errors: FieldErrors = {};
    setError("");

    function showFieldErrors(errors: FieldErrors) {
      setFieldErrors(errors);
      const firstInput = form.elements.namedItem(Object.keys(errors)[0]);
      if (firstInput instanceof HTMLInputElement) firstInput.focus();
    }

    const nameLength = Array.from(input.fullName).length;
    if (nameLength < 2 || nameLength > 80) {
      errors.fullName = "Enter a name between 2 and 80 characters.";
    }
    const emailInput = form.elements.namedItem("email") as HTMLInputElement;
    if (!input.email || emailInput.validity.typeMismatch) {
      errors.email = "Enter an email address, such as you@example.com.";
    } else if (Array.from(input.email).length > 254) {
      errors.email = "Use an email address of 254 characters or fewer.";
    }
    if (Array.from(input.phone ?? "").length > 30) {
      errors.phone = "Use 30 characters or fewer for your phone number.";
    }
    const passwordMessage = passwordError(password);
    if (passwordMessage) errors.password = passwordMessage;
    if (Object.keys(errors).length) {
      showFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    try {
      await signUp(input);
      router.replace("/dashboard");
    } catch (caughtError) {
      if (caughtError instanceof ApiError) {
        for (const { field, messages } of caughtError.fields) {
          if (Object.hasOwn(input, field) && messages.length) {
            errors[field as keyof RegisterInput] = messages.join(" ");
          }
        }
        if (caughtError.status === 409) {
          errors.email = "Try signing in with this email address, or use a different email to register.";
        }
        if (Object.keys(errors).length) {
          showFieldErrors(errors);
          return;
        }
        if (caughtError.status >= 500) {
          setError("The marketplace couldn’t finish your signup. Try signing in, or try again in a few minutes.");
          return;
        }
      }
      setError(caughtError instanceof Error ? caughtError.message : "Couldn’t complete signup. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#FAF8F4] px-4 py-8 text-stone-900">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] w-full min-w-0 grid-cols-[minmax(0,1fr)] max-w-6xl overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-xl lg:grid-cols-[1fr_500px]">
        <section className="relative isolate hidden flex-col justify-between overflow-hidden bg-stone-900 p-10 text-white lg:flex">
          <img
            alt="Independent seller managing orders in her studio"
            className="absolute inset-0 -z-20 h-full w-full object-cover"
            src="/images/seller-studio.webp"
          />
          <div className="absolute inset-0 -z-10 bg-stone-950/75" />
          <div className="relative z-10">
            <Link className="flex items-center gap-2" href="/">
              <BrandLogo textClassName="text-white" />
            </Link>
          </div>

          <div className="relative z-10 max-w-lg">
            <p className="mb-3 text-xs font-extrabold uppercase tracking-widest text-emerald-400">
              Buyer account
            </p>
            <h1 className="text-4xl font-extrabold leading-tight">
              Create an account and continue into the marketplace workspace.
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-stone-400">
              Start as a buyer, then submit a seller application from your
              dashboard whenever your store is ready.
            </p>
          </div>

          <div className="relative z-10 grid gap-3">
            {[
              ["Buyer dashboard", "Profile and protected account access"],
              ["Seller application", "Submit store details after registration"],
              ["Approval status", "Track admin decisions from your workspace"],
            ].map(([title, body]) => (
              <div
                key={title}
                className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4"
              >
                <BadgeCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400" />
                <div>
                  <p className="text-sm font-bold text-white">{title}</p>
                  <p className="mt-0.5 text-xs text-stone-400">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="flex min-w-0 items-center p-6 sm:p-10">
          <div className="w-full min-w-0">
            <div className="mb-8 lg:hidden">
              <Link className="flex items-center gap-2" href="/">
                <BrandLogo />
              </Link>
            </div>

            <div className="mb-8">
              <p className="mb-2 text-xs font-extrabold uppercase tracking-widest text-emerald-600">
                Create account
              </p>
              <h2 className="text-3xl font-extrabold tracking-tight text-stone-900">
                Join Marketo
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-stone-500">
                Register a buyer account. Seller tools are available after you
                apply and get approved.
              </p>
            </div>

            <form
              className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4"
              noValidate
              onChange={(event) => {
                if (!(event.target instanceof HTMLInputElement)) return;
                const field = event.target.name as keyof RegisterInput;
                if (fieldErrors[field]) setFieldErrors((current) => ({ ...current, [field]: undefined }));
                setError("");
              }}
              onSubmit={handleSubmit}
            >
              <label className="grid min-w-0 gap-2">
                <span className="text-sm font-bold text-stone-700">
                  Full name
                </span>
                <input
                  autoComplete="name"
                  aria-describedby={fieldErrors.fullName ? "fullName-error" : undefined}
                  aria-invalid={Boolean(fieldErrors.fullName)}
                  required
                  className="h-12 w-full min-w-0 rounded-2xl border border-stone-200 bg-stone-50 px-4 text-sm text-stone-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                  name="fullName"
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Your full name"
                  type="text"
                  value={fullName}
                />
                <FieldError field="fullName" errors={fieldErrors} />
              </label>

              <label className="grid min-w-0 gap-2">
                <span className="text-sm font-bold text-stone-700">Email</span>
                <input
                  autoComplete="email"
                  aria-describedby={fieldErrors.email ? "email-error" : undefined}
                  aria-invalid={Boolean(fieldErrors.email)}
                  required
                  className="h-12 w-full min-w-0 rounded-2xl border border-stone-200 bg-stone-50 px-4 text-sm text-stone-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                  name="email"
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  type="email"
                  value={email}
                />
                <FieldError field="email" errors={fieldErrors} />
              </label>

              <label className="grid min-w-0 gap-2">
                <span className="text-sm font-bold text-stone-700">
                  Phone (optional)
                </span>
                <input
                  autoComplete="tel"
                  aria-describedby={fieldErrors.phone ? "phone-error" : undefined}
                  aria-invalid={Boolean(fieldErrors.phone)}
                  className="h-12 w-full min-w-0 rounded-2xl border border-stone-200 bg-stone-50 px-4 text-sm text-stone-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                  name="phone"
                  onChange={(event) => setPhone(event.target.value)}
                  type="tel"
                  value={phone}
                />
                <FieldError field="phone" errors={fieldErrors} />
              </label>

              <div className="grid min-w-0 gap-2">
                <label htmlFor="new-password" className="text-sm font-bold text-stone-700">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="new-password"
                    autoComplete="new-password"
                    aria-describedby="password-feedback"
                    aria-invalid={Boolean(passwordFeedback)}
                    required
                    className="h-12 w-full min-w-0 rounded-2xl border border-stone-200 bg-stone-50 pl-4 pr-12 text-sm text-stone-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 [&::-ms-reveal]:hidden"
                    name="password"
                    onChange={(event) => setPassword(event.target.value)}
                    type={passwordVisible ? "text" : "password"}
                    value={password}
                  />
                  <button
                    type="button"
                    aria-controls="new-password"
                    aria-label={passwordVisible ? "Hide password" : "Show password"}
                    className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-2xl text-stone-600 hover:text-emerald-700 focus-visible:outline-2 focus-visible:outline-emerald-600"
                    onClick={() => setPasswordVisible((visible) => !visible)}
                  >
                    {passwordVisible ? <EyeOff /> : <Eye />}
                  </button>
                </div>
                <p
                  id="password-feedback"
                  aria-live="polite"
                  className={passwordFeedback ? "text-sm font-medium text-red-700" : "text-xs leading-relaxed text-stone-600"}
                >
                  {passwordFeedback ?? passwordHint}
                </p>
              </div>

              {error ? (
                <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                  {error}
                </p>
              ) : null}

              <button
                className="mt-2 flex h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 text-sm font-extrabold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSubmitting}
                type="submit"
              >
                {isSubmitting ? "Creating account..." : "Create account"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            <p className="mt-8 text-center text-sm text-stone-500">
              Already have an account?{" "}
              <Link
                className="font-extrabold text-emerald-700 hover:text-emerald-900"
                href="/login"
              >
                Sign in
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
