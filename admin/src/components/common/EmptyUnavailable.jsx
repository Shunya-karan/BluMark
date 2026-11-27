import { Construction } from "lucide-react";
export default function EmptyUnavailable({ title, detail }) {
  return (
    <div className="card mx-auto mt-12 max-w-xl text-center">
      <Construction className="mx-auto mb-4 text-amber-500" size={38} />
      <h2 className="text-lg font-bold text-ink">{title} is not available yet</h2>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        {detail} This page intentionally has no mock data or simulated actions.
      </p>
    </div>
  );
}
