"use client";

function SuggestionsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3">
      {Array.from({ length: 4 }).map((_, idx) => (
        <div key={idx} className="h-28 animate-pulse rounded-xl border border-slate-200 bg-slate-100" />
      ))}
    </div>
  );
}

export default function SuggestionsPanel({
  marketingPlan,
  selectedStepIds,
  onToggleStep,
  loading,
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:min-h-[420px]">
      <h3 className="text-base font-semibold text-slate-900">Marketing Plan</h3>
      <p className="mt-1 text-sm text-slate-500">
        Select any plan steps you want to execute. Actions update dynamically based on your selected
        steps.
      </p>

      <div className="mt-4 max-h-[540px] overflow-y-auto pr-1">
        {loading ? (
          <SuggestionsSkeleton />
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {marketingPlan.map((step) => {
              const selected = selectedStepIds.includes(step.id);
              return (
                <button
                  key={step.id}
                  onClick={() => onToggleStep(step.id)}
                  className={`rounded-xl border p-4 text-left transition ${
                    selected
                      ? "border-blue-500 bg-blue-50 shadow-sm"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selected}
                      readOnly
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">{step.title}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{step.description}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {step.channels?.map((ch) => (
                          <span
                            key={`${step.id}-${ch}`}
                            className="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-600"
                          >
                            {ch}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
            {marketingPlan.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                Ask AI in chat to generate a detailed marketing plan.
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
