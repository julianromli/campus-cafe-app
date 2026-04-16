import { api } from "@campus-cafe/backend/convex/_generated/api";
import { useQuery } from "convex/react";

import PagePlaceholder from "@/components/page-placeholder";

export default function ProfilePage() {
  const user = useQuery(api.users.getMe);

  return (
    <div className="grid gap-4">
      <PagePlaceholder
        title="Profile"
        description="Sprint 1 sudah menghubungkan current app user ke customer shell. Form edit profile lengkap akan diisi pada sprint user management."
      />
      {user ? (
        <section className="rounded-lg border border-border bg-card p-6">
          <dl className="grid gap-3 text-sm text-muted-foreground md:grid-cols-2">
            <div>
              <dt className="font-medium text-foreground">Name</dt>
              <dd>{user.name}</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">Email</dt>
              <dd>{user.email}</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">Role</dt>
              <dd className="capitalize">{user.role}</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">Phone</dt>
              <dd>{user.phone ?? "Belum diisi"}</dd>
            </div>
          </dl>
        </section>
      ) : null}
    </div>
  );
}
