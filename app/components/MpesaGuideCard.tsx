import { INDI_CONNECT_CONFIG } from "../config/indi-config";

type MpesaGuideCardProps = {
  memberNo: string;
  parishPaybills: {
    tithe: string;
    cess: string;
    operations: string;
    projects: string;
  };
};

export function MpesaGuideCard({ memberNo, parishPaybills }: MpesaGuideCardProps) {
  const accounts = [
    { name: "Tithe (Zaka)", number: parishPaybills.tithe, desc: "For general church tithe covenants" },
    { name: "Cess Quota", number: parishPaybills.cess, desc: "Automated Diocesan remittance split" },
    { name: "Operations", number: parishPaybills.operations, desc: "Parish utility fees & welfare support" },
    { name: "Church Projects", number: parishPaybills.projects, desc: "Structural expansions & cathedral funds" },
  ];

  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 border-b pb-4">
        <h3 className="text-lg font-bold text-gray-900">Lipa na M-Pesa Payment Methods</h3>
        <p className="mt-1 text-xs text-gray-500">
          Your unique Account Number for all choices below is: <span className="rounded bg-yellow-100 px-2 py-0.5 font-bold tracking-wider text-gray-800">{memberNo}</span>
        </p>
      </div>

      <div className="space-y-4">
        {accounts.map((acc, index) => (
          <div key={`${acc.name}-${index}`} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-3 transition-colors hover:border-green-200">
            <div>
              <p className="text-sm font-semibold text-gray-900">{acc.name}</p>
              <p className="text-xs text-gray-500">{acc.desc}</p>
            </div>
            <div className="text-right">
              <span className="block text-xs text-gray-400">Paybill No:</span>
              <span className="font-mono text-sm font-bold tracking-wider" style={{ color: INDI_CONNECT_CONFIG.ui.primaryGreen }}>{acc.number}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
