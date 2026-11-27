import EmptyUnavailable from "../../components/common/EmptyUnavailable";
export default function SettingsPage() {
  return (
    <EmptyUnavailable
      title="System settings"
      detail="No institution settings endpoint is currently mounted. Backend configuration remains server-managed to preserve the existing application contract."
    />
  );
}
