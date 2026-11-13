import { requireUser } from "@/lib/auth";
import { PageHead } from "@/components/site/shell";
import { Card } from "@/components/ui/ui";
import { ProfileForm, PasswordForm } from "./form";

export default async function SettingsPage() {
  const { profile, user } = await requireUser();
  return (
    <>
      <PageHead title="Settings" />
      <div className="grid max-w-3xl gap-6">
        <Card className="p-6">
          <h3 className="mb-5 text-[14px] font-medium">Profile</h3>
          <ProfileForm username={profile.username} displayName={profile.display_name ?? ""} email={user.email ?? ""} />
        </Card>
        <Card className="p-6">
          <h3 className="mb-5 text-[14px] font-medium">Password</h3>
          <PasswordForm />
        </Card>
      </div>
    </>
  );
}
