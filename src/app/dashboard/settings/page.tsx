import { requireUser } from "@/lib/auth";
import { PageHead } from "@/components/site/shell";
import { Card } from "@/components/ui/ui";
import { ProfileForm, PasswordForm } from "./form";
import { getT } from "@/lib/i18n/server";
import { LangSwitch } from "@/components/site/lang-switch";
import { NotificationsForm } from "./notifications-form";

export default async function SettingsPage() {
  const [{ supabase, profile, user }, { t }] = await Promise.all([requireUser(), getT()]);
  const { data: prefs } = await supabase.from("notification_prefs").select("email_opt_in,sms_opt_in,phone").eq("user_id", profile.id).maybeSingle();
  return (
    <>
      <PageHead title={t.settings.title} />
      <div className="grid max-w-3xl gap-6">
        <Card className="p-6">
          <h3 className="mb-5 text-[14px] font-medium">{t.settings.profile}</h3>
          <ProfileForm username={profile.username} displayName={profile.display_name ?? ""} email={user.email ?? ""} />
        </Card>
        <Card className="p-6">
          <h3 className="mb-5 text-[14px] font-medium">{t.settings.notifications}</h3>
          <NotificationsForm emailOptIn={!!prefs?.email_opt_in} smsOptIn={!!prefs?.sms_opt_in} phone={prefs?.phone ?? null} />
        </Card>
        <Card className="p-6">
          <h3 className="mb-5 text-[14px] font-medium">{t.common.password}</h3>
          <PasswordForm />
        </Card>
        <Card className="flex items-center justify-between gap-4 p-6">
          <h3 className="text-[14px] font-medium">{t.lang.label}</h3>
          <LangSwitch />
        </Card>
      </div>
    </>
  );
}
